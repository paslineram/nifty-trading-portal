const fs = require('fs');
const path = require('path');

function getWritableDataDir(subName = 'nifty_portal_data') {
    try {
        const d = path.join(__dirname, 'data');
        if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
        const testFile = path.join(d, '.test-write');
        fs.writeFileSync(testFile, 'ok');
        fs.unlinkSync(testFile);
        return d;
    } catch (_) {
        const d = path.join(process.env.TMPDIR || '/tmp', subName);
        if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
        return d;
    }
}

const TELEGRAM_API = 'https://api.telegram.org';
const DATA_DIR = getWritableDataDir('nifty_telegram_data');
const STATE_FILE = path.join(DATA_DIR, 'telegram_state.json');

function defaultState() {
    return {
        seeded: false,
        sentKeys: [],
        logs: [],
        lastCheckAt: null,
        lastSentAt: null
    };
}

function loadTelegramState() {
    try {
        if (!fs.existsSync(STATE_FILE)) return defaultState();
        const raw = fs.readFileSync(STATE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return {
            seeded: Boolean(parsed?.seeded),
            sentKeys: Array.isArray(parsed?.sentKeys) ? parsed.sentKeys.slice(-600) : [],
            logs: Array.isArray(parsed?.logs) ? parsed.logs.slice(0, 100) : [],
            lastCheckAt: parsed?.lastCheckAt || null,
            lastSentAt: parsed?.lastSentAt || null
        };
    } catch (_) {
        return defaultState();
    }
}

function saveTelegramState(state) {
    try {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        const trimmed = {
            seeded: Boolean(state.seeded),
            sentKeys: (state.sentKeys || []).slice(-600),
            logs: (state.logs || []).slice(0, 100),
            lastCheckAt: state.lastCheckAt || null,
            lastSentAt: state.lastSentAt || null
        };
        fs.writeFileSync(STATE_FILE, JSON.stringify(trimmed, null, 2), 'utf8');
    } catch (_) {}
}

function escapeHtml(v) {
    return String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function fmtNum(n) {
    return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function fmtIstNow() {
    return new Date().toLocaleString('en-GB', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).replace(',', '') + ' IST';
}

function lotSizeFor(indexKey) {
    return String(indexKey || '').toUpperCase().includes('SENSEX') ? 20 : 25;
}

function buildEntryKey(instKey, sig) {
    return `ENTRY|${instKey}|${sig.ts || sig.time}|${sig.side}|${sig.ref}`;
}

function buildExitKey(instKey, sig) {
    if (!sig.exitReason) return null;
    return `EXIT|${instKey}|${sig.ts || sig.time}|${sig.exitReason}|${sig.exitTs || sig.exitTime || sig.exitPrice}`;
}

function formatSignalMessage(inst, sig, eventType) {
    const lot = lotSizeFor(inst.key);
    const isBull = /PE/.test(sig.side || '');
    const dirLabel = isBull ? 'Bullish (Sell PE)' : 'Bearish (Sell CE)';

    if (eventType === 'EXIT') {
        const pts = Number(sig.pts || 0);
        const pnl = Math.round(pts * lot);
        const pnlSign = pnl >= 0 ? '+' : '-';
        const ptsSign = pts > 0 ? '+' : '';
        const icon = sig.exitReason === 'TP1'
            ? '🎯'
            : sig.exitReason === 'TL BREAK'
                ? '⚠️'
                : sig.exitReason === 'SL'
                    ? '🛑'
                    : '🔔';
        return [
            `${icon} <b>${escapeHtml(inst.key)} — EXIT (${escapeHtml(sig.exitReason)})</b>`,
            `<b>Side:</b> ${escapeHtml(sig.side)} · ${dirLabel}`,
            `<b>Entry:</b> ${fmtNum(sig.ref)} → <b>Exit:</b> ${fmtNum(sig.exitPrice)}`,
            `<b>Result (1 Lot = ${lot}):</b> ${ptsSign}${fmtNum(pts)} pts (${pnlSign}₹${fmtNum(Math.abs(pnl))})`,
            `<b>Entry Time:</b> ${escapeHtml(sig.time || '-')} | <b>Exit Time:</b> ${escapeHtml(sig.exitTime || '-')}`,
            `<i>Setup: ${escapeHtml(sig.setup || 'OB/FVG')}</i>`
        ].join('\n');
    }

    const icon = isBull ? '🟢' : '🔴';
    const riskPts = Math.abs(Number(sig.ref) - Number(sig.sl));
    const rewardPts = Math.abs(Number(sig.tp1) - Number(sig.ref));
    return [
        `${icon} <b>${escapeHtml(inst.key)} — NEW SIGNAL: ${escapeHtml(sig.side)}</b>`,
        `<b>Bias:</b> ${dirLabel} | <b>Setup:</b> ${escapeHtml(sig.setup || 'OB/FVG')}`,
        `<b>Ref Spot:</b> ${fmtNum(sig.ref)}`,
        `<b>SL:</b> ${fmtNum(sig.sl)} (${fmtNum(riskPts)} pts) | <b>TP1:</b> ${fmtNum(sig.tp1)} (${fmtNum(rewardPts)} pts)`,
        `<b>Single Lot Size:</b> ${lot} qty`,
        `<b>Indicators:</b> ST ${escapeHtml(inst.supertrend || '-')} · HMA ${escapeHtml(inst.hmaSlope || '-')} · ADX ${escapeHtml(inst.adx ?? '-')}`,
        `<b>Signal Bar:</b> ${escapeHtml(sig.time || '-')} IST`
    ].join('\n');
}

function buildBotUrl(token, method) {
    const cleanToken = String(token || '').trim();
    const encodedToken = encodeURIComponent(cleanToken).replace(/%3A/gi, ':');
    return `${TELEGRAM_API}/bot${encodedToken}/${method}`;
}

async function verifyTelegramBot(token) {
    const cleanToken = String(token || '').trim();
    if (!cleanToken) {
        return { verified: false, bot: null, error: null, httpStatus: null, checkedAt: null };
    }
    try {
        const resp = await fetch(buildBotUrl(cleanToken, 'getMe'), {
            method: 'GET',
            signal: AbortSignal.timeout(8000)
        });
        const payload = await resp.json().catch(() => ({}));
        if (resp.ok && payload?.ok && payload?.result) {
            const b = payload.result;
            return {
                verified: true,
                bot: {
                    id: b.id,
                    username: b.username || '',
                    firstName: b.first_name || 'Telegram Bot'
                },
                error: null,
                httpStatus: resp.status,
                checkedAt: new Date().toISOString()
            };
        }
        return {
            verified: false,
            bot: null,
            error: payload?.description || `Telegram API returned HTTP ${resp.status}`,
            httpStatus: resp.status,
            checkedAt: new Date().toISOString()
        };
    } catch (err) {
        return {
            verified: false,
            bot: null,
            error: err?.message || 'Could not reach Telegram Bot API',
            httpStatus: null,
            checkedAt: new Date().toISOString()
        };
    }
}

async function sendTelegramMessage(token, chatId, htmlText) {
    const cleanToken = String(token || '').trim();
    const cleanChatId = String(chatId || '').trim();
    if (!cleanToken || !cleanChatId) {
        return { ok: false, error: 'Telegram Bot Token and Chat ID are required.' };
    }
    try {
        const resp = await fetch(buildBotUrl(cleanToken, 'sendMessage'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: cleanChatId,
                text: htmlText,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            }),
            signal: AbortSignal.timeout(10000)
        });
        const payload = await resp.json().catch(() => ({}));
        if (resp.ok && payload?.ok) {
            return { ok: true, messageId: payload.result?.message_id || null, error: null };
        }
        return {
            ok: false,
            messageId: null,
            error: payload?.description || `Telegram API returned HTTP ${resp.status}`
        };
    } catch (err) {
        return {
            ok: false,
            messageId: null,
            error: err?.message || 'Failed to send Telegram message'
        };
    }
}

let stateQueue = Promise.resolve();
function withStateLock(fn) {
    const run = stateQueue.then(fn, fn);
    stateQueue = run.catch(() => {});
    return run;
}

function appendLog(state, entry) {
    state.logs.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        loggedAt: fmtIstNow(),
        ...entry
    });
    if (state.logs.length > 100) state.logs.length = 100;
}

