import { DatabaseSync } from 'node:sqlite';

export const STATUS = ['Novo', 'Ativo', 'Bloqueado', 'Inativo', 'Suspenso'];
export const SEXO = ['F', 'M'];
export const ORIGEM = ['Balcao', 'Site', 'Indicacao', 'Wellhub', 'TotalPass', 'ClassPass'];
export const TIPO_CONTATO = ['Celular', 'TelefoneFixo', 'Email', 'WhatsApp', 'Outro'];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS cliente (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  nome             TEXT    NOT NULL,
  cpf              TEXT,
  rg               TEXT,
  data_nascimento  TEXT,
  sexo             TEXT CHECK (sexo IN ('F','M') OR sexo IS NULL),
  email            TEXT,
  telefone         TEXT,
  objetivo         TEXT,
  cep              TEXT,
  endereco         TEXT,
  numero           TEXT,
  complemento      TEXT,
  bairro           TEXT,
  cidade           TEXT,
  uf               TEXT,
  observacao       TEXT,
  status           TEXT    NOT NULL DEFAULT 'Novo',
  vip              INTEGER NOT NULL DEFAULT 0,
  origem           TEXT    NOT NULL DEFAULT 'Balcao',
  wellhub_id       TEXT,
  tem_responsavel  INTEGER NOT NULL DEFAULT 0,
  responsavel_nome TEXT,
  responsavel_cpf  TEXT,
  responsavel_telefone TEXT,
  professor        TEXT,
  consultor        TEXT,
  ultimo_acesso    TEXT,
  anonimizado      INTEGER NOT NULL DEFAULT 0,
  removido_em      TEXT,
  criado_em        TEXT    NOT NULL DEFAULT (datetime('now')),
  atualizado_em    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_cliente_cpf ON cliente(cpf) WHERE cpf IS NOT NULL AND removido_em IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_cliente_wellhub ON cliente(wellhub_id) WHERE wellhub_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_cliente_nome ON cliente(nome);

CREATE TABLE IF NOT EXISTS cliente_contato (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES cliente(id) ON DELETE CASCADE,
  tipo       TEXT    NOT NULL,
  descricao  TEXT    NOT NULL,
  criado_em  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_contato_cliente ON cliente_contato(cliente_id);
`;

export function openDb(file = process.env.DB_FILE || 'olimpo.db') {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  return db;
}
