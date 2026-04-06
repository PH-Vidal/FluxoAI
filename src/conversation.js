import {
    eHorarioComercial,
    formatarBoasVindas,
    formatarServicos,
    gerarId,
    validarData
} from './utils.js';

import {
    salvarAgendamento,
    cancelarAgendamento,
    getHorariosDisponiveis,
    getAgendamentosAtivos
} from './scheduler.js';

import { perguntarIA } from './groq.js';
import { logger } from './logger.js';

// Sessões com TTL para evitar memory leak.
// Sem TTL, cada número que mandar mensagem vive em memória para sempre.
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutos de inatividade

// Armazena o estado de cada conversa em memória
const sessoes = {};

// Limpa sessões inativas a cada 10 minutos
setInterval(() => {
    const agora = Date.now();
    let removidas = 0;
    for (const telefone of Object.keys(sessoes)) {
        if (agora - sessoes[telefone].ultimaAtividade > SESSION_TTL_MS) {
            delete sessoes[telefone];
            removidas++;
        }
    }
    if (removidas > 0) {
        logger.debug('session', `${removidas} sessão(ões) inativa(s) removida(s). Ativas: ${Object.keys(sessoes).length}`);
    }
}, 10 * 60 * 1000);

/**
 * Retorna ou cria a sessão do usuário, atualizando o timestamp de atividade.
 * @param {string} telefone
 * @returns {Object}
 */
function obterSessao(telefone) {
    if (!sessoes[telefone]) {
        sessoes[telefone] = {
            etapa: 'menu',
            agendamento: {},
            historico: [],
            ultimaAtividade: Date.now()
        };
        logger.debug('session', `Nova sessão criada para ${telefone}`);
    }
    sessoes[telefone].ultimaAtividade = Date.now();
    return sessoes[telefone];
}

/**
 * Adiciona uma interação ao histórico da sessão para contexto da IA.
 * Mantém no máximo 20 mensagens (10 pares user/assistant).
 * @param {Object} sessao
 * @param {string} mensagemUsuario
 * @param {string} respostaAssistente
 */
function registrarNoHistorico(sessao, mensagemUsuario, respostaAssistente) {
    sessao.historico.push({ role: 'user', content: mensagemUsuario });
    sessao.historico.push({ role: 'assistant', content: respostaAssistente });
    if (sessao.historico.length > 20) {
        sessao.historico.splice(0, sessao.historico.length - 20);
    }
}

/**
 * Processa a mensagem recebida e retorna a resposta adequada.
 * @param {string} telefone
 * @param {string} mensagem
 * @param {Object} config - Configuração do negócio
 * @returns {Promise<string>}
 */
