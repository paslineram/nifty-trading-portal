const UPSTOX_V2 = 'https://api.upstox.com/v2';
const UPSTOX_V3 = 'https://api.upstox.com/v3';

const INSTRUMENTS = [
    { key: 'NIFTY', upstoxKey: 'NSE_INDEX|Nifty 50', step: 50, flatLimit: 12 },
    { key: 'SENSEX', upstoxKey: 'BSE_INDEX|SENSEX', step: 100, flatLimit: 37 }
];
const VIX_KEY = 'NSE_INDEX|India VIX';

const cache = new Map();
const CACHE_TTL_MS = 10000;

function r2(n) { return Math.round(n * 100) / 100; }
function r1(n) { return Math.round(n * 10) / 10; }

function getISTParts(date = new Date()) {
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    });
    const parts = Object.fromEntries(fmt.formatToParts(date).map(p => [p.type, p.value]));
    const wdFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' });
    const wdStr = wdFmt.format(date);
    return {
        ymd: `${parts.year}-${parts.month}-${parts.day}`,
        hour: Number(parts.hour),
        minute: Number(parts.minute),
        weekday: wdStr,
        isWeekday: !['Sat', 'Sun'].includes(wdStr)
    };
}

function addDaysYmd(ymd, deltaDays) {
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
    return dt.toISOString().slice(0, 10);
}

function isMarketOpenIST(date = new Date()) {
    const p = getISTParts(date);
    const mins = p.hour * 60 + p.minute;
    return p.isWeekday && mins >= 555 && mins <= 930;
}

function formatAsOf(isoTs) {
    if (!isoTs) return '';
    const d = new Date(isoTs);
    if (Number.isNaN(d.getTime())) return String(isoTs);
    const s = d.toLocaleString('en-GB', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short', day: '2-digit', month: 'short',
        hour: '2-digit', minute: '2-digit', hour12: false
    }).replace(',', '');
    return `${s} IST`;
}

function formatDayLabel(ymd) {
    const d = new Date(`${ymd}T09:15:00+05:30`);
    return d.toLocaleDateString('en-GB', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short', day: '2-digit', month: 'short'
    }).replace(',', '');
}

function formatSignalTime(isoTs) {
    const d = new Date(isoTs);
    return d.toLocaleString('en-GB', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false
    }).replace(',', '');
}

function formatLakhs(n) {
    if (n == null || Number.isNaN(n)) return '0.0L';
    const l = n / 100000;
    return `${l > 0 ? '+' : ''}${l.toFixed(1)}L`;
}

async function fetchJson(url, token = '') {
    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = data?.errors?.[0]?.message || data?.message || `HTTP ${res.status}`;
        const err = new Error(msg);
        err.status = res.status;
        throw err;
    }
    return data;
}

function parseCandles(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter(c => Array.isArray(c) && c.length >= 5)
        .map(c => ({
            ts: c[0],
            ymd: String(c[0]).slice(0, 10),
            o: Number(c[1]),
            h: Number(c[2]),
            l: Number(c[3]),
            c: Number(c[4]),
            v: Number(c[5] || 0)
        }));
}

async function fetchCandles15m(upstoxKey, todayYmd) {
    const fromYmd = addDaysYmd(todayYmd, -21);
    const enc = encodeURIComponent(upstoxKey);
    const [hist, intra] = await Promise.all([
        fetchJson(`${UPSTOX_V3}/historical-candle/${enc}/minutes/15/${todayYmd}/${fromYmd}`).catch(() => ({ data: { candles: [] } })),
        fetchJson(`${UPSTOX_V3}/historical-candle/intraday/${enc}/minutes/15`).catch(() => ({ data: { candles: [] } }))
    ]);
    const map = new Map();
    for (const c of [...parseCandles(hist?.data?.candles), ...parseCandles(intra?.data?.candles)]) {
        map.set(c.ts, c);
    }
    return Array.from(map.values()).sort((a, b) => a.ts.localeCompare(b.ts));
}

async function fetchDailyCandles(upstoxKey, todayYmd, lookbackDays = 45) {
    const fromYmd = addDaysYmd(todayYmd, -lookbackDays);
    const enc = encodeURIComponent(upstoxKey);
    const [hist, intra] = await Promise.all([
        fetchJson(`${UPSTOX_V3}/historical-candle/${enc}/days/1/${todayYmd}/${fromYmd}`).catch(() => ({ data: { candles: [] } })),
        fetchJson(`${UPSTOX_V3}/historical-candle/intraday/${enc}/days/1`).catch(() => ({ data: { candles: [] } }))
    ]);
    const map = new Map();
    for (const c of [...parseCandles(hist?.data?.candles), ...parseCandles(intra?.data?.candles)]) {
        map.set(c.ymd, c);
    }
    return Array.from(map.values()).sort((a, b) => a.ymd.localeCompare(b.ymd));
}

function wma(values, len) {
    return values.map((_, i) => {
        if (i < len - 1) return null;
        let num = 0, den = 0;
        for (let k = 0; k < len; k++) {
            const v = values[i - len + 1 + k];
            if (v == null) return null;
            num += v * (k + 1);
            den += k + 1;
        }
        return num / den;
    });
}

function computeHMA(closes) {
    const w2 = wma(closes, 10);
    const w1 = wma(closes, 21);
    const diff = closes.map((_, i) => (w2[i] == null || w1[i] == null) ? null : 2 * w2[i] - w1[i]);
    return wma(diff, 4).map(v => v == null ? null : r2(v));
}

