# Especificação - Document Management System

## 1. Objetivo

Entregar uma aplicação web simples para que usuários enviem, listem e baixem seus documentos, mantendo os arquivos no filesystem local e os metadados em memória nesta fase.

## 2. Escopo

### Dentro do escopo

- Envio de um documento por requisição.
- Listagem dos metadados dos documentos pertencentes ao usuário atual.
- Download de um documento pelo identificador, somente pelo usuário dono.
- Interface React para envio, consulta e download, com estados de carregamento, vazio e erro.
- Validação do arquivo enviado e tratamento de erros de armazenamento.
- Armazenamento dos arquivos em `backend/storage` via Multer `diskStorage`.
- Metadados mantidos em memória durante a execução do processo.

### Fora do escopo

- Armazenamento em nuvem, banco de dados ou provedores externos.
- Versionamento, exclusão e compartilhamento de documentos.
- Cadastro, login e implementação de autenticação. O backend depende de um contexto de identidade confiável fornecido por middleware de autenticação quando integrado.
- Recuperação automática dos metadados após reinício, limpeza automática de arquivos órfãos e antivírus/inspeção de conteúdo.

### Premissas e dependências

- Cada requisição de negócio deve possuir um identificador de usuário confiável no contexto da requisição. O cliente não pode definir o proprietário enviando um campo `owner`.
- Enquanto a autenticação não estiver integrada, os endpoints de negócio não podem ser considerados prontos para uso multiusuário; sem identidade confiável, devem responder `401`.
- Os caminhos descritos neste documento são relativos à API Express. No navegador, o frontend usa o prefixo `/api`; o proxy Vite o remove ao encaminhar a requisição ao backend.

## 3. Requisitos funcionais

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| RF-01 | O usuário pode enviar um documento pelo formulário da aplicação. | Uma requisição válida armazena o arquivo localmente e retorna `201` com os metadados criados. |
| RF-02 | O upload aceita exatamente um arquivo no campo multipart `file`. | Requisição sem arquivo ou com multipart inválido retorna erro JSON `400`. |
| RF-03 | O sistema valida tamanho e tipo do documento. | O padrão é até 10 MiB e os formatos PDF, DOC, DOCX, XLS, XLSX, PPT e PPTX; exceder o tamanho retorna `413` e tipo não permitido retorna `415`. |
| RF-04 | O sistema associa cada documento ao usuário autenticado. | O `owner` é obtido exclusivamente do contexto confiável da requisição; requisição sem identidade retorna `401`. |
| RF-05 | O usuário pode listar seus documentos. | A resposta contém somente metadados próprios, sem conteúdo binário nem caminho interno do arquivo. |
| RF-06 | O usuário pode baixar um documento próprio por ID. | Um documento existente e pertencente ao usuário é enviado como anexo; ID inexistente ou de outro usuário retorna `404`. |
| RF-07 | A interface apresenta feedback para envio, listagem e download. | A tela informa estados de carregamento, lista vazia e falha, e permite tentar novamente quando aplicável. |
| RF-08 | O sistema não usa nome enviado pelo usuário como caminho físico. | O nome físico é gerado pelo sistema; o nome original serve apenas como metadado e nome de apresentação/download. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os binários devem ser gravados exclusivamente no filesystem local da aplicação, em `backend/storage`, usando Multer com `diskStorage`. Não usar armazenamento externo ou em nuvem. |
| RNF-02 | Os metadados ficam em memória e podem ser perdidos ao reiniciar o processo. A especificação não exige persistência adicional nesta fase. |
| RNF-03 | O limite padrão de upload é `10 MiB` (`10485760` bytes), configurável por `UPLOAD_MAX_SIZE_BYTES`. |
| RNF-04 | A allowlist padrão é configurável por `UPLOAD_ALLOWED_MIME_TYPES` e cobre PDF, DOC/DOCX, XLS/XLSX e PPT/PPTX. Extensão e MIME declarados devem ser coerentes com a allowlist; o MIME enviado pelo cliente não deve ser tratado isoladamente como prova do conteúdo real. |
| RNF-05 | A configuração operacional deve seguir 12-Factor e usar variáveis de ambiente. `PORT` mantém o padrão existente de `3000`; as variáveis de upload usam os padrões descritos neste documento. |
| RNF-06 | IDs e caminhos devem ser tratados de forma segura: gerar IDs no servidor, resolver caminhos dentro de `backend/storage` e não concatenar caminhos fornecidos pelo cliente. |
| RNF-07 | Erros da API usam JSON consistente e não expõem stack traces, caminhos absolutos ou detalhes internos do filesystem. Mensagens destinadas ao usuário são em português. |
| RNF-08 | A implementação backend segue `routes -> controllers -> services -> repositories`; camadas internas não dependem de Express ou de detalhes da interface HTTP. |
| RNF-09 | O frontend usa React com componentes funcionais e Hooks, e acessa a API por `fetch` sob o prefixo `/api`. |

