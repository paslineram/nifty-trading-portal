const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { getLiveMarketSnapshot, clearMarketCache, runBacktestSimulation, fetchUpstoxBrokerJournal, getStockChartAnalysis, scanNifty50OrderBlocks } = require('./upstoxMarket');
const {
    loadTelegramState,
    verifyTelegramBot,
    processSnapshotForTelegram,
    sendTestTelegramAlert,
    clearTelegramLogs,
    getTelegramAlertsForDashboard
} = require('./telegramNotifier');
const {
    loadOrderState,
    executeUpstoxOrderSignal,
    fetchUpstoxOrderBook,
    processSnapshotForAutoOrder,
    clearOrderLogs
} = require('./upstoxOrders');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let appConfig = {
    upstoxToken: process.env.UPSTOX_ACCESS_TOKEN || '',
    instrument: 'BOTH',
    lotSize: 25,
    actionType: 'BOTH',
    maxTrades: 3,
    obMaxAge: 25,
    impATR: 0.8,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
    telegramEnabled: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    telegramNotifyEntries: true,
    telegramNotifyExits: true,
    telegramAutoMonitor: true,
    upstoxSandboxToken: process.env.UPSTOX_SANDBOX_TOKEN || '',
    upstoxOrderMode: 'DRY_RUN',
    upstoxAutoOrder: false,
    upstoxOrderProduct: 'I',
    upstoxOrderLots: 1,
    upstoxTokenUpdatedAt: null,
    upstoxTokenDay: null
};

let botState = { status: 'Idle', lastSignal: 'None', tradesToday: 0, currentPnL: 0.0, gammaEnv: 'Neutral', distanceToWall: 145.5 };
let settingsSavedAt = null;

function getUpstoxTradingDayIST(date = new Date()) {
    // Upstox access tokens expire daily at 03:30 IST (IST = UTC+05:30 => IST - 03:30 = UTC+02:00)
    const shifted = new Date(date.getTime() + 2 * 60 * 60 * 1000);
    return shifted.toISOString().slice(0, 10);
}

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

const CONFIG_DIR = getWritableDataDir('nifty_portal_data');
const CONFIG_FILE = path.join(CONFIG_DIR, 'app_config.json');
const TELEGRAM_CONFIG_FILE = path.join(CONFIG_DIR, 'telegram_config.json');
const TELEGRAM_KEYS = ['telegramBotToken', 'telegramChatId', 'telegramEnabled', 'telegramNotifyEntries', 'telegramNotifyExits', 'telegramAutoMonitor'];

function loadAppConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                if (parsed.settingsSavedAt) settingsSavedAt = parsed.settingsSavedAt;
                const { settingsSavedAt: _savedAt, ...cfgFields } = parsed;
                for (const [k, v] of Object.entries(cfgFields)) {
                    if (v === undefined || v === null) continue;
                    if (['upstoxToken', 'telegramBotToken', 'telegramChatId', 'upstoxSandboxToken'].includes(k)) {
                        const s = String(v).trim();
                        if (s !== '') appConfig[k] = s;
                    } else {
                        appConfig[k] = v;
                    }
                }
            }
        }
    } catch (_) {}
    try {
        if (fs.existsSync(TELEGRAM_CONFIG_FILE)) {
            const raw = fs.readFileSync(TELEGRAM_CONFIG_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                for (const k of TELEGRAM_KEYS) {
                    const v = parsed[k];
                    if (v === undefined || v === null) continue;
                    if (k === 'telegramBotToken' || k === 'telegramChatId') {
                        const s = String(v).trim();
                        if (s !== '') appConfig[k] = s;
                    } else {
                        appConfig[k] = v;
                    }
                }
            }
        }
    } catch (_) {}
}

function saveTelegramConfig() {
    try {
        if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
        const tgOnly = {};
        for (const k of TELEGRAM_KEYS) tgOnly[k] = appConfig[k];
        fs.writeFileSync(TELEGRAM_CONFIG_FILE, JSON.stringify({ ...tgOnly, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
    } catch (_) {}
}

function saveAppConfig() {
    try {
        if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
        fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...appConfig, settingsSavedAt }, null, 2), 'utf8');
        saveTelegramConfig();
    } catch (_) {}
}

loadAppConfig();

const JOURNAL_DIR = getWritableDataDir('nifty_journal_data');
const JOURNAL_FILE = path.join(JOURNAL_DIR, 'journal.json');

function loadJournalEntries() {
    try {
        if (!fs.existsSync(JOURNAL_FILE)) return [];
        const raw = fs.readFileSync(JOURNAL_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
        return [];
    }
}

function saveJournalEntries(entries) {
    try {
        if (!fs.existsSync(JOURNAL_DIR)) fs.mkdirSync(JOURNAL_DIR, { recursive: true });
        fs.writeFileSync(JOURNAL_FILE, JSON.stringify(entries, null, 2), 'utf8');
    } catch (_) {}
}

function formatNowIST() {
    return new Date().toLocaleString('en-GB', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false
    }).replace(',', '');
}