function computeSupertrend(candles, period = 10, mult = 3) {
    const st = [];
    let fu = null, fl = null, up = true;
    for (let i = 0; i < candles.length; i++) {
        if (i < period) {
            st.push(null);
            continue;
        }
        let atr = 0;
        for (let k = i - period + 1; k <= i; k++) {
            const cur = candles[k], prev = candles[k - 1];
            atr += Math.max(cur.h - cur.l, Math.abs(cur.h - prev.c), Math.abs(cur.l - prev.c));
        }
        atr /= period;
        const mid = (candles[i].h + candles[i].l) / 2;
        const bu = mid + mult * atr;
        const bl = mid - mult * atr;
        fu = (fu == null || bu < fu || candles[i - 1].c > fu) ? bu : fu;
        fl = (fl == null || bl > fl || candles[i - 1].c < fl) ? bl : fl;
        if (up && candles[i].c < fl) up = false;
        else if (!up && candles[i].c > fu) up = true;
        st.push({ v: r2(up ? fl : fu), up });
    }
    return st;
}

function computeATR(candles, period = 14) {
    if (candles.length < period + 1) return 0;
    const trs = [];
    for (let i = 1; i < candles.length; i++) {
        const cur = candles[i], prev = candles[i - 1];
        trs.push(Math.max(cur.h - cur.l, Math.abs(cur.h - prev.c), Math.abs(cur.l - prev.c)));
    }
    let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < trs.length; i++) {
        atr = (atr * (period - 1) + trs[i]) / period;
    }
    return r1(atr);
}

function computeADX(candles, period = 14) {
    if (candles.length < period * 2 + 1) return 0;
    const trs = [], plusDM = [], minusDM = [];
    for (let i = 1; i < candles.length; i++) {
        const cur = candles[i], prev = candles[i - 1];
        const tr = Math.max(cur.h - cur.l, Math.abs(cur.h - prev.c), Math.abs(cur.l - prev.c));
        const upMove = cur.h - prev.h;
        const dnMove = prev.l - cur.l;
        trs.push(tr);
        plusDM.push(upMove > dnMove && upMove > 0 ? upMove : 0);
        minusDM.push(dnMove > upMove && dnMove > 0 ? dnMove : 0);
    }
    let tr14 = trs.slice(0, period).reduce((a, b) => a + b, 0);
    let p14 = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
    let m14 = minusDM.slice(0, period).reduce((a, b) => a + b, 0);
    const dxs = [];
    for (let i = period; i < trs.length; i++) {
        tr14 = tr14 - tr14 / period + trs[i];
        p14 = p14 - p14 / period + plusDM[i];
        m14 = m14 - m14 / period + minusDM[i];
        const pdi = tr14 ? (p14 / tr14) * 100 : 0;
        const mdi = tr14 ? (m14 / tr14) * 100 : 0;
        const denom = pdi + mdi;
        dxs.push(denom ? (Math.abs(pdi - mdi) / denom) * 100 : 0);
    }
    if (dxs.length < period) return Math.round(dxs[dxs.length - 1] || 0);
    let adx = dxs.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < dxs.length; i++) {
        adx = (adx * (period - 1) + dxs[i]) / period;
    }
    return Math.round(adx);
}

function computeHourlyTrend(candles15m) {
    if (candles15m.length < 16) return { dir: 'NEUTRAL', note: 'Insufficient bars for 1-hour trend' };
    const hourly = [];
    for (let i = 0; i + 3 < candles15m.length; i += 4) {
        const slice = candles15m.slice(i, i + 4);
        hourly.push({
            o: slice[0].o,
            h: Math.max(...slice.map(x => x.h)),
            l: Math.min(...slice.map(x => x.l)),
            c: slice[slice.length - 1].c
        });
    }
    if (hourly.length < 6) return { dir: 'NEUTRAL', note: '1-hour trend flat/unclear' };
    const closes = hourly.map(x => x.c);
    const last = closes[closes.length - 1];
    const prev = closes[closes.length - 2];
    const sma5 = closes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    if (last > sma5 && last > prev) return { dir: 'BULL', note: `1-hour close (${r2(last)}) above 5-bar SMA (${r2(sma5)})` };
    if (last < sma5 && last < prev) return { dir: 'BEAR', note: `1-hour close (${r2(last)}) below 5-bar SMA (${r2(sma5)})` };
    return { dir: 'NEUTRAL', note: '1-hour trend flat/unclear' };
}

