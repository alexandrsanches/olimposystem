import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiErro } from '../api';
import { Campo } from '../components/ui';
import { cpfValido, digitos, mascaraCep, mascaraCpf, mascaraTelefone } from '../format';
import { ORIGENS, STATUS, TIPOS_CONTATO, type Cliente, type Contato, type TipoContato } from '../types';

type Form = Omit<Cliente, 'id' | 'anonimizado' | 'removido' | 'removidoEm' | 'criadoEm' | 'atualizadoEm' | 'idade' | 'ultimoAcesso' | 'contatos'>;

const VAZIO: Form = {
  nome: '', cpf: '', rg: '', dataNascimento: '', sexo: null, email: '', telefone: '', objetivo: '',
  cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', observacao: '',
  status: 'Novo', vip: false, origem: 'Balcao', wellhubId: '', temResponsavel: false,
  responsavelNome: '', responsavelCpf: '', responsavelTelefone: '', professor: '', consultor: '',
};

const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');

function validarLocal(f: Form) {
  const e: Record<string, string> = {};
  if (!f.nome?.trim()) e.nome = 'Informe o nome.';
  if (f.cpf && !cpfValido(f.cpf)) e.cpf = 'CPF inválido.';
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'E-mail inválido.';
  const tel = digitos(f.telefone);
  if (tel && (tel.length < 10 || tel.length > 11)) e.telefone = 'Informe DDD + número.';
  if (f.temResponsavel && !f.responsavelNome?.trim()) e.responsavelNome = 'Informe o nome do responsável.';
  if (f.responsavelCpf && !cpfValido(f.responsavelCpf)) e.responsavelCpf = 'CPF inválido.';
  return e;
}

