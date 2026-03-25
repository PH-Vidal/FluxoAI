import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Envia uma mensagem para a IA e retorna a resposta
 * @param {string} mensagem - Mensagem do usuário
 * @param {Object} config - Configuração do negócio
 * @returns {Promise<string>}
 */
export async function perguntarIA(mensagem, config) {
    const servicosNomes = config.servicos.map(s => s.nome).join(', ');
    const { inicio, fim } = config.horarioComercial;

    const systemPrompt = config.promptIA
        .replace('{nome}', config.nome)
        + ` Serviços disponíveis: ${servicosNomes}.`
        + ` Horário de funcionamento: ${inicio}h às ${fim}h.`;

    const result = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: mensagem }
        ]
    });

    return result.choices[0].message.content;
}