function computeTradePnl(side, entryPrice, exitPrice, qty) {
    if (exitPrice == null || exitPrice === '' || Number.isNaN(Number(exitPrice))) return null;
    const ep = Number(entryPrice), xp = Number(exitPrice), q = Number(qty || 1);
    const isLongSide = /^(BUY|SELL PE)/i.test(String(side || ''));
    const diff = isLongSide ? (xp - ep) : (ep - xp);
    return Math.round(diff * q);
}

function computeJournalSummary(entries) {
    const closed = entries.filter(e => e.status === 'Closed' && e.pnl != null);
    const openCount = entries.filter(e => e.status !== 'Closed').length;
    const wins = closed.filter(e => Number(e.pnl) > 0);
    const losses = closed.filter(e => Number(e.pnl) < 0);
    const grossWin = wins.reduce((s, e) => s + Number(e.pnl), 0);
    const grossLoss = Math.abs(losses.reduce((s, e) => s + Number(e.pnl), 0));
    const netPnl = Math.round(closed.reduce((s, e) => s + Number(e.pnl || 0), 0));
    const winRate = closed.length ? Math.round((wins.length / closed.length) * 1000) / 10 : 0;
    const profitFactor = grossLoss > 0 ? Math.round((grossWin / grossLoss) * 100) / 100 : (grossWin > 0 ? '∞' : 0);
    const bestPnl = closed.length ? Math.max(...closed.map(e => Number(e.pnl))) : 0;
    const worstPnl = closed.length ? Math.min(...closed.map(e => Number(e.pnl))) : 0;
    return {
        total: entries.length,
        openCount,
        closedCount: closed.length,
        wins: wins.length,
        losses: losses.length,
        winRate: `${winRate}%`,
        netPnl,
        profitFactor,
        bestPnl: Math.round(bestPnl),
        worstPnl: Math.round(worstPnl)
    };
}

let strategyJournalCache = { ts: 0, instrument: '', data: null };

// Live market snapshot is provided by ./upstoxMarket.js using Upstox v2/v3 APIs.

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || 'nifty2026';
    if (username === adminUser && password === adminPass) {
        res.json({ success: true, token: 'mock-jwt-session-token-xyz' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

app.get('/api/market', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    try {
        const force = req.query.force === '1';
        const currentDay = getUpstoxTradingDayIST();
        const lastCheckMs = upstoxState.checkedAt ? Date.parse(upstoxState.checkedAt) : 0;
        const retryTransientProfile = !upstoxState.verified && upstoxState.httpStatus !== 401 && (!lastCheckMs || (Date.now() - lastCheckMs) > 20000);
        const needsProfileCheck = Boolean(
            appConfig.upstoxToken &&
            (!upstoxState.checkedAt || upstoxState.checkedDay !== currentDay || retryTransientProfile)
        );
        const [data] = await Promise.all([
            getLiveMarketSnapshot(appConfig.upstoxToken, appConfig.instrument, force),
            needsProfileCheck ? fetchUpstoxProfile(appConfig.upstoxToken).catch(() => null) : Promise.resolve(null)
        ]);
        if (data.quoteAuthFailed && appConfig.upstoxToken) {
            upstoxState = {
                verified: false,
                profile: null,
                error: data.quoteError || 'Upstox token expired (HTTP 401)',
                httpStatus: data.quoteHttpStatus || 401,
                checkedAt: new Date().toISOString(),
                checkedDay: currentDay
            };
        } else if (data.source === 'upstox-live' && appConfig.upstoxToken && !upstoxState.verified) {
            await fetchUpstoxProfile(appConfig.upstoxToken).catch(() => null);
        }
        await Promise.all([
            processSnapshotForTelegram(data, appConfig).catch(() => null),
            processSnapshotForAutoOrder(data, appConfig).catch(() => null)
        ]);
        const tgState = loadTelegramState();
        res.json({
            ...data,
            alerts: getTelegramAlertsForDashboard(),
            upstoxDaily: getUpstoxDailyStatus(),
            telegramStatus: {
                enabled: Boolean(appConfig.telegramEnabled),
                autoMonitor: Boolean(appConfig.telegramAutoMonitor),
                hasToken: Boolean(appConfig.telegramBotToken),
                hasChatId: Boolean(appConfig.telegramChatId),
                lastSentAt: tgState.lastSentAt || null,
                lastCheckAt: tgState.lastCheckAt || null,
                permanent: true
            }
        });
    } catch (err) {
        res.status(502).json({ error: err?.message || 'Failed to load Upstox market data' });
    }
});

app.get('/api/xray/stock/:symbol', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    try {
        const tf = req.query.tf || '5m';
        const days = req.query.days || 2;
        const force = req.query.force === '1';
        const data = await getStockChartAnalysis(req.params.symbol, {
            timeframe: tf,
            days,
            force,
            token: appConfig.upstoxToken
        });
        res.json({ success: true, ...data });
    } catch (err) {
        res.status(400).json({ success: false, error: err?.message || 'Could not load stock chart' });
    }
});

app.get('/api/xray/ob-radar', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    try {
        const tf = req.query.tf || '5m';
        const maxDistPct = req.query.maxDist || 0.25;
        const force = req.query.force === '1';
        const data = await scanNifty50OrderBlocks({
            timeframe: tf,
            maxDistPct,
            force,
            token: appConfig.upstoxToken
        });
        res.json({ success: true, ...data });
    } catch (err) {
        res.status(502).json({ success: false, error: err?.message || 'Failed to scan NIFTY 50 Order Blocks' });
    }
});
let upstoxState = {
    verified: false,
    profile: null,
    error: null,
    checkedAt: null,
    checkedDay: null
};
let telegramBotState = {
    verified: false,
    bot: null,
    error: null,
    httpStatus: null,
    checkedAt: null
};

