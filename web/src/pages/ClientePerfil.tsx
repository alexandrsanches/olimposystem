import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { Avatar, Modal, StatusChip, Vazio } from '../components/ui';
import { dataBr, mascaraCep, mascaraCpf, mascaraTelefone } from '../format';
import { ORIGENS, STATUS, TIPOS_CONTATO, type Resumo, type Status } from '../types';

const ABAS = [
  { path: '', rotulo: 'Resumo' },
  { path: 'comunicacao', rotulo: 'Comunicação' },
  { path: 'vendas', rotulo: 'Vendas' },
  { path: 'contratos', rotulo: 'Contratos' },
  { path: 'financeiro', rotulo: 'Financeiro' },
  { path: 'treinos', rotulo: 'Treinos' },
  { path: 'avaliacoes', rotulo: 'Avaliações físicas' },
  { path: 'evolucoes', rotulo: 'Evoluções' },
];

export default function ClientePerfil() {
  const { id } = useParams();
  const nav = useNavigate();
  const [r, setR] = useState<Resumo | null>(null);
  const [erro, setErro] = useState('');
  const [mudarStatus, setMudarStatus] = useState(false);

  const carregar = useCallback(() => {
    api.resumoCliente(Number(id)).then(setR).catch((e) => setErro(e.message));
  }, [id]);
  useEffect(carregar, [carregar]);

  if (erro) return <div className="pagina"><Vazio titulo="Não foi possível abrir o cliente">{erro}</Vazio><Link to="/clientes">Voltar para a lista</Link></div>;
  if (!r) return <div className="pagina"><p>Carregando…</p></div>;
  const c = r.cliente;

  const alterarStatus = async (s: Status) => {
    await api.alterarCliente(c.id, { status: s }).catch((e) => setErro(e.message));
    setMudarStatus(false);
    carregar();
  };

  return (
    <div className="pagina">
      <button className="btn btn-link voltar" onClick={() => nav('/clientes')}>← Clientes</button>
      <header className="perfil-topo">
        <Avatar nome={c.nome} tamanho={72} />
        <div className="perfil-info">
          <h1>{c.nome}{c.vip && <span className="vip" title="VIP"> ★</span>}</h1>
          <div className="perfil-meta">
            <button className="chip-botao" onClick={() => setMudarStatus(true)} disabled={c.anonimizado} title="Alterar situação">
              <StatusChip status={c.status} />
            </button>
            <span>#{c.id}</span>
            {c.idade != null && <span>{c.idade} anos</span>}
            <span>Cliente há {r.diasDeCasa} dia{r.diasDeCasa === 1 ? '' : 's'}</span>
            {c.origem === 'Wellhub' && <span className="tag tag-wellhub">Wellhub</span>}
            {c.removido && <span className="tag tag-removido">Removido</span>}
          </div>
        </div>
        {!c.anonimizado && <Link className="btn btn-primario" to={`/clientes/${c.id}/editar`}>Editar cadastro</Link>}
      </header>

      {r.aniversarioHoje && <div className="aviso">🎂 Hoje é aniversário de {c.nome.split(' ')[0]}!</div>}

      <nav className="abas" aria-label="Seções do cliente">
        {ABAS.map((a) => (
          <NavLink key={a.rotulo} to={a.path ? `/clientes/${c.id}/${a.path}` : `/clientes/${c.id}`} end className={({ isActive }) => (isActive ? 'ativa' : '')}>
            {a.rotulo}
          </NavLink>
        ))}
      </nav>

      <Routes>
        <Route index element={<AbaResumo r={r} />} />
        <Route path="*" element={<Vazio titulo="Em construção">Esta aba entra nas próximas etapas (contratos, vendas, financeiro, treinos…).</Vazio>} />
      </Routes>

      <Modal aberto={mudarStatus} titulo="Alterar situação" onFechar={() => setMudarStatus(false)}
        acoes={<button className="btn" onClick={() => setMudarStatus(false)}>Fechar</button>}>
        <div className="opcoes-status">
          {STATUS.map((s) => (
            <button key={s} className={`btn ${s === c.status ? 'btn-destaque' : ''}`} onClick={() => alterarStatus(s)}>{s}</button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return <div className="linha-dado"><dt>{rotulo}</dt><dd>{valor || '—'}</dd></div>;
}

function AbaResumo({ r }: { r: Resumo }) {
  const c = r.cliente;
  const endereco = [c.endereco && `${c.endereco}${c.numero ? `, ${c.numero}` : ''}`, c.complemento, c.bairro, c.cidade && `${c.cidade}${c.uf ? `/${c.uf}` : ''}`, c.cep && mascaraCep(c.cep)]
    .filter(Boolean).join(' · ');
  return (
    <div className="resumo-grid">
      {r.pendencias.length > 0 && !c.anonimizado && (
        <section className="cartao cartao-alerta">
          <h3>Cadastro incompleto</h3>
          <ul>{r.pendencias.map((p) => <li key={p}>{p}</li>)}</ul>
          <Link to={`/clientes/${c.id}/editar`}>Completar cadastro →</Link>
        </section>
      )}
      <section className="cartao">
        <h3>Dados pessoais</h3>
        <dl>
          <Linha rotulo="CPF" valor={c.cpf && mascaraCpf(c.cpf)} />
          <Linha rotulo="RG" valor={c.rg} />
          <Linha rotulo="Nascimento" valor={c.dataNascimento && `${dataBr(c.dataNascimento)}${c.idade != null ? ` (${c.idade} anos)` : ''}`} />
          <Linha rotulo="Sexo" valor={c.sexo === 'F' ? 'Feminino' : c.sexo === 'M' ? 'Masculino' : null} />
          <Linha rotulo="Objetivo" valor={c.objetivo} />
        </dl>
      </section>
      <section className="cartao">
        <h3>Contato</h3>
        <dl>
          <Linha rotulo="Celular" valor={c.telefone && <a href={`https://wa.me/55${c.telefone}`} target="_blank" rel="noreferrer">{mascaraTelefone(c.telefone)}</a>} />
          <Linha rotulo="E-mail" valor={c.email && <a href={`mailto:${c.email}`}>{c.email}</a>} />
          {r.contatos.map((k) => (
            <Linha key={k.id} rotulo={TIPOS_CONTATO.find((t) => t.valor === k.tipo)?.rotulo ?? k.tipo} valor={k.descricao} />
          ))}
          <Linha rotulo="Endereço" valor={endereco} />
        </dl>
      </section>
      <section className="cartao">
        <h3>Relacionamento</h3>
        <dl>
          <Linha rotulo="Origem" valor={ORIGENS.find((o) => o.valor === c.origem)?.rotulo} />
          <Linha rotulo="ID Wellhub" valor={c.wellhubId} />
          <Linha rotulo="Professor" valor={c.professor} />
          <Linha rotulo="Consultor" valor={c.consultor} />
          <Linha rotulo="Cadastrado em" valor={dataBr(c.criadoEm)} />
          <Linha rotulo="Último acesso" valor={dataBr(c.ultimoAcesso)} />
        </dl>
      </section>
      {c.temResponsavel && (
        <section className="cartao">
          <h3>Responsável</h3>
          <dl>
            <Linha rotulo="Nome" valor={c.responsavelNome} />
            <Linha rotulo="CPF" valor={c.responsavelCpf && mascaraCpf(c.responsavelCpf)} />
            <Linha rotulo="Telefone" valor={c.responsavelTelefone && mascaraTelefone(c.responsavelTelefone)} />
          </dl>
        </section>
      )}
      {c.observacao && (
        <section className="cartao cartao-largo">
          <h3>Observações</h3>
          <p className="observacao">{c.observacao}</p>
        </section>
      )}
    </div>
  );
}
