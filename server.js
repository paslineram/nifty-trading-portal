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

let botState = { status: 'Idle', lastSignal: 'None', tradesToday: 0, currentPnL: 0.0, gammaEnv: 'Neutral', distanceToWall: 145.5 };

let tradeHistory = [
    { id: 1, time: '2026-11-13 09:30:00', symbol: 'NIFTY', type: 'BUY', price: 23040.5, pnl: 1250.0, status: 'Closed' },
    { id: 2, time: '2026-11-13 11:15:00', symbol: 'NIFTY', type: 'SELL', price: 23120.0, pnl: -450.0, status: 'Closed' }
];

// ---------------------------------------------------------------------------
// Market snapshot for the Live dashboard.
// Values are sample data from the reference dashboard. Replace the config
// objects (or build them from Upstox) - the front end only needs this shape.
// Candles/HMA/Supertrend below are generated so the chart has something to draw.
// ---------------------------------------------------------------------------
function rng(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; }
const r2 = n => Math.round(n * 100) / 100;

function wma(a, n) {
    return a.map((_, i) => {
        if (i < n - 1 || a.slice(i - n + 1, i + 1).some(v => v == null)) return null;
        let num = 0, den = 0;
        for (let k = 0; k < n; k++) { num += a[i - n + 1 + k] * (k + 1); den += k + 1; }
        return num / den;
    });
}

function genSeries(close, range, seed) {
    const r = rng(seed), n = 75, raw = [];
    let p = close + range * 0.5;
    for (let i = 0; i < n; i++) { p += (r() - 0.5) * range * 0.14 - (i > 20 ? range * 0.004 : 0); raw.push(p); }
    const off = close - raw[n - 1];
    const closes = raw.map((v, i) => v + off * (i / (n - 1)));
    closes[n - 1] = close;
    const candles = closes.map((c, i) => {
        const o = i ? closes[i - 1] : c + range * 0.02;
        return { o: r2(o), c: r2(c), h: r2(Math.max(o, c) + r() * range * 0.035), l: r2(Math.min(o, c) - r() * range * 0.035) };
    });
    const w2 = wma(closes, 10), w1 = wma(closes, 21);
    const diff = closes.map((_, i) => (w2[i] == null || w1[i] == null) ? null : 2 * w2[i] - w1[i]);
    const hma = wma(diff, 4).map(v => v == null ? null : r2(v));
    // Supertrend (ATR 10, x3)
    const st = []; let fu = null, fl = null, up = true;
    for (let i = 0; i < n; i++) {
        if (i < 10) { st.push(null); continue; }
        let atr = 0;
        for (let k = i - 9; k <= i; k++) atr += Math.max(candles[k].h - candles[k].l, Math.abs(candles[k].h - candles[k - 1].c), Math.abs(candles[k].l - candles[k - 1].c));
        atr /= 10;
        const mid = (candles[i].h + candles[i].l) / 2;
        const bu = mid + 3 * atr, bl = mid - 3 * atr;
        fu = (fu == null || bu < fu || candles[i - 1].c > fu) ? bu : fu;
        fl = (fl == null || bl > fl || candles[i - 1].c < fl) ? bl : fl;
        if (up && candles[i].c < fl) up = false; else if (!up && candles[i].c > fu) up = true;
        st.push({ v: r2(up ? fl : fu), up });
    }
    return { candles, hma, st };
}

function genLadder(center, step, callWall, putWall, seed) {
    const r = rng(seed), out = [];
    for (let k = -10; k <= 10; k++) {
        const strike = center + k * step;
        const c = 20 + 80 * Math.exp(-(((strike - callWall) / (step * 4)) ** 2)) + r() * 25 + (strike > center ? 10 : 0);
        const p = 20 + 80 * Math.exp(-(((strike - putWall) / (step * 4)) ** 2)) + r() * 25 + (strike < center ? 10 : 0);
        out.push({ strike, call: Math.round(c), put: Math.round(p) });
    }
    return out;
}