function maskToken(tok) {
    if (!tok) return '';
    if (tok.length <= 8) return '****';
    return tok.slice(0, 4) + '••••' + tok.slice(-4);
}

function getUpstoxDailyStatus() {
    const currentDay = getUpstoxTradingDayIST();
    const hasToken = Boolean(appConfig.upstoxToken);
    const tokenDay = appConfig.upstoxTokenDay || null;
    const isStaleDay = Boolean(hasToken && tokenDay && tokenDay !== currentDay && !upstoxState.verified);
    const isUnauthorized = Boolean(
        hasToken && upstoxState.checkedAt && !upstoxState.verified &&
        (upstoxState.httpStatus === 401 || /invalid|expired|unauthoriz/i.test(String(upstoxState.error || '')))
    );
    const needsDailyUpdate = !hasToken || isStaleDay || isUnauthorized;
    let reason = `Active for ${tokenDay || currentDay}`;
    if (!hasToken) {
        reason = 'Upstox daily token not set for today';
    } else if (isUnauthorized) {
        reason = `Upstox daily token rejected (${upstoxState.error || 'HTTP 401'}) — update today's token`;
    } else if (isStaleDay) {
        reason = `Upstox token from ${tokenDay} expired (03:30 IST daily reset) — update today's token`;
    } else if (tokenDay && tokenDay !== currentDay && !upstoxState.verified) {
        reason = `Token saved on ${tokenDay} — daily update recommended for ${currentDay}`;
    }
    return {
        currentDay,
        tokenDay,
        updatedAt: appConfig.upstoxTokenUpdatedAt || null,
        hasToken,
        isStaleDay,
        isUnauthorized,
        needsDailyUpdate,
        reason
    };
}

function getSafeConfig() {
    const { upstoxToken, telegramBotToken, upstoxSandboxToken, ...rest } = appConfig;
    return {
        ...rest,
        hasUpstoxToken: Boolean(upstoxToken),
        upstoxTokenMasked: maskToken(upstoxToken),
        hasUpstoxSandboxToken: Boolean(upstoxSandboxToken),
        upstoxSandboxTokenMasked: maskToken(upstoxSandboxToken),
        hasTelegramToken: Boolean(telegramBotToken),
        telegramTokenMasked: maskToken(telegramBotToken)
    };
}

async function ensureTelegramVerified() {
    if (!appConfig.telegramBotToken) {
        telegramBotState = { verified: false, bot: null, error: null, httpStatus: null, checkedAt: null };
        return telegramBotState;
    }
    const lastMs = telegramBotState.checkedAt ? Date.parse(telegramBotState.checkedAt) : 0;
    const retryFailed = !telegramBotState.verified && (!lastMs || (Date.now() - lastMs) > 30000);
    if (!telegramBotState.checkedAt || retryFailed) {
        telegramBotState = await verifyTelegramBot(appConfig.telegramBotToken);
    }
    return telegramBotState;
}

async function fetchUpstoxProfile(token) {
    const currentDay = getUpstoxTradingDayIST();
    if (!token) {
        upstoxState = { verified: false, profile: null, error: null, checkedAt: null, checkedDay: null };
        return upstoxState;
    }
    try {
        const resp = await fetch('https://api.upstox.com/v2/user/profile', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            signal: AbortSignal.timeout(8000)
        });
        const payload = await resp.json().catch(() => ({}));
        if (resp.ok && payload && payload.status === 'success' && payload.data) {
            const d = payload.data;
            upstoxState = {
                verified: true,
                profile: {
                    id: d.user_id || null,
                    ...d
                },
                error: null,
                httpStatus: resp.status,
                checkedAt: new Date().toISOString(),
                checkedDay: currentDay
            };
            if (!appConfig.upstoxTokenDay || appConfig.upstoxTokenDay !== currentDay) {
                appConfig.upstoxTokenDay = currentDay;
                if (!appConfig.upstoxTokenUpdatedAt) appConfig.upstoxTokenUpdatedAt = upstoxState.checkedAt;
                saveAppConfig();
            }
        } else {
            const msg = payload?.errors?.[0]?.message || payload?.message || `Upstox returned HTTP ${resp.status}`;
            upstoxState = {
                verified: false,
                profile: null,
                error: msg,
                httpStatus: resp.status,
                checkedAt: new Date().toISOString(),
                checkedDay: currentDay
            };
        }
    } catch (err) {
        upstoxState = {
            verified: false,
            profile: null,
            error: err?.message || 'Could not reach Upstox API',
            httpStatus: null,
            checkedAt: new Date().toISOString(),
            checkedDay: currentDay
        };
    }
    return upstoxState;
}