export default function ClienteForm() {
  const { id } = useParams();
  const editando = !!id;
  const nav = useNavigate();
  const [f, setF] = useState<Form>(VAZIO);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [novoContato, setNovoContato] = useState<{ tipo: TipoContato; descricao: string }>({ tipo: 'Celular', descricao: '' });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(editando);
  const [buscandoCep, setBuscandoCep] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.obterCliente(Number(id))
      .then((c) => {
        const base = { ...VAZIO };
        for (const k of Object.keys(VAZIO) as (keyof Form)[]) (base as Record<string, unknown>)[k] = c[k] ?? VAZIO[k];
        setF(base);
        setContatos(c.contatos ?? []);
      })
      .catch((e) => setMensagem(e.message))
      .finally(() => setCarregando(false));
  }, [id]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    if (erros[k]) setErros(({ [k]: _, ...resto }) => resto);
  };

  const buscarCep = async () => {
    const cep = digitos(f.cep);
    if (cep.length !== 8) return;
    setBuscandoCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await r.json();
      if (d.erro) { setErros((e) => ({ ...e, cep: 'CEP não encontrado.' })); return; }
      setF((x) => ({ ...x, endereco: d.logradouro || x.endereco, bairro: d.bairro || x.bairro, cidade: d.localidade || x.cidade, uf: d.uf || x.uf }));
    } catch {
      // Consulta de CEP é opcional: segue com preenchimento manual.
    } finally {
      setBuscandoCep(false);
    }
  };

  const adicionarContato = async () => {
    if (!novoContato.descricao.trim()) return;
    if (editando) {
      try {
        const c = await api.adicionarContato(Number(id), novoContato);
        setContatos((l) => [...l, c]);
      } catch (e) { setMensagem((e as Error).message); return; }
    } else {
      setContatos((l) => [...l, { id: -Date.now(), ...novoContato }]);
    }
    setNovoContato({ tipo: novoContato.tipo, descricao: '' });
  };

  const removerContato = async (c: Contato) => {
    if (editando && c.id > 0) await api.removerContato(Number(id), c.id).catch(() => undefined);
    setContatos((l) => l.filter((x) => x.id !== c.id));
  };

  const salvar = async (ev: FormEvent) => {
    ev.preventDefault();
    const locais = validarLocal(f);
    setErros(locais);
    if (Object.keys(locais).length) { setMensagem('Verifique os campos destacados.'); return; }
    setSalvando(true);
    setMensagem('');
    try {
      const payload = { ...f, dataNascimento: f.dataNascimento || null, sexo: f.sexo || null };
      const salvo = editando ? await api.alterarCliente(Number(id), payload) : await api.criarCliente(payload);
      if (!editando) {
        for (const c of contatos) await api.adicionarContato(salvo.id, { tipo: c.tipo, descricao: c.descricao });
      }
      nav(`/clientes/${salvo.id}`);
    } catch (e) {
      if (e instanceof ApiErro && e.erros) setErros(e.erros);
      setMensagem((e as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) return <div className="pagina"><p>Carregando…</p></div>;

  return (
    <form className="pagina form-cliente" onSubmit={salvar} noValidate>
      <header className="pagina-topo">
        <div>
          <button type="button" className="btn btn-link voltar" onClick={() => nav(-1)}>← Voltar</button>
          <h1>{editando ? 'Editar cliente' : 'Novo cliente'}</h1>
        </div>
        <div className="acoes-topo">
          <button type="button" className="btn" onClick={() => nav(-1)}>Cancelar</button>
          <button type="submit" className="btn btn-primario" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </header>

      {mensagem && <div className="aviso aviso-erro" role="alert">{mensagem}</div>}

      <section className="secao">
        <h2>Dados principais</h2>
        <div className="grid-campos">
          <Campo rotulo="Nome *" erro={erros.nome} largura={2}>
            <input value={f.nome} onChange={(e) => set('nome', e.target.value)} autoFocus maxLength={120} />
          </Campo>
          <Campo rotulo="CPF" erro={erros.cpf}>
            <input value={mascaraCpf(f.cpf)} onChange={(e) => set('cpf', digitos(e.target.value))} inputMode="numeric" placeholder="000.000.000-00" />
          </Campo>
          <Campo rotulo="RG">
            <input value={f.rg ?? ''} onChange={(e) => set('rg', e.target.value)} />
          </Campo>
          <Campo rotulo="Data de nascimento" erro={erros.dataNascimento}>
            <input type="date" value={f.dataNascimento ?? ''} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set('dataNascimento', e.target.value)} />
          </Campo>
          <Campo rotulo="Sexo" erro={erros.sexo}>
            <select value={f.sexo ?? ''} onChange={(e) => set('sexo', (e.target.value || null) as Form['sexo'])}>
              <option value="">Não informado</option>
              <option value="F">Feminino</option>
              <option value="M">Masculino</option>
            </select>
          </Campo>
          <Campo rotulo="Celular" erro={erros.telefone}>
            <input value={mascaraTelefone(f.telefone)} onChange={(e) => set('telefone', digitos(e.target.value))} inputMode="tel" placeholder="(00) 00000-0000" />
          </Campo>
          <Campo rotulo="E-mail" erro={erros.email}>
            <input type="email" value={f.email ?? ''} onChange={(e) => set('email', e.target.value)} />
          </Campo>
          <Campo rotulo="Objetivo" largura={2}>
            <input value={f.objetivo ?? ''} onChange={(e) => set('objetivo', e.target.value)} placeholder="Ex.: Hipertrofia, emagrecimento…" />
          </Campo>
        </div>
      </section>

      <section className="secao">
        <h2>Situação e vínculos</h2>
        <div className="grid-campos">
          <Campo rotulo="Situação" erro={erros.status}>
            <select value={f.status} onChange={(e) => set('status', e.target.value as Form['status'])}>
              {STATUS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Origem" erro={erros.origem}>
            <select value={f.origem} onChange={(e) => set('origem', e.target.value as Form['origem'])}>
              {ORIGENS.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
            </select>
          </Campo>
          <Campo rotulo="ID Wellhub" erro={erros.wellhubId}>
            <input value={f.wellhubId ?? ''} onChange={(e) => set('wellhubId', e.target.value)} placeholder="Vinculado no 1º check-in" />
          </Campo>
          <label className="campo check-campo">
            <input type="checkbox" checked={f.vip} onChange={(e) => set('vip', e.target.checked)} /> Cliente VIP
          </label>
          <Campo rotulo="Professor responsável">
            <input value={f.professor ?? ''} onChange={(e) => set('professor', e.target.value)} />
          </Campo>
          <Campo rotulo="Consultor">
            <input value={f.consultor ?? ''} onChange={(e) => set('consultor', e.target.value)} />
          </Campo>
        </div>
      </section>

      <section className="secao">
        <h2>Endereço</h2>
        <div className="grid-campos">
          <Campo rotulo={buscandoCep ? 'CEP (buscando…)' : 'CEP'} erro={erros.cep}>
            <input value={mascaraCep(f.cep)} onChange={(e) => set('cep', digitos(e.target.value))} onBlur={buscarCep} inputMode="numeric" placeholder="00000-000" />
          </Campo>
          <Campo rotulo="Logradouro" largura={2}>
            <input value={f.endereco ?? ''} onChange={(e) => set('endereco', e.target.value)} />
          </Campo>
          <Campo rotulo="Número">
            <input value={f.numero ?? ''} onChange={(e) => set('numero', e.target.value)} />
          </Campo>
          <Campo rotulo="Complemento">
            <input value={f.complemento ?? ''} onChange={(e) => set('complemento', e.target.value)} />
          </Campo>
          <Campo rotulo="Bairro">
            <input value={f.bairro ?? ''} onChange={(e) => set('bairro', e.target.value)} />
          </Campo>
          <Campo rotulo="Cidade">
            <input value={f.cidade ?? ''} onChange={(e) => set('cidade', e.target.value)} />
          </Campo>
          <Campo rotulo="UF" erro={erros.uf}>
            <select value={f.uf ?? ''} onChange={(e) => set('uf', e.target.value)}>
              <option value="" />
              {UFS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </Campo>
        </div>
      </section>

      <section className="secao">
        <h2>Responsável</h2>
        <label className="check">
          <input type="checkbox" checked={f.temResponsavel} onChange={(e) => set('temResponsavel', e.target.checked)} />
          Cliente possui responsável (menor de idade ou dependente)
        </label>
        {f.temResponsavel && (
          <div className="grid-campos">
            <Campo rotulo="Nome do responsável *" erro={erros.responsavelNome} largura={2}>
              <input value={f.responsavelNome ?? ''} onChange={(e) => set('responsavelNome', e.target.value)} />
            </Campo>
            <Campo rotulo="CPF do responsável" erro={erros.responsavelCpf}>
              <input value={mascaraCpf(f.responsavelCpf)} onChange={(e) => set('responsavelCpf', digitos(e.target.value))} inputMode="numeric" />
            </Campo>
            <Campo rotulo="Telefone do responsável">
              <input value={mascaraTelefone(f.responsavelTelefone)} onChange={(e) => set('responsavelTelefone', digitos(e.target.value))} inputMode="tel" />
            </Campo>
          </div>
        )}
      </section>

      <section className="secao">
        <h2>Mais contatos</h2>
        {contatos.length > 0 && (
          <ul className="lista-contatos">
            {contatos.map((c) => (
              <li key={c.id}>
                <span className="tag">{TIPOS_CONTATO.find((t) => t.valor === c.tipo)?.rotulo}</span>
                <span>{c.descricao}</span>
                <button type="button" className="btn btn-link" onClick={() => removerContato(c)}>Remover</button>
              </li>
            ))}
          </ul>
        )}
        <div className="linha-contato">
          <select value={novoContato.tipo} onChange={(e) => setNovoContato((n) => ({ ...n, tipo: e.target.value as TipoContato }))} aria-label="Tipo de contato">
            {TIPOS_CONTATO.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
          </select>
          <input
            value={novoContato.descricao}
            onChange={(e) => setNovoContato((n) => ({ ...n, descricao: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarContato(); } }}
            placeholder="Telefone, e-mail ou outro contato"
            aria-label="Contato"
          />
          <button type="button" className="btn" onClick={adicionarContato}>Adicionar</button>
        </div>
      </section>

      <section className="secao">
        <h2>Observações</h2>
        <textarea rows={4} value={f.observacao ?? ''} onChange={(e) => set('observacao', e.target.value)} placeholder="Restrições médicas, preferências, combinados…" />
      </section>
    </form>
  );
}
