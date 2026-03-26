import fs from 'fs';
import path from 'path';

const ARQUIVO_AGENDAMENTOS = path.resolve('./data/agendamentos.json');

// FIX: fila serial para eliminar race condition em leitura → modificação → escrita
// Sem isso, dois usuários simultâneos podem sobrescrever o agendamento um do outro
let _filaPromise = Promise.resolve();

function serializar(fn) {
    _filaPromise = _filaPromise.then(() => fn()).catch(() => fn());
    return _filaPromise;
}

/**
 * Carrega todos os agendamentos do arquivo JSON (uso interno)
 * @returns {Array}
 */
function _carregarAgendamentos() {
    if (!fs.existsSync(ARQUIVO_AGENDAMENTOS)) {
        fs.writeFileSync(ARQUIVO_AGENDAMENTOS, JSON.stringify([]));
    }
    try {
        return JSON.parse(fs.readFileSync(ARQUIVO_AGENDAMENTOS, 'utf-8'));
    } catch {
        return [];
    }
}

/**
 * Carrega todos os agendamentos (leitura pública — não usa lock, apenas leitura)
 * @returns {Array}
 */
export function carregarAgendamentos() {
    return _carregarAgendamentos();
}

/**
 * Salva um novo agendamento no arquivo JSON de forma serializada (sem race condition)
 * @param {Object} agendamento
 * @returns {Promise<void>}
 */
export function salvarAgendamento(agendamento) {
    return serializar(() => {
        const agendamentos = _carregarAgendamentos();
        agendamentos.push(agendamento);
        fs.writeFileSync(ARQUIVO_AGENDAMENTOS, JSON.stringify(agendamentos, null, 2));
    });
}

/**
 * Marca um agendamento como cancelado de forma serializada
 * FIX: também compacta entradas canceladas com mais de 30 dias para evitar crescimento infinito do arquivo
 * @param {string} telefone
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export function cancelarAgendamento(telefone, id) {
    return serializar(() => {
        const agendamentos = _carregarAgendamentos();
        const index = agendamentos.findIndex(a => a.id === id && a.telefone === telefone);
        if (index === -1) return false;

        agendamentos[index].status = 'cancelado';
        agendamentos[index].canceladoEm = new Date().toISOString();

        // FIX: compacta cancelamentos com mais de 30 dias — evita crescimento infinito do arquivo
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

        const compactado = agendamentos.filter(a => {
            if (a.status !== 'cancelado') return true;
            const canceladoEm = new Date(a.canceladoEm || 0);
            return canceladoEm > trintaDiasAtras;
        });

        fs.writeFileSync(ARQUIVO_AGENDAMENTOS, JSON.stringify(compactado, null, 2));
        return true;
    });
}

/**
 * Retorna os horários já ocupados para uma data específica
 * @param {string} data - formato DD/MM/AAAA
 * @returns {string[]}
 */
export function getHorariosOcupados(data) {
    return _carregarAgendamentos()
        .filter(a => a.data === data && a.status !== 'cancelado')
        .map(a => a.horario);
}

/**
 * Retorna os horários disponíveis para uma data, excluindo os ocupados
 * @param {string} data - formato DD/MM/AAAA
 * @param {Object} config - Configuração do negócio
 * @returns {string[]}
 */
export function getHorariosDisponiveis(data, config) {
    const ocupados = getHorariosOcupados(data);
    return config.horariosDisponiveis.filter(h => !ocupados.includes(h));
}

/**
 * Retorna os agendamentos ativos de um telefone
 * @param {string} telefone
 * @returns {Array}
 */
export function getAgendamentosAtivos(telefone) {
    return _carregarAgendamentos().filter(
        a => a.telefone === telefone && a.status !== 'cancelado'
    );
}