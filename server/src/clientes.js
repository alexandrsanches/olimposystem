import { Router } from 'express';
import { STATUS, ORIGEM, SEXO, TIPO_CONTATO } from './db.js';
import { validarCliente, validarContato, soDigitos } from './validacao.js';

const camel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

export function serializar(row) {
  if (!row) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) out[camel(k)] = v;
  out.vip = !!out.vip;
  out.temResponsavel = !!out.temResponsavel;
  out.anonimizado = !!out.anonimizado;
  out.removido = !!out.removidoEm;
  out.idade = idade(out.dataNascimento);
  return out;
}

export function idade(dataNascimento, hoje = new Date()) {
  if (!dataNascimento) return null;
  const [a, m, d] = dataNascimento.split('-').map(Number);
  let anos = hoje.getUTCFullYear() - a;
  const mes = hoje.getUTCMonth() + 1;
  if (mes < m || (mes === m && hoje.getUTCDate() < d)) anos--;
  return anos;
}

const ORDENACAO = {
  nome: 'nome COLLATE NOCASE',
  status: 'status',
  idade: 'data_nascimento',
  sexo: 'sexo',
  criadoEm: 'criado_em',
  ultimoAcesso: 'ultimo_acesso',
};

const lista = (v) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : []);

class HttpErro extends Error {
  constructor(status, mensagem, erros) { super(mensagem); this.status = status; this.erros = erros; }
}