app.get('/api/settings', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    const currentDay = getUpstoxTradingDayIST();
    const lastCheckMs = upstoxState.checkedAt ? Date.parse(upstoxState.checkedAt) : 0;
    const retryTransient = !upstoxState.verified && upstoxState.httpStatus !== 401 && (!lastCheckMs || (Date.now() - lastCheckMs) > 15000);
    if (appConfig.upstoxToken && (!upstoxState.checkedAt || upstoxState.checkedDay !== currentDay || retryTransient)) {
        await fetchUpstoxProfile(appConfig.upstoxToken);
    }
    await ensureTelegramVerified();
    res.json({
        success: true,
        savedAt: settingsSavedAt,
        appConfig: getSafeConfig(),
        upstox: upstoxState,
        upstoxDaily: getUpstoxDailyStatus(),
        telegram: telegramBotState
    });
});

app.post('/api/settings', async (req, res) => {
    const hadTelegramCreds = Boolean(appConfig.telegramBotToken && appConfig.telegramChatId);
    const body = req.body || {};
    const allowed = [
        'upstoxToken', 'instrument', 'lotSize', 'actionType', 'maxTrades', 'obMaxAge', 'impATR',
        'telegramBotToken', 'telegramChatId', 'telegramEnabled', 'telegramNotifyEntries', 'telegramNotifyExits', 'telegramAutoMonitor',
        'upstoxSandboxToken', 'upstoxOrderMode', 'upstoxAutoOrder', 'upstoxOrderProduct', 'upstoxOrderLots'
    ];
    let upstoxTokenUpdated = false;
    let tgTokenUpdated = false;
    for (const key of allowed) {
        if (body[key] !== undefined) {
            if (key === 'instrument') {
                const inst = String(body[key]).toUpperCase();
                if (['NIFTY', 'SENSEX', 'BOTH'].includes(inst)) appConfig.instrument = inst;
            } else if (['telegramEnabled', 'telegramNotifyEntries', 'telegramNotifyExits', 'telegramAutoMonitor', 'upstoxAutoOrder'].includes(key)) {
                appConfig[key] = body[key] === true || body[key] === 'true';
            } else if (['upstoxSandboxToken', 'upstoxToken', 'telegramBotToken'].includes(key)) {
                const trimmed = String(body[key]).trim();
                if (trimmed !== '') {
                    if (key === 'upstoxToken') upstoxTokenUpdated = true;
                    if (key === 'telegramBotToken') tgTokenUpdated = true;
                    appConfig[key] = trimmed;
                }
            } else if (key === 'telegramChatId') {
                appConfig.telegramChatId = String(body[key]).trim();
            } else if (key === 'upstoxOrderMode') {
                const m = String(body[key]).toUpperCase();
                if (['DRY_RUN', 'SANDBOX', 'LIVE'].includes(m)) appConfig.upstoxOrderMode = m;
            } else if (key === 'upstoxOrderProduct') {
                const p = String(body[key]).toUpperCase();
                if (['I', 'D'].includes(p)) appConfig.upstoxOrderProduct = p;
            } else if (key === 'upstoxOrderLots') {
                appConfig[key] = Math.max(1, Math.min(50, Number(body[key]) || 1));
            } else {
                appConfig[key] = body[key];
            }
        }
    }
    if (!hadTelegramCreds && appConfig.telegramBotToken && appConfig.telegramChatId && body.telegramEnabled === undefined) {
        appConfig.telegramEnabled = true;
    }
    const nowIso = new Date().toISOString();
    if (upstoxTokenUpdated) {
        appConfig.upstoxTokenUpdatedAt = nowIso;
        appConfig.upstoxTokenDay = getUpstoxTradingDayIST();
        upstoxState.checkedAt = null;
    }
    if (tgTokenUpdated) {
        telegramBotState.checkedAt = null;
    }
    settingsSavedAt = nowIso;
    saveAppConfig();
    clearMarketCache();

    if (upstoxTokenUpdated || (appConfig.upstoxToken && !upstoxState.verified)) {
        await fetchUpstoxProfile(appConfig.upstoxToken);
    }
    await ensureTelegramVerified();
    if (appConfig.telegramEnabled && appConfig.telegramAutoMonitor && appConfig.telegramBotToken && appConfig.telegramChatId) {
        setImmediate(() => { runBackgroundSignalMonitor(); });
    }

    res.json({
        success: true,
        savedAt: settingsSavedAt,
        appConfig: getSafeConfig(),
        upstox: upstoxState,
        upstoxDaily: getUpstoxDailyStatus(),
        telegram: telegramBotState
    });
});

