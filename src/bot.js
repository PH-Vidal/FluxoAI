import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { processarMensagem } from './conversation.js';
import { iniciarLembretes } from './reminder.js';
import { logger } from './logger.js';

/**
 * Calcula um delay de digitação proporcional ao tamanho da resposta,
 * para simular um tempo de leitura/digitação humano.
 * Mínimo: 800ms | Máximo: 4000ms
 * @param {string} texto
 * @returns {number} delay em ms
 */
function calcularDelayDigitacao(texto) {
    return Math.min(800 + texto.length * 8, 4000);
}

/**
 * Inicializa e conecta o bot do WhatsApp.
 * @param {Object} config - Configuração do negócio
 */
export function iniciarBot(config) {
    const client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            // --no-sandbox desativa a sandbox do Chromium, expondo o sistema a conteúdo malicioso.
            // --disable-setuid-sandbox é complementar e necessário em ambientes sem root-namespace.
            // NUNCA rode com --no-sandbox como root em produção. Use usuário sem privilégios.
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    client.on('qr', qr => {
        console.log('\n📱 Escaneie o QR Code abaixo com o WhatsApp:\n');
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        logger.info('bot', `FluxoAI — ${config.nome} conectado e pronto!`);
        iniciarLembretes(client, config);
    });

    client.on('message', async msg => {
        try {
            if (msg.from.includes('newsletter') || msg.from.includes('broadcast')) return;

            const chat = await msg.getChat();
            if (chat.isGroup || chat.archived) return;

            logger.debug('bot', `Mensagem recebida de ${msg.from}: "${msg.body?.slice(0, 60)}"`);

            const resposta = await processarMensagem(msg.from, msg.body, config);

            // Delay dinâmico proporcional ao tamanho da resposta
            await chat.sendStateTyping();
            const delay = calcularDelayDigitacao(resposta);
            await new Promise(r => setTimeout(r, delay));

            await msg.reply(resposta);

            logger.debug('bot', `Resposta enviada (${resposta.length} chars, delay: ${delay}ms)`);

        } catch (error) {
            logger.error('bot', 'Erro ao processar mensagem:', error.message);
        }
    });

    client.initialize();
}