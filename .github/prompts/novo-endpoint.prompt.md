---
description: Adiciona um novo endpoint a um recurso existente do backend, respeitando as camadas routes -> controllers -> services -> repositories.
name: novo-endpoint
argument-hint: método e caminho do endpoint (ex. GET /documents/:id)
agent: agent
---

# Novo endpoint no backend

Adicione o endpoint `${input:endpoint:método e caminho do endpoint (ex. GET /documents/:id)}` ao recurso `${input:recurso:recurso existente (ex. documents)}`, seguindo a Clean Architecture simples do projeto.

Antes de alterar qualquer arquivo, leia `backend/src/app.js` e os arquivos existentes do recurso em `routes/`, `controllers/`, `services/` e `repositories/`, e reaproveite os padrões já usados.

## Passos

1. **Rota** (`backend/src/routes/${input:recurso}.routes.js`): registre o endpoint no router existente. Use o middleware `requireUser` quando o endpoint exigir usuário autenticado, como os demais. A rota apenas delega ao controller e não contém lógica.
2. **Controller** (`backend/src/controllers/${input:recurso}.controller.js`): trate entrada e saída HTTP. Valide de forma básica `params`, `query` e `body`. Envolva a lógica em `try/catch` e encaminhe erros com `next(error)`. Não coloque regra de negócio aqui.
3. **Service** (`backend/src/services/${input:recurso}.service.js`): implemente as regras de negócio. Lance `AppError(status, CODE, mensagem)` para erros esperados. O service não deve conhecer `req` nem `res`.
4. **Repository** (`backend/src/repositories/`): apenas persistência. Se precisar de nova consulta, adicione uma função pequena e reutilize as existentes quando possível.
5. **Resposta**: exponha somente campos públicos. Mapeie o objeto antes de responder, como `toPublicDocument` faz em `documents.service.js`, e nunca devolva campos internos como nomes de arquivo gravados em disco.
6. **Documentação**: atualize a seção "Endpoints previstos" em `.github/copilot-instructions.md` com o novo endpoint.

## Requisitos

- Respeite fluxo `routes -> controllers -> services -> repositories`. Camadas internas não importam camadas externas.
- Controllers não devem importar repositories diretamente. O `documents.controller.js` atual usa `fileRepository` para o upload, mas esse caso não deve ser repetido.
- Erros de negócio usam `AppError` com código em `UPPER_SNAKE_CASE` e mensagem em português. Erros inesperados ficam a cargo do `error-handler`, sem expor stack trace.
- Trate erros nos limites do sistema: entrada HTTP e leitura ou escrita de arquivos.
- Os arquivos continuam no filesystem local (`backend/storage`), e os metadados continuam em memória. Não use serviços externos.
- Nomes de símbolos em inglês. Mensagens ao usuário e comentários em português, e comente apenas o que exige esclarecimento.
- Não quebre endpoints existentes.
- Não crie camadas, arquivos ou abstrações além dos necessários para este endpoint.

## Validação

- Se o recurso já tiver testes em `backend/test`, adicione casos apenas para o novo endpoint, cobrindo sucesso e os erros principais. Veja o prompt `gerar-testes`.
- Execute `npm test` dentro de `backend/` e confirme que os testes existentes continuam passando.