function computeSignalsAndReplay(chartCandles, fullCandles, offsetInFull, atrLatest, daily, fullHma, fullSt) {
    const signals = [];
    const marks = [];
    let paperPts = 0;
    let bullOB = null;
    let bearOB = null;
    let bullFVG = null;
    let bearFVG = null;
    let prevBullImp = false;
    let prevBearImp = false;

    const structBars = 6;
    const obLookback = 10;
    const obMaxAge = 25;
    const impATR = 0.8;
    const slBuf = 0.25;
    const rr = 1.0;

    const lvByDay = {};
    for (let i = 1; i < daily.length; i++) {
        const p = daily[i - 1];
        const piv = (p.h + p.l + p.c) / 3;
        const bc = (p.h + p.l) / 2;
        const tc = 2 * piv - bc;
        const r1 = 2 * piv - p.l;
        const s1 = 2 * piv - p.h;
        const r2 = piv + (p.h - p.l);
        const s2 = piv - (p.h - p.l);
        lvByDay[daily[i].ymd] = {
            piv,
            top: Math.max(tc, bc),
            bot: Math.min(tc, bc),
            res: [r1, r2, p.h],
            sup: [s1, s2, p.l]
        };
    }

    let pos = null;
    for (let i = 14; i < fullCandles.length; i++) {
        const c = fullCandles[i];
        const chartIdx = i - offsetInFull;
        const hm = String(c.ts).slice(11, 16);

        // Day rollover square-off
        if (i > 0 && fullCandles[i - 1].ymd !== c.ymd && pos) {
            if (i - 1 >= offsetInFull) {
                paperPts += pos.side === 'SELL PE' ? (fullCandles[i - 1].c - pos.ref) : (pos.ref - fullCandles[i - 1].c);
            }
            pos = null;
        }

        // Rolling ATR14 at bar i
        let atr = 0;
        for (let k = i - 13; k <= i; k++) {
            const cur = fullCandles[k], prev = fullCandles[k - 1];
            atr += Math.max(cur.h - cur.l, Math.abs(cur.h - prev.c), Math.abs(cur.l - prev.c));
        }
        atr /= 14;

        // Check active position SL / TP1
        if (pos) {
            if (pos.side === 'SELL PE') {
                if (c.l <= pos.sl) {
                    if (i >= offsetInFull) paperPts += (pos.sl - pos.ref);
                    pos = null;
                } else if (c.h >= pos.tp1) {
                    if (i >= offsetInFull) paperPts += (pos.tp1 - pos.ref);
                    pos = null;
                }
            } else {
                if (c.h >= pos.sl) {
                    if (i >= offsetInFull) paperPts += (pos.ref - pos.sl);
                    pos = null;
                } else if (c.l <= pos.tp1) {
                    if (i >= offsetInFull) paperPts += (pos.ref - pos.tp1);
                    pos = null;
                }
            }
        }

        // Intraday square-off at 15:15 IST
        if (hm >= '15:15' && pos) {
            if (i >= offsetInFull) {
                paperPts += pos.side === 'SELL PE' ? (c.c - pos.ref) : (pos.ref - c.c);
            }
            pos = null;
        }

        if (bullOB && (c.c < bullOB.bot || i - bullOB.barIndex > obMaxAge)) bullOB = null;
        if (bearOB && (c.c > bearOB.top || i - bearOB.barIndex > obMaxAge)) bearOB = null;
        if (bullFVG && (c.c < bullFVG.bot || i - bullFVG.barIndex > obMaxAge)) bullFVG = null;
        if (bearFVG && (c.c > bearFVG.top || i - bearFVG.barIndex > obMaxAge)) bearFVG = null;

        let structHigh = -Infinity, structLow = Infinity;
        for (let k = Math.max(0, i - structBars); k < i; k++) {
            if (fullCandles[k].h > structHigh) structHigh = fullCandles[k].h;
            if (fullCandles[k].l < structLow) structLow = fullCandles[k].l;
        }

        const lv = lvByDay[c.ymd];
        const stUp = fullSt[i]?.up;
        const inWindow = hm >= '09:30' && hm <= '14:45';
        const hmaCur = fullHma[i];
        const hmaPrev = fullHma[i - 1];
        const hmaUp = hmaCur != null && hmaPrev != null && hmaCur > hmaPrev;
        const hmaDn = hmaCur != null && hmaPrev != null && hmaCur < hmaPrev;
        const bullHma = hmaCur == null || (c.c >= hmaCur && hmaUp);
        const bearHma = hmaCur == null || (c.c <= hmaCur || hmaDn);
        const resRoom = !lv || lv.res.filter(r => r > c.c).every(r => (r - c.c) > 0.8 * atr);
        const supRoom = !lv || lv.sup.filter(s => s < c.c).every(s => (c.c - s) > 0.8 * atr);

        const bullBias = stUp === true && (!lv || c.c >= lv.bot) && bullHma && resRoom;
        const bearBias = stUp === false && (!lv || c.c <= lv.top) && bearHma && supRoom;

        const longOB = bullOB && c.l <= bullOB.top && c.c > bullOB.bot && c.c > c.o;
        const longFVG = bullFVG && c.l <= bullFVG.top && c.c > bullFVG.bot && c.c > c.o;
        const shortOB = bearOB && c.h >= bearOB.bot && c.c < bearOB.top && c.c < c.o;
        const shortFVG = bearFVG && c.h >= bearFVG.bot && c.c < bearFVG.top && c.c < c.o;

        if (i >= offsetInFull && inWindow && !pos) {
            if ((longOB || longFVG) && bullBias) {
                const ref = Math.round(c.c);
                const stopBase = bullOB ? bullOB.bot : bullFVG.stopBase;
                const sl = Math.round(stopBase - slBuf * atr);
                const risk = Math.max(ref - sl, atr * 0.5);
                if (risk <= 4 * atr) {
                    const tp1 = Math.round(ref + risk * rr);
                    pos = { side: 'SELL PE', ref, sl, tp1 };
                    signals.unshift({ time: formatSignalTime(c.ts), side: 'SELL PE', ref, sl, tp1, setup: 'OB/FVG' });
                    marks.push({ i: chartIdx, side: 'PE' });
                    bullOB = null;
                    bullFVG = null;
                }
            } else if ((shortOB || shortFVG) && bearBias) {
                const ref = Math.round(c.c);
                const stopBase = bearOB ? bearOB.top : bearFVG.stopBase;
                const sl = Math.round(stopBase + slBuf * atr);
                const risk = Math.max(sl - ref, atr * 0.5);
                if (risk <= 4 * atr) {
                    const tp1 = Math.round(ref - risk * rr);
                    pos = { side: 'SELL CE', ref, sl, tp1 };
                    signals.unshift({ time: formatSignalTime(c.ts), side: 'SELL CE', ref, sl, tp1, setup: 'OB/FVG' });
                    marks.push({ i: chartIdx, side: 'CE' });
                    bearOB = null;
                    bearFVG = null;
                }
            }
        }

        if (i >= 2) {
            const c2 = fullCandles[i - 2];
            if (prevBullImp && c.l > c2.h) {
                bullFVG = { top: c.l, bot: c2.h, stopBase: c2.l, barIndex: i };
            }
            if (prevBearImp && c.h < c2.l) {
                bearFVG = { top: c2.l, bot: c.h, stopBase: c2.h, barIndex: i };
            }
        }

        const bullImpulse = c.c > c.o && (c.c - c.o) > impATR * atr && c.c > structHigh;
        const bearImpulse = c.c < c.o && (c.o - c.c) > impATR * atr && c.c < structLow;

        if (bullImpulse) {
            for (let k = 1; k <= obLookback; k++) {
                const idx = i - k;
                if (idx >= 0 && fullCandles[idx].c < fullCandles[idx].o) {
                    bullOB = { top: fullCandles[idx].h, bot: fullCandles[idx].l, barIndex: i };
                    break;
                }
            }
        }
        if (bearImpulse) {
            for (let k = 1; k <= obLookback; k++) {
                const idx = i - k;
                if (idx >= 0 && fullCandles[idx].c > fullCandles[idx].o) {
                    bearOB = { top: fullCandles[idx].h, bot: fullCandles[idx].l, barIndex: i };
                    break;
                }
            }
        }

        prevBullImp = bullImpulse;
        prevBearImp = bearImpulse;
    }

    if (pos && chartCandles.length) {
        const lastClose = chartCandles[chartCandles.length - 1].c;
        paperPts += pos.side === 'SELL PE' ? (lastClose - pos.ref) : (pos.ref - lastClose);
    }

    return {
        signals: signals.slice(0, 6),
        marks,
        paperPts: Math.round(paperPts),
        hasActiveOB: Boolean(bullOB || bearOB || bullFVG || bearFVG),
        atrLatest
    };
}

