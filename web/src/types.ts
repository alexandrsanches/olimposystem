export type Status = 'Novo' | 'Ativo' | 'Bloqueado' | 'Inativo' | 'Suspenso';
export type Origem = 'Balcao' | 'Site' | 'Indicacao' | 'Wellhub' | 'TotalPass' | 'ClassPass';
export type TipoContato = 'Celular' | 'TelefoneFixo' | 'Email' | 'WhatsApp' | 'Outro';

export interface Contato {
  id: number;
  tipo: TipoContato;
  descricao: string;
}

export interface Cliente {
  id: number;
  nome: string;
  cpf: string | null;
  rg: string | null;
  dataNascimento: string | null;
  sexo: 'F' | 'M' | null;
  email: string | null;
  telefone: string | null;
  objetivo: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  observacao: string | null;
  status: Status;
  vip: boolean;
  origem: Origem;
  wellhubId: string | null;
  temResponsavel: boolean;
  responsavelNome: string | null;
  responsavelCpf: string | null;
  responsavelTelefone: string | null;
  professor: string | null;
  consultor: string | null;
  ultimoAcesso: string | null;
  anonimizado: boolean;
  removido: boolean;
  removidoEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
  idade: number | null;
  contatos?: Contato[];
}

export interface Pagina<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  contagemPorStatus: Partial<Record<Status, number>>;
}

export interface Resumo {
  cliente: Cliente;
  contatos: Contato[];
  diasDeCasa: number;
  pendencias: string[];
  aniversarioHoje: boolean;
}

export const STATUS: Status[] = ['Ativo', 'Novo', 'Suspenso', 'Bloqueado', 'Inativo'];
export const ORIGENS: { valor: Origem; rotulo: string }[] = [
  { valor: 'Balcao', rotulo: 'Balcão' },
  { valor: 'Site', rotulo: 'Site' },
  { valor: 'Indicacao', rotulo: 'Indicação' },
  { valor: 'Wellhub', rotulo: 'Wellhub' },
  { valor: 'TotalPass', rotulo: 'TotalPass' },
  { valor: 'ClassPass', rotulo: 'ClassPass' },
];
export const TIPOS_CONTATO: { valor: TipoContato; rotulo: string }[] = [
  { valor: 'Celular', rotulo: 'Celular' },
  { valor: 'WhatsApp', rotulo: 'WhatsApp' },
  { valor: 'TelefoneFixo', rotulo: 'Telefone fixo' },
  { valor: 'Email', rotulo: 'E-mail' },
  { valor: 'Outro', rotulo: 'Outro' },
];