function snapshot() {
    const nifty = {
        key: 'NIFTY', price: 25144.30, change: -155.0, changePct: -0.61,
        bias: 'BEARISH - SELL CE / BUY PE side',
        supertrend: 'DOWN', hmaSlope: 'UP', adx: 28, atr: 34.8, paperPts: -30,
        sideways: { score: 0, total: 6, label: 'TRENDING / MIXED', checks: [
            { pass: false, name: 'Wide CPR (range-day sign)', note: 'CPR width 0.09% vs 20-day median 0.30%' },
            { pass: false, name: 'Weak trend (ADX < 22)', note: 'ADX 28' },
            { pass: false, name: 'Price between S1 and R1', note: '25,144 OUTSIDE 25,167 - 25,408' },
            { pass: false, name: 'No big gap at open', note: 'gap 0.35%' },
            { pass: false, name: 'HMA flat', note: 'HMA moved 15 pts in 4 bars (limit 12)' },
            { pass: false, name: 'Small range so far', note: 'today 192 pts vs yesterday 242' }
        ]},
        days: ['Wed 11 Nov', 'Thu 12 Nov', 'Fri 13 Nov'],
        ...genSeries(25144.30, 420, 11),
        marks: [{ i: 63, side: 'CE' }],
        chain: { pcrAtm: 0.82, pcrTotal: 0.83, pcrAtmTone: 'dn', pcrTotalTone: 'dn',
            putWall: 25000, callWall: 25500, maxPain: 25100, oiCE: '+189.3L', oiPE: '+61.5L', atmIv: 13.1, expiry: '2026-11-17',
            ladder: genLadder(25150, 50, 25500, 25000, 5) },
        seller: [
            { name: 'Gamma (GEX)', tag: 'GOOD', note: 'POSITIVE +12349.3 Cr per 1% move: dealers dampen moves, ranges more likely (better for selling); flip near 25500' },
            { name: 'IV rank (VIX proxy)', tag: 'GOOD', note: "India VIX 15.5 is above 69% of the last year's readings (rank 34%). HIGH: richer premiums for sellers, but bigger moves" },
            { name: 'Put/call skew', tag: 'INFO', note: '25-delta put IV 13.6 vs call IV 13.3 = +0.3 pts. no unusual hedging' },
            { name: 'OI velocity', tag: 'INFO', note: 'needs ~15 min of data - keep the dashboard and autopilot running' },
            { name: 'Auto mode pick', tag: 'INFO', note: 'SELL: IV rich (69%) and positive gamma (+12349 Cr): selling favoured (default thresholds, used only if autopilot mode is AUTO)' }
        ],
        agents: [
            { name: 'Trend', vote: 'NEUTRAL', note: 'Supertrend DOWN, HMA UP, below CPR' },
            { name: '1-hour', vote: 'NEUTRAL', note: '1-hour trend flat/unclear' },
            { name: 'Gap', vote: 'NEUTRAL', note: 'opening gap -0.35%' },
            { name: 'OI / PCR', vote: 'BEAR', note: 'PCR 0.82 (calls heavy = resistance); fresh call writing > put writing' },
            { name: 'Breadth', vote: 'BEAR', note: '53 up / 163 down; more bearish setups; heavyweights -0.47%' }
        ],
        composite: { score: -2, text: 'SELL CE side (bearish)', tone: 'dn' },
        levels: [
            { name: 'R2', v: 25518, diff: 373 }, { name: 'R1', v: 25408, diff: 264 }, { name: 'Prev high', v: 25385, diff: 240 },
            { name: 'CPR top', v: 25288, diff: 143 }, { name: 'Pivot', v: 25276, diff: 131 }, { name: 'CPR bottom', v: 25264, diff: 120 },
            { name: 'S1', v: 25167, diff: 22 }, { name: 'Prev low', v: 25143, diff: -1, hi: true }, { name: 'S2', v: 25034, diff: -110 }
        ],
        why: {
            pe: 'price on the wrong side of the CPR; Supertrend points the other way; 1-hour trend is against it',
            ce: 'price on the wrong side of the HMA; too close to support/resistance; 1-hour trend is against it'
        },
        signals: [{ time: '13 Nov 12:30', side: 'SELL CE', ref: 25110, sl: 25200, tp1: 25019, setup: 'OB/FVG' }]
    };

    const sensex = {
        key: 'SENSEX', price: 81592.45, change: -318.6, changePct: -0.39,
        bias: 'BEARISH - SELL CE / BUY PE side',
        supertrend: 'DOWN', hmaSlope: 'UP', adx: 27, atr: 107.1, paperPts: -112,
        sideways: { score: 2, total: 6, label: 'TRENDING / MIXED', checks: [
            { pass: false, name: 'Wide CPR (range-day sign)', note: 'CPR width 0.03% vs 20-day median 0.29%' },
            { pass: false, name: 'Weak trend (ADX < 22)', note: 'ADX 27' },
            { pass: true, name: 'Price between S1 and R1', note: '81,592 inside 81,550 - 82,299' },
            { pass: true, name: 'No big gap at open', note: 'gap 0.09%' },
            { pass: false, name: 'HMA flat', note: 'HMA moved 74 pts in 4 bars (limit 37)' },
            { pass: false, name: 'Small range so far', note: 'today 591 pts vs yesterday 749' }
        ]},
        days: ['Wed 11 Nov', 'Thu 12 Nov', 'Fri 13 Nov'],
        ...genSeries(81592.45, 1300, 23),
        marks: [{ i: 54, side: 'CE' }, { i: 4, side: 'PE' }],
        chain: { pcrAtm: 0.83, pcrTotal: 0.91, pcrAtmTone: 'dn', pcrTotalTone: '',
            putWall: 81500, callWall: 81500, maxPain: 81500, oiCE: '+21.4L', oiPE: '+16.3L', atmIv: 15.0, expiry: '2026-11-19',
            ladder: genLadder(81600, 200, 81500, 81400, 9) },
        seller: [
            { name: 'Gamma (GEX)', tag: 'GOOD', note: 'POSITIVE +2727.9 Cr per 1% move: dealers dampen moves, ranges more likely (better for selling); flip near 82400' },
            { name: 'IV rank (VIX proxy)', tag: 'GOOD', note: "India VIX 15.5 is above 69% of the last year's readings (rank 34%). HIGH: richer premiums for sellers, but bigger moves" },
            { name: 'Put/call skew', tag: 'INFO', note: '25-delta put IV 15.8 vs call IV 15.1 = +0.8 pts. no unusual hedging' },
            { name: 'OI velocity', tag: 'INFO', note: 'needs ~15 min of data - keep the dashboard and autopilot running' },
            { name: 'Auto mode pick', tag: 'INFO', note: 'SELL: IV rich (69%) and positive gamma (+2728 Cr): selling favoured (default thresholds, used only if autopilot mode is AUTO)' }
        ],
        agents: [
            { name: 'Trend', vote: 'NEUTRAL', note: 'Supertrend DOWN, HMA UP, below CPR' },
            { name: '1-hour', vote: 'NEUTRAL', note: '1-hour trend flat/unclear' },
            { name: 'Gap', vote: 'NEUTRAL', note: 'opening gap -0.09%' },
            { name: 'OI / PCR', vote: 'NEUTRAL', note: 'PCR 0.83 (calls heavy = resistance); fresh call writing > put writing; price at put wall 81500' },
            { name: 'Breadth', vote: 'BEAR', note: '53 up / 163 down; more bearish setups; heavyweights -0.47%' }
        ],
        composite: { score: -1, text: 'NO CLEAR EDGE - be selective', tone: 'mid' },
        levels: [
            { name: 'R2', v: 82687, diff: 1095 }, { name: 'Prev high', v: 82326, diff: 733 }, { name: 'R1', v: 82299, diff: 707 },
            { name: 'CPR top', v: 81951, diff: 358 }, { name: 'Pivot', v: 81938, diff: 345 }, { name: 'CPR bottom', v: 81924, diff: 332 },
            { name: 'Prev low', v: 81576, diff: -16, hi: true }, { name: 'S1', v: 81550, diff: -43 }, { name: 'S2', v: 81188, diff: -404 }
        ],
        why: {
            pe: 'price on the wrong side of the CPR; Supertrend points the other way; 1-hour trend is against it',
            ce: 'price on the wrong side of the HMA; too close to support/resistance; 1-hour trend is against it'
        },
        signals: [
            { time: '13 Nov 10:15', side: 'SELL CE', ref: 81703, sl: 82046, tp1: 81361, setup: 'OB/FVG' },
            { time: '11 Nov 10:15', side: 'SELL PE', ref: 82298, sl: 81921, tp1: 82674, setup: 'OB/FVG' }
        ]
    };

    return {
        asOf: 'Fri 13 Nov 15:15 IST',
        marketOpen: false,
        instruments: [nifty, sensex],
        autopilot: null,
        condor: null,
        alerts: []
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

app.get('/api/market', (req, res) => res.json(snapshot()));
app.get('/api/settings', (req, res) => res.json(appConfig));
app.post('/api/settings', (req, res) => { appConfig = { ...appConfig, ...req.body }; res.json({ success: true, appConfig }); });
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