## 5. Modelo de dados (metadados do documento)

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | string | Sim | Identificador único opaco, gerado pelo servidor. Recomenda-se UUID v4. |
| `originalName` | string | Sim | Nome original fornecido no upload, armazenado somente como dado de apresentação. |
| `size` | number | Sim | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Sim | Data e hora do upload em ISO 8601, preferencialmente UTC. |
| `owner` | string | Sim | Identificador obtido do contexto autenticado confiável. Não é informado pelo cliente. |

O repositório de metadados é em memória. O arquivo físico é armazenado com nome gerado a partir do ID e de uma extensão validada, sem expor esse nome ou caminho na API. O nome físico não constitui um campo adicional do contrato público.

Como os metadados não sobrevivem ao reinício, os arquivos gravados permanecem no disco, mas deixam de ser localizáveis pela API e podem se tornar órfãos. Recuperação e limpeza desses arquivos não fazem parte desta fase.

## 6. Contratos de API

### Convenções

- Os paths abaixo são registrados no Express sem `/api`. O frontend os chama como `/api/upload`, `/api/documents` e `/api/documents/:id/download` através do proxy Vite.
- Todas as rotas de negócio exigem identidade confiável no contexto da requisição. Não aceitar `owner` no corpo, query string ou cabeçalho controlado diretamente pelo cliente.
- Erros usam o formato `{ "error": { "code": "CODIGO", "message": "Descrição em português" } }` com `Content-Type: application/json`.
- Não revelar se um documento inacessível existe: documento inexistente e documento de outro usuário têm a mesma resposta `404`.

### POST /upload

Envia um arquivo usando `multipart/form-data`.

**Entrada**

- Campo de arquivo obrigatório: `file`.
- Exatamente um arquivo por requisição.
- Não aceitar campo `owner`; o proprietário vem da identidade confiável.

**Sucesso - `201 Created`**

```json
{
  "document": {
    "id": "5f86c24a-1e1b-4bb5-b844-a40caf32e0cb",
    "originalName": "relatorio.pdf",
    "size": 24576,
    "uploadedAt": "2026-11-23T12:00:00.000Z",
    "owner": "user-123"
  }
}
```

**Erros**

| Status | Código | Condição |
| --- | --- | --- |
| `400` | `FILE_REQUIRED` | Arquivo ausente ou corpo multipart inválido. |
| `401` | `AUTHENTICATION_REQUIRED` | Contexto de usuário ausente ou inválido. |
| `413` | `FILE_TOO_LARGE` | Arquivo excede `UPLOAD_MAX_SIZE_BYTES`. |
| `415` | `UNSUPPORTED_FILE_TYPE` | Tipo ou extensão não está na allowlist configurada ou são incompatíveis. |
| `500` | `UPLOAD_FAILED` | Falha ao gravar arquivo ou registrar metadados. |

Se o arquivo for gravado, mas o registro dos metadados falhar, a implementação deve tentar remover o arquivo recém-criado antes de responder, evitando órfão criado por falha parcial da própria requisição.