app.post('/api/upstox/token', async (req, res) => {
    const body = req.body || {};
    const tok = typeof body.upstoxToken === 'string' ? body.upstoxToken.trim() : '';
    const sTok = typeof body.upstoxSandboxToken === 'string' ? body.upstoxSandboxToken.trim() : '';
    if (!tok && !sTok) {
        return res.status(400).json({ success: false, message: 'Please paste a valid daily Upstox Access Token.' });
    }
    const nowIso = new Date().toISOString();
    if (tok) {
        appConfig.upstoxToken = tok;
        appConfig.upstoxTokenUpdatedAt = nowIso;
        appConfig.upstoxTokenDay = getUpstoxTradingDayIST();
        upstoxState.checkedAt = null;
    }
    if (sTok) {
        appConfig.upstoxSandboxToken = sTok;
    }
    settingsSavedAt = nowIso;
    saveAppConfig();
    clearMarketCache();

    if (appConfig.upstoxToken) {
        await fetchUpstoxProfile(appConfig.upstoxToken);
    }
    await ensureTelegramVerified();

    res.json({
        success: true,
        savedAt: settingsSavedAt,
        appConfig: getSafeConfig(),
        upstox: upstoxState,
        upstoxDaily: getUpstoxDailyStatus(),
        telegram: telegramBotState
    });
});

app.get('/api/dashboard', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    const entries = loadJournalEntries();
    res.json({ botState, appConfig: getSafeConfig(), tradeHistory: entries });
});

app.get('/api/journal', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    try {
        const entries = loadJournalEntries();
        const force = req.query.force === '1';
        const now = Date.now();
        const needReplay = force || !strategyJournalCache.data || strategyJournalCache.instrument !== appConfig.instrument || (now - strategyJournalCache.ts) > 60000;

        const [broker, replay] = await Promise.all([
            fetchUpstoxBrokerJournal(appConfig.upstoxToken),
            needReplay
                ? runBacktestSimulation({
                    instrument: appConfig.instrument,
                    lookbackDays: 14,
                    lots: 1,
                    niftyLotSize: 25,
                    sensexLotSize: 60,
                    obMaxAge: appConfig.obMaxAge,
                    maxTradesPerDay: appConfig.maxTrades,
                    useTrendlineExit: true
                }).catch(() => null)
                : Promise.resolve(strategyJournalCache.data)
        ]);

        if (needReplay && replay) {
            strategyJournalCache = { ts: now, instrument: appConfig.instrument, data: replay };
        }

        res.json({
            success: true,
            entries,
            summary: computeJournalSummary(entries),
            broker,
            strategyTrades: replay?.trades || [],
            strategySummary: replay ? {
                startDate: replay.startDate,
                endDate: replay.endDate,
                totalTrades: replay.totalTrades,
                winRate: replay.winRate,
                netPnL: replay.netPnL,
                netPnLRaw: replay.netPnLRaw,
                netPts: replay.netPts
            } : null
        });
    } catch (err) {
        res.status(502).json({ success: false, error: err?.message || 'Failed to load trade journal' });
    }
});

app.post('/api/journal', (req, res) => {
    const body = req.body || {};
    const symbol = String(body.symbol || '').trim().toUpperCase();
    const entryPrice = Number(body.entryPrice);
    if (!symbol || !Number.isFinite(entryPrice) || entryPrice <= 0) {
        return res.status(400).json({ success: false, error: 'Symbol and valid entry price are required.' });
    }

    const side = String(body.side || 'SELL PE').trim().toUpperCase();
    const lots = Math.max(1, Number(body.lots) || 1);
    const defaultLot = /SENSEX/.test(symbol) ? 60 : 25;
    const lotSize = Math.max(1, Number(body.lotSize) || defaultLot);
    const qty = Math.max(1, Number(body.qty) || (lots * lotSize));
    const exitPrice = (body.exitPrice !== undefined && body.exitPrice !== '' && body.exitPrice !== null)
        ? Number(body.exitPrice)
        : null;
    const isClosed = exitPrice != null && Number.isFinite(exitPrice) && exitPrice > 0;
    const explicitPnl = (body.pnl !== undefined && body.pnl !== '' && body.pnl !== null && Number.isFinite(Number(body.pnl)))
        ? Math.round(Number(body.pnl))
        : null;
    const pnl = explicitPnl != null ? explicitPnl : (isClosed ? computeTradePnl(side, entryPrice, exitPrice, qty) : null);

    const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        entryTime: String(body.entryTime || formatNowIST()).trim(),
        exitTime: isClosed ? String(body.exitTime || formatNowIST()).trim() : null,
        symbol,
        side,
        lots,
        lotSize,
        qty,
        entryPrice: Math.round(entryPrice * 100) / 100,
        exitPrice: isClosed ? Math.round(exitPrice * 100) / 100 : null,
        sl: body.sl ? Number(body.sl) : null,
        tp: body.tp ? Number(body.tp) : null,
        exitReason: isClosed ? String(body.exitReason || 'MANUAL').trim().toUpperCase() : null,
        setup: String(body.setup || 'OB/FVG').trim(),
        notes: String(body.notes || '').trim(),
        pnl,
        status: isClosed ? 'Closed' : 'Open'
    };

    const entries = loadJournalEntries();
    entries.unshift(entry);
    saveJournalEntries(entries);
    res.json({ success: true, entry, entries, summary: computeJournalSummary(entries) });
});

