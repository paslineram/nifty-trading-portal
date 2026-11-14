const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { getLiveMarketSnapshot, clearMarketCache } = require('./upstoxMarket');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let appConfig = {
    upstoxToken: process.env.UPSTOX_ACCESS_TOKEN || '',
    instrument: 'NIFTY',
    lotSize: 25,
    actionType: 'BOTH',
    maxTrades: 3,
    obMaxAge: 25,
    impATR: 0.8
};

let botState = { status: 'Idle', lastSignal: 'None', tradesToday: 0, currentPnL: 0.0, gammaEnv: 'Neutral', distanceToWall: 145.5 };

let tradeHistory = [
    { id: 1, time: '2026-11-13 09:30:00', symbol: 'NIFTY', type: 'BUY', price: 23040.5, pnl: 1250.0, status: 'Closed' },
    { id: 2, time: '2026-11-13 11:15:00', symbol: 'NIFTY', type: 'SELL', price: 23120.0, pnl: -450.0, status: 'Closed' }
];

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
    try {
        const data = await getLiveMarketSnapshot(appConfig.upstoxToken);
        res.json(data);
    } catch (err) {
        res.status(502).json({ error: err?.message || 'Failed to load Upstox market data' });
    }
});
let upstoxState = {
    verified: false,
    profile: null,
    error: null,
    checkedAt: null
};
let settingsSavedAt = null;

function maskToken(tok) {
    if (!tok) return '';
    if (tok.length <= 8) return '****';
    return tok.slice(0, 4) + '••••' + tok.slice(-4);
}

function getSafeConfig() {
    const { upstoxToken, ...rest } = appConfig;
    return {
        ...rest,
        hasUpstoxToken: Boolean(upstoxToken),
        upstoxTokenMasked: maskToken(upstoxToken)
    };
}

async function fetchUpstoxProfile(token) {
    if (!token) {
        upstoxState = { verified: false, profile: null, error: null, checkedAt: null };
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
                checkedAt: new Date().toISOString()
            };
        } else {
            const msg = payload?.errors?.[0]?.message || payload?.message || `Upstox returned HTTP ${resp.status}`;
            upstoxState = {
                verified: false,
                profile: null,
                error: msg,
                httpStatus: resp.status,
                checkedAt: new Date().toISOString()
            };
        }
    } catch (err) {
        upstoxState = {
            verified: false,
            profile: null,
            error: err?.message || 'Could not reach Upstox API',
            checkedAt: new Date().toISOString()
        };
    }
    return upstoxState;
}

app.get('/api/settings', async (req, res) => {
    if (appConfig.upstoxToken && !upstoxState.checkedAt) {
        await fetchUpstoxProfile(appConfig.upstoxToken);
    }
    res.json({
        success: true,
        savedAt: settingsSavedAt,
        appConfig: getSafeConfig(),
        upstox: upstoxState
    });
});

app.post('/api/settings', async (req, res) => {
    const body = req.body || {};
    const prevToken = appConfig.upstoxToken;
    const allowed = ['upstoxToken', 'instrument', 'lotSize', 'actionType', 'maxTrades', 'obMaxAge', 'impATR'];
    for (const key of allowed) {
        if (body[key] !== undefined && body[key] !== '') {
            appConfig[key] = body[key];
        }
    }
    settingsSavedAt = new Date().toISOString();
    clearMarketCache();

    if (body.upstoxToken || (appConfig.upstoxToken && !upstoxState.verified)) {
        await fetchUpstoxProfile(appConfig.upstoxToken);
    }

    res.json({
        success: true,
        savedAt: settingsSavedAt,
        appConfig: getSafeConfig(),
        upstox: upstoxState
    });
});

app.get('/api/dashboard', (req, res) => res.json({ botState, appConfig: getSafeConfig(), tradeHistory }));

app.post('/api/backtest', (req, res) => {
    res.json({
        success: true,
        results: {
            totalTrades: 142, winRate: '64.8%', profitFactor: 2.14,
            maxDrawdown: '₹ 8,450', netPnL: '₹ 1,24,600',
            equityCurve: [100000, 104000, 102500, 111000, 118000, 115000, 124600],
            trades: tradeHistory
        }
    });
});

app.post('/api/bot/toggle', (req, res) => {
    botState.status = req.body.active ? 'Running' : 'Stopped';
    res.json({ success: true, botState });
});

if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => console.log(`Nifty Trading Portal running on port ${PORT}`));
}

module.exports = app;
