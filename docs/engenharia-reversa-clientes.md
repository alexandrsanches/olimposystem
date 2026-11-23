# Engenharia reversa: módulo de Clientes (referência NextFit)

Levantamento feito em 23/11/2026 para orientar o módulo de Clientes do Olimpo System.

## Método

O login automatizado no app foi barrado pelo Cloudflare Turnstile ("não sou um robô"). Não tentamos contornar o captcha.
O levantamento foi feito por **análise estática do front-end público** (os bundles JS que o navegador baixa antes do login),
na linha do "website" das ferramentas listadas em [awesome-reverse-engineer-anything](https://github.com/AIshihzong/awesome-reverse-engineer-anything):

- `app.js` (~25 MB): AngularJS 1.x com componentes React embutidos via `react2angular`. Contém rotas (`$stateProvider`), serviços REST e colunas das grades.
- `templates.js`: templates HTML do AngularJS (`$templateCache`), de onde saem os campos dos formulários (`ng-model`).
- `env-config.js`: URLs base dos serviços.

Para validar com dados reais, falta uma captura da sessão logada (arquivo HAR ou navegação no computador do usuário). Ver "Próximos passos".

## Arquitetura observada

| Item | Valor |
|---|---|
| API principal | `https://api.nextfit.com.br/api/` |
| Padrão de rota | `{versao?}/{Recurso}/{Acao}`, ex.: `v2/Cliente/Listar` |
| Filtros | Array JSON `filter=[{property, operator: equal\|contains\|in, value, and}]`, mais `page`, `limit`, `sort`, `fields`, `includes` |
| Resposta de lista | `{ Content: [...], Total }` |
| Remoção | Lógica (`Inativar`/`Restaurar`), e remoção LGPD separada (`Anonimizar`) |

### Endpoints do recurso `Cliente`

| Método | Rota | Uso |
|---|---|---|
| GET | `v2/Cliente/Listar` | listagem genérica com filtros |
| GET | `Cliente/RecuperarPesquisaGeral` | grade principal; params `StatusStr`, `OrigemStr`, `CodigosUnidadesStr`, `TipoVinculoStr`, `VerRemovidos`, `VerVIPs`, `Descricao` |
| POST | `v2/Cliente/Inserir` | criar |
| PUT | `v2/Cliente/Alterar` | editar |
| GET | `v3/Cliente/RecuperarResumo?Codigo=` | aba Resumo |
| GET | `Cliente/RecuperarDashboard` | dashboard |
| GET | `v2/Cliente/RecuperarFrequenciaAcesso?Codigo=` | frequência |
| POST | `Cliente/Anonimizar` | remoção LGPD |
| PUT | `v2/Cliente/AlterarUnidadePreferencial` | multiunidade |
| POST | `v2/Cliente/EnviarMensagem`, `Cliente/EnviarPush` | comunicação |
| GET | `Cliente/RecuperarOportunidadesEmAberto` | checado antes de remover |

## Telas e rotas

| Rota (ui-router) | URL | Conteúdo |
|---|---|---|
| `app.cliente.list` | `/cliente/lista` | componente React `ClienteListagem` |
| `app.cadastrocliente.novo` / `.id` | `/cliente-cadastro[/:id]` | formulário |
| `app.cliente.id.dashboard` | `/cliente/:id/cliente-dashboard` | ficha, aba Resumo |

**Abas da ficha:** Resumo, Comunicação, Vendas, Contratos, Financeiro, Treinos, Avaliações físicas, Graduações, Evoluções, Serviços.

### Listagem

- Colunas: foto, Nome (com selo de responsável), Situação (chip colorido), Idade, Sexo, Unidade (só multiunidade), Ações.
- Ações: Editar, Remover, Abrir em nova guia, Visualizar perfil, Remover (LGPD).
- Filtros: busca geral, Situação (padrão: Ativo, Bloqueado, Inativo, Suspenso), Origem, VIPs, Removidos, Unidades.
- Alternância lista/grade, guardada no `localStorage`. Duplo clique abre o perfil.
- Permissões: `ClientesVisualizarLista`, `ClientesCadastrar`, `ClientesEditar`, `ClientesRemover`.

### Cadastro (campos `vm.cliente.*`)

- **Dados principais:** Nome, Cpf, Rg, DataNascimento, Sexo, Email, TelefoneCompleto, Objetivo, TemResponsavel e ClienteResponsavel.
- **Endereço:** Cep, Endereco, NumEndereco, CompleEndereco, Bairro, Cidade.
- **Mais contatos:** lista de `{TipoContato, Descricao}`.
- **Observações:** Observacao.
- **Responsáveis internos:** UsuarioProfessor, UsuarioConsultor.

### Enums

- `EnumStatusCliente`: Novo, Ativo, Bloqueado, Inativo, Suspenso.
- `EnumOrigemCliente`: inclui Gympass (Wellhub), TotalPass, ClassPass e Comanda.
- `EnumSexo`: Feminino, Masculino.

## Como isso virou o Olimpo System

| NextFit | Olimpo |
|---|---|
| `RecuperarPesquisaGeral` + filtros JSON | `GET /api/clientes?busca&status&origem&sexo&vip&removidos&page&limit&sort&dir` |
| `Inserir` / `Alterar` | `POST /api/clientes`, `PUT /api/clientes/:id` (update parcial) |
| Inativar/Restaurar | `DELETE /api/clientes/:id` (lógico), `POST /api/clientes/:id/restaurar` |
| `Anonimizar` | `POST /api/clientes/:id/anonimizar` |
| `RecuperarResumo` | `GET /api/clientes/:id/resumo` (com pendências de cadastro) |
| Mais contatos | `POST/DELETE /api/clientes/:id/contatos` |

Visual, marca e código são próprios. Nada de código, imagem ou texto do NextFit foi copiado; só a estrutura funcional serviu de referência.

## Próximos passos

1. Capturar um HAR da sessão logada para confirmar os payloads reais (`RecuperarResumo`, `RecuperarDashboard`).
2. Multiunidade e permissões por perfil de usuário.
3. Upload de foto do cliente.
4. Abas seguintes: Contratos e Vendas, que são pré-requisito para Financeiro.