app.patch('/api/journal/:id', (req, res) => {
    const id = req.params.id;
    const body = req.body || {};
    const entries = loadJournalEntries();
    const idx = entries.findIndex(e => String(e.id) === String(id));
    if (idx === -1) return res.status(404).json({ success: false, error: 'Journal entry not found' });

    const cur = { ...entries[idx] };
    if (body.exitPrice !== undefined && body.exitPrice !== '' && body.exitPrice !== null) {
        const xp = Number(body.exitPrice);
        if (!Number.isFinite(xp) || xp <= 0) return res.status(400).json({ success: false, error: 'Invalid exit price' });
        cur.exitPrice = Math.round(xp * 100) / 100;
        cur.exitTime = String(body.exitTime || formatNowIST()).trim();
        cur.exitReason = String(body.exitReason || cur.exitReason || 'MANUAL').trim().toUpperCase();
        cur.status = 'Closed';
        cur.pnl = computeTradePnl(cur.side, cur.entryPrice, cur.exitPrice, cur.qty);
    }
    if (body.notes !== undefined) cur.notes = String(body.notes).trim();
    if (body.setup !== undefined) cur.setup = String(body.setup).trim();
    if (body.status === 'Open') {
        cur.status = 'Open';
        cur.exitPrice = null;
        cur.exitTime = null;
        cur.exitReason = null;
        cur.pnl = null;
    }

    entries[idx] = cur;
    saveJournalEntries(entries);
    res.json({ success: true, entry: cur, entries, summary: computeJournalSummary(entries) });
});

app.delete('/api/journal/:id', (req, res) => {
    const id = req.params.id;
    const entries = loadJournalEntries();
    const next = entries.filter(e => String(e.id) !== String(id));
    saveJournalEntries(next);
    res.json({ success: true, entries: next, summary: computeJournalSummary(next) });
});

app.post('/api/backtest', async (req, res) => {
    try {
        const body = req.body || {};
        const results = await runBacktestSimulation({
            instrument: body.instrument || appConfig.instrument,
            lookbackDays: body.lookbackDays,
            lots: body.lots ?? 1,
            niftyLotSize: body.niftyLotSize ?? 25,
            sensexLotSize: body.sensexLotSize ?? 60,
            obMaxAge: body.obMaxAge ?? appConfig.obMaxAge,
            rrRatio: body.rrRatio,
            maxTradesPerDay: body.maxTradesPerDay ?? appConfig.maxTrades,
            useTrendlineExit: body.useTrendlineExit
        });
        res.json({ success: true, results });
    } catch (err) {
        res.status(502).json({ success: false, error: err?.message || 'Backtest simulation failed' });
    }
});

app.get('/api/telegram', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    await ensureTelegramVerified();
    res.json({
        success: true,
        appConfig: getSafeConfig(),
        telegram: telegramBotState,
        state: loadTelegramState()
    });
});

function buildEffectiveTelegramConfig(body = {}) {
    const instRaw = typeof body.instrument === 'string' ? body.instrument.trim().toUpperCase() : '';
    const tokenOverride = typeof body.telegramBotToken === 'string' ? body.telegramBotToken.trim() : '';
    const chatIdOverride = body.telegramChatId !== undefined ? String(body.telegramChatId).trim() : '';
    return {
        ...appConfig,
        ...(tokenOverride ? { telegramBotToken: tokenOverride } : {}),
        ...(chatIdOverride ? { telegramChatId: chatIdOverride } : {}),
        ...(['NIFTY', 'SENSEX', 'BOTH'].includes(instRaw) ? { instrument: instRaw } : {})
    };
}

