import { STATUS, SEXO, ORIGEM, TIPO_CONTATO } from './db.js';

export const soDigitos = (v) => (v == null ? '' : String(v).replace(/\D/g, ''));

export function cpfValido(cpf) {
  const d = soDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (len) => {
    let soma = 0;
    for (let i = 0; i < len; i++) soma += Number(d[i]) * (len + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

const vazio = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const texto = (v) => (vazio(v) ? null : String(v).trim());

/** Campos aceitos do corpo da requisição → colunas da tabela. */
const CAMPOS = {
  nome: 'nome', cpf: 'cpf', rg: 'rg', dataNascimento: 'data_nascimento', sexo: 'sexo',
  email: 'email', telefone: 'telefone', objetivo: 'objetivo', cep: 'cep', endereco: 'endereco',
  numero: 'numero', complemento: 'complemento', bairro: 'bairro', cidade: 'cidade', uf: 'uf',
  observacao: 'observacao', status: 'status', vip: 'vip', origem: 'origem', wellhubId: 'wellhub_id',
  temResponsavel: 'tem_responsavel', responsavelNome: 'responsavel_nome',
  responsavelCpf: 'responsavel_cpf', responsavelTelefone: 'responsavel_telefone',
  professor: 'professor', consultor: 'consultor',
};

/**
 * Valida e normaliza o payload de cliente.
 * @param {object} body
 * @param {{parcial?: boolean}} opts  parcial=true em updates (campos ausentes são ignorados)
 * @returns {{dados: Record<string, any>, erros: Record<string,string>}}
 */
export function validarCliente(body = {}, { parcial = false } = {}) {
  const erros = {};
  const dados = {};
  for (const [campo, coluna] of Object.entries(CAMPOS)) {
    if (!(campo in body)) continue;
    dados[coluna] = body[campo];
  }

  for (const k of ['nome', 'rg', 'email', 'objetivo', 'endereco', 'numero', 'complemento', 'bairro',
    'cidade', 'observacao', 'wellhub_id', 'responsavel_nome', 'professor', 'consultor']) {
    if (k in dados) dados[k] = texto(dados[k]);
  }
  for (const k of ['cpf', 'telefone', 'cep', 'responsavel_cpf', 'responsavel_telefone']) {
    if (k in dados) dados[k] = soDigitos(dados[k]) || null;
  }
  if ('uf' in dados) dados.uf = texto(dados.uf)?.toUpperCase() ?? null;
  if ('sexo' in dados) dados.sexo = texto(dados.sexo);
  if ('vip' in dados) dados.vip = dados.vip ? 1 : 0;
  if ('tem_responsavel' in dados) dados.tem_responsavel = dados.tem_responsavel ? 1 : 0;
  if ('data_nascimento' in dados) dados.data_nascimento = texto(dados.data_nascimento);

  if (!parcial || 'nome' in dados) {
    if (!dados.nome) erros.nome = 'Informe o nome.';
    else if (dados.nome.length > 120) erros.nome = 'Nome muito longo.';
  }
  if (dados.cpf && !cpfValido(dados.cpf)) erros.cpf = 'CPF inválido.';
  if (dados.responsavel_cpf && !cpfValido(dados.responsavel_cpf)) erros.responsavelCpf = 'CPF do responsável inválido.';
  if (dados.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) erros.email = 'E-mail inválido.';
  if (dados.telefone && (dados.telefone.length < 10 || dados.telefone.length > 11)) erros.telefone = 'Telefone deve ter DDD + número.';
  if (dados.cep && dados.cep.length !== 8) erros.cep = 'CEP deve ter 8 dígitos.';
  if (dados.uf && !/^[A-Z]{2}$/.test(dados.uf)) erros.uf = 'UF inválida.';
  if (dados.sexo && !SEXO.includes(dados.sexo)) erros.sexo = 'Sexo deve ser F ou M.';
  if ('status' in dados && !STATUS.includes(dados.status)) erros.status = `Situação deve ser uma de: ${STATUS.join(', ')}.`;
  if ('origem' in dados && !ORIGEM.includes(dados.origem)) erros.origem = `Origem deve ser uma de: ${ORIGEM.join(', ')}.`;
  if (dados.data_nascimento) {
    const dt = new Date(`${dados.data_nascimento}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.data_nascimento) || Number.isNaN(dt.getTime())) erros.dataNascimento = 'Data inválida (AAAA-MM-DD).';
    else if (dt > new Date()) erros.dataNascimento = 'Data de nascimento no futuro.';
  }
  if (dados.tem_responsavel === 1 && !dados.responsavel_nome && !parcial) erros.responsavelNome = 'Informe o nome do responsável.';

  return { dados, erros };
}

export function validarContato(body = {}) {
  const erros = {};
  const tipo = texto(body.tipo);
  const descricao = texto(body.descricao);
  if (!tipo || !TIPO_CONTATO.includes(tipo)) erros.tipo = `Tipo deve ser um de: ${TIPO_CONTATO.join(', ')}.`;
  if (!descricao) erros.descricao = 'Informe o contato.';
  return { dados: { tipo, descricao }, erros };
}
