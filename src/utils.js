import { randomBytes } from 'crypto';

/**
 * Gera um ID único de 64 bits (colisão praticamente impossível)
 * FIX: era randomBytes(4) — 32 bits com ~0.01% colisão em 1k agendamentos
 */
export function gerarId() {
    return randomBytes(8).toString('hex').toUpperCase();
}

/**
 * Verifica se o momento atual está dentro do horário comercial
 * FIX: usa timezone do config para evitar erro UTC vs local (ex: servidor em UTC, negócio em UTC-3)
 * @param {Object} config
 */
export function eHorarioComercial(config) {
    const { inicio, fim, dias, timezone = 'America/Sao_Paulo' } = config.horarioComercial;

    const agora = new Date();

    const hora = parseInt(
        new Intl.DateTimeFormat('pt-BR', {
            hour: 'numeric',
            hour12: false,
            timeZone: timezone
        }).format(agora)
    );

    const diaStr = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        timeZone: timezone
    }).format(agora);

    const diaMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dia = diaMap[diaStr];

    return dias.includes(dia) && hora >= inicio && hora < fim;
}

/**
 * Formata a mensagem de boas-vindas com os dados do config
 * @param {Object} config
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
 * @param {Object} config
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
 * FIX: compara apenas a data sem hora — evitava rejeitar datas de hoje dependendo do horário
 * @param {string} texto
 * @returns {{ valido: boolean, data?: Date }}
 */
export function validarData(texto) {
    const regexData = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!regexData.test(texto)) return { valido: false };

    const [, dia, mes, ano] = texto.match(regexData);
    const data = new Date(`${ano}-${mes}-${dia}`);
    if (isNaN(data.getTime())) return { valido: false };

    // Compara só a data, sem hora
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    data.setHours(0, 0, 0, 0);

    if (data < hoje) return { valido: false };

    return { valido: true, data };
}

/**
 * Valida o schema mínimo do config do negócio
 * FIX: sem validação, campos ausentes causavam crash em runtime com erro genérico
 * @param {Object} config
 * @throws {Error} se algum campo obrigatório estiver ausente
 */
export function validarConfig(config) {
    const campos = [
        'nome', 'emoji', 'promptIA',
        'horarioComercial', 'horarioComercial.inicio',
        'horarioComercial.fim', 'horarioComercial.dias',
        'horariosDisponiveis', 'servicos',
        'mensagens', 'mensagens.boasVindas', 'mensagens.foraDoPeriodo'
    ];

    for (const campo of campos) {
        const valor = campo.split('.').reduce((obj, k) => obj?.[k], config);
        if (valor === undefined || valor === null) {
            throw new Error(`Campo obrigatório ausente no config: "${campo}"`);
        }
    }

    if (!Array.isArray(config.servicos) || config.servicos.length === 0) {
        throw new Error('"servicos" deve ser um array com ao menos um item.');
    }

    if (!Array.isArray(config.horariosDisponiveis) || config.horariosDisponiveis.length === 0) {
        throw new Error('"horariosDisponiveis" deve ter ao menos um horário.');
    }
}