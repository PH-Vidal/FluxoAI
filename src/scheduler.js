import fs from 'fs';
import path from 'path';

// TODO [SQLite]: substituir ARQUIVO_AGENDAMENTOS + fs.readFileSync/writeFileSync por
// conexão com better-sqlite3. Todas as funções abaixo têm anotações de como seria
// a query equivalente. A fila serial (_filaPromise) pode ser removida após a migração,
// pois o SQLite garante atomicidade nativamente via transações.
const ARQUIVO_AGENDAMENTOS = path.resolve('./data/agendamentos.json');

// Fila serial para eliminar race condition em leitura → modificação → escrita.
// Sem isso, dois usuários simultâneos podem sobrescrever o agendamento um do outro.
let _filaPromise = Promise.resolve();

function serializar(fn) {
    _filaPromise = _filaPromise.then(() => fn()).catch(() => fn());
    return _filaPromise;
}

/**
 * Carrega todos os agendamentos do arquivo JSON (uso interno).
 * TODO [SQLite]: substituir por `db.prepare('SELECT * FROM agendamentos').all()`
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
 * Carrega todos os agendamentos (leitura pública — não usa lock, apenas leitura).
 * TODO [SQLite]: `db.prepare('SELECT * FROM agendamentos').all()`
 * @returns {Array}
 */
export function carregarAgendamentos() {
    return _carregarAgendamentos();
}

/**
 * Salva um novo agendamento no arquivo JSON de forma serializada (sem race condition).
 * TODO [SQLite]: `db.prepare('INSERT INTO agendamentos VALUES (...)').run(agendamento)`
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
 * Marca um agendamento como cancelado de forma serializada.
 * Também compacta entradas canceladas com mais de 30 dias para evitar crescimento infinito.
 * TODO [SQLite]: `db.prepare("UPDATE agendamentos SET status='cancelado', canceladoEm=? WHERE id=? AND telefone=?").run(...)`
 *               A compactação vira: `db.prepare("DELETE FROM agendamentos WHERE status='cancelado' AND canceladoEm < ?").run(limite)`
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

        // Compacta cancelamentos com mais de 30 dias — evita crescimento infinito do arquivo
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
 * Marca um field de lembrete como enviado de forma serializada.
 * TODO [SQLite]: `db.prepare("UPDATE agendamentos SET lembrete24h=1 WHERE id=?").run(id)` (ou lembrete1h)
 * @param {string} id
 * @param {'24h'|'1h'} tipo
 * @returns {Promise<void>}
 */
export function marcarLembreteEnviado(id, tipo) {
    return serializar(() => {
        const agendamentos = _carregarAgendamentos();
        const idx = agendamentos.findIndex(a => a.id === id);
        if (idx === -1) return;

        const campo = tipo === '24h' ? 'lembrete24h' : 'lembrete1h';
        agendamentos[idx][campo] = true;
        agendamentos[idx][`${campo}Em`] = new Date().toISOString();

        fs.writeFileSync(ARQUIVO_AGENDAMENTOS, JSON.stringify(agendamentos, null, 2));
    });
}

/**
 * Retorna os horários já ocupados para uma data específica.
 * TODO [SQLite]: `db.prepare("SELECT horario FROM agendamentos WHERE data=? AND status!='cancelado'").all(data).map(r => r.horario)`
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
 * e filtrando horários que já passaram caso a data seja hoje (filtro intradiário).
 * TODO [SQLite]: a query de horarios ocupados muda conforme anotado em getHorariosOcupados;
 *               o filtro intradiário permanece em JavaScript após a query.
 * @param {string} data - formato DD/MM/AAAA
 * @param {Object} config - Configuração do negócio
 * @returns {string[]}
 */
export function getHorariosDisponiveis(data, config) {
    const ocupados = getHorariosOcupados(data);
    let disponiveis = config.horariosDisponiveis.filter(h => !ocupados.includes(h));

    // ── Filtro intradiário: remove horários que já passaram quando a data é hoje ──
    const { timezone = 'America/Sao_Paulo' } = config.horarioComercial;
    const agora = new Date();

    // Monta partes de data/hora no fuso do negócio
    const partes = Object.fromEntries(
        new Intl.DateTimeFormat('pt-BR', {
            timeZone: timezone,
            day:    '2-digit',
            month:  '2-digit',
            year:   'numeric',
            hour:   '2-digit',
            minute: '2-digit',
            hour12: false,
        })
        .formatToParts(agora)
        .map(({ type, value }) => [type, value])
    );

    const dataHoje = `${partes.day}/${partes.month}/${partes.year}`;

    if (data === dataHoje) {
        const horaAtual   = parseInt(partes.hour,   10);
        const minutoAtual = parseInt(partes.minute, 10);

        disponiveis = disponiveis.filter(h => {
            const [hh, mm] = h.split(':').map(Number);
            return hh > horaAtual || (hh === horaAtual && mm > minutoAtual);
        });
    }

    return disponiveis;
}

/**
 * Retorna os agendamentos ativos de um telefone.
 * TODO [SQLite]: `db.prepare("SELECT * FROM agendamentos WHERE telefone=? AND status!='cancelado'").all(telefone)`
 * @param {string} telefone
 * @returns {Array}
 */
export function getAgendamentosAtivos(telefone) {
    return _carregarAgendamentos().filter(
        a => a.telefone === telefone && a.status !== 'cancelado'
    );
}