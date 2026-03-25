import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { iniciarBot } from './src/bot.js';

// Carrega o arquivo de configuração do negócio
const configPath = process.env.CONFIG_PATH || './configs/meu-negocio.json';
const configAbsoluto = path.resolve(configPath);

if (!fs.existsSync(configAbsoluto)) {
    console.error(`\n❌ Arquivo de configuração não encontrado: ${configAbsoluto}`);
    console.error(`📋 Copie configs/negocio.example.json para configs/meu-negocio.json e preencha os dados.\n`);
    process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configAbsoluto, 'utf-8'));

console.log(`\n🚀 Iniciando FluxoAI para: ${config.nome}\n`);

iniciarBot(config);
