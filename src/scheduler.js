import fs from 'fs';
import path from 'path';

const ARQUIVO_AGENDAMENTOS = path.resolve('./data/agendamentos.json');

/**
 * Carrega todos os agendamentos do arquivo JSON
 * @returns {Array}
 */
export function carregarAgendamentos() {
    if (!fs.existsSync(ARQUIVO_AGENDAMENTOS)) {
        fs.writeFileSync(ARQUIVO_AGENDAMENTOS, JSON.stringify([]));
    }
    return JSON.parse(fs.readFileSync(ARQUIVO_AGENDAMENTOS, 'utf-8'));
}

/**
 * Salva um novo agendamento no arquivo JSON
 * @param {Object} agendamento
 */
export function salvarAgendamento(agendamento) {
    const agendamentos = carregarAgendamentos();
    agendamentos.push(agendamento);
    fs.writeFileSync(ARQUIVO_AGENDAMENTOS, JSON.stringify(agendamentos, null, 2));
}

/**
 * Marca um agendamento como cancelado
 * @param {string} telefone
 * @param {string} id
 * @returns {boolean}
 */
export function cancelarAgendamento(telefone, id) {
    const agendamentos = carregarAgendamentos();
    const index = agendamentos.findIndex(a => a.id === id && a.telefone === telefone);
    if (index === -1) return false;
    agendamentos[index].status = 'cancelado';
    fs.writeFileSync(ARQUIVO_AGENDAMENTOS, JSON.stringify(agendamentos, null, 2));
    return true;
}

/**
 * Retorna os horários já ocupados para uma data específica
 * @param {string} data - formato DD/MM/AAAA
 * @returns {string[]}
 */
export function getHorariosOcupados(data) {
    return carregarAgendamentos()
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
    return carregarAgendamentos().filter(
        a => a.telefone === telefone && a.status !== 'cancelado'
    );
}