app.post('/api/telegram/settings', async (req, res) => {
    const hadTelegramCreds = Boolean(appConfig.telegramBotToken && appConfig.telegramChatId);
    const body = req.body || {};
    if (typeof body.telegramBotToken === 'string' && body.telegramBotToken.trim()) {
        appConfig.telegramBotToken = body.telegramBotToken.trim();
        telegramBotState.checkedAt = null;
    }
    if (body.telegramChatId !== undefined) {
        appConfig.telegramChatId = String(body.telegramChatId).trim();
    }
    if (body.telegramEnabled !== undefined) {
        appConfig.telegramEnabled = body.telegramEnabled === true || body.telegramEnabled === 'true';
    } else if (!hadTelegramCreds && appConfig.telegramBotToken && appConfig.telegramChatId) {
        appConfig.telegramEnabled = true;
    }
    if (body.telegramNotifyEntries !== undefined) {
        appConfig.telegramNotifyEntries = body.telegramNotifyEntries === true || body.telegramNotifyEntries === 'true';
    }
    if (body.telegramNotifyExits !== undefined) {
        appConfig.telegramNotifyExits = body.telegramNotifyExits === true || body.telegramNotifyExits === 'true';
    }
    if (body.telegramAutoMonitor !== undefined) {
        appConfig.telegramAutoMonitor = body.telegramAutoMonitor === true || body.telegramAutoMonitor === 'true';
    }
    if (!appConfig.telegramBotToken) {
        telegramBotState = { verified: false, bot: null, error: null, httpStatus: null, checkedAt: null };
    } else {
        await ensureTelegramVerified();
    }
    settingsSavedAt = new Date().toISOString();
    saveAppConfig();
    if (appConfig.telegramEnabled && appConfig.telegramAutoMonitor && appConfig.telegramBotToken && appConfig.telegramChatId) {
        setImmediate(() => { runBackgroundSignalMonitor(); });
    }
    res.json({
        success: true,
        savedAt: settingsSavedAt,
        appConfig: getSafeConfig(),
        telegram: telegramBotState,
        state: loadTelegramState()
    });
});

app.post('/api/telegram/test', async (req, res) => {
    try {
        const effConfig = buildEffectiveTelegramConfig(req.body || {});
        const snapshot = await Promise.race([
            getLiveMarketSnapshot(effConfig.upstoxToken, effConfig.instrument, false).catch(() => null),
            new Promise(resolve => setTimeout(() => resolve(null), 2500))
        ]);
        const result = await sendTestTelegramAlert(effConfig, snapshot);
        res.status(result.ok ? 200 : 400).json({
            success: result.ok,
            status: result.status,
            messageId: result.messageId || null,
            error: result.error || null,
            state: result.state,
            appConfig: getSafeConfig(),
            telegram: telegramBotState
        });
    } catch (err) {
        res.status(502).json({ success: false, error: err?.message || 'Telegram test failed' });
    }
});

app.post('/api/telegram/check', async (req, res) => {
    try {
        const body = req.body || {};
        const sendLatest = Boolean(body.sendLatest);
        const effConfig = buildEffectiveTelegramConfig(body);
        const snapshot = await getLiveMarketSnapshot(effConfig.upstoxToken, effConfig.instrument, true);
        const result = await processSnapshotForTelegram(snapshot, effConfig, { sendLatest });
        res.json({
            success: true,
            sendLatest,
            seededJustNow: result.seededJustNow,
            dispatched: result.dispatched,
            state: result.state,
            appConfig: getSafeConfig()
        });
    } catch (err) {
        res.status(502).json({ success: false, error: err?.message || 'Signal check failed' });
    }
});

app.delete('/api/telegram/logs', async (req, res) => {
    const state = await clearTelegramLogs();
    res.json({ success: true, state });
});

app.get('/api/upstox/orders', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    const orderBook = await fetchUpstoxOrderBook(appConfig.upstoxToken);
    res.json({
        success: true,
        appConfig: getSafeConfig(),
        upstoxDaily: getUpstoxDailyStatus(),
        state: loadOrderState(),
        orderBook
    });
});

app.post('/api/upstox/order-config', (req, res) => {
    const body = req.body || {};
    if (typeof body.upstoxSandboxToken === 'string' && body.upstoxSandboxToken.trim()) {
        appConfig.upstoxSandboxToken = body.upstoxSandboxToken.trim();
    }
    if (body.upstoxOrderMode !== undefined) {
        const m = String(body.upstoxOrderMode).toUpperCase();
        if (['DRY_RUN', 'SANDBOX', 'LIVE'].includes(m)) appConfig.upstoxOrderMode = m;
    }
    if (body.upstoxAutoOrder !== undefined) {
        appConfig.upstoxAutoOrder = body.upstoxAutoOrder === true || body.upstoxAutoOrder === 'true';
    }
    if (body.upstoxOrderProduct !== undefined) {
        const p = String(body.upstoxOrderProduct).toUpperCase();
        if (['I', 'D'].includes(p)) appConfig.upstoxOrderProduct = p;
    }
    if (body.upstoxOrderLots !== undefined) {
        appConfig.upstoxOrderLots = Math.max(1, Math.min(50, Number(body.upstoxOrderLots) || 1));
    }
    settingsSavedAt = new Date().toISOString();
    saveAppConfig();
    res.json({
        success: true,
        savedAt: settingsSavedAt,
        appConfig: getSafeConfig()
    });
});