export async function processarMensagem(telefone, mensagem, config) {
    const sessao = obterSessao(telefone);
    const texto = mensagem.trim();

    logger.debug('conversation', `[${telefone}] etapa="${sessao.etapa}" mensagem="${texto.slice(0, 60)}"`);

    // Fora do horário comercial — bloqueia apenas o início do fluxo (etapa: menu)
    if (!eHorarioComercial(config) && sessao.etapa === 'menu') {
        return config.mensagens.foraDoPeriodo;
    }

    switch (sessao.etapa) {

        case 'menu': {
            if (texto === '1') {
                sessao.etapa = 'escolher_servico';
                return `*Ótimo! Vamos agendar!* 📅\n\n${formatarServicos(config)}\nDigite o *número* do serviço desejado:`;
            }

            if (texto === '2') {
                const ativos = getAgendamentosAtivos(telefone);
                if (ativos.length === 0) {
                    return `Você não possui agendamentos ativos. 📋\n\nDigite *1* para fazer um agendamento.`;
                }
                let msg = `*📋 Seus agendamentos:*\n\n`;
                ativos.forEach(a => {
                    msg += `🆔 *ID:* ${a.id}\n📌 ${a.servico}\n📅 ${a.data} às ${a.horario}\n\n`;
                });
                return msg + `Digite *0* para voltar ao menu.`;
            }

            if (texto === '3') {
                sessao.etapa = 'cancelar';
                return `Para cancelar, informe o *ID* do agendamento.\n\n(Digite *0* para voltar ao menu)`;
            }

            if (texto === '4') {
                return formatarServicos(config) + `\nDigite *0* para voltar ao menu.`;
            }

            if (texto === '0') {
                return formatarBoasVindas(config);
            }

            // Passa histórico + agendamentos ativos para a IA ter contexto completo do cliente
            const agendamentosAtivos = getAgendamentosAtivos(telefone);
            const respostaIA = await perguntarIA(texto, config, sessao.historico, agendamentosAtivos);
            const respostaFinal = respostaIA + `\n\nDigite *0* para ver o menu principal.`;

            registrarNoHistorico(sessao, texto, respostaIA);

            return respostaFinal;
        }

        case 'escolher_servico': {
            if (texto === '0') {
                sessao.etapa = 'menu';
                return formatarBoasVindas(config);
            }
            const servico = config.servicos.find(s => s.id === parseInt(texto));
            if (!servico) return `Opção inválida. Digite o número do serviço ou *0* para voltar.`;
            sessao.agendamento.servico = servico.nome;
            sessao.agendamento.preco = servico.preco;
            sessao.etapa = 'escolher_data';
            return `Ótima escolha! *${servico.nome}* ✅\n\nInforme a *data* desejada:\n*DD/MM/AAAA*\n\nEx: 25/01/2025\n\n(Digite *0* para voltar)`;
        }

        case 'escolher_data': {
            if (texto === '0') {
                sessao.etapa = 'escolher_servico';
                return `Escolha o serviço:\n\n${formatarServicos(config)}`;
            }
            const { valido, data } = validarData(texto);
            if (!valido) return `Data inválida. Use o formato *DD/MM/AAAA*.\n\nEx: 25/01/2025`;

            const diaSemana = data.getDay();
            if (!config.horarioComercial.dias.includes(diaSemana)) {
                return `Não atendemos nesse dia. Escolha outra data. 📅`;
            }

            sessao.agendamento.data = texto;
            const horariosLivres = getHorariosDisponiveis(texto, config);
            if (horariosLivres.length === 0) {
                return `Não há horários disponíveis para *${texto}*. Escolha outra data:`;
            }

            sessao.etapa = 'escolher_horario';
            let msg = `*🕐 Horários disponíveis para ${texto}:*\n\n`;
            horariosLivres.forEach((h, i) => { msg += `${i + 1}. ${h}\n`; });
            return msg + `\nDigite o *número* do horário desejado:`;
        }

        case 'escolher_horario': {
            if (texto === '0') {
                sessao.etapa = 'escolher_data';
                return `Informe a data desejada (DD/MM/AAAA):`;
            }
            const horariosLivres = getHorariosDisponiveis(sessao.agendamento.data, config);
            const idx = parseInt(texto) - 1;
            if (isNaN(idx) || idx < 0 || idx >= horariosLivres.length) {
                return `Opção inválida. Digite o número do horário.`;
            }
            sessao.agendamento.horario = horariosLivres[idx];
            sessao.etapa = 'confirmar_nome';
            return `Qual é o seu *nome completo*? 😊\n\n_(Informe nome e sobrenome)_`;
        }

        case 'confirmar_nome': {
            const palavras = texto.trim().split(/\s+/);
            if (palavras.length < 2 || texto.trim().length < 5) {
                return `Por favor, informe seu *nome completo* (nome e sobrenome). 😊`;
            }
            sessao.agendamento.nome = texto.trim();
            sessao.etapa = 'confirmar_agendamento';
            const a = sessao.agendamento;
            return (
                `*📋 Confirme seu agendamento:*\n\n` +
                `👤 Nome: ${a.nome}\n` +
                `✂️ Serviço: ${a.servico}\n` +
                `📅 Data: ${a.data}\n` +
                `🕐 Horário: ${a.horario}\n` +
                `💰 Valor: ${a.preco}\n\n` +
                `Digite *SIM* para confirmar ou *NÃO* para cancelar.`
            );
        }

        case 'confirmar_agendamento': {
            if (texto.toLowerCase() === 'sim') {
                const a = sessao.agendamento;
                const id = gerarId();
                await salvarAgendamento({
                    id, telefone,
                    nome: a.nome,
                    servico: a.servico,
                    data: a.data,
                    horario: a.horario,
                    preco: a.preco,
                    status: 'confirmado',
                    criadoEm: new Date().toISOString(),
                    lembrete24h: false,
                    lembrete1h: false
                });
                logger.info('conversation', `Agendamento confirmado — ID: ${id} | ${a.servico} | ${a.data} ${a.horario} | ${telefone}`);
                sessao.etapa = 'menu';
                sessao.agendamento = {};
                return (
                    `✅ *Agendamento confirmado!*\n\n` +
                    `🆔 ID: *${id}*\n` +
                    `📅 ${a.data} às ${a.horario}\n` +
                    `✂️ ${a.servico}\n\n` +
                    `Guarde seu ID para cancelamentos.\n\nAté logo! ${config.emoji}`
                );
            }
            sessao.etapa = 'menu';
            sessao.agendamento = {};
            return `Agendamento cancelado. Até a próxima! 😊\n\n${formatarBoasVindas(config)}`;
        }

        case 'cancelar': {
            if (texto === '0') {
                sessao.etapa = 'menu';
                return formatarBoasVindas(config);
            }
            const cancelado = await cancelarAgendamento(telefone, texto.toUpperCase());
            sessao.etapa = 'menu';
            if (cancelado) {
                logger.info('conversation', `Agendamento cancelado — ID: ${texto.toUpperCase()} | ${telefone}`);
                return `✅ Agendamento *${texto.toUpperCase()}* cancelado!\n\n${formatarBoasVindas(config)}`;
            }
            return `❌ Agendamento não encontrado. Verifique o ID.\n\nDigite *0* para voltar ao menu.`;
        }

        default:
            sessao.etapa = 'menu';
            return formatarBoasVindas(config);
    }
}