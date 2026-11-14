const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

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

let botState = {
    status: 'Idle',
    lastSignal: 'None',
    tradesToday: 0,
    currentPnL: 0.0,
    gammaEnv: 'Neutral',
    distanceToWall: 145.5
};

let tradeHistory = [
    { id: 1, time: '2026-11-13 09:30:00', symbol: 'NIFTY', type: 'BUY', price: 23040.5, pnl: 1250.0, status: 'Closed' },
    { id: 2, time: '2026-11-13 11:15:00', symbol: 'NIFTY', type: 'SELL', price: 23120.0, pnl: -450.0, status: 'Closed' }
];

// ---- Market snapshot used by the Live dashboard ----
// Replace the values below with real Upstox-derived calculations when ready.
// The front end only depends on this JSON shape.
function marketSnapshot() {
    return {
        asOf: '15-min bar: Fri 13 Nov 15:15 IST',
        marketOpen: false,
        instruments: [
            {
                key: 'NIFTY', price: 25144.30, change: -155.0, changePct: -0.61,
                bias: 'BEARISH - SELL CE / BUY PE',
                supertrend: 'DOWN', hmaSlope: 'UP', adx: 28, atr: 34.8, paperPts: -30,
                sideways: { score: 0, total: 6, checks: [
                    { pass: false, name: 'Wide CPR (range-day sign)', note: 'CPR width 0.09% vs 20-day median 0.30%' },
                    { pass: false, name: 'Weak trend (ADX < 22)', note: 'ADX 28' },
                    { pass: false, name: 'Price between S1 and R1', note: '25,144 OUTSIDE 25,167 - 25,408' },
                    { pass: false, name: 'No big gap at open', note: 'gap 0.35%' },
                    { pass: false, name: 'HMA flat', note: 'HMA moved 16 pts in 4 bars' },
                    { pass: false, name: 'Small range so far', note: 'today 192 pts vs yesterday 242' }
                ]},
                chain: { pcrAtm: 0.82, pcrTotal: 0.83, putWall: 25000, callWall: 25500, maxPain: 25100,
                    expiry: '2026-11-17',
                    ladder: [
                        { strike: 24850, call: 60, put: 70 }, { strike: 24950, call: 65, put: 45 },
                        { strike: 25050, call: 75, put: 30 }, { strike: 25150, call: 77, put: 20 },
                        { strike: 25250, call: 80, put: 10 }, { strike: 25350, call: 83, put: 5 }
                    ]},
                seller: {
                    gamma: { good: true, label: 'POSITIVE +12,349 Cr', note: 'dealers dampen moves' },
                    iv: { good: true, label: 'India VIX 15.5', note: 'above 69% of last year' }
                },
                agents: [
                    { name: 'Trend / Supertrend', vote: 'BEAR', note: 'Supertrend DOWN, below CPR' },
                    { name: 'OI / PCR', vote: 'BEAR', note: 'PCR 0.82 (calls heavy = resistance)' },
                    { name: 'Breadth', vote: 'BEAR', note: '53 up / 163 down' }
                ],
                composite: { score: -2, text: 'SELL CE side (bearish)' },
                levels: [
                    { name: 'R2', v: 25518 }, { name: 'R1', v: 25408, diff: 264 }, { name: 'CPR top', v: 25288, diff: 143 },
                    { name: 'Pivot', v: 25276, diff: 131 }, { name: 'CPR bot', v: 25264 }, { name: 'S1', v: 25167, diff: 22 },
                    { name: 'Prev Low', v: 25143, diff: -1 }
                ],
                why: {
                    pe: 'price on wrong side of CPR; Supertrend points other way; 1-hour trend against it.',
                    ce: 'price on wrong side of HMA; too close to support/resistance; 1-hour trend against it.'
                },
                signals: [
                    { time: '13 Nov 12:30', setup: 'OB/FVG', type: 'SELL CE', ref: 25110, sl: 25200, tp1: 25019 }
                ]
            },
            {
                key: 'SENSEX', price: 81592.45, change: -318.6, changePct: -0.39,
                bias: 'BEARISH - SELL CE / BUY PE',
                supertrend: 'DOWN', hmaSlope: 'UP', adx: 27, atr: 107.1, paperPts: -112,
                sideways: { score: 2, total: 6, checks: [
                    { pass: false, name: 'Wide CPR', note: 'CPR width 0.03%' },
                    { pass: false, name: 'Weak trend', note: 'ADX 27' },
                    { pass: true, name: 'Price between S1 and R1', note: '81,592 inside' },
                    { pass: true, name: 'No big gap at open', note: 'gap 0.09%' },
                    { pass: false, name: 'HMA flat', note: 'moved 74 pts' },
                    { pass: false, name: 'Small range so far', note: '591 pts' }
                ]},
                chain: { pcrAtm: 0.83, pcrTotal: 0.91, putWall: 81500, callWall: 81500, maxPain: 81500,
                    expiry: '2026-11-19',
                    ladder: [
                        { strike: 80600, call: 55, put: 68 }, { strike: 81000, call: 60, put: 40 },
                        { strike: 81400, call: 70, put: 25 }, { strike: 81600, call: 75, put: 15 },
                        { strike: 81800, call: 79, put: 8 }, { strike: 82200, call: 81, put: 4 }
                    ]},
                seller: {
                    gamma: { good: true, label: 'POSITIVE', note: 'dealers dampen moves' },
                    iv: { good: true, label: 'India VIX 15.5', note: 'above 69% of last year' }
                },
                agents: [
                    { name: 'Trend / Supertrend', vote: 'BEAR', note: 'Supertrend DOWN' },
                    { name: 'OI / PCR', vote: 'BEAR', note: 'PCR 0.83' },
                    { name: 'Breadth', vote: 'BEAR', note: 'majority of constituents down' }
                ],
                composite: { score: -2, text: 'SELL CE side (bearish)' },
                levels: [
                    { name: 'R2', v: 82687 }, { name: 'R1', v: 82299 }, { name: 'CPR top', v: 81951 },
                    { name: 'CPR bot', v: 81924 }, { name: 'S1', v: 81550 }, { name: 'Prev Low', v: 81576 }
                ],
                why: {
                    pe: 'price on wrong side of CPR; Supertrend points other way; 1-hour trend against it.',
                    ce: 'price on wrong side of HMA; too close to support/resistance; 1-hour trend against it.'
                },
                signals: [
                    { time: '13 Nov 10:15', setup: 'OB/FVG', type: 'SELL CE', ref: 81703, sl: 82046, tp1: 81361 },
                    { time: '11 Nov 10:15', setup: 'OB/FVG', type: 'SELL PE', ref: 82298, sl: 81921, tp1: 82674 }
                ]
            }
        ]
    };
}

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

app.get('/api/market', (req, res) => res.json(marketSnapshot()));

app.get('/api/settings', (req, res) => res.json(appConfig));

app.post('/api/settings', (req, res) => {
    appConfig = { ...appConfig, ...req.body };
    res.json({ success: true, appConfig });
});

app.get('/api/dashboard', (req, res) => res.json({ botState, appConfig, tradeHistory }));

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
    app.listen(PORT, () => console.log(`Nifty Trading Portal running on port ${PORT}`));
}

module.exports = app;
