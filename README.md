# 🤖 FluxoAI — WhatsApp Chatbot

Modular WhatsApp AI chatbot built with Node.js and Groq — configurable for any business.

## ✅ Funcionalidades

- Menu interativo com opções numeradas
- Agendamento de serviços (serviço, data e horário)
- Consulta e cancelamento de agendamentos
- Respostas apenas em horário comercial
- IA (Groq/LLaMA) para perguntas gerais
- Configuração por negócio via arquivo JSON
- Dados salvos localmente em JSON

## 🗂️ Estrutura do projeto

```
FluxoAI/
├── src/
│   ├── bot.js            ← Inicialização do WhatsApp
│   ├── conversation.js   ← Lógica de conversa e etapas
│   ├── scheduler.js      ← CRUD de agendamentos
│   ├── groq.js           ← Integração com IA
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
| `horarioComercial` | Dias e horários de funcionamento |
| `horariosDisponiveis` | Horários disponíveis para agendamento |
| `servicos` | Lista de serviços com nome, duração e preço |
| `mensagens` | Mensagens personalizadas do bot |
| `promptIA` | Instrução de personalidade para a IA |

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

## 📄 Licença

MIT © [Pedro Vidal](https://github.com/PH-Vidal)