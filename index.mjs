import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { iniciarBot } from './src/bot.js';
import { validarConfig } from './src/utils.js';

// FIX: proteção contra path traversal
// Sem isso, CONFIG_PATH=../../../../etc/passwd exporia arquivos do sistema
const CONFIG_BASE = path.resolve('./configs');
const configPath = process.env.CONFIG_PATH || './configs/meu-negocio.json';
const configAbsoluto = path.resolve(configPath);

if (!configAbsoluto.startsWith(CONFIG_BASE)) {
    console.error('\n❌ CONFIG_PATH inválido: o caminho deve estar dentro da pasta ./configs\n');
    process.exit(1);
}

if (!fs.existsSync(configAbsoluto)) {
    console.error(`\n❌ Arquivo de configuração não encontrado: ${configAbsoluto}`);
    console.error(`📋 Copie configs/negocio.example.json para configs/meu-negocio.json e preencha os dados.\n`);
    process.exit(1);
}

let config;
try {
    config = JSON.parse(fs.readFileSync(configAbsoluto, 'utf-8'));
} catch {
    console.error('\n❌ Erro ao ler o arquivo de configuração. Verifique se é um JSON válido.\n');
    process.exit(1);
}

// FIX: valida campos obrigatórios antes de iniciar — evita crash em runtime com erro genérico
try {
    validarConfig(config);
} catch (err) {
    console.error(`\n${err.message}\n`);
    process.exit(1);
}

console.log(`\n🚀 Iniciando FluxoAI para: ${config.nome}\n`);

iniciarBot(config);
