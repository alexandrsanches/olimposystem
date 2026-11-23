# Olimpo System

Sistema de gestão para academias. Primeiro módulo: **Clientes**.

## Stack

- `server/`: Node 22 + Express + SQLite nativo (`node:sqlite`), sem dependências nativas.
- `web/`: React 18 + Vite + TypeScript.

## Rodando

```bash
npm install
npm run seed --workspace server   # dados de exemplo (opcional)
npm run dev                       # API em :3333, front em http://localhost:5173
```

Produção: `npm run build && npm start`. A API serve o front compilado em `http://localhost:3333`.
Variáveis: `PORT` (padrão 3333) e `DB_FILE` (padrão `olimpo.db`).

Testes: `npm test` (testes da API e checagem de tipos do front).

## Módulo de Clientes

- **Lista:** busca geral (nome, CPF, e-mail, telefone, ID Wellhub), abas por situação com contadores, filtros (origem, sexo, VIP, removidos), ordenação, paginação, visualização em lista ou grade e menu de ações.
- **Cadastro:** dados principais, situação e vínculos, endereço com busca de CEP (ViaCEP), responsável, mais contatos e observações. Valida CPF, e-mail e telefone no front e na API.
- **Ficha:** cabeçalho com situação editável, abas (Resumo pronto; as demais nas próximas etapas), alerta de cadastro incompleto e de aniversário.
- **Remoção:** lógica (com restauração) ou **LGPD**, que apaga os dados pessoais de forma irreversível.

### API

| Método | Rota |
|---|---|
| GET | `/api/clientes?busca&status=Ativo,Novo&origem&sexo&vip&removidos&page&limit&sort&dir` |
| GET | `/api/clientes/:id` · `/api/clientes/:id/resumo` |
| POST | `/api/clientes` |
| PUT | `/api/clientes/:id` (parcial) |
| DELETE | `/api/clientes/:id` (remoção lógica) |
| POST | `/api/clientes/:id/restaurar` · `/api/clientes/:id/anonimizar` |
| POST/DELETE | `/api/clientes/:id/contatos[/:contatoId]` |

## Documentação

- [Engenharia reversa do módulo de Clientes](docs/engenharia-reversa-clientes.md)
- [Integração Wellhub: estudo e plano](docs/integracao-wellhub.md)
