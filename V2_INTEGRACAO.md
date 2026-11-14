# PortoPlan Chatbot V2 - Plano de Integracao

## Decisao de arquitetura

O repositorio `portoplan-chatbot` sera usado como **frontend V2**.
O repositorio `bot` continua sendo o **backend real**, responsavel por autenticacao, banco, WhatsApp/Baileys, contatos, tickets, mensagens, filas, usuarios e demais regras.

Nao substituir o backend atual pelo `ChatContext` do V2, pois o V2 atualmente usa dados mockados e estado local.

## Fonte V2 vinculada

Repositorio: `lrubinger/portoplan-chatbot`
Commit avaliado: `6f91f965ff8c8502c0663490e93ead4f824b957c`
Submodulo: `frontend-v2/`

## O que aproveitar do V2

- Layout React/TypeScript
- Inbox/Atendimentos
- Multiatendimento por abas
- Contatos
- Administracao e niveis de acesso
- Kanban
- Fluxos
- Automacoes
- Chat interno
- Configuracoes
- Componentes Shadcn/Radix e paineis redimensionaveis

## O que NAO deve substituir o backend atual

- ChatContext como fonte definitiva de dados
- mockData
- login demonstrativo
- sendMessage local
- criacao local de contatos/conversas
- simulacao de resposta de cliente
- permissoes apenas em memoria
- Kanban apenas em memoria

## Mapeamento V2 -> backend atual

| V2 | Backend real |
|---|---|
| Login | /auth/login |
| Usuario logado | auth/session + Users |
| Inbox | Tickets + Messages |
| Contatos | Contacts |
| Enviar mensagem | MessageController / SendWhatsAppMessage |
| Anexos | SendWhatsAppMedia |
| Nao lidas | Ticket.unreadMessages |
| Arquivar | Ticket.archived |
| Fixar | Ticket.pinned |
| Atendente | Ticket.userId |
| Filas | Queue |
| Chat interno | InternalChat |
| Kanban | CompanyKanban / Tags |
| Configuracoes | MvpSettings/Settings |
| WhatsApp | Whatsapp + WbotServices |
| Grupos | SystemSetting whatsappGroupsEnabled |

## Ordem recomendada de integracao

1. Autenticacao real
2. Layout e navegacao V2
3. Inbox lendo Tickets/Messages reais
4. Envio de texto e midia pelo backend atual
5. Contatos reais
6. Usuarios/permissoes reais
7. Chat interno
8. Filas
9. Kanban
10. Fluxos e automacoes

## Regra de seguranca

Nao alterar o deploy de producao enquanto o V2 estiver em integracao.
Trabalhar na branch `integracao-v2` e validar cada modulo antes de substituir o frontend atual.
