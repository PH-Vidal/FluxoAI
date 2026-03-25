import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { processarMensagem } from './conversation.js';

/**
 * Inicializa e conecta o bot do WhatsApp
 * @param {Object} config - Configuração do negócio
 */
export function iniciarBot(config) {
    const client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: { args: ['--no-sandbox'] }
    });

    client.on('qr', qr => {
        console.log('\n📱 Escaneie o QR Code abaixo com o WhatsApp:\n');
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        console.log(`\n✅ FluxoAI - ${config.nome} conectado e pronto!\n`);
    });

    client.on('message', async msg => {
        try {
            if (msg.from.includes('newsletter') || msg.from.includes('broadcast')) return;

            const chat = await msg.getChat();
            if (chat.isGroup || chat.archived) return;

            const resposta = await processarMensagem(msg.from, msg.body, config);

            await chat.sendStateTyping();
            await new Promise(r => setTimeout(r, 1000));
            await msg.reply(resposta);
        } catch (error) {
            console.error('Erro ao processar mensagem:', error.message);
        }
    });

    client.initialize();
}