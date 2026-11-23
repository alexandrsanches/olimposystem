# Integração com o Wellhub (ex-Gympass): estudo e plano

Status: **estudo, sem código ainda.** Levantamento de 23/11/2026.

## Fontes e confiabilidade

O portal antigo `developers.wellhub.com` hoje devolve a mesma página inicial para qualquer rota quando acessado direto.
O conteúdo abaixo vem dos trechos indexados das páginas oficiais, encontrados por busca, e precisa ser conferido na
documentação completa (ou na coleção Postman) **antes de implementar**:

- Access Control API: [Getting Started](https://developers.wellhub.com/product/access-control-api/1.0/getting-started), [Endpoints](https://developers.wellhub.com/product/access-control-api/1.0/endpoints), [Check-in Webhook](https://developers.wellhub.com/product/access-control-api/1.0/check-in-webhook), [FAQ](https://developers.wellhub.com/product/access-control-api/1.0/faq)
- Booking API: [Endpoints](https://developers.wellhub.com/product/booking-api/1.0/endpoints), [Webhooks](https://developers.wellhub.com/product/booking-api/1.0/webhooks)
- Setup: [System Integration Requested Webhook](https://developers.wellhub.com/product/integration-setup-api/1.0/system-integration-requested-webhook)
- Partner App: [User Status API](https://developers.wellhub.com/product/partner-app-apis/1.0/user-status-api)
- [Postman: Quick Start Guide](https://documenter.getpostman.com/view/14766562/2sAYdbPtHN)

`developer-hub.wellhub.com` é outra coisa: integração de **empresas** (elegibilidade de funcionários e folha). Não serve para academias.

## Quais APIs uma academia usa

| API | Para quê | Precisamos? |
|---|---|---|
| **Access Control API** | Validar o check-in do aluno Wellhub na recepção ou catraca | **Sim, é o MVP** |
| Booking API | Publicar aulas e horários (slots) no app Wellhub e aceitar ou recusar reservas | Depois, quando existir o módulo Agenda |
| Integration Setup API | Webhook avisando que a academia pediu integração com o nosso sistema | Sim, se o Olimpo virar um parceiro de software (vários clientes) |

## Fluxo de check-in (Access Control API)

1. O aluno faz check-in no app Wellhub, na academia.
2. O Wellhub envia o webhook **check-in** para a nossa URL. O payload traz o objeto `user` com `unique_token` (o ID Wellhub do aluno) e os dados da academia.
3. Validamos a assinatura do header **`X-Gympass-Signature`**: um HMAC do corpo bruto da requisição com a nossa chave secreta, em hexadecimal maiúsculo. Uma das páginas cita **HMAC-SHA1**; confirmar o algoritmo do webhook de check-in.
4. Buscamos o cliente por `wellhub_id`. Se não existir, criamos um com `origem = Wellhub`. O campo `wellhub_id` já existe no cadastro.
5. Chamamos a validação: **`POST https://api.partners.gympass.com/access/v1/validate`** (sandbox em `apitesting.partners.gympass.com`), com `Authorization: Bearer <token>` e o ID da academia no corpo (`Gym.Id`, conferir o nome exato).
6. O check-in **expira** se não for validado dentro da janela definida pelo Wellhub (conferir o tempo).
7. Registramos o acesso (`ultimo_acesso`) e um log do evento, e liberamos a catraca se houver uma.

Uma mesma chave de API pode atender várias unidades, porque cada requisição informa o ID da unidade.

## Como obter as credenciais

1. A academia precisa ser **parceira Wellhub** (contrato ativo).
2. Pedir ao **gerente de relacionamento / time de tech sales do Wellhub** o acesso à Access Control API. Eles fornecem:
   - o **token de autenticação** (Bearer),
   - o **Gym ID** de cada unidade,
   - a **chave secreta** dos webhooks,
   - credenciais de **sandbox** para testes.
3. Informar a **URL do nosso webhook**, ex.: `https://<dominio-olimpo>/api/integracoes/wellhub/checkin`. Precisa ser HTTPS público.
4. Fazer os testes no sandbox seguindo o Quick Start. Credenciais de produção só são liberadas depois disso.

## Como o NextFit faz (referência)

O bundle do NextFit mostra estes recursos, que servem de checklist:

- `ConfigGympass`: código Gympass da academia, verificação da integração (`VerificarIntegracao`), modalidades liberadas para check-in e para booking.
- `ConfigGympassProductId`: mapeamento de *Product IDs* Wellhub para planos ou modalidades.
- `ClienteGympass`: vínculo cliente ↔ ID Wellhub.
- `LogGympass`: log de eventos recebidos.
- Histórico de check-ins Wellhub por contrato do cliente (`clientehistoricogympass`).
- Notificação interna "check-ins de alunos através do Wellhub".

## Plano de implementação no Olimpo

**Fase 1: check-in (MVP)**
- Tabelas `wellhub_config` (gym_id, ambiente sandbox/produção) e `wellhub_evento` (payload, assinatura válida, status, erro, timestamps).
- Segredos (token, chave do webhook) em variáveis de ambiente, nunca no banco ou no repositório.
- Endpoint `POST /api/integracoes/wellhub/checkin`: verifica a assinatura com comparação em tempo constante, grava o evento, responde `200` rápido e processa a validação em seguida, com retentativa.
- Vínculo automático por `wellhub_id`, ou fila de "check-ins sem cliente" para a recepção vincular manualmente.
- Tela de check-ins do dia e badge Wellhub na ficha do cliente (o badge já existe).

**Fase 2: Booking**, junto com o módulo Agenda: classes, slots, webhooks `booking-requested`, `booking-canceled`, `booking-late-canceled` e `checkin-booking-occurred`.

## Dúvidas para levar ao Wellhub

1. Payload completo do webhook de check-in e algoritmo exato da assinatura.
2. Janela de validade do check-in.
3. Nome exato do campo do Gym ID na requisição de validação, e se existe header obrigatório.
4. Política de retentativa do webhook e códigos de resposta esperados.
5. Se o Olimpo deve se cadastrar como **software parceiro**, para atender várias academias pela Integration Setup API.
