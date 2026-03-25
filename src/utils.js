import { randomBytes } from 'crypto';

/**
 * Gera um ID único para agendamentos
 */
export function gerarId() {
    return randomBytes(4).toString('hex').toUpperCase();
}

/**
 * Verifica se o momento atual está dentro do horário comercial definido no config
 * @param {Object} config - Configuração do negócio
 */
export function eHorarioComercial(config) {
    const { inicio, fim, dias } = config.horarioComercial;
    const agora = new Date();
    const hora = agora.getHours();
    const dia = agora.getDay();
    return dias.includes(dia) && hora >= inicio && hora < fim;
}

/**
 * Formata a mensagem de boas-vindas com os dados do config
 * @param {Object} config - Configuração do negócio
 */
export function formatarBoasVindas(config) {
    const { nome, emoji, mensagens } = config;
    const base = mensagens.boasVindas
        .replace('{nome}', nome)
        .replace('{emoji}', emoji);

    return (
        base +
        `\n\n1️⃣ Fazer um agendamento` +
        `\n2️⃣ Ver meus agendamentos` +
        `\n3️⃣ Cancelar agendamento` +
        `\n4️⃣ Ver serviços e preços` +
        `\n\nDigite o número da opção desejada.`
    );
}

/**
 * Formata a lista de serviços disponíveis
 * @param {Object} config - Configuração do negócio
 */
export function formatarServicos(config) {
    let msg = `*${config.emoji} Nossos Serviços:*\n\n`;
    config.servicos.forEach(s => {
        msg += `*${s.id}.* ${s.nome}\n   💰 ${s.preco} | ⏱ ${s.duracao} min\n\n`;
    });
    return msg;
}

/**
 * Valida e extrai os componentes de uma data no formato DD/MM/AAAA
 * @param {string} texto
 * @returns {{ valido: boolean, data?: Date }}
 */
export function validarData(texto) {
    const regexData = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!regexData.test(texto)) return { valido: false };
    const [, dia, mes, ano] = texto.match(regexData);
    const data = new Date(`${ano}-${mes}-${dia}`);
    if (isNaN(data.getTime()) || data < new Date()) return { valido: false };
    return { valido: true, data };
}