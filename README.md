# API Gateway - NextLevel E-learning System

Gateway centralizado para o sistema de e-learning NextLevel, responsável por roteamento, autenticação, autorização e agregação de documentação OpenAPI de todos os microserviços.

## 📋 Visão Geral

Este API Gateway atua como ponto de entrada único para toda a plataforma NextLevel E-learning, gerenciando:

- **Roteamento** de requisições para microserviços apropriados
- **Autenticação** via JWT (cookies ou headers)
- **Autorização** baseada em roles (ADMIN, INSTRUTOR, FUNCIONARIO)
- **Agregação** de documentação OpenAPI de todos os serviços
- **Proxy reverso** com injeção de contexto de usuário
- **Logging** com correlation ID para rastreabilidade

## 🎯 Funcionalidades Principais

### 1. Roteamento de Microserviços

O gateway roteia requisições para os seguintes serviços:

- `/auth/*` → Auth Service (autenticação e autorização)
- `/users/*` → User Service (gestão de usuários)
- `/notifications/*` → Notification Service (envio de notificações)
- `/courses/*` → Course Service (gestão de cursos e módulos)
- `/assessments/*` → Assessment Service (avaliações e questões)
- `/gamification/*` → Gamification Service (badges e conquistas)
- `/progress/*` → Progress Service (acompanhamento de progresso)

### 2. Autenticação e Autorização

- **Autenticação JWT**: Suporta tokens via cookies (`accessToken`, `refreshToken`) ou header `Authorization`
- **Roles hierárquicas**:
  - `ADMIN`: Acesso total, incluindo gerenciamento de usuários, categorias, badges
  - `INSTRUTOR`: Pode criar/editar cursos, avaliações e materiais
  - `FUNCIONARIO`: Acesso padrão a recursos permitidos

### 3. Rotas Públicas

As seguintes rotas **não** requerem autenticação:

- `POST /auth/v1/login`
- `POST /auth/v1/register`
- `POST /users/v1/register`
- `POST /auth/v1/reset-password`
- Documentação: `/docs`, `/openapi.json`

### 4. Documentação Swagger Agregada

- **Endpoint**: `/docs` (interface Swagger UI)
- **Endpoint**: `/openapi.json` (especificação OpenAPI completa)
- Agrega automaticamente as especificações OpenAPI de todos os microserviços configurados

## 🏗️ Arquitetura

```
┌─────────────┐
│   Cliente   │
└──────┬──────┘
       │
       │ HTTP/HTTPS
       ▼
┌─────────────────────────────────┐
│       API Gateway               │
│  ┌──────────────────────────┐  │
│  │  Middlewares             │  │
│  │  - CORS                  │  │
│  │  - Correlation ID        │  │
│  │  - Auth & Authorization  │  │
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │  Proxy Reverso           │  │
│  │  - Injeção de contexto   │  │
│  │  - Repasse de headers    │  │
│  └──────────────────────────┘  │
└────┬────────────────────────────┘
     │
     ├──► Auth Service
     ├──► User Service
     ├──► Course Service
     ├──► Assessment Service
     ├──► Notification Service
     ├──► Gamification Service
     └──► Progress Service
```

## 🚀 Instalação e Execução

### Pré-requisitos

- Node.js 20+ 
- npm ou yarn

### Instalação

```bash
# Instalar dependências
npm install
```

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Porta do servidor
PORT=3333

# Segredo JWT (deve ser o mesmo em todos os serviços)
JWT_SECRET=seu-segredo-aqui

# CORS
ALLOW_ALL_ORIGINS=false
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# URLs dos microserviços
AUTH_SERVICE_BASE_URL=http://localhost:3001
USER_SERVICE_BASE_URL=http://localhost:3002
NOTIFICATION_SERVICE_BASE_URL=http://localhost:3003
COURSE_SERVICE_BASE_URL=http://localhost:3004
ASSESSMENT_SERVICE_BASE_URL=http://localhost:3005
GAMIFICATION_SERVICE_BASE_URL=http://localhost:3006
PROGRESS_SERVICE_BASE_URL=http://localhost:3007

# URLs das especificações OpenAPI dos serviços
SERVICES_OPENAPI=http://localhost:3001/openapi.json,http://localhost:3002/openapi.json,http://localhost:3004/openapi.json,http://localhost:3005/openapi.json
```

### Desenvolvimento

```bash
# Executar em modo desenvolvimento com hot-reload
npm run dev
```

### Produção

```bash
# Build do TypeScript
npm run build

# Executar em produção
npm start
```

## 🐳 Docker

### Build da imagem

```bash
docker build -t api-gateway .
```

### Executar container

```bash
docker run -p 3333:3333 --env-file .env api-gateway
```

## 🔧 Scripts Disponíveis

- `npm run dev` - Desenvolvimento com hot-reload
- `npm run build` - Build do TypeScript
- `npm start` - Executar versão compilada
- `npm run lint` - Verificar problemas de linting
- `npm run lint:fix` - Corrigir problemas de linting automaticamente
- `npm run format` - Formatar código com Prettier

## 🔐 Fluxo de Autenticação

1. **Cliente** faz login via `POST /auth/v1/login`
2. **Auth Service** valida credenciais e retorna tokens JWT
3. Tokens são armazenados em **cookies HTTP-only** (`accessToken`, `refreshToken`)
4. **Requisições subsequentes** incluem automaticamente os cookies
5. **Gateway** extrai e valida o token JWT
6. **Gateway** injeta headers de contexto (`x-user-id`, `x-user-role`, `x-user-data`)
7. **Microserviço** recebe requisição com contexto do usuário

## 📊 Headers Injetados pelo Gateway

O gateway adiciona automaticamente os seguintes headers nas requisições para microserviços:

- `authorization: Bearer <token>` - Token JWT original
- `x-correlation-id` - ID único para rastreamento de requisições
- `x-user-id` - ID do usuário autenticado
- `x-user-role` - Role do usuário (ADMIN/INSTRUTOR/FUNCIONARIO)
- `x-user-data` - Dados do usuário codificados em Base64

## 📝 Logging

O gateway utiliza **Pino** para logging estruturado. Cada requisição recebe um **correlation ID** único para rastreabilidade através de múltiplos serviços.

## 🛡️ Segurança

- Tokens JWT com assinatura HMAC-SHA256
- Cookies HTTP-only para prevenir XSS
- CORS configurável por variáveis de ambiente
- Validação de roles antes do proxy
- Headers hop-by-hop removidos adequadamente

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é parte do sistema NextLevel E-learning.

## 🔗 Links Relacionados

- [Documentação da API](http://localhost:3333/docs) (quando o servidor estiver rodando)
- [Especificação OpenAPI](http://localhost:3333/openapi.json)