function buildLevels(prevDay, currentPrice) {
    const { h, l, c } = prevDay;
    const pivot = (h + l + c) / 3;
    const bc = (h + l) / 2;
    const tc = 2 * pivot - bc;
    const cprTop = Math.max(tc, bc);
    const cprBot = Math.min(tc, bc);
    const r1 = 2 * pivot - l;
    const s1 = 2 * pivot - h;
    const r2 = pivot + (h - l);
    const s2 = pivot - (h - l);

    const raw = [
        { name: 'R2', v: Math.round(r2) },
        { name: 'R1', v: Math.round(r1) },
        { name: 'Prev high', v: Math.round(h) },
        { name: 'CPR top', v: Math.round(cprTop) },
        { name: 'Pivot', v: Math.round(pivot) },
        { name: 'CPR bottom', v: Math.round(cprBot) },
        { name: 'S1', v: Math.round(s1) },
        { name: 'Prev low', v: Math.round(l) },
        { name: 'S2', v: Math.round(s2) }
    ].sort((a, b) => b.v - a.v);

    let closestIdx = 0;
    let closestDist = Infinity;
    raw.forEach((lv, idx) => {
        lv.diff = Math.round(lv.v - currentPrice);
        const dist = Math.abs(lv.diff);
        if (dist < closestDist) {
            closestDist = dist;
            closestIdx = idx;
        }
    });
    if (raw[closestIdx]) raw[closestIdx].hi = true;
    return { levels: raw, pivot, cprTop, cprBot, r1, s1 };
}

