import type { Cliente, Contato, Pagina, Resumo } from './types';

export class ApiErro extends Error {
  constructor(public status: number, mensagem: string, public erros?: Record<string, string>) {
    super(mensagem);
  }
}

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${url}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const dados = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiErro(res.status, dados.mensagem || 'Falha na requisição.', dados.erros);
  return dados as T;
}

export interface FiltroClientes {
  busca?: string;
  status?: string[];
  origem?: string[];
  sexo?: string;
  vip?: boolean;
  removidos?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
  dir?: 'asc' | 'desc';
}

export const api = {
  listarClientes(f: FiltroClientes) {
    const p = new URLSearchParams();
    if (f.busca) p.set('busca', f.busca);
    if (f.status?.length) p.set('status', f.status.join(','));
    if (f.origem?.length) p.set('origem', f.origem.join(','));
    if (f.sexo) p.set('sexo', f.sexo);
    if (f.vip) p.set('vip', 'true');
    if (f.removidos) p.set('removidos', 'true');
    p.set('page', String(f.page ?? 1));
    p.set('limit', String(f.limit ?? 25));
    if (f.sort) p.set('sort', f.sort);
    if (f.dir) p.set('dir', f.dir);
    return req<Pagina<Cliente>>('GET', `/clientes?${p}`);
  },
  obterCliente: (id: number) => req<Cliente>('GET', `/clientes/${id}`),
  resumoCliente: (id: number) => req<Resumo>('GET', `/clientes/${id}/resumo`),
  criarCliente: (c: Partial<Cliente>) => req<Cliente>('POST', '/clientes', c),
  alterarCliente: (id: number, c: Partial<Cliente>) => req<Cliente>('PUT', `/clientes/${id}`, c),
  removerCliente: (id: number) => req<void>('DELETE', `/clientes/${id}`),
  restaurarCliente: (id: number) => req<Cliente>('POST', `/clientes/${id}/restaurar`),
  anonimizarCliente: (id: number) => req<Cliente>('POST', `/clientes/${id}/anonimizar`),
  adicionarContato: (id: number, c: Omit<Contato, 'id'>) => req<Contato>('POST', `/clientes/${id}/contatos`, c),
  removerContato: (id: number, contatoId: number) => req<void>('DELETE', `/clientes/${id}/contatos/${contatoId}`),
};
