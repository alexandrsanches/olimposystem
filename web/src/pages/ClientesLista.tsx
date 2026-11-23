import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, type FiltroClientes } from '../api';
import { Avatar, Modal, StatusChip, Vazio } from '../components/ui';
import { dataBr, mascaraCpf, mascaraTelefone } from '../format';
import { ORIGENS, STATUS, type Cliente, type Pagina, type Status } from '../types';

type Visualizacao = 'lista' | 'grade';
const CHAVE_VIS = 'olimpo.clientes.visualizacao';

function lerVis(): Visualizacao {
  try { return localStorage.getItem(CHAVE_VIS) === 'grade' ? 'grade' : 'lista'; } catch { return 'lista'; }
}

function useDebounce<T>(valor: T, ms = 300) {
  const [v, setV] = useState(valor);
  useEffect(() => { const t = setTimeout(() => setV(valor), ms); return () => clearTimeout(t); }, [valor, ms]);
  return v;
}

const rotuloOrigem = (o: string) => ORIGENS.find((x) => x.valor === o)?.rotulo ?? o;

export default function ClientesLista() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [busca, setBusca] = useState(sp.get('busca') ?? '');
  const buscaDeb = useDebounce(busca);
  const [vis, setVis] = useState<Visualizacao>(lerVis);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [dados, setDados] = useState<Pagina<Cliente> | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [menuAberto, setMenuAberto] = useState<number | null>(null);
  const [confirmar, setConfirmar] = useState<{ tipo: 'remover' | 'lgpd'; cliente: Cliente } | null>(null);
  const [aviso, setAviso] = useState('');

  const filtro: FiltroClientes = useMemo(() => ({
    busca: buscaDeb || undefined,
    status: sp.get('status')?.split(',').filter(Boolean),
    origem: sp.get('origem')?.split(',').filter(Boolean),
    sexo: sp.get('sexo') || undefined,
    vip: sp.get('vip') === 'true',
    removidos: sp.get('removidos') === 'true',
    page: Number(sp.get('page')) || 1,
    limit: 20,
    sort: sp.get('sort') || 'nome',
    dir: (sp.get('dir') as 'asc' | 'desc') || 'asc',
  }), [sp, buscaDeb]);

  const atualizar = useCallback((mudancas: Record<string, string | null>, manterPagina = false) => {
    const novo = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(mudancas)) (v ? novo.set(k, v) : novo.delete(k));
    if (!manterPagina) novo.delete('page');
    setSp(novo, { replace: true });
  }, [sp, setSp]);

  useEffect(() => {
    if ((sp.get('busca') ?? '') !== buscaDeb) atualizar({ busca: buscaDeb || null });
  }, [buscaDeb]); // eslint-disable-line react-hooks/exhaustive-deps

  const carregar = useCallback(() => {
    setCarregando(true);
    setErro('');
    api.listarClientes(filtro)
      .then(setDados)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [filtro]);
  useEffect(carregar, [carregar]);

  useEffect(() => {
    const fechar = () => setMenuAberto(null);
    document.addEventListener('click', fechar);
    return () => document.removeEventListener('click', fechar);
  }, []);

  const mudarVis = (v: Visualizacao) => {
    setVis(v);
    try { localStorage.setItem(CHAVE_VIS, v); } catch { /* sem armazenamento */ }
  };

  const ordenar = (campo: string) => {
    const dir = filtro.sort === campo && filtro.dir === 'asc' ? 'desc' : 'asc';
    atualizar({ sort: campo, dir }, true);
  };

  const alternarLista = (chave: 'status' | 'origem', valor: string) => {
    const atual = new Set(filtro[chave] ?? []);
    atual.has(valor) ? atual.delete(valor) : atual.add(valor);
    atualizar({ [chave]: [...atual].join(',') || null });
  };

  const executarConfirmacao = async () => {
    if (!confirmar) return;
    const { tipo, cliente } = confirmar;
    try {
      if (tipo === 'remover') await api.removerCliente(cliente.id);
      else await api.anonimizarCliente(cliente.id);
      setAviso(tipo === 'remover' ? `${cliente.nome} foi movido para Removidos.` : 'Dados pessoais apagados (LGPD).');
      carregar();
    } catch (e) {
      setAviso((e as Error).message);
    }
    setConfirmar(null);
  };

  const restaurar = async (c: Cliente) => {
    await api.restaurarCliente(c.id).catch((e) => setAviso(e.message));
    setAviso(`${c.nome} foi restaurado.`);
    carregar();
  };

  const totalPaginas = dados ? Math.max(1, Math.ceil(dados.total / dados.limit)) : 1;
  const contagem = dados?.contagemPorStatus ?? {};
  const totalGeral = Object.values(contagem).reduce((a, b) => a + (b ?? 0), 0);
  const qtdFiltrosExtras = (filtro.origem?.length ?? 0) + (filtro.sexo ? 1 : 0) + (filtro.vip ? 1 : 0) + (filtro.removidos ? 1 : 0);

  const Cabecalho = ({ campo, children, className }: { campo?: string; children: React.ReactNode; className?: string }) => (
    <th className={className}>
      {campo ? (
        <button className="th-ordenar" onClick={() => ordenar(campo)}>
          {children}
          {filtro.sort === campo && <span aria-hidden>{filtro.dir === 'asc' ? ' ▲' : ' ▼'}</span>}
        </button>
      ) : children}
    </th>
  );

  const menuAcoes = (c: Cliente) => (
    <div className="menu-wrap" onClick={(e) => e.stopPropagation()}>
      <button className="btn-icone" aria-label={`Ações para ${c.nome}`} onClick={() => setMenuAberto(menuAberto === c.id ? null : c.id)}>⋮</button>
      {menuAberto === c.id && (
        <div className="menu" role="menu">
          <Link role="menuitem" to={`/clientes/${c.id}`}>Ver perfil</Link>
          <a role="menuitem" href={`/clientes/${c.id}`} target="_blank" rel="noreferrer">Abrir em nova guia</a>
          {!c.anonimizado && <Link role="menuitem" to={`/clientes/${c.id}/editar`}>Editar</Link>}
          {c.removido
            ? <button role="menuitem" onClick={() => restaurar(c)}>Restaurar</button>
            : <button role="menuitem" onClick={() => setConfirmar({ tipo: 'remover', cliente: c })}>Remover</button>}
          {!c.anonimizado && (
            <button role="menuitem" className="perigo" onClick={() => setConfirmar({ tipo: 'lgpd', cliente: c })}>Remover dados (LGPD)</button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="pagina">
      <header className="pagina-topo">
        <div>
          <h1>Clientes</h1>
          <p className="sub">{totalGeral} cadastrados · {contagem.Ativo ?? 0} ativos</p>
        </div>
        <button className="btn btn-primario" onClick={() => nav('/clientes/novo')}>+ Novo cliente</button>
      </header>

      <div className="abas-status" role="tablist" aria-label="Filtrar por situação">
        <button role="tab" aria-selected={!filtro.status?.length} className={!filtro.status?.length ? 'ativa' : ''} onClick={() => atualizar({ status: null })}>
          Todos <span className="contador">{totalGeral}</span>
        </button>
        {STATUS.map((s) => (
          <button key={s} role="tab" aria-selected={filtro.status?.includes(s)} className={filtro.status?.includes(s) ? 'ativa' : ''} onClick={() => alternarLista('status', s)}>
            {s} <span className="contador">{contagem[s as Status] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="barra-ferramentas">
        <input
          className="busca"
          type="search"
          placeholder="Buscar por nome, CPF, e-mail, telefone ou ID Wellhub"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Busca geral"
        />
        <button className={`btn ${qtdFiltrosExtras ? 'btn-destaque' : ''}`} onClick={() => setFiltrosAbertos((v) => !v)} aria-expanded={filtrosAbertos}>
          Filtros{qtdFiltrosExtras ? ` (${qtdFiltrosExtras})` : ''}
        </button>
        <div className="alternar-vis" role="group" aria-label="Visualização">
          <button className={vis === 'lista' ? 'ativa' : ''} onClick={() => mudarVis('lista')}>Lista</button>
          <button className={vis === 'grade' ? 'ativa' : ''} onClick={() => mudarVis('grade')}>Grade</button>
        </div>
      </div>

      {filtrosAbertos && (
        <div className="painel-filtros">
          <fieldset>
            <legend>Origem</legend>
            {ORIGENS.map((o) => (
              <label key={o.valor} className="check">
                <input type="checkbox" checked={filtro.origem?.includes(o.valor) ?? false} onChange={() => alternarLista('origem', o.valor)} />
                {o.rotulo}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Sexo</legend>
            {[['', 'Todos'], ['F', 'Feminino'], ['M', 'Masculino']].map(([v, r]) => (
              <label key={v} className="check">
                <input type="radio" name="sexo" checked={(filtro.sexo ?? '') === v} onChange={() => atualizar({ sexo: v || null })} />
                {r}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Outros</legend>
            <label className="check"><input type="checkbox" checked={filtro.vip} onChange={(e) => atualizar({ vip: e.target.checked ? 'true' : null })} /> Somente VIPs</label>
            <label className="check"><input type="checkbox" checked={filtro.removidos} onChange={(e) => atualizar({ removidos: e.target.checked ? 'true' : null })} /> Ver removidos</label>
          </fieldset>
          <button className="btn btn-link" onClick={() => setSp(new URLSearchParams(), { replace: true })}>Limpar filtros</button>
        </div>
      )}

      {aviso && <div className="aviso" role="status" onClick={() => setAviso('')}>{aviso}</div>}
      {erro && <div className="aviso aviso-erro" role="alert">{erro} <button className="btn btn-link" onClick={carregar}>Tentar novamente</button></div>}

      {!erro && dados && dados.items.length === 0 && !carregando && (
        <Vazio titulo="Nenhum cliente encontrado">
          {filtro.busca || filtro.status?.length || qtdFiltrosExtras ? 'Ajuste a busca ou os filtros.' : 'Cadastre o primeiro cliente para começar.'}
        </Vazio>
      )}

      {dados && dados.items.length > 0 && vis === 'lista' && (
        <div className={`tabela-wrap ${carregando ? 'carregando' : ''}`}>
          <table className="tabela">
            <thead>
              <tr>
                <Cabecalho campo="nome">Nome</Cabecalho>
                <Cabecalho campo="status">Situação</Cabecalho>
                <Cabecalho campo="idade" className="col-opc">Idade</Cabecalho>
                <Cabecalho campo="sexo" className="col-opc">Sexo</Cabecalho>
                <Cabecalho className="col-opc">Contato</Cabecalho>
                <Cabecalho className="col-opc">Origem</Cabecalho>
                <Cabecalho campo="ultimoAcesso" className="col-opc">Último acesso</Cabecalho>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {dados.items.map((c) => (
                <tr key={c.id} onDoubleClick={() => nav(`/clientes/${c.id}`)} className={c.removido ? 'linha-removida' : ''}>
                  <td>
                    <Link to={`/clientes/${c.id}`} className="cel-nome">
                      <Avatar nome={c.nome} />
                      <span>
                        <span className="nome">{c.nome}{c.vip && <span className="vip" title="VIP"> ★</span>}</span>
                        <span className="detalhe">{c.cpf ? mascaraCpf(c.cpf) : `#${c.id}`}</span>
                      </span>
                    </Link>
                  </td>
                  <td><StatusChip status={c.status} /></td>
                  <td className="col-opc">{c.idade ?? '—'}</td>
                  <td className="col-opc">{c.sexo === 'F' ? 'Fem.' : c.sexo === 'M' ? 'Masc.' : '—'}</td>
                  <td className="col-opc">{c.telefone ? mascaraTelefone(c.telefone) : c.email ?? '—'}</td>
                  <td className="col-opc">
                    <span className={`tag tag-${c.origem.toLowerCase()}`}>{rotuloOrigem(c.origem)}</span>
                  </td>
                  <td className="col-opc">{dataBr(c.ultimoAcesso)}</td>
                  <td className="col-acoes">{menuAcoes(c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dados && dados.items.length > 0 && vis === 'grade' && (
        <div className={`grade ${carregando ? 'carregando' : ''}`}>
          {dados.items.map((c) => (
            <article key={c.id} className={`cartao-cliente ${c.removido ? 'linha-removida' : ''}`}>
              <div className="cartao-topo">
                <StatusChip status={c.status} />
                {menuAcoes(c)}
              </div>
              <Link to={`/clientes/${c.id}`} className="cartao-corpo">
                <Avatar nome={c.nome} tamanho={64} />
                <strong>{c.nome}{c.vip && <span className="vip"> ★</span>}</strong>
                <span className="detalhe">{c.idade != null ? `${c.idade} anos · ` : ''}{rotuloOrigem(c.origem)}</span>
              </Link>
            </article>
          ))}
        </div>
      )}

      {dados && dados.total > dados.limit && (
        <nav className="paginacao" aria-label="Paginação">
          <button className="btn" disabled={filtro.page === 1} onClick={() => atualizar({ page: String((filtro.page ?? 1) - 1) }, true)}>Anterior</button>
          <span>Página {filtro.page} de {totalPaginas} · {dados.total} clientes</span>
          <button className="btn" disabled={(filtro.page ?? 1) >= totalPaginas} onClick={() => atualizar({ page: String((filtro.page ?? 1) + 1) }, true)}>Próxima</button>
        </nav>
      )}

      <Modal
        aberto={!!confirmar}
        titulo={confirmar?.tipo === 'lgpd' ? 'Remover dados pessoais (LGPD)' : 'Remover cliente'}
        onFechar={() => setConfirmar(null)}
        acoes={<>
          <button className="btn" onClick={() => setConfirmar(null)}>Cancelar</button>
          <button className="btn btn-perigo" onClick={executarConfirmacao}>{confirmar?.tipo === 'lgpd' ? 'Apagar dados' : 'Remover'}</button>
        </>}
      >
        {confirmar?.tipo === 'lgpd' ? (
          <p>Os dados pessoais de <strong>{confirmar.cliente.nome}</strong> serão apagados de forma <strong>irreversível</strong>. O registro fica apenas para histórico financeiro e de acessos.</p>
        ) : (
          <p><strong>{confirmar?.cliente.nome}</strong> sairá da lista e poderá ser restaurado em “Ver removidos”.</p>
        )}
      </Modal>
    </div>
  );
}