function median(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

async function fetchLiveQuotes(token) {
    if (!token) return { quotes: null, error: 'Upstox Access Token not set' };
    try {
        const keys = [INSTRUMENTS[0].upstoxKey, INSTRUMENTS[1].upstoxKey, VIX_KEY].join(',');
        const json = await fetchJson(`${UPSTOX_V2}/market-quote/quotes?instrument_key=${encodeURIComponent(keys)}`, token);
        return { quotes: json?.data || null, error: null };
    } catch (err) {
        return { quotes: null, error: err.message || 'Live quote request failed' };
    }
}

function findQuoteForKey(quotes, upstoxKey) {
    if (!quotes) return null;
    if (quotes[upstoxKey]) return quotes[upstoxKey];
    const colonKey = upstoxKey.replace('|', ':');
    if (quotes[colonKey]) return quotes[colonKey];
    const targetSym = upstoxKey.split('|')[1];
    return Object.values(quotes).find(q => q?.instrument_token === upstoxKey || q?.symbol === targetSym) || null;
}

async function fetchOptionChainData(upstoxKey, spotPrice, step, token, todayYmd) {
    if (!token) return { ok: false, error: 'Requires Upstox Access Token' };
    try {
        const contracts = await fetchJson(`${UPSTOX_V2}/option/contract?instrument_key=${encodeURIComponent(upstoxKey)}`, token);
        const list = Array.isArray(contracts?.data) ? contracts.data : [];
        const expiries = [...new Set(list.map(c => c.expiry).filter(Boolean))].sort();
        const expiry = expiries.find(e => e >= todayYmd) || expiries[0];
        if (!expiry) return { ok: false, error: 'No active option expiry found' };

        const chainResp = await fetchJson(
            `${UPSTOX_V2}/option/chain?instrument_key=${encodeURIComponent(upstoxKey)}&expiry_date=${encodeURIComponent(expiry)}`,
            token
        );
        const rows = Array.isArray(chainResp?.data) ? chainResp.data : [];
        if (!rows.length) return { ok: false, error: 'Empty option chain response' };

        const sorted = [...rows].sort((a, b) => a.strike_price - b.strike_price);
        let atmIdx = 0, bestDiff = Infinity;
        sorted.forEach((row, i) => {
            const d = Math.abs(row.strike_price - spotPrice);
            if (d < bestDiff) { bestDiff = d; atmIdx = i; }
        });

        let totalCallOI = 0, totalPutOI = 0, totalCallAdd = 0, totalPutAdd = 0;
        let maxCallOI = -1, callWall = null, maxPutOI = -1, putWall = null;
        let gexSum = 0;
        let call25Iv = null, call25Diff = Infinity, put25Iv = null, put25Diff = Infinity;

        for (const r of sorted) {
            const cm = r.call_options?.market_data || {};
            const pm = r.put_options?.market_data || {};
            const cg = r.call_options?.option_greeks || {};
            const pg = r.put_options?.option_greeks || {};
            const cOI = Number(cm.oi || 0);
            const pOI = Number(pm.oi || 0);
            totalCallOI += cOI;
            totalPutOI += pOI;
            totalCallAdd += (cOI - Number(cm.prev_oi || cOI));
            totalPutAdd += (pOI - Number(pm.prev_oi || pOI));
            if (cOI > maxCallOI) { maxCallOI = cOI; callWall = r.strike_price; }
            if (pOI > maxPutOI) { maxPutOI = pOI; putWall = r.strike_price; }

            const cGamma = Number(cg.gamma || 0);
            const pGamma = Number(pg.gamma || 0);
            gexSum += (cGamma * cOI - pGamma * pOI) * spotPrice * spotPrice * 0.01;

            if (cg.delta != null && cg.iv) {
                const d = Math.abs(Math.abs(Number(cg.delta)) - 0.25);
                if (d < call25Diff) { call25Diff = d; call25Iv = Number(cg.iv); }
            }
            if (pg.delta != null && pg.iv) {
                const d = Math.abs(Math.abs(Number(pg.delta)) - 0.25);
                if (d < put25Diff) { put25Diff = d; put25Iv = Number(pg.iv); }
            }
        }

        const nearRows = sorted.slice(Math.max(0, atmIdx - 5), Math.min(sorted.length, atmIdx + 6));
        const nearCallOI = nearRows.reduce((s, r) => s + Number(r.call_options?.market_data?.oi || 0), 0);
        const nearPutOI = nearRows.reduce((s, r) => s + Number(r.put_options?.market_data?.oi || 0), 0);

        const pcrTotal = totalCallOI > 0 ? r2(totalPutOI / totalCallOI) : 0;
        const pcrAtm = nearCallOI > 0 ? r2(nearPutOI / nearCallOI) : 0;

        // Max Pain across nearby strikes
        let maxPain = sorted[atmIdx]?.strike_price || Math.round(spotPrice / step) * step;
        let minPayout = Infinity;
        for (const cand of sorted.slice(Math.max(0, atmIdx - 15), Math.min(sorted.length, atmIdx + 16))) {
            const k = cand.strike_price;
            let payout = 0;
            for (const r of sorted) {
                const cOI = Number(r.call_options?.market_data?.oi || 0);
                const pOI = Number(r.put_options?.market_data?.oi || 0);
                if (k > r.strike_price) payout += (k - r.strike_price) * cOI;
                if (k < r.strike_price) payout += (r.strike_price - k) * pOI;
            }
            if (payout < minPayout) { minPayout = payout; maxPain = k; }
        }

        const atmRow = sorted[atmIdx];
        const atmCallIv = Number(atmRow?.call_options?.option_greeks?.iv || 0);
        const atmPutIv = Number(atmRow?.put_options?.option_greeks?.iv || 0);
        const atmIv = (atmCallIv && atmPutIv) ? r1((atmCallIv + atmPutIv) / 2) : r1(atmCallIv || atmPutIv || 0);

        const ladderRows = sorted.slice(Math.max(0, atmIdx - 10), Math.min(sorted.length, atmIdx + 11));
        const ladder = ladderRows.map(r => ({
            strike: r.strike_price,
            call: Math.round(Number(r.call_options?.market_data?.oi || 0)),
            put: Math.round(Number(r.put_options?.market_data?.oi || 0))
        }));

        return {
            ok: true,
            chain: {
                pcrAtm,
                pcrTotal,
                pcrAtmTone: pcrAtm < 0.9 ? 'dn' : pcrAtm > 1.1 ? 'up' : '',
                pcrTotalTone: pcrTotal < 0.9 ? 'dn' : pcrTotal > 1.1 ? 'up' : '',
                putWall,
                callWall,
                maxPain,
                oiCE: formatLakhs(totalCallAdd),
                oiPE: formatLakhs(totalPutAdd),
                atmIv,
                expiry,
                ladder
            },
            gexCr: r1(gexSum / 1e7),
            skew: (put25Iv != null && call25Iv != null) ? { put25Iv: r1(put25Iv), call25Iv: r1(call25Iv), diff: r1(put25Iv - call25Iv) } : null
        };
    } catch (err) {
        return { ok: false, error: err.message || 'Option chain request failed' };
    }
}

async function buildInstrumentData(inst, todayYmd, quotes, vixInfo, token, mode = 'BOTH') {
    const signalsEnabled = mode === 'BOTH' || mode === inst.key;
    const [candles15m, daily] = await Promise.all([
        fetchCandles15m(inst.upstoxKey, todayYmd),
        fetchDailyCandles(inst.upstoxKey, todayYmd, 45)
    ]);

    if (!candles15m.length || daily.length < 2) {
        throw new Error(`No Upstox candle data returned for ${inst.key}`);
    }

    const latestBar = candles15m[candles15m.length - 1];
    const latestYmd = latestBar.ymd;

    // Identify last 3 trading days present in 15m data
    const uniqueDays = [...new Set(candles15m.map(c => c.ymd))];
    const last3Days = uniqueDays.slice(-3);
    const chartCandles = candles15m.filter(c => last3Days.includes(c.ymd));
    const offsetInFull = candles15m.length - chartCandles.length;
    const dayCounts = last3Days.map(d => chartCandles.filter(c => c.ymd === d).length);

    // Live quote if available, else latest 15m candle close
    const liveQ = findQuoteForKey(quotes, inst.upstoxKey);
    const todayDailyIdx = daily.findIndex(d => d.ymd === latestYmd);
    const prevDay = todayDailyIdx > 0 ? daily[todayDailyIdx - 1] : daily[daily.length - 2];
    const currentDay = todayDailyIdx >= 0 ? daily[todayDailyIdx] : daily[daily.length - 1];

    const spotPrice = liveQ?.last_price ? r2(liveQ.last_price) : r2(latestBar.c);
    const prevClose = prevDay.c;
    const change = liveQ?.net_change != null ? r2(liveQ.net_change) : r2(spotPrice - prevClose);
    const changePct = prevClose ? r2((change / prevClose) * 100) : 0;

    // Indicators over full 15m history, then sliced to chartCandles
    const fullCloses = candles15m.map(c => c.c);
    const fullHma = computeHMA(fullCloses);
    const fullSt = computeSupertrend(candles15m, 10, 3);
    const hma = fullHma.slice(offsetInFull);
    const st = fullSt.slice(offsetInFull);

    const latestSt = st[st.length - 1];
    const supertrend = latestSt ? (latestSt.up ? 'UP' : 'DOWN') : 'NEUTRAL';

    const hmaLast = hma[hma.length - 1];
    const hmaPrev = hma[hma.length - 5];
    const hmaMove = (hmaLast != null && hmaPrev != null) ? (hmaLast - hmaPrev) : 0;
    const hmaSlope = Math.abs(hmaMove) < 1 ? 'FLAT' : (hmaMove > 0 ? 'UP' : 'DOWN');

    const adx = computeADX(candles15m, 14);
    const atr = computeATR(candles15m, 14);

    // Pivots & CPR
    const { levels, pivot, cprTop, cprBot, r1, s1 } = buildLevels(prevDay, spotPrice);
    const cprWidthPct = pivot ? ((cprTop - cprBot) / pivot) * 100 : 0;
    const histCprWidths = [];
    for (let i = Math.max(1, daily.length - 21); i < daily.length; i++) {
        const d = daily[i - 1];
        const p = (d.h + d.l + d.c) / 3;
        const bc = (d.h + d.l) / 2;
        const tc = 2 * p - bc;
        if (p) histCprWidths.push((Math.abs(tc - bc) / p) * 100);
    }
    const medianCprPct = median(histCprWidths);

    const todayBars = chartCandles.filter(c => c.ymd === latestYmd);
    const todayOpen = todayBars.length ? todayBars[0].o : currentDay.o;
    const todayHigh = todayBars.length ? Math.max(...todayBars.map(c => c.h)) : currentDay.h;
    const todayLow = todayBars.length ? Math.min(...todayBars.map(c => c.l)) : currentDay.l;
    const todayRange = Math.round(todayHigh - todayLow);
    const prevRange = Math.round(prevDay.h - prevDay.l);
    const gapPct = prevClose ? ((todayOpen - prevClose) / prevClose) * 100 : 0;

    const checks = [
        {
            pass: cprWidthPct > medianCprPct,
            name: 'Wide CPR (range-day sign)',
            note: `CPR width ${cprWidthPct.toFixed(2)}% vs 20-day median ${medianCprPct.toFixed(2)}%`
        },
        {
            pass: adx < 22,
            name: 'Weak trend (ADX < 22)',
            note: `ADX ${adx}`
        },
        {
            pass: spotPrice >= s1 && spotPrice <= r1,
            name: 'Price between S1 and R1',
            note: `${Math.round(spotPrice).toLocaleString('en-IN')} ${spotPrice >= s1 && spotPrice <= r1 ? 'inside' : 'OUTSIDE'} ${Math.round(s1).toLocaleString('en-IN')} - ${Math.round(r1).toLocaleString('en-IN')}`
        },
        {
            pass: Math.abs(gapPct) <= 0.30,
            name: 'No big gap at open',
            note: `gap ${Math.abs(gapPct).toFixed(2)}%`
        },
        {
            pass: Math.abs(hmaMove) <= inst.flatLimit,
            name: 'HMA flat',
            note: `HMA moved ${Math.round(Math.abs(hmaMove))} pts in 4 bars (limit ${inst.flatLimit})`
        },
        {
            pass: todayRange < prevRange,
            name: 'Small range so far',
            note: `today ${todayRange} pts vs yesterday ${prevRange}`
        }
    ];
    const score = checks.filter(c => c.pass).length;
    const sideways = {
        score,
        total: 6,
        label: score >= 4 ? 'SIDEWAYS LIKELY' : 'TRENDING / MIXED',
        checks
    };

    const hourly = computeHourlyTrend(candles15m);
    const replay = computeSignalsAndReplay(chartCandles, candles15m, offsetInFull, atr, daily, fullHma, fullSt);

    // Option chain (real Upstox v2 when token is valid)
    const optRes = await fetchOptionChainData(inst.upstoxKey, spotPrice, inst.step, token, todayYmd);
    const chain = optRes.ok ? optRes.chain : {
        pcrAtm: '-', pcrTotal: '-', pcrAtmTone: '', pcrTotalTone: '',
        putWall: null, callWall: null, maxPain: null,
        oiCE: '-', oiPE: '-', atmIv: null,
        expiry: optRes.error || 'Token required',
        ladder: []
    };

    // Seller advisory (real VIX + real GEX/skew when option chain is available)
    const seller = [];
    if (optRes.ok) {
        const posGex = optRes.gexCr >= 0;
        seller.push({
            name: 'Gamma (GEX)',
            tag: posGex ? 'GOOD' : 'BAD',
            note: `${posGex ? 'POSITIVE' : 'NEGATIVE'} ${optRes.gexCr > 0 ? '+' : ''}${optRes.gexCr} Cr per 1% move: ${posGex ? 'dealers dampen moves, ranges more likely (better for selling)' : 'dealers amplify moves, trend acceleration risk'}`
        });
    } else {
        seller.push({
            name: 'Gamma (GEX)',
            tag: 'INFO',
            note: `Unavailable (${optRes.error}) - refresh Upstox token in Settings`
        });
    }

    if (vixInfo.current != null) {
        const vixTag = vixInfo.pctAbove >= 50 ? 'GOOD' : 'INFO';
        seller.push({
            name: 'IV rank (VIX proxy)',
            tag: vixTag,
            note: `India VIX ${vixInfo.current.toFixed(1)} is above ${vixInfo.pctAbove}% of the last year's readings (rank ${vixInfo.rank}%). ${vixInfo.pctAbove >= 50 ? 'HIGH: richer premiums for sellers' : 'LOW/MODERATE: thinner option premiums'}`
        });
    }

    if (optRes.ok && optRes.skew) {
        const sk = optRes.skew;
        seller.push({
            name: 'Put/call skew',
            tag: Math.abs(sk.diff) > 3 ? 'BAD' : 'INFO',
            note: `25-delta put IV ${sk.put25Iv} vs call IV ${sk.call25Iv} = ${sk.diff > 0 ? '+' : ''}${sk.diff} pts`
        });
    } else {
        seller.push({
            name: 'Put/call skew',
            tag: 'INFO',
            note: optRes.ok ? 'Insufficient delta strikes for 25-delta skew' : 'Requires active Upstox option chain token'
        });
    }

    seller.push({
        name: 'Auto mode pick',
        tag: 'INFO',
        note: optRes.ok
            ? `${optRes.gexCr >= 0 && (vixInfo.pctAbove ?? 0) >= 50 ? 'SELL' : 'SELECTIVE'}: GEX ${optRes.gexCr >= 0 ? '+' : ''}${optRes.gexCr} Cr, VIX pct ${vixInfo.pctAbove ?? '-'}%`
            : 'Waiting for live option chain token to evaluate GEX + IV regime'
    });

    // Agents voting on direction
    const trendVote = (supertrend === 'UP' && hmaSlope === 'UP' && spotPrice > cprTop) ? 'BULL'
        : (supertrend === 'DOWN' && hmaSlope === 'DOWN' && spotPrice < cprBot) ? 'BEAR'
            : 'NEUTRAL';
    const gapVote = gapPct > 0.4 ? 'BULL' : gapPct < -0.4 ? 'BEAR' : 'NEUTRAL';
    const oiVote = !optRes.ok ? 'NEUTRAL'
        : (chain.pcrAtm >= 1.15 ? 'BULL' : chain.pcrAtm <= 0.85 ? 'BEAR' : 'NEUTRAL');
    const levelVote = spotPrice > prevDay.h ? 'BULL' : spotPrice < prevDay.l ? 'BEAR' : 'NEUTRAL';

    const agents = [
        { name: 'Trend', vote: trendVote, note: `Supertrend ${supertrend}, HMA ${hmaSlope}, ${spotPrice > cprTop ? 'above CPR' : spotPrice < cprBot ? 'below CPR' : 'inside CPR'}` },
        { name: '1-hour', vote: hourly.dir, note: hourly.note },
        { name: 'Gap', vote: gapVote, note: `opening gap ${gapPct > 0 ? '+' : ''}${gapPct.toFixed(2)}%` },
        { name: 'OI / PCR', vote: oiVote, note: optRes.ok ? `PCR ${chain.pcrAtm} (ATM) / ${chain.pcrTotal} (total); Put wall ${chain.putWall}, Call wall ${chain.callWall}` : `Option chain unavailable (${optRes.error})` },
        { name: 'Range', vote: levelVote, note: `Spot ${r2(spotPrice)} vs Prev H/L (${Math.round(prevDay.h)} / ${Math.round(prevDay.l)})` }
    ];

    const compScore = agents.reduce((s, a) => s + (a.vote === 'BULL' ? 1 : a.vote === 'BEAR' ? -1 : 0), 0);
    const composite = compScore >= 2
        ? { score: compScore, text: 'SELL PE side (bullish)', tone: 'up' }
        : compScore <= -2
            ? { score: compScore, text: 'SELL CE side (bearish)', tone: 'dn' }
            : { score: compScore, text: 'NO CLEAR EDGE - be selective', tone: 'mid' };

    const bias = compScore >= 1
        ? { text: 'BULLISH - SELL PE / BUY CE side', tone: 'up' }
        : compScore <= -1
            ? { text: 'BEARISH - SELL CE / BUY PE side', tone: 'dn' }
            : { text: 'NEUTRAL / MIXED - WAIT FOR BREAKOUT', tone: 'mid' };

    // Live explanation for why no signal right now
    const resLevels = levels.filter(l => /^(R1|R2|Prev high)$/.test(l.name) && l.v > spotPrice).map(l => l.v);
    const supLevels = levels.filter(l => /^(S1|S2|Prev low)$/.test(l.name) && l.v < spotPrice).map(l => l.v);
    const nearRes = resLevels.some(v => (v - spotPrice) <= 0.8 * atr);
    const nearSup = supLevels.some(v => (spotPrice - v) <= 0.8 * atr);

    const peReasons = [];
    if (spotPrice < cprBot) peReasons.push('price on the wrong side of the CPR');
    if (supertrend !== 'UP') peReasons.push('Supertrend points the other way');
    if (hmaLast != null && spotPrice < hmaLast) peReasons.push('price on the wrong side of the HMA');
    if (nearRes) peReasons.push('too close to resistance');
    if (hourly.dir === 'BEAR') peReasons.push('1-hour trend is against it');
    if (!peReasons.length) peReasons.push('waiting for fresh bullish OB/FVG retest');

    const ceReasons = [];
    if (spotPrice > cprTop) ceReasons.push('price on the wrong side of the CPR');
    if (supertrend !== 'DOWN') ceReasons.push('Supertrend points the other way');
    if (hmaLast != null && spotPrice > hmaLast && hmaSlope === 'UP') ceReasons.push('price on the wrong side of the HMA');
    if (nearSup) ceReasons.push('too close to support/resistance');
    if (hourly.dir === 'BULL') ceReasons.push('1-hour trend is against it');
    if (!ceReasons.length) ceReasons.push('waiting for fresh bearish OB/FVG retest');

    const peText = signalsEnabled ? peReasons.join('; ') : `Signals paused (Settings set to ${mode} only)`;
    const ceText = signalsEnabled ? ceReasons.join('; ') : `Signals paused (Settings set to ${mode} only)`;

    return {
        key: inst.key,
        signalsEnabled,
        price: spotPrice,
        change,
        changePct,
        bias: bias.text,
        biasTone: bias.tone,
        supertrend,
        hmaSlope,
        adx,
        atr,
        paperPts: signalsEnabled ? replay.paperPts : 0,
        sideways,
        days: last3Days.map(formatDayLabel),
        dayCounts,
        candles: chartCandles.map(({ o, h, l, c }) => ({ o, h, l, c })),
        hma,
        st,
        marks: signalsEnabled ? replay.marks : [],
        chain,
        seller,
        agents,
        composite,
        levels,
        why: { pe: peText, ce: ceText },
        signals: signalsEnabled ? replay.signals : [],
        latestTs: latestBar.ts
    };
}

async function getIndiaVixStats(todayYmd, quotes) {
    const daily = await fetchDailyCandles(VIX_KEY, todayYmd, 365).catch(() => []);
    const liveQ = findQuoteForKey(quotes, VIX_KEY);
    const closes = daily.map(d => d.c).filter(v => v > 0);
    const current = liveQ?.last_price ? Number(liveQ.last_price) : (closes.length ? closes[closes.length - 1] : null);
    if (current == null || !closes.length) return { current: null, pctAbove: null, rank: null };
    const below = closes.filter(v => v < current).length;
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const pctAbove = Math.round((below / closes.length) * 100);
    const rank = max > min ? Math.round(((current - min) / (max - min)) * 100) : 50;
    return { current, pctAbove, rank };
}

async function getLiveMarketSnapshot(token = '', selectedInstrument = 'BOTH', force = false) {
    const rawMode = String(selectedInstrument || 'BOTH').toUpperCase();
    const mode = ['NIFTY', 'SENSEX', 'BOTH'].includes(rawMode) ? rawMode : 'BOTH';
    const cacheKey = `${token ? token.slice(-12) : 'no-token'}:${mode}`;
    const hit = cache.get(cacheKey);
    if (!force && hit && (Date.now() - hit.ts) < CACHE_TTL_MS) {
        return hit.data;
    }

    const ist = getISTParts(new Date());
    const marketOpen = isMarketOpenIST(new Date());
    const quoteRes = await fetchLiveQuotes(token);
    const vixInfo = await getIndiaVixStats(ist.ymd, quoteRes.quotes);

    const instruments = await Promise.all(
        INSTRUMENTS.map(inst => buildInstrumentData(inst, ist.ymd, quoteRes.quotes, vixInfo, token, mode))
    );

    const latestTs = instruments.map(i => i.latestTs).filter(Boolean).sort().pop();
    const fetchedAt = new Date().toISOString();
    const asOf = quoteRes.quotes ? formatAsOf(fetchedAt) : formatAsOf(latestTs);

    const notices = [];
    if (quoteRes.quotes) {
        notices.push('Live Upstox quotes, option chain, and 15-min candles active.');
    } else {
        notices.push(`Spot candles & technicals are live from Upstox (${asOf}). Live quote & option chain need a valid Upstox token in Settings (${quoteRes.error}).`);
    }
    notices.push(`Signal filter: ${mode === 'BOTH' ? 'BOTH (NIFTY & SENSEX)' : mode + ' only'}.`);

    const data = {
        asOf,
        fetchedAt,
        marketOpen,
        activeInstrument: mode,
        source: quoteRes.quotes ? 'upstox-live' : 'upstox-candles',
        notice: notices.join(' '),
        instruments,
        autopilot: null,
        condor: null,
        alerts: []
    };

    cache.set(cacheKey, { ts: Date.now(), data });
    return data;
}

function clearMarketCache() {
    cache.clear();
}

module.exports = { getLiveMarketSnapshot, clearMarketCache };