app.post('/api/upstox/order-signal', async (req, res) => {
    try {
        const body = req.body || {};
        const index = String(body.index || (appConfig.instrument === 'SENSEX' ? 'SENSEX' : 'NIFTY')).toUpperCase();
        let spotPrice = body.spotPrice ? Number(body.spotPrice) : null;
        if (!spotPrice) {
            const snap = await getLiveMarketSnapshot(appConfig.upstoxToken, appConfig.instrument, false).catch(() => null);
            const match = (snap?.instruments || []).find(i => i.key === index);
            if (match?.price) spotPrice = match.price;
        }

        const result = await executeUpstoxOrderSignal({
            index,
            side: body.side || 'SELL PE',
            spotPrice,
            lots: body.lots || appConfig.upstoxOrderLots || 1,
            product: body.product || appConfig.upstoxOrderProduct || 'I',
            orderType: body.orderType || 'MARKET',
            limitPrice: body.limitPrice,
            isAmo: Boolean(body.isAmo),
            mode: body.mode || appConfig.upstoxOrderMode || 'DRY_RUN',
            tag: body.tag
        }, appConfig);

        const orderBook = await fetchUpstoxOrderBook(appConfig.upstoxToken);
        res.status(result.ok ? 200 : 400).json({
            success: result.ok,
            log: result.log,
            state: result.state,
            orderBook,
            appConfig: getSafeConfig()
        });
    } catch (err) {
        res.status(502).json({ success: false, error: err?.message || 'Upstox order signal check failed' });
    }
});

app.post('/api/upstox/order-test', async (req, res) => {
    try {
        const body = req.body || {};
        const snap = await getLiveMarketSnapshot(appConfig.upstoxToken, appConfig.instrument, false);
        const activeInsts = (snap?.instruments || []).filter(i => i.signalsEnabled !== false);
        const requestedIdx = body.index ? String(body.index).toUpperCase() : null;
        const pickedInst = (requestedIdx && activeInsts.find(i => i.key === requestedIdx))
            || activeInsts.find(i => (i.signals || []).length)
            || activeInsts[0]
            || snap?.instruments?.[0];

        if (!pickedInst) {
            return res.status(400).json({ success: false, error: 'No instrument market snapshot available' });
        }

        const latestSig = (pickedInst.signals || [])[0];
        const side = body.side || latestSig?.side || (pickedInst.supertrend === 'DOWN' ? 'SELL CE' : 'SELL PE');
        const spotPrice = latestSig?.ref || pickedInst.price;
        const mode = ['DRY_RUN', 'SANDBOX', 'LIVE'].includes(String(body.mode || '').toUpperCase())
            ? String(body.mode).toUpperCase()
            : (appConfig.upstoxOrderMode || 'DRY_RUN');

        const result = await executeUpstoxOrderSignal({
            index: pickedInst.key,
            side,
            spotPrice,
            lots: body.lots || appConfig.upstoxOrderLots || 1,
            product: body.product || appConfig.upstoxOrderProduct || 'I',
            orderType: body.orderType || 'MARKET',
            isAmo: Boolean(body.isAmo),
            mode,
            tag: `sig-test-${pickedInst.key.slice(0, 3).toLowerCase()}`
        }, appConfig);

        const orderBook = await fetchUpstoxOrderBook(appConfig.upstoxToken);
        res.status(result.ok ? 200 : 400).json({
            success: result.ok,
            sourceSignal: latestSig || { time: 'Live Spot', side, ref: spotPrice, setup: 'Sample Signal' },
            log: result.log,
            state: result.state,
            orderBook,
            appConfig: getSafeConfig()
        });
    } catch (err) {
        res.status(502).json({ success: false, error: err?.message || 'Upstox signal test failed' });
    }
});

app.delete('/api/upstox/orders', async (req, res) => {
    const state = await clearOrderLogs();
    res.json({ success: true, state });
});

app.post('/api/bot/toggle', (req, res) => {
    botState.status = req.body.active ? 'Running' : 'Stopped';
    res.json({ success: true, botState });
});

let tgMonitorRunning = false;
async function runBackgroundSignalMonitor() {
    if (tgMonitorRunning) return;
    tgMonitorRunning = true;
    try {
        const tgState = loadTelegramState();
        const ordState = loadOrderState();
        const tgActive = appConfig.telegramEnabled && appConfig.telegramAutoMonitor && appConfig.telegramBotToken && appConfig.telegramChatId;
        const ordActive = appConfig.upstoxAutoOrder && appConfig.upstoxToken;
        const shouldPoll = !tgState.seeded || !ordState.seeded || tgActive || ordActive;
        if (!shouldPoll) return;
        const snapshot = await getLiveMarketSnapshot(appConfig.upstoxToken, appConfig.instrument, true);
        await Promise.all([
            processSnapshotForTelegram(snapshot, appConfig),
            processSnapshotForAutoOrder(snapshot, appConfig)
        ]);
    } catch (_) {
        // Keep background monitor resilient on transient network errors
    } finally {
        tgMonitorRunning = false;
    }
}

if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Nifty Trading Portal running on port ${PORT}`);
        if (appConfig.upstoxToken) fetchUpstoxProfile(appConfig.upstoxToken).catch(() => null);
        if (appConfig.telegramBotToken) ensureTelegramVerified().catch(() => null);
        setTimeout(() => { runBackgroundSignalMonitor(); }, 3000);
        setInterval(() => { runBackgroundSignalMonitor(); }, 30000);
    });
}

module.exports = app;