async function dispatchAndLog(state, config, { index, type, eventSummary, text, sig }) {
    if (!config.telegramBotToken || !config.telegramChatId) {
        const err = 'Missing Bot Token or Chat ID';
        appendLog(state, {
            index,
            type,
            side: sig?.side || '-',
            price: sig?.exitPrice ?? sig?.ref ?? '-',
            setup: sig?.setup || '-',
            summary: eventSummary,
            status: 'SKIPPED',
            error: err
        });
        return { ok: false, status: 'SKIPPED', error: err };
    }
    const res = await sendTelegramMessage(config.telegramBotToken, config.telegramChatId, text);
    if (res.ok) state.lastSentAt = new Date().toISOString();
    appendLog(state, {
        index,
        type,
        side: sig?.side || '-',
        price: sig?.exitPrice ?? sig?.ref ?? '-',
        setup: sig?.setup || '-',
        summary: eventSummary,
        status: res.ok ? 'SENT' : 'FAILED',
        messageId: res.messageId || null,
        error: res.error || null
    });
    return { ok: res.ok, status: res.ok ? 'SENT' : 'FAILED', error: res.error || null, messageId: res.messageId || null };
}

async function processSnapshotForTelegram(snapshot, config, options = {}) {
    return withStateLock(async () => {
        const state = loadTelegramState();
        state.lastCheckAt = new Date().toISOString();
        const seen = new Set(state.sentKeys || []);
        const instruments = Array.isArray(snapshot?.instruments) ? snapshot.instruments : [];
        const activeInsts = instruments.filter(i => i.signalsEnabled !== false);
        const results = [];

        if (options.sendLatest) {
            for (const inst of activeInsts) {
                const sig = (inst.signals || [])[0];
                if (!sig) continue;
                const eventType = sig.exitReason ? 'EXIT' : 'ENTRY';
                const text = formatSignalMessage(inst, sig, eventType);
                const summary = eventType === 'EXIT'
                    ? `${sig.side} ${sig.exitReason} @ ${sig.exitPrice} (${sig.pts >= 0 ? '+' : ''}${sig.pts} pts)`
                    : `${sig.side} @ ${sig.ref} (SL ${sig.sl} / TP1 ${sig.tp1})`;
                const out = await dispatchAndLog(state, config, {
                    index: inst.key,
                    type: eventType,
                    eventSummary: summary,
                    text,
                    sig
                });
                if (out.ok) {
                    const key = eventType === 'EXIT' ? buildExitKey(inst.key, sig) : buildEntryKey(inst.key, sig);
                    if (key) seen.add(key);
                }
                results.push({ index: inst.key, type: eventType, ...out });
            }
            state.sentKeys = Array.from(seen).slice(-600);
            saveTelegramState(state);
            return { seededJustNow: false, dispatched: results, state };
        }

        // Baseline historical replay signals on first boot so restarts never spam old signals
        if (!state.seeded) {
            for (const inst of instruments) {
                for (const sig of (inst.signals || [])) {
                    seen.add(buildEntryKey(inst.key, sig));
                    const exKey = buildExitKey(inst.key, sig);
                    if (exKey) seen.add(exKey);
                }
            }
            state.sentKeys = Array.from(seen).slice(-600);
            state.seeded = true;
            saveTelegramState(state);
            return { seededJustNow: true, dispatched: [], state };
        }

        const canDispatch = Boolean(config.telegramEnabled && config.telegramBotToken && config.telegramChatId);

        for (const inst of activeInsts) {
            // Evaluate oldest-to-newest so chronological order is preserved if multiple fire together
            const ordered = [...(inst.signals || [])].reverse();
            for (const sig of ordered) {
                const entryKey = buildEntryKey(inst.key, sig);
                if (!seen.has(entryKey) && canDispatch) {
                    if (config.telegramNotifyEntries !== false) {
                        const out = await dispatchAndLog(state, config, {
                            index: inst.key,
                            type: 'ENTRY',
                            eventSummary: `${sig.side} @ ${sig.ref} (SL ${sig.sl} / TP1 ${sig.tp1})`,
                            text: formatSignalMessage(inst, sig, 'ENTRY'),
                            sig
                        });
                        if (out.ok) seen.add(entryKey);
                        results.push({ index: inst.key, type: 'ENTRY', ...out });
                    } else {
                        seen.add(entryKey);
                    }
                }

                const exitKey = buildExitKey(inst.key, sig);
                if (exitKey && !seen.has(exitKey) && canDispatch) {
                    if (config.telegramNotifyExits !== false) {
                        const out = await dispatchAndLog(state, config, {
                            index: inst.key,
                            type: 'EXIT',
                            eventSummary: `${sig.side} ${sig.exitReason} @ ${sig.exitPrice} (${sig.pts >= 0 ? '+' : ''}${sig.pts} pts)`,
                            text: formatSignalMessage(inst, sig, 'EXIT'),
                            sig
                        });
                        if (out.ok) seen.add(exitKey);
                        results.push({ index: inst.key, type: 'EXIT', ...out });
                    } else {
                        seen.add(exitKey);
                    }
                }
            }
        }

        state.sentKeys = Array.from(seen).slice(-600);
        saveTelegramState(state);
        return { seededJustNow: false, dispatched: results, state };
    });
}

