# Bot

Sistema de atendimento com backend Node.js/TypeScript e frontend React.

## Estrutura

- `backend/`: API, banco de dados, filas e integração com WhatsApp.
- `frontend/`: interface web em React.
- `installer/`: scripts de provisionamento para Ubuntu.

## Configuração

1. Copie `backend/.env.example` para `backend/.env` e preencha os valores.
2. Copie `frontend/.env.example` para `frontend/.env` e configure a URL da API.
3. Instale as dependências separadamente em `backend/` e `frontend/`.

Arquivos `.env`, certificados, senhas e outros segredos não devem ser enviados ao GitHub.

## Implantação

O instalador requer Ubuntu e solicita interativamente o endereço do repositório, domínios, portas e senhas. Revise os scripts antes de executá-los com privilégios administrativos.

