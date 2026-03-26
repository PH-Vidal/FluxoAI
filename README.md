# 🤖 FluxoAI — WhatsApp Chatbot

Modular WhatsApp AI chatbot built with Node.js and Groq — configurable for any business.

## ✅ Funcionalidades

- Menu interativo com opções numeradas
- Agendamento de serviços (serviço, data e horário)
- Consulta e cancelamento de agendamentos
- Respostas apenas em horário comercial (com suporte a timezone configurável)
- IA (Groq/LLaMA) para perguntas gerais, com contexto de histórico de conversa
- Configuração por negócio via arquivo JSON com validação de schema
- Dados salvos localmente em JSON com proteção contra race condition

## 🗂️ Estrutura do projeto

```
FluxoAI/
├── src/
│   ├── bot.js            ← Inicialização do WhatsApp
│   ├── conversation.js   ← Lógica de conversa, etapas e gerenciamento de sessões
│   ├── scheduler.js      ← CRUD de agendamentos (com fila serial anti-race condition)
│   ├── groq.js           ← Integração com IA (com fallback e sanitização)
│   └── utils.js          ← Funções auxiliares
├── configs/
│   └── negocio.example.json  ← Template de configuração
├── data/                 ← Agendamentos gerados em runtime
├── .env.example
├── index.mjs             ← Entry point
└── package.json
```

## 🚀 Como usar

### 1. Clone o repositório
```bash
git clone https://github.com/PH-Vidal/FluxoAI.git
cd FluxoAI
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
```bash
cp .env.example .env
```
Edite o `.env` com sua chave do Groq (obtenha em https://console.groq.com):
```env
GROQ_API_KEY=sua_chave_aqui
CONFIG_PATH=./configs/meu-negocio.json
```

> **Segurança:** `CONFIG_PATH` só aceita caminhos dentro de `./configs/`. Qualquer tentativa de path traversal (ex: `../../etc/passwd`) é bloqueada com `process.exit(1)`.

### 4. Configure o negócio
```bash
cp configs/negocio.example.json configs/meu-negocio.json
```
Edite `configs/meu-negocio.json` com os dados do negócio: nome, serviços, horários, etc.

### 5. Inicie o chatbot
```bash
npm start
```

### 6. Escaneie o QR Code
Um QR Code aparecerá no terminal. Escaneie com o WhatsApp do número que será o chatbot.

## ⚙️ Configuração por negócio

O arquivo `configs/meu-negocio.json` permite personalizar completamente o bot para qualquer tipo de negócio (barbearia, salão, petshop, clínica, etc.) sem alterar o código.

| Campo | Descrição |
|---|---|
| `nome` | Nome do negócio |
| `segmento` | Tipo de negócio (apenas descritivo) |
| `emoji` | Emoji representativo |
| `horarioComercial` | Dias, horários de funcionamento e `timezone` (ex: `"America/Sao_Paulo"`) |
| `horariosDisponiveis` | Horários disponíveis para agendamento |
| `servicos` | Lista de serviços com nome, duração e preço |
| `mensagens` | Mensagens personalizadas do bot |
| `promptIA` | Instrução de personalidade para a IA |

> O campo `timezone` em `horarioComercial` garante que o horário comercial seja calculado corretamente independente do fuso do servidor.

## 🔒 Segurança

Esta versão inclui proteções contra as principais vulnerabilidades identificadas em auditoria de segurança:

| Proteção | Arquivo | Descrição |
|---|---|---|
| **Anti-race condition** | `scheduler.js` | Fila assíncrona serial garante que escritas no JSON nunca se sobrescrevam |
| **Anti-path traversal** | `index.mjs` | `CONFIG_PATH` é validado contra `./configs/` antes de qualquer leitura |
| **Anti-prompt injection** | `groq.js` | Mensagens limitadas a 500 caracteres + instrução protetora no system prompt |
| **Puppeteer hardening** | `bot.js` | Usa `--no-sandbox` + `--disable-setuid-sandbox`; nunca rode como root |
| **Sessões com TTL** | `conversation.js` | Sessões inativas por mais de 30 min são removidas automaticamente (anti-memory leak) |
| **Fallback de IA** | `groq.js` | Erros da API Groq retornam mensagem amigável em vez de silêncio |
| **Compactação de dados** | `scheduler.js` | Cancelamentos com mais de 30 dias são removidos automaticamente do arquivo |
| **Validação de schema** | `utils.js` | Config é validado na inicialização; campos ausentes causam erro claro antes de subir |
| **IDs de 64 bits** | `utils.js` | IDs gerados com `randomBytes(8)` — colisão praticamente impossível |
| **Histórico de conversa** | `conversation.js` + `groq.js` | Janela deslizante de 10 interações enviadas à IA com controle de tokens |

## 🛠️ Tecnologias

- [Node.js](https://nodejs.org/)
- [whatsapp-web.js](https://wwebjs.dev/)
- [Groq SDK](https://console.groq.com/) + LLaMA 3.3
- [dotenv](https://github.com/motdotla/dotenv)

## ⚠️ Importante

- Use um número de WhatsApp exclusivo para o bot
- O celular precisa estar conectado à internet
- A sessão é salva em `.wwebjs_auth/` (não precisa escanear toda vez)
- Nunca suba o arquivo `.env` para o GitHub
- Em produção, rode o processo com um usuário de sistema **sem privilégios de root**

## 📄 Licença

MIT © [Pedro Vidal](https://github.com/PH-Vidal)