export function clientesRouter(db) {
  const r = Router();

  const buscar = (id) => db.prepare('SELECT * FROM cliente WHERE id = ?').get(id);
  const exigir = (id) => {
    const c = buscar(Number(id));
    if (!c) throw new HttpErro(404, 'Cliente não encontrado.');
    return c;
  };
  const conflitoUnico = (e) => {
    if (String(e.message).includes('cliente.cpf')) return new HttpErro(409, 'Já existe um cliente com este CPF.', { cpf: 'CPF já cadastrado.' });
    if (String(e.message).includes('cliente.wellhub_id')) return new HttpErro(409, 'Este ID Wellhub já está vinculado a outro cliente.', { wellhubId: 'ID Wellhub já vinculado.' });
    return e;
  };

  r.get('/opcoes', (_req, res) => res.json({ status: STATUS, origem: ORIGEM, sexo: SEXO, tipoContato: TIPO_CONTATO }));

  // Listagem com busca geral, filtros, ordenação e paginação.
  r.get('/', (req, res) => {
    const where = [];
    const params = [];
    const q = req.query;

    where.push(q.removidos === 'true' ? 'removido_em IS NOT NULL' : 'removido_em IS NULL');

    if (q.busca) {
      const termo = String(q.busca).trim();
      const dig = soDigitos(termo);
      const conds = ['nome LIKE ? COLLATE NOCASE', 'email LIKE ? COLLATE NOCASE', 'wellhub_id = ?'];
      params.push(`%${termo}%`, `%${termo}%`, termo);
      if (dig.length >= 3) { conds.push('cpf LIKE ?', 'telefone LIKE ?'); params.push(`%${dig}%`, `%${dig}%`); }
      if (/^\d+$/.test(termo)) { conds.push('id = ?'); params.push(Number(termo)); }
      where.push(`(${conds.join(' OR ')})`);
    }
    const status = lista(q.status).filter((s) => STATUS.includes(s));
    if (status.length) { where.push(`status IN (${status.map(() => '?').join(',')})`); params.push(...status); }
    const origem = lista(q.origem).filter((s) => ORIGEM.includes(s));
    if (origem.length) { where.push(`origem IN (${origem.map(() => '?').join(',')})`); params.push(...origem); }
    if (q.sexo && SEXO.includes(q.sexo)) { where.push('sexo = ?'); params.push(q.sexo); }
    if (q.vip === 'true') where.push('vip = 1');

    const limit = Math.min(Math.max(Number(q.limit) || 25, 1), 100);
    const page = Math.max(Number(q.page) || 1, 1);
    const sort = ORDENACAO[q.sort] || ORDENACAO.nome;
    const dir = q.dir === 'desc' ? 'DESC' : 'ASC';
    const w = `WHERE ${where.join(' AND ')}`;

    const total = db.prepare(`SELECT COUNT(*) AS n FROM cliente ${w}`).get(...params).n;
    const items = db
      .prepare(`SELECT * FROM cliente ${w} ORDER BY ${sort} ${dir} NULLS LAST, id ASC LIMIT ? OFFSET ?`)
      .all(...params, limit, (page - 1) * limit)
      .map(serializar);
    const contagem = Object.fromEntries(
      db.prepare('SELECT status, COUNT(*) AS n FROM cliente WHERE removido_em IS NULL GROUP BY status').all().map((x) => [x.status, x.n]),
    );
    res.json({ items, total, page, limit, contagemPorStatus: contagem });
  });

  r.get('/:id', (req, res) => {
    const c = serializar(exigir(req.params.id));
    c.contatos = db.prepare('SELECT id, tipo, descricao, criado_em AS criadoEm FROM cliente_contato WHERE cliente_id = ? ORDER BY id').all(c.id);
    res.json(c);
  });

  r.get('/:id/resumo', (req, res) => {
    const c = serializar(exigir(req.params.id));
    const contatos = db.prepare('SELECT id, tipo, descricao FROM cliente_contato WHERE cliente_id = ? ORDER BY id').all(c.id);
    const diasDeCasa = Math.floor((Date.now() - new Date(`${c.criadoEm.replace(' ', 'T')}Z`).getTime()) / 86_400_000);
    const pendencias = [];
    if (!c.cpf) pendencias.push('CPF não informado');
    if (!c.telefone) pendencias.push('Celular não informado');
    if (!c.dataNascimento) pendencias.push('Data de nascimento não informada');
    if (!c.email) pendencias.push('E-mail não informado');
    res.json({ cliente: c, contatos, diasDeCasa, pendencias, aniversarioHoje: ehAniversario(c.dataNascimento) });
  });

  r.post('/', (req, res) => {
    const { dados, erros } = validarCliente(req.body);
    if (Object.keys(erros).length) throw new HttpErro(422, 'Verifique os campos destacados.', erros);
    const cols = Object.keys(dados);
    try {
      const { lastInsertRowid } = db
        .prepare(`INSERT INTO cliente (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`)
        .run(...cols.map((k) => dados[k]));
      res.status(201).json(serializar(buscar(Number(lastInsertRowid))));
    } catch (e) { throw conflitoUnico(e); }
  });

  r.put('/:id', (req, res) => {
    const atual = exigir(req.params.id);
    if (atual.anonimizado) throw new HttpErro(409, 'Cliente anonimizado (LGPD) não pode ser editado.');
    const { dados, erros } = validarCliente(req.body, { parcial: true });
    if (Object.keys(erros).length) throw new HttpErro(422, 'Verifique os campos destacados.', erros);
    const cols = Object.keys(dados);
    if (cols.length) {
      try {
        db.prepare(`UPDATE cliente SET ${cols.map((k) => `${k} = ?`).join(', ')}, atualizado_em = datetime('now') WHERE id = ?`)
          .run(...cols.map((k) => dados[k]), atual.id);
      } catch (e) { throw conflitoUnico(e); }
    }
    res.json(serializar(buscar(atual.id)));
  });

  // Remoção lógica (vai para "Removidos"), como no sistema de referência.
  r.delete('/:id', (req, res) => {
    const c = exigir(req.params.id);
    db.prepare("UPDATE cliente SET removido_em = datetime('now'), atualizado_em = datetime('now') WHERE id = ?").run(c.id);
    res.status(204).end();
  });

  r.post('/:id/restaurar', (req, res) => {
    const c = exigir(req.params.id);
    try {
      db.prepare("UPDATE cliente SET removido_em = NULL, atualizado_em = datetime('now') WHERE id = ?").run(c.id);
    } catch (e) { throw conflitoUnico(e); }
    res.json(serializar(buscar(c.id)));
  });

  // Remoção LGPD: apaga dados pessoais de forma irreversível, mantendo o registro para histórico.
  r.post('/:id/anonimizar', (req, res) => {
    const c = exigir(req.params.id);
    db.exec('BEGIN');
    try {
      db.prepare(`UPDATE cliente SET nome = ?, cpf = NULL, rg = NULL, data_nascimento = NULL, email = NULL, telefone = NULL,
        cep = NULL, endereco = NULL, numero = NULL, complemento = NULL, bairro = NULL, cidade = NULL, uf = NULL,
        observacao = NULL, wellhub_id = NULL, responsavel_nome = NULL, responsavel_cpf = NULL, responsavel_telefone = NULL,
        tem_responsavel = 0, anonimizado = 1, status = 'Inativo', removido_em = COALESCE(removido_em, datetime('now')),
        atualizado_em = datetime('now') WHERE id = ?`).run(`Cliente anonimizado #${c.id}`, c.id);
      db.prepare('DELETE FROM cliente_contato WHERE cliente_id = ?').run(c.id);
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
    res.json(serializar(buscar(c.id)));
  });

  r.post('/:id/contatos', (req, res) => {
    const c = exigir(req.params.id);
    const { dados, erros } = validarContato(req.body);
    if (Object.keys(erros).length) throw new HttpErro(422, 'Verifique os campos destacados.', erros);
    const { lastInsertRowid } = db.prepare('INSERT INTO cliente_contato (cliente_id, tipo, descricao) VALUES (?, ?, ?)').run(c.id, dados.tipo, dados.descricao);
    res.status(201).json({ id: Number(lastInsertRowid), ...dados });
  });

  r.delete('/:id/contatos/:contatoId', (req, res) => {
    const c = exigir(req.params.id);
    const { changes } = db.prepare('DELETE FROM cliente_contato WHERE id = ? AND cliente_id = ?').run(Number(req.params.contatoId), c.id);
    if (!changes) throw new HttpErro(404, 'Contato não encontrado.');
    res.status(204).end();
  });

  return r;
}

function ehAniversario(dataNascimento, hoje = new Date()) {
  if (!dataNascimento) return false;
  const [, m, d] = dataNascimento.split('-').map(Number);
  return hoje.getMonth() + 1 === m && hoje.getDate() === d;
}

export function tratarErros(err, _req, res, _next) {
  if (err instanceof HttpErro) return res.status(err.status).json({ mensagem: err.message, erros: err.erros });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ mensagem: 'JSON inválido.' });
  console.error(err);
  return res.status(500).json({ mensagem: 'Erro interno.' });
}