async function sendTestTelegramAlert(config, activeSnapshot = null) {
    return withStateLock(async () => {
        const state = loadTelegramState();
        const activeList = (activeSnapshot?.instruments || [])
            .filter(i => i.signalsEnabled !== false)
            .map(i => `${i.key}: ${fmtNum(i.price)} (${i.bias})`)
            .join('\n');

        const text = [
            `✅ <b>Paslin Trading Portal — Telegram Connected</b>`,
            `Signal alerts are active for <b>${escapeHtml(config.instrument || 'BOTH')}</b>.`,
            `<b>Lot Sizes:</b> NIFTY 25 · SENSEX 20`,
            `<b>Rules:</b> Entry = ${config.telegramNotifyEntries !== false ? 'ON' : 'OFF'} · Exit (TP1/SL/TL Break) = ${config.telegramNotifyExits !== false ? 'ON' : 'OFF'}`,
            activeList ? `\n<b>Current Market Snapshot:</b>\n${escapeHtml(activeList)}` : '',
            `\n<i>${escapeHtml(fmtIstNow())}</i>`
        ].filter(Boolean).join('\n');

        const out = await dispatchAndLog(state, config, {
            index: config.instrument || 'BOTH',
            type: 'TEST',
            eventSummary: 'Manual connection test alert',
            text,
            sig: { side: 'TEST', ref: '-', setup: 'Telegram Check' }
        });
        saveTelegramState(state);
        return { ...out, state };
    });
}

function clearTelegramLogs() {
    return withStateLock(async () => {
        const state = loadTelegramState();
        state.logs = [];
        saveTelegramState(state);
        return state;
    });
}

function getTelegramAlertsForDashboard() {
    const state = loadTelegramState();
    return (state.logs || []).slice(0, 15).map(l => ({
        logged: l.loggedAt || '-',
        index: l.index || '-',
        bar: l.type || '-',
        side: l.side || '-',
        ref: l.price ?? '-',
        sl: l.status || '-',
        tp1: l.error ? `Err: ${l.error}` : (l.summary || '-'),
        setup: l.setup || '-'
    }));
}

module.exports = {
    loadTelegramState,
    saveTelegramState,
    verifyTelegramBot,
    sendTelegramMessage,
    processSnapshotForTelegram,
    sendTestTelegramAlert,
    clearTelegramLogs,
    getTelegramAlertsForDashboard,
    formatSignalMessage
};