### GET /documents

Lista documentos do usuário autenticado. Não retorna o conteúdo binário nem caminhos de armazenamento. A lista deve vir em ordem decrescente de `uploadedAt`; em empate, usar `id` para ordenação estável. Paginação fica fora desta fase.

**Sucesso - `200 OK`**

```json
{
  "documents": [
    {
      "id": "5f86c24a-1e1b-4bb5-b844-a40caf32e0cb",
      "originalName": "relatorio.pdf",
      "size": 24576,
      "uploadedAt": "2026-11-23T12:00:00.000Z",
      "owner": "user-123"
    }
  ]
}
```

Sem documentos, retornar `200` com `"documents": []`.

**Erros**

| Status | Código | Condição |
| --- | --- | --- |
| `401` | `AUTHENTICATION_REQUIRED` | Contexto de usuário ausente ou inválido. |
| `500` | `DOCUMENT_LIST_FAILED` | Falha inesperada ao consultar metadados. |

### GET /documents/:id/download

Baixa o conteúdo binário do documento identificado por `id`, se pertencer ao usuário autenticado.

**Sucesso - `200 OK`**

- Corpo: bytes originais do arquivo.
- `Content-Type`: tipo MIME validado no upload.
- `Content-Disposition`: `attachment` com o nome original codificado de forma segura.

**Erros**

| Status | Código | Condição |
| --- | --- | --- |
| `401` | `AUTHENTICATION_REQUIRED` | Contexto de usuário ausente ou inválido. |
| `404` | `DOCUMENT_NOT_FOUND` | ID inexistente, documento de outro usuário ou arquivo local ausente. |
| `500` | `DOWNLOAD_FAILED` | Falha inesperada ao ler o arquivo. |

## 7. Decisões arquiteturais

- Backend em Node.js e Express, CommonJS, JavaScript puro.
- `routes/` mapeia métodos e paths e delega aos controllers.
- `controllers/` valida a entrada HTTP, obtém a identidade confiável, chama serviços e converte resultados em status/respostas HTTP.
- `services/` contém as regras de upload, validação, autorização por proprietário, listagem e download.
- `repositories/` concentra acesso aos metadados em memória e ao filesystem local. O repositório de arquivos usa `backend/storage` e Multer `diskStorage` na entrada.
- Dependências seguem `routes -> controllers -> services -> repositories`. Camadas de domínio/serviço não conhecem objetos Express.
- Frontend React/Vite com componentes reutilizáveis para formulário de upload, lista e ação de download; um serviço centraliza `fetch` para a API.
- A autenticação é dependência externa desta entrega. Até existir middleware confiável, não substituir identidade por um `owner` enviado pelo cliente.
- Não introduzir banco, storage remoto ou dependências adicionais sem necessidade aprovada.

## 8. Plano de execução

As etapas abaixo descrevem trabalho futuro. A entrega desta especificação não executa nem altera arquivos de backend, frontend ou testes.

1. Confirmar a integração de identidade autenticada e os valores operacionais de `UPLOAD_MAX_SIZE_BYTES` e `UPLOAD_ALLOWED_MIME_TYPES` no ambiente de execução.
2. Implementar os módulos backend por camada: repositórios para metadados em memória e arquivos locais, serviços com validação/autorização, controllers e rotas para os três contratos.
3. Adicionar testes backend com `node:test` para contratos, limites e tipos, isolamento por proprietário, falhas de filesystem e limpeza em falha parcial.
4. Implementar no frontend o serviço `fetch`, o formulário de upload, a listagem, download e os estados de carregamento, vazio e erro.
5. Validar o fluxo integrado via proxy `/api`, incluindo reinício do backend e confirmação da limitação conhecida de perda dos metadados em memória.
6. Revisar a documentação e critérios de aceite antes de considerar a funcionalidade pronta; persistência de metadados e autenticação continuam fora desta fase salvo decisão explícita de escopo.