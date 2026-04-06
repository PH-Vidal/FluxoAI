import { carregarAgendamentos, marcarLembreteEnviado } from './scheduler.js';
import { logger } from './logger.js';

// Intervalo de verificação de lembretes (padrão: 1 minuto)
// TODO [SQLite]: quando migrar para banco, substituir o polling (setInterval)
// por uma query SELECT com WHERE horario BETWEEN agora AND agora+24h,
// eliminando a necessidade de carregar todos os agendamentos a cada ciclo.
const INTERVALO_MS = parseInt(process.env.REMINDER_INTERVAL_MS || String(60 * 1000));

/**
 * Converte data "DD/MM/AAAA" e horário "HH:MM" em um objeto Date local.
 * @param {string} data - ex: "25/04/2025"
 * @param {string} horario - ex: "14:00"
 * @returns {Date}
 */
function parseDataHorario(data, horario) {
    const [dia, mes, ano] = data.split('/').map(Number);
    const [hora, minuto] = horario.split(':').map(Number);
    return new Date(ano, mes - 1, dia, hora, minuto);
}

/**
 * Inicializa o serviço de lembretes automáticos.
 * Dispara mensagens 24h e 1h antes de cada agendamento confirmado.
 * @param {import('whatsapp-web.js').Client} client
 * @param {Object} config
 */
export function iniciarLembretes(client, config) {
    logger.info('reminder', `Serviço de lembretes iniciado (intervalo: ${INTERVALO_MS / 1000}s)`);

    setInterval(async () => {
        try {
            const agora = new Date();
            const agendamentos = carregarAgendamentos();

            for (const a of agendamentos) {
                if (a.status !== 'confirmado') continue;

                let dtAgendamento;
                try {
                    dtAgendamento = parseDataHorario(a.data, a.horario);
                } catch {
                    logger.warn('reminder', `Data inválida no agendamento ID ${a.id} — pulando`);
                    continue;
                }

                const diffMs = dtAgendamento - agora;
                const diffHoras = diffMs / (1000 * 60 * 60);

                // ── Lembrete 24 horas antes ──────────────────────────────────────────
                if (!a.lembrete24h && diffHoras > 0 && diffHoras <= 24) {
                    try {
                        await client.sendMessage(
                            a.telefone,
                            `⏰ *Lembrete de agendamento!*\n\n` +
                            `Olá, ${a.nome}! Você tem um agendamento amanhã:\n\n` +
                            `✂️ *${a.servico}*\n` +
                            `📅 ${a.data} às ${a.horario}\n\n` +
                            `Para cancelar, acesse o menu e use o ID: *${a.id}*`
                        );
                        await marcarLembreteEnviado(a.id, '24h');
                        logger.info('reminder', `Lembrete 24h → ${a.telefone} (ID: ${a.id})`);
                    } catch (err) {
                        logger.error('reminder', `Falha ao enviar lembrete 24h (ID: ${a.id}):`, err?.message);
                    }
                }

                // ── Lembrete 1 hora antes ────────────────────────────────────────────
                if (!a.lembrete1h && diffHoras > 0 && diffHoras <= 1) {
                    try {
                        await client.sendMessage(
                            a.telefone,
                            `⏰ *Seu agendamento é em breve!*\n\n` +
                            `Olá, ${a.nome}! Em cerca de 1 hora você tem:\n\n` +
                            `✂️ *${a.servico}*\n` +
                            `📅 ${a.data} às ${a.horario}\n\n` +
                            `Te esperamos! ${config.emoji}`
                        );
                        await marcarLembreteEnviado(a.id, '1h');
                        logger.info('reminder', `Lembrete 1h → ${a.telefone} (ID: ${a.id})`);
                    } catch (err) {
                        logger.error('reminder', `Falha ao enviar lembrete 1h (ID: ${a.id}):`, err?.message);
                    }
                }
            }
        } catch (err) {
            logger.error('reminder', 'Erro inesperado no ciclo de lembretes:', err?.message);
        }
    }, INTERVALO_MS);
}
