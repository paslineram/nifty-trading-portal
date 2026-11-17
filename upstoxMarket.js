const fs = require('fs');
const path = require('path');

const UPSTOX_V2 = 'https://api.upstox.com/v2';
const UPSTOX_V3 = 'https://api.upstox.com/v3';

const INSTRUMENTS = [
    { key: 'NIFTY', upstoxKey: 'NSE_INDEX|Nifty 50', step: 50, flatLimit: 12, lotQty: 25 },
    { key: 'SENSEX', upstoxKey: 'BSE_INDEX|SENSEX', step: 100, flatLimit: 37, lotQty: 20 }
];
const VIX_KEY = 'NSE_INDEX|India VIX';

const NIFTY_50_STOCKS = [
    { symbol: 'ADANIENT', sector: 'Metals & Energy', upstoxKey: 'NSE_EQ|INE423A01024' },
    { symbol: 'ADANIPORTS', sector: 'Infra', upstoxKey: 'NSE_EQ|INE742F01042' },
    { symbol: 'APOLLOHOSP', sector: 'Pharma', upstoxKey: 'NSE_EQ|INE437A01024' },
    { symbol: 'ASIANPAINT', sector: 'FMCG & Consumer', upstoxKey: 'NSE_EQ|INE021A01026' },
    { symbol: 'AXISBANK', sector: 'Banking', upstoxKey: 'NSE_EQ|INE238A01034' },
    { symbol: 'BAJAJ-AUTO', sector: 'Auto', upstoxKey: 'NSE_EQ|INE917I01010' },
    { symbol: 'BAJFINANCE', sector: 'Fin Service', upstoxKey: 'NSE_EQ|INE296A01032' },
    { symbol: 'BAJAJFINSV', sector: 'Fin Service', upstoxKey: 'NSE_EQ|INE918I01026' },
    { symbol: 'BEL', sector: 'Infra', upstoxKey: 'NSE_EQ|INE263A01024' },
    { symbol: 'BHARTIARTL', sector: 'Telecom & Media', upstoxKey: 'NSE_EQ|INE397D01024' },
    { symbol: 'CIPLA', sector: 'Pharma', upstoxKey: 'NSE_EQ|INE059A01026' },
    { symbol: 'COALINDIA', sector: 'Energy', upstoxKey: 'NSE_EQ|INE522F01014' },
    { symbol: 'DRREDDY', sector: 'Pharma', upstoxKey: 'NSE_EQ|INE089A01031' },
    { symbol: 'EICHERMOT', sector: 'Auto', upstoxKey: 'NSE_EQ|INE066A01021' },
    { symbol: 'ETERNAL', sector: 'FMCG & Consumer', upstoxKey: 'NSE_EQ|INE758T01015' },
    { symbol: 'GRASIM', sector: 'Infra', upstoxKey: 'NSE_EQ|INE047A01021' },
    { symbol: 'HCLTECH', sector: 'IT', upstoxKey: 'NSE_EQ|INE860A01027' },
    { symbol: 'HDFCBANK', sector: 'Banking', upstoxKey: 'NSE_EQ|INE040A01034' },
    { symbol: 'HDFCLIFE', sector: 'Fin Service', upstoxKey: 'NSE_EQ|INE795G01014' },
    { symbol: 'HINDALCO', sector: 'Metal', upstoxKey: 'NSE_EQ|INE038A01020' },
    { symbol: 'HINDUNILVR', sector: 'FMCG', upstoxKey: 'NSE_EQ|INE030A01027' },
    { symbol: 'ICICIBANK', sector: 'Banking', upstoxKey: 'NSE_EQ|INE090A01021' },
    { symbol: 'INDIGO', sector: 'Infra', upstoxKey: 'NSE_EQ|INE646L01027' },
    { symbol: 'INFY', sector: 'IT', upstoxKey: 'NSE_EQ|INE009A01021' },
    { symbol: 'ITC', sector: 'FMCG', upstoxKey: 'NSE_EQ|INE154A01025' },
    { symbol: 'JIOFIN', sector: 'Fin Service', upstoxKey: 'NSE_EQ|INE758E01017' },
    { symbol: 'JSWSTEEL', sector: 'Metal', upstoxKey: 'NSE_EQ|INE019A01038' },
    { symbol: 'KOTAKBANK', sector: 'Banking', upstoxKey: 'NSE_EQ|INE237A01036' },
    { symbol: 'LT', sector: 'Infra', upstoxKey: 'NSE_EQ|INE018A01030' },
    { symbol: 'M&M', sector: 'Auto', upstoxKey: 'NSE_EQ|INE101A01026' },
    { symbol: 'MARUTI', sector: 'Auto', upstoxKey: 'NSE_EQ|INE585B01010' },
    { symbol: 'MAXHEALTH', sector: 'Pharma', upstoxKey: 'NSE_EQ|INE027H01010' },
    { symbol: 'NESTLEIND', sector: 'FMCG', upstoxKey: 'NSE_EQ|INE239A01024' },
    { symbol: 'NTPC', sector: 'Energy', upstoxKey: 'NSE_EQ|INE733E01010' },
    { symbol: 'ONGC', sector: 'Energy', upstoxKey: 'NSE_EQ|INE213A01029' },
    { symbol: 'POWERGRID', sector: 'Energy', upstoxKey: 'NSE_EQ|INE752E01010' },
    { symbol: 'RELIANCE', sector: 'Energy', upstoxKey: 'NSE_EQ|INE002A01018' },
    { symbol: 'SBILIFE', sector: 'Fin Service', upstoxKey: 'NSE_EQ|INE123W01016' },
    { symbol: 'SBIN', sector: 'Banking', upstoxKey: 'NSE_EQ|INE062A01020' },
    { symbol: 'SHRIRAMFIN', sector: 'Fin Service', upstoxKey: 'NSE_EQ|INE721A01047' },
    { symbol: 'SUNPHARMA', sector: 'Pharma', upstoxKey: 'NSE_EQ|INE044A01036' },
    { symbol: 'TATACONSUM', sector: 'FMCG', upstoxKey: 'NSE_EQ|INE192A01025' },
    { symbol: 'TMPV', sector: 'Auto', upstoxKey: 'NSE_EQ|INE155A01022' },
    { symbol: 'TATASTEEL', sector: 'Metal', upstoxKey: 'NSE_EQ|INE081A01020' },
    { symbol: 'TCS', sector: 'IT', upstoxKey: 'NSE_EQ|INE467B01029' },
    { symbol: 'TECHM', sector: 'IT', upstoxKey: 'NSE_EQ|INE669C01036' },
    { symbol: 'TITAN', sector: 'FMCG & Consumer', upstoxKey: 'NSE_EQ|INE280A01028' },
    { symbol: 'TRENT', sector: 'FMCG & Consumer', upstoxKey: 'NSE_EQ|INE849A01020' },
    { symbol: 'ULTRACEMCO', sector: 'Infra', upstoxKey: 'NSE_EQ|INE481G01011' },
    { symbol: 'WIPRO', sector: 'IT', upstoxKey: 'NSE_EQ|INE075A01022' }
];

const SECTOR_INDICES = [
    { name: 'Nifty Bank', matchSector: 'Banking', upstoxKey: 'NSE_INDEX|Nifty Bank' },
    { name: 'Nifty Fin Service', matchSector: 'Fin Service', upstoxKey: 'NSE_INDEX|Nifty Fin Service' },
    { name: 'Nifty IT', matchSector: 'IT', upstoxKey: 'NSE_INDEX|Nifty IT' },
    { name: 'Nifty Auto', matchSector: 'Auto', upstoxKey: 'NSE_INDEX|Nifty Auto' },
    { name: 'Nifty Pharma', matchSector: 'Pharma', upstoxKey: 'NSE_INDEX|Nifty Pharma' },
    { name: 'Nifty FMCG', matchSector: 'FMCG', upstoxKey: 'NSE_INDEX|Nifty FMCG' },
    { name: 'Nifty Metal', matchSector: 'Metal', upstoxKey: 'NSE_INDEX|Nifty Metal' },
    { name: 'Nifty Energy', matchSector: 'Energy', upstoxKey: 'NSE_INDEX|Nifty Energy' },
    { name: 'Nifty Infra', matchSector: 'Infra', upstoxKey: 'NSE_INDEX|Nifty Infra' },
    { name: 'Nifty PSU Bank', matchSector: null, upstoxKey: 'NSE_INDEX|Nifty PSU Bank' },
    { name: 'Nifty Realty', matchSector: null, upstoxKey: 'NSE_INDEX|Nifty Realty' },
    { name: 'Nifty Media', matchSector: null, upstoxKey: 'NSE_INDEX|Nifty Media' }
];

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

const candleUrlCache = new Map();
const candleUrlInFlight = new Map();
let v3RateLimitedUntil = 0;

const CANDLE_CACHE_FILE = path.join(__dirname, 'data', 'candle_cache.json');
let candleSaveTimer = null;

function loadDiskCandleCache() {
    try {
        if (!fs.existsSync(CANDLE_CACHE_FILE)) return;
        const parsed = JSON.parse(fs.readFileSync(CANDLE_CACHE_FILE, 'utf8'));
        if (parsed && typeof parsed === 'object') {
            for (const [url, entry] of Object.entries(parsed)) {
                if (entry?.data?.data?.candles?.length) {
                    candleUrlCache.set(url, entry);
                }
            }
        }
    } catch (_) {}
}

function scheduleSaveCandleCache() {
    if (candleSaveTimer) return;
    candleSaveTimer = setTimeout(() => {
        candleSaveTimer = null;
        try {
            const dir = path.dirname(CANDLE_CACHE_FILE);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const entries = Array.from(candleUrlCache.entries())
                .filter(([, v]) => Array.isArray(v?.data?.data?.candles) && v.data.data.candles.length > 0)
                .sort((a, b) => b[1].ts - a[1].ts)
                .slice(0, 260);
            const obj = Object.fromEntries(entries);
            fs.writeFileSync(CANDLE_CACHE_FILE, JSON.stringify(obj), 'utf8');
        } catch (_) {}
    }, 1000);
}

loadDiskCandleCache();

function candleTtl(isIntraday = false) {
    const open = isMarketOpenIST(new Date());
    if (isIntraday) return open ? 45 * 1000 : 15 * 60 * 1000;
    return open ? 15 * 60 * 1000 : 60 * 60 * 1000;
}

async function fetchCandleJson(url, ttlMs) {
    const hit = candleUrlCache.get(url);
    const now = Date.now();
    if (hit && (now - hit.ts) < ttlMs) {
        return hit.data;
    }
    if (now < v3RateLimitedUntil) {
        return hit ? hit.data : { data: { candles: [] }, _rateLimited: true };
    }
    if (candleUrlInFlight.has(url)) {
        return candleUrlInFlight.get(url);
    }
    const p = (async () => {
        try {
            const json = await fetchJson(url);
            if (Array.isArray(json?.data?.candles)) {
                if (json.data.candles.length > 0 || !hit?.data?.data?.candles?.length) {
                    candleUrlCache.set(url, { ts: Date.now(), data: json });
                    if (json.data.candles.length > 0) scheduleSaveCandleCache();
                }
            }
            return json;
        } catch (err) {
            if (err?.status === 429) {
                v3RateLimitedUntil = Date.now() + 60000;
            }
            if (hit?.data) return hit.data;
            return { data: { candles: [] }, _errorStatus: err?.status || null };
        } finally {
            candleUrlInFlight.delete(url);
        }
    })();
    candleUrlInFlight.set(url, p);
    return p;
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
        fetchCandleJson(`${UPSTOX_V3}/historical-candle/${enc}/minutes/15/${todayYmd}/${fromYmd}`, candleTtl(false)),
        fetchCandleJson(`${UPSTOX_V3}/historical-candle/intraday/${enc}/minutes/15`, candleTtl(true))
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
        fetchCandleJson(`${UPSTOX_V3}/historical-candle/${enc}/days/1/${todayYmd}/${fromYmd}`, candleTtl(false)),
        fetchCandleJson(`${UPSTOX_V3}/historical-candle/intraday/${enc}/days/1`, candleTtl(true))
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
    let curKey = null;
    let curBar = null;
    for (const x of candles15m) {
        const hh = Number(String(x.ts).slice(11, 13));
        const mm = Number(String(x.ts).slice(14, 16));
        const mins = Number.isFinite(hh) && Number.isFinite(mm) ? (hh * 60 + mm) : 555;
        const slot = Math.min(5, Math.floor(Math.max(0, mins - 555) / 60));
        const key = `${x.ymd}|${slot}`;
        if (key !== curKey) {
            if (curBar) hourly.push(curBar);
            curKey = key;
            curBar = { o: x.o, h: x.h, l: x.l, c: x.c };
        } else {
            curBar.h = Math.max(curBar.h, x.h);
            curBar.l = Math.min(curBar.l, x.l);
            curBar.c = x.c;
        }
    }
    if (curBar) hourly.push(curBar);
    if (hourly.length < 6) return { dir: 'NEUTRAL', note: '1-hour trend flat/unclear' };
    const closes = hourly.map(x => x.c);
    const last = closes[closes.length - 1];
    const prev = closes[closes.length - 2];
    const sma5 = closes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    if (last > sma5 && last > prev) return { dir: 'BULL', note: `1-hour close (${r2(last)}) above 5-bar SMA (${r2(sma5)})` };
    if (last < sma5 && last < prev) return { dir: 'BEAR', note: `1-hour close (${r2(last)}) below 5-bar SMA (${r2(sma5)})` };
    return { dir: 'NEUTRAL', note: `1-hour close (${r2(last)}) vs 5-bar SMA (${r2(sma5)}) mixed/flat` };
}

function computeSignalsAndReplay(chartCandles, fullCandles, offsetInFull, atrLatest, daily, fullHma, fullSt) {
    const signals = [];
    const marks = [];
    const exits = [];
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

    // Causal trendline tracking (swing pivot window L = 3, confirmed at p + L with zero look-ahead)
    const swingL = 3;
    const swingHighs = [];
    const swingLows = [];
    const allTrendlines = [];
    let activeUp = null;
    let activeDown = null;
    const lineVal = (tl, idx) => tl.v1 + tl.slope * (idx - tl.i1);

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
    const closePos = (barIdx, exitPrice, reason, ts) => {
        if (!pos) return;
        const pts = Math.round(pos.side === 'SELL PE' ? (exitPrice - pos.ref) : (pos.ref - exitPrice));
        if (barIdx >= offsetInFull) {
            paperPts += pts;
        }
        if (pos.signalRef) {
            pos.signalRef.exitTs = ts || null;
            pos.signalRef.exitTime = ts ? formatSignalTime(ts) : null;
            pos.signalRef.exitPrice = Math.round(exitPrice);
            pos.signalRef.exitReason = reason;
            pos.signalRef.pts = pts;
        }
        const chartExitIdx = barIdx - offsetInFull;
        if (chartExitIdx >= 0 && chartExitIdx < chartCandles.length && reason !== 'EOD') {
            exits.push({
                i: chartExitIdx,
                side: pos.side === 'SELL PE' ? 'EXIT_PE' : 'EXIT_CE',
                price: Math.round(exitPrice),
                reason,
                pts
            });
        }
        pos = null;
    };

    for (let i = 14; i < fullCandles.length; i++) {
        const c = fullCandles[i];
        const chartIdx = i - offsetInFull;
        const hm = String(c.ts).slice(11, 16);

        // Day rollover square-off
        if (i > 0 && fullCandles[i - 1].ymd !== c.ymd && pos) {
            const prevBar = fullCandles[i - 1];
            closePos(i - 1, prevBar.c, 'EOD', prevBar.ts);
        }

        // Update causal swing pivots confirmed at bar p = i - swingL
        const p = i - swingL;
        if (p >= swingL) {
            const pv = fullCandles[p];
            let isSH = true;
            let isSL = true;
            for (let k = p - swingL; k <= p + swingL; k++) {
                if (k === p) continue;
                const kc = fullCandles[k];
                if (k < p) {
                    if (pv.h <= kc.h) isSH = false;
                    if (pv.l >= kc.l) isSL = false;
                } else {
                    if (pv.h < kc.h) isSH = false;
                    if (pv.l > kc.l) isSL = false;
                }
            }
            if (isSH) {
                for (let j = swingHighs.length - 1; j >= Math.max(0, swingHighs.length - 8); j--) {
                    const prevSH = swingHighs[j];
                    if (p - prevSH.i < 4 || pv.h >= prevSH.v) continue;
                    const slope = (pv.h - prevSH.v) / (p - prevSH.i);
                    const cand = { side: 'DOWN', i1: prevSH.i, v1: prevSH.v, i2: p, v2: pv.h, slope, broken: false, breakIdx: null, breakPrice: null };
                    let intact = true;
                    for (let k = prevSH.i + 1; k <= i; k++) {
                        if (fullCandles[k].c > lineVal(cand, k)) {
                            intact = false;
                            break;
                        }
                    }
                    if (intact) {
                        activeDown = cand;
                        allTrendlines.push(cand);
                        break;
                    }
                }
                swingHighs.push({ i: p, v: pv.h });
            }
            if (isSL) {
                for (let j = swingLows.length - 1; j >= Math.max(0, swingLows.length - 8); j--) {
                    const prevSL = swingLows[j];
                    if (p - prevSL.i < 4 || pv.l <= prevSL.v) continue;
                    const slope = (pv.l - prevSL.v) / (p - prevSL.i);
                    const cand = { side: 'UP', i1: prevSL.i, v1: prevSL.v, i2: p, v2: pv.l, slope, broken: false, breakIdx: null, breakPrice: null };
                    let intact = true;
                    for (let k = prevSL.i + 1; k <= i; k++) {
                        if (fullCandles[k].c < lineVal(cand, k)) {
                            intact = false;
                            break;
                        }
                    }
                    if (intact) {
                        activeUp = cand;
                        allTrendlines.push(cand);
                        break;
                    }
                }
                swingLows.push({ i: p, v: pv.l });
            }
        }

        // Check active trendline breaks on bar i close
        let justBrokeUp = false;
        let justBrokeDown = false;
        if (activeUp && !activeUp.broken && i > activeUp.i2 + swingL) {
            if (c.c < lineVal(activeUp, i)) {
                activeUp.broken = true;
                activeUp.breakIdx = i;
                activeUp.breakPrice = c.c;
                justBrokeUp = true;
            }
        }
        if (activeDown && !activeDown.broken && i > activeDown.i2 + swingL) {
            if (c.c > lineVal(activeDown, i)) {
                activeDown.broken = true;
                activeDown.breakIdx = i;
                activeDown.breakPrice = c.c;
                justBrokeDown = true;
            }
        }

        // Rolling ATR14 at bar i
        let atr = 0;
        for (let k = i - 13; k <= i; k++) {
            const cur = fullCandles[k], prev = fullCandles[k - 1];
            atr += Math.max(cur.h - cur.l, Math.abs(cur.h - prev.c), Math.abs(cur.l - prev.c));
        }
        atr /= 14;

        const stUp = fullSt[i]?.up;

        // Check active position SL / TP1, then protected trendline break exit on candle close
        if (pos) {
            if (pos.side === 'SELL PE') {
                const tlProtected = (c.c - pos.ref) >= 0.4 * pos.risk || stUp === false;
                if (c.l <= pos.sl) {
                    closePos(i, pos.sl, 'SL', c.ts);
                } else if (c.h >= pos.tp1) {
                    closePos(i, pos.tp1, 'TP1', c.ts);
                } else if (justBrokeUp && tlProtected) {
                    closePos(i, c.c, 'TL BREAK', c.ts);
                }
            } else {
                const tlProtected = (pos.ref - c.c) >= 0.4 * pos.risk || stUp === true;
                if (c.h >= pos.sl) {
                    closePos(i, pos.sl, 'SL', c.ts);
                } else if (c.l <= pos.tp1) {
                    closePos(i, pos.tp1, 'TP1', c.ts);
                } else if (justBrokeDown && tlProtected) {
                    closePos(i, c.c, 'TL BREAK', c.ts);
                }
            }
        }

        // Intraday square-off at 15:15 IST
        if (hm >= '15:15' && pos) {
            closePos(i, c.c, 'EOD', c.ts);
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
        const inWindow = hm >= '09:30' && hm <= '14:15';
        const hmaCur = fullHma[i];
        const hmaPrev = fullHma[i - 1];
        const hmaUp = hmaCur != null && hmaPrev != null && hmaCur > hmaPrev;
        const hmaDn = hmaCur != null && hmaPrev != null && hmaCur < hmaPrev;
        const bullHma = hmaCur == null || hmaUp;
        const bearHma = hmaCur == null || hmaDn;
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
                    const sigRef = { ts: c.ts, time: formatSignalTime(c.ts), side: 'SELL PE', ref, sl, tp1, setup: 'OB/FVG' };
                    pos = { side: 'SELL PE', ref, sl, tp1, risk, signalRef: sigRef };
                    signals.unshift(sigRef);
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
                    const sigRef = { ts: c.ts, time: formatSignalTime(c.ts), side: 'SELL CE', ref, sl, tp1, setup: 'OB/FVG' };
                    pos = { side: 'SELL CE', ref, sl, tp1, risk, signalRef: sigRef };
                    signals.unshift(sigRef);
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

    // Select the most recent UP and DOWN trendlines that appear in the 3-day chart window
    const lastBarFull = fullCandles.length - 1;
    const formatChartTL = (tl) => {
        const rawEndIdx = tl.broken && tl.breakIdx != null
            ? Math.min(lastBarFull, tl.breakIdx + 1)
            : lastBarFull;
        if (rawEndIdx < offsetInFull || tl.i2 < offsetInFull - 4) return null;
        const clippedStart = tl.i1 < offsetInFull;
        const i1 = clippedStart ? 0 : (tl.i1 - offsetInFull);
        const v1 = clippedStart ? lineVal(tl, offsetInFull) : tl.v1;
        const i2 = Math.max(0, tl.i2 - offsetInFull);
        const v2 = tl.i2 < offsetInFull ? lineVal(tl, offsetInFull) : tl.v2;
        const endIdx = Math.min(chartCandles.length - 1, rawEndIdx - offsetInFull);
        const breakChartIdx = tl.breakIdx != null ? tl.breakIdx - offsetInFull : null;
        return {
            side: tl.side,
            i1,
            v1: r2(v1),
            hasAnchor1: !clippedStart,
            i2,
            v2: r2(v2),
            hasAnchor2: tl.i2 >= offsetInFull,
            endIdx,
            endVal: r2(lineVal(tl, offsetInFull + endIdx)),
            broken: Boolean(tl.broken),
            breakIdx: breakChartIdx != null && breakChartIdx >= 0 && breakChartIdx < chartCandles.length ? breakChartIdx : null,
            breakPrice: tl.breakPrice != null ? r2(tl.breakPrice) : null
        };
    };

    const upTLs = allTrendlines.filter(t => t.side === 'UP').map(formatChartTL).filter(Boolean).slice(-2);
    const dnTLs = allTrendlines.filter(t => t.side === 'DOWN').map(formatChartTL).filter(Boolean).slice(-2);
    const trendlines = [...upTLs, ...dnTLs].sort((a, b) => a.i2 - b.i2);

    return {
        signals: signals.slice(0, 6),
        marks,
        exits,
        trendlines,
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
    if (!token) return { quotes: null, error: 'Upstox Access Token not set', status: null, isAuthError: false };
    try {
        const keys = [INSTRUMENTS[0].upstoxKey, INSTRUMENTS[1].upstoxKey, VIX_KEY].join(',');
        const json = await fetchJson(`${UPSTOX_V2}/market-quote/quotes?instrument_key=${encodeURIComponent(keys)}`, token);
        return { quotes: json?.data || null, error: null, status: 200, isAuthError: false };
    } catch (err) {
        const msg = err.message || 'Live quote request failed';
        const status = err.status || null;
        const isAuthError = status === 401 || /invalid|expired|unauthoriz/i.test(msg);
        return { quotes: null, error: msg, status, isAuthError };
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

    const liveQ = findQuoteForKey(quotes, inst.upstoxKey);
    if (!candles15m.length || daily.length < 2) {
        if (!liveQ?.last_price) {
            throw new Error(`No Upstox candle data returned for ${inst.key}`);
        }
        const spotPrice = r2(liveQ.last_price);
        const change = liveQ.net_change != null ? r2(liveQ.net_change) : 0;
        const prevClose = r2(spotPrice - change);
        const changePct = prevClose ? r2((change / prevClose) * 100) : 0;
        const ohlc = liveQ.ohlc || { open: prevClose, high: spotPrice, low: spotPrice, close: prevClose };
        const synthPrev = {
            h: Number(ohlc.high || spotPrice),
            l: Number(ohlc.low || spotPrice),
            c: prevClose || spotPrice
        };
        const { levels } = buildLevels(synthPrev, spotPrice);
        const optRes = await fetchOptionChainData(inst.upstoxKey, spotPrice, inst.step, token, todayYmd);
        const chain = optRes.ok ? optRes.chain : {
            pcrAtm: '-', pcrTotal: '-', pcrAtmTone: '', pcrTotalTone: '',
            putWall: null, callWall: null, maxPain: null,
            oiCE: '-', oiPE: '-', atmIv: null,
            expiry: optRes.error || 'Token required',
            ladder: []
        };
        const oiVote = !optRes.ok ? 'NEUTRAL'
            : (chain.pcrAtm >= 1.15 ? 'BULL' : chain.pcrAtm <= 0.85 ? 'BEAR' : 'NEUTRAL');
        const agents = [
            { name: 'Trend', vote: 'NEUTRAL', note: '15-min candles temporarily rate-limited by Upstox; using live quote' },
            { name: '1-hour', vote: 'NEUTRAL', note: 'Waiting for Upstox candle rate-limit cooldown' },
            { name: 'Gap', vote: 'NEUTRAL', note: 'Live quote active' },
            { name: 'OI / PCR', vote: oiVote, note: optRes.ok ? `PCR ${chain.pcrAtm} (ATM) / ${chain.pcrTotal} (total); Put wall ${chain.putWall}, Call wall ${chain.callWall}` : `Option chain unavailable (${optRes.error})` },
            { name: 'Range', vote: 'NEUTRAL', note: `Spot ${spotPrice}` }
        ];
        const compScore = oiVote === 'BULL' ? 1 : oiVote === 'BEAR' ? -1 : 0;
        return {
            key: inst.key,
            candlesRateLimited: true,
            signalsEnabled,
            price: spotPrice,
            change,
            changePct,
            bias: change >= 0 ? 'BULLISH - LIVE QUOTE' : 'BEARISH - LIVE QUOTE',
            biasTone: change >= 0 ? 'up' : 'dn',
            supertrend: 'NEUTRAL',
            hmaSlope: 'FLAT',
            adx: 0,
            atr: 0,
            paperPts: 0,
            sideways: { score: 0, total: 6, label: 'CANDLE COOLDOWN', checks: [] },
            days: [],
            dayCounts: [],
            candles: [],
            hma: [],
            st: [],
            marks: [],
            exits: [],
            trendlines: [],
            chain,
            seller: [{ name: 'Candle Feed', tag: 'INFO', note: 'Upstox historical-candle endpoint is cooling down from rate-limit; live quote & option chain active.' }],
            agents,
            composite: { score: compScore, text: 'CANDLE COOLDOWN - QUOTE & OI LIVE', tone: 'mid' },
            levels,
            why: { pe: 'Waiting for Upstox candle rate-limit recovery', ce: 'Waiting for Upstox candle rate-limit recovery' },
            signals: [],
            latestTs: new Date().toISOString(),
            latestBarTime: null,
            latestBarClose: null
        };
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
    if (hmaSlope !== 'UP') peReasons.push('HMA(21) slope points the other way');
    if (nearRes) peReasons.push('too close to resistance');
    if (hourly.dir === 'BEAR') peReasons.push('1-hour trend is against it');
    if (!peReasons.length) peReasons.push('waiting for fresh bullish OB/FVG retest');

    const ceReasons = [];
    if (spotPrice > cprTop) ceReasons.push('price on the wrong side of the CPR');
    if (supertrend !== 'DOWN') ceReasons.push('Supertrend points the other way');
    if (hmaSlope !== 'DOWN') ceReasons.push('HMA(21) slope points the other way');
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
        exits: signalsEnabled ? replay.exits : [],
        trendlines: replay.trendlines || [],
        chain,
        seller,
        agents,
        composite,
        levels,
        why: { pe: peText, ce: ceText },
        signals: signalsEnabled ? replay.signals : [],
        latestTs: latestBar.ts,
        latestBarTime: formatAsOf(latestBar.ts),
        latestBarClose: r2(latestBar.c)
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

async function mapWithConcurrency(items, limit, fn) {
    const out = new Array(items.length);
    let next = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (true) {
            const idx = next++;
            if (idx >= items.length) break;
            out[idx] = await fn(items[idx], idx);
        }
    });
    await Promise.all(workers);
    return out;
}

async function fetchBatchQuotes(upstoxKeys, token) {
    if (!token || !upstoxKeys.length) return {};
    const merged = {};
    const chunkSize = 35;
    for (let i = 0; i < upstoxKeys.length; i += chunkSize) {
        const chunk = upstoxKeys.slice(i, i + chunkSize);
        try {
            const json = await fetchJson(
                `${UPSTOX_V2}/market-quote/quotes?instrument_key=${encodeURIComponent(chunk.join(','))}`,
                token
            );
            if (json?.data) Object.assign(merged, json.data);
        } catch (_) {
            // Fall back to v3 daily candles per missing instrument
        }
    }
    return merged;
}

async function fetchKeyPriceChange(upstoxKey, todayYmd, batchQuotes, marketOpen) {
    const q = findQuoteForKey(batchQuotes, upstoxKey);
    if (q && q.last_price != null && q.net_change != null) {
        const price = Number(q.last_price);
        const change = Number(q.net_change);
        const prevClose = price - change;
        if (price > 0 && prevClose > 0 && (change !== 0 || marketOpen || (q.ohlc && q.ohlc.open > 0))) {
            const changePct = r2((change / prevClose) * 100);
            return { price: r2(price), prevClose: r2(prevClose), change: r2(change), changePct };
        }
    }

    // Fallback (pre/post-market reset or missing token): fetch Upstox v3 daily candles (cached)
    const enc = encodeURIComponent(upstoxKey);
    const fromYmd = addDaysYmd(todayYmd, -10);
    const [hist, intra] = await Promise.all([
        fetchCandleJson(`${UPSTOX_V3}/historical-candle/${enc}/days/1/${todayYmd}/${fromYmd}`, candleTtl(false)),
        marketOpen
            ? fetchCandleJson(`${UPSTOX_V3}/historical-candle/intraday/${enc}/days/1`, candleTtl(true))
            : Promise.resolve({ data: { candles: [] } })
    ]);
    const map = new Map();
    for (const c of [...parseCandles(hist?.data?.candles), ...parseCandles(intra?.data?.candles)]) {
        map.set(c.ymd, c);
    }
    const daily = Array.from(map.values()).sort((a, b) => a.ymd.localeCompare(b.ymd));
    if (daily.length < 2) return null;
    const latest = daily[daily.length - 1];
    const prev = daily[daily.length - 2];
    if (!latest?.c || !prev?.c) return null;
    const change = r2(latest.c - prev.c);
    const changePct = r2(((latest.c - prev.c) / prev.c) * 100);
    return { price: r2(latest.c), prevClose: r2(prev.c), change, changePct };
}

async function fetchMarketXRay(todayYmd, token, marketOpen) {
    const allKeys = [...NIFTY_50_STOCKS.map(s => s.upstoxKey), ...SECTOR_INDICES.map(s => s.upstoxKey)];
    const batchQuotes = await fetchBatchQuotes(allKeys, token);

    const flatBand = 0.15;
    const classify = (pct) => pct > flatBand ? 'UP' : pct < -flatBand ? 'LOW' : 'NEUTRAL';

    const [stockRows, sectorRows] = await Promise.all([
        mapWithConcurrency(NIFTY_50_STOCKS, 5, async (st) => {
            const p = await fetchKeyPriceChange(st.upstoxKey, todayYmd, batchQuotes, marketOpen);
            if (!p) return null;
            return {
                symbol: st.symbol,
                sector: st.sector,
                price: p.price,
                prevClose: p.prevClose,
                change: p.change,
                changePct: p.changePct,
                status: classify(p.changePct)
            };
        }),
        mapWithConcurrency(SECTOR_INDICES, 4, async (sec) => {
            const p = await fetchKeyPriceChange(sec.upstoxKey, todayYmd, batchQuotes, marketOpen);
            if (!p) return null;
            return {
                name: sec.name,
                matchSector: sec.matchSector,
                price: p.price,
                change: p.change,
                changePct: p.changePct,
                status: p.changePct > flatBand ? 'BULL' : p.changePct < -flatBand ? 'BEAR' : 'NEUTRAL'
            };
        })
    ]);

    const stocks = stockRows.filter(Boolean);
    const up = stocks.filter(s => s.status === 'UP').length;
    const low = stocks.filter(s => s.status === 'LOW').length;
    const neutral = stocks.filter(s => s.status === 'NEUTRAL').length;
    const total = stocks.length || 1;

    const sortedDesc = [...stocks].sort((a, b) => b.changePct - a.changePct);
    const sortedAsc = [...stocks].sort((a, b) => a.changePct - b.changePct);
    const topHigh = sortedDesc.slice(0, 8);
    const topLoss = sortedAsc.slice(0, 8);

    const sectors = sectorRows.filter(Boolean).map(sec => {
        const members = sec.matchSector
            ? stocks.filter(s => s.sector === sec.matchSector || (sec.matchSector === 'FMCG' && s.sector === 'FMCG & Consumer'))
            : [];
        return {
            name: sec.name,
            matchSector: sec.matchSector || null,
            price: sec.price,
            change: sec.change,
            changePct: sec.changePct,
            status: sec.status,
            breadth: members.length ? {
                up: members.filter(m => m.status === 'UP').length,
                low: members.filter(m => m.status === 'LOW').length,
                neutral: members.filter(m => m.status === 'NEUTRAL').length,
                total: members.length
            } : null
        };
    }).sort((a, b) => b.changePct - a.changePct);

    const stockMap = new Map(stocks.map(s => [s.symbol, s]));
    const nearOrderBlocks = await scanNifty50OrderBlocks({
        timeframe: '5m',
        maxDistPct: 0.25,
        token,
        stockMap
    }).catch(() => null);

    return {
        breadth: {
            total: stocks.length,
            up,
            low,
            neutral,
            upPct: Math.round((up / total) * 100),
            lowPct: Math.round((low / total) * 100),
            neutralPct: Math.round((neutral / total) * 100),
            adRatio: low ? r2(up / low) : up,
            flatBand
        },
        sectors,
        topHigh,
        topLoss,
        nearOrderBlocks,
        stocks: sortedDesc
    };
}

const lastGoodSnapshotByMode = new Map();
let lastXraySnapshot = { ts: 0, tokenTail: '', data: null };
const xrayInFlight = new Map();

function getXraySnapshotOrWarm(todayYmd, token, marketOpen, force = false) {
    const tokenTail = token ? token.slice(-12) : 'no-tok';
    const xrayTtl = marketOpen ? 30000 : 120000;
    if (!force && lastXraySnapshot.data && lastXraySnapshot.tokenTail === tokenTail && (Date.now() - lastXraySnapshot.ts) < xrayTtl) {
        return { promise: Promise.resolve(lastXraySnapshot.data), fromCache: true };
    }
    let p = xrayInFlight.get(tokenTail);
    if (!p) {
        p = fetchMarketXRay(todayYmd, token, marketOpen)
            .then(res => {
                if (res) {
                    lastXraySnapshot = { ts: Date.now(), tokenTail, data: res };
                    for (const entry of cache.values()) {
                        if (entry?.data && !entry.data.xray) {
                            entry.data.xray = res;
                            entry.data.xrayWarming = false;
                        }
                    }
                    for (const snap of lastGoodSnapshotByMode.values()) {
                        if (snap && !snap.xray) {
                            snap.xray = res;
                            snap.xrayWarming = false;
                        }
                    }
                }
                return res;
            })
            .catch(() => null)
            .finally(() => {
                if (xrayInFlight.get(tokenTail) === p) xrayInFlight.delete(tokenTail);
            });
        xrayInFlight.set(tokenTail, p);
    }
    return { promise: p, fromCache: false };
}

async function getLiveMarketSnapshot(token = '', selectedInstrument = 'BOTH', force = false, opts = {}) {
    const rawMode = String(selectedInstrument || 'BOTH').toUpperCase();
    const mode = ['NIFTY', 'SENSEX', 'BOTH'].includes(rawMode) ? rawMode : 'BOTH';
    const includeXray = opts.includeXray !== false;
    const cacheKey = `${token ? token.slice(-12) : 'no-token'}:${mode}`;
    const hit = cache.get(cacheKey);
    if (!force && hit && (Date.now() - hit.ts) < CACHE_TTL_MS && (!includeXray || hit.data?.xray)) {
        return hit.data;
    }

    const ist = getISTParts(new Date());
    const marketOpen = isMarketOpenIST(new Date());
    const quoteRes = await fetchLiveQuotes(token);
    const vixInfo = await getIndiaVixStats(ist.ymd, quoteRes.quotes);

    const staleHit = lastGoodSnapshotByMode.get(mode);
    const fallbackXray = staleHit?.xray || lastXraySnapshot.data || null;
    let xrayTimedOut = false;

    let xrayTask;
    if (includeXray) {
        const { promise, fromCache } = getXraySnapshotOrWarm(ist.ymd, token, marketOpen, force);
        xrayTask = fromCache
            ? promise
            : Promise.race([
                promise,
                new Promise(resolve => setTimeout(() => {
                    xrayTimedOut = true;
                    resolve(fallbackXray);
                }, 4500))
            ]);
    } else {
        xrayTask = Promise.resolve(fallbackXray);
    }

    let instruments;
    let xray;
    try {
        [instruments, xray] = await Promise.all([
            Promise.all(INSTRUMENTS.map(inst => buildInstrumentData(inst, ist.ymd, quoteRes.quotes, vixInfo, token, mode))),
            xrayTask
        ]);
    } catch (err) {
        if (staleHit) {
            return {
                ...staleHit,
                quoteAuthFailed: Boolean(token && quoteRes.isAuthError),
                quoteHttpStatus: quoteRes.status || staleHit.quoteHttpStatus || null,
                quoteError: quoteRes.error || staleHit.quoteError || null,
                notice: `${staleHit.notice || ''} (Serving last synced snapshot while Upstox recovers: ${err?.message || 'rate limit'})`.trim()
            };
        }
        throw err;
    }

    const latestTs = instruments.map(i => i.latestTs).filter(Boolean).sort().pop();
    const fetchedAt = new Date().toISOString();
    const asOf = quoteRes.quotes ? formatAsOf(fetchedAt) : formatAsOf(latestTs);

    const notices = [];
    if (quoteRes.quotes) {
        notices.push('Live Upstox quotes, option chain, and 15-min candles active.');
    } else if (!token || quoteRes.isAuthError) {
        notices.push(`Spot candles & technicals are live from Upstox (${asOf}). Live quote & option chain need a valid Upstox token (${quoteRes.error}).`);
    } else {
        notices.push(`Spot candles & technicals are live from Upstox (${asOf}). Live quote temporarily unavailable (${quoteRes.error}) — retrying on next refresh.`);
    }
    const anyRateLimited = instruments.some(i => i.candlesRateLimited);
    if (anyRateLimited) {
        notices.push('Candle history temporarily rate-limited by Upstox — live quotes, option chain & market breadth active.');
    }
    notices.push(`Signal filter: ${mode === 'BOTH' ? 'BOTH (NIFTY & SENSEX)' : mode + ' only'}.`);

    const finalXray = xray || fallbackXray || null;
    const xrayWarming = Boolean(includeXray && xrayTimedOut && !finalXray);
    const data = {
        asOf,
        fetchedAt,
        marketOpen,
        activeInstrument: mode,
        source: quoteRes.quotes ? 'upstox-live' : 'upstox-candles',
        quoteAuthFailed: Boolean(token && quoteRes.isAuthError),
        quoteHttpStatus: quoteRes.status || null,
        quoteError: quoteRes.error || null,
        notice: notices.join(' '),
        instruments,
        xray: finalXray,
        xrayWarming,
        autopilot: null,
        condor: null,
        alerts: []
    };

    if (!anyRateLimited) {
        lastGoodSnapshotByMode.set(mode, data);
        if (quoteRes.quotes || !token || quoteRes.isAuthError) {
            cache.set(cacheKey, { ts: Date.now(), data });
        }
    }
    return data;
}

async function fetchCandles15mRange(upstoxKey, todayYmd, totalDays) {
    const enc = encodeURIComponent(upstoxKey);
    const chunks = [];
    let endYmd = todayYmd;
    let remaining = Math.max(15, Math.min(180, totalDays));
    while (remaining > 0) {
        const span = Math.min(28, remaining);
        const startYmd = addDaysYmd(endYmd, -span);
        chunks.push({ fromYmd: startYmd, toYmd: endYmd });
        endYmd = addDaysYmd(startYmd, -1);
        remaining -= (span + 1);
    }

    const resps = await Promise.all([
        ...chunks.map(ch =>
            fetchCandleJson(`${UPSTOX_V3}/historical-candle/${enc}/minutes/15/${ch.toYmd}/${ch.fromYmd}`, candleTtl(false))
        ),
        fetchCandleJson(`${UPSTOX_V3}/historical-candle/intraday/${enc}/minutes/15`, candleTtl(true))
    ]);

    const map = new Map();
    for (const r of resps) {
        for (const c of parseCandles(r?.data?.candles)) {
            map.set(c.ts, c);
        }
    }
    return Array.from(map.values()).sort((a, b) => a.ts.localeCompare(b.ts));
}

function simulateIndexBacktest(inst, candles15m, daily, simStartYmd, opts) {
    const { obMaxAge, rrRatio, maxTradesPerDay, useTrendlineExit } = opts;
    const qty = inst.key === 'NIFTY' ? (opts.niftyQty || 25) : (opts.sensexQty || 20);
    if (!candles15m.length || daily.length < 2) return [];

    const fullCloses = candles15m.map(c => c.c);
    const fullHma = computeHMA(fullCloses);
    const fullSt = computeSupertrend(candles15m, 10, 3);

    const lvByDay = {};
    for (let i = 1; i < daily.length; i++) {
        const p = daily[i - 1];
        const piv = (p.h + p.l + p.c) / 3;
        const bc = (p.h + p.l) / 2;
        const tc = 2 * piv - bc;
        lvByDay[daily[i].ymd] = {
            piv,
            top: Math.max(tc, bc),
            bot: Math.min(tc, bc),
            res: [2 * piv - p.l, piv + (p.h - p.l), p.h],
            sup: [2 * piv - p.h, piv - (p.h - p.l), p.l]
        };
    }

    const structBars = 6;
    const obLookback = 10;
    const impATR = 0.8;
    const slBuf = 0.25;
    const swingL = 3;
    const swingHighs = [];
    const swingLows = [];
    let activeUp = null;
    let activeDown = null;
    const lineVal = (tl, idx) => tl.v1 + tl.slope * (idx - tl.i1);

    let bullOB = null;
    let bearOB = null;
    let bullFVG = null;
    let bearFVG = null;
    let prevBullImp = false;
    let prevBearImp = false;
    let pos = null;
    let tradesToday = 0;
    let lastYmd = '';
    const trades = [];

    const closePos = (exitPrice, reason, exitTs) => {
        if (!pos) return;
        const pts = Math.round(pos.side === 'SELL PE' ? (exitPrice - pos.ref) : (pos.ref - exitPrice));
        const pnl = Math.round(pts * qty);
        trades.push({
            index: inst.key,
            qty,
            entryTs: pos.entryTs,
            entryTime: formatSignalTime(pos.entryTs),
            exitTs: exitTs || pos.entryTs,
            exitTime: exitTs ? formatSignalTime(exitTs) : '-',
            side: pos.side,
            entryPrice: pos.ref,
            sl: pos.sl,
            tp1: pos.tp1,
            exitPrice: Math.round(exitPrice),
            exitReason: reason,
            pts,
            pnl,
            setup: pos.setup
        });
        pos = null;
    };

    for (let i = 14; i < candles15m.length; i++) {
        const c = candles15m[i];
        const hm = String(c.ts).slice(11, 16);

        if (c.ymd !== lastYmd) {
            if (pos && i > 0) {
                const prevBar = candles15m[i - 1];
                closePos(prevBar.c, 'EOD', prevBar.ts);
            }
            tradesToday = 0;
            lastYmd = c.ymd;
        }

        // Causal L=3 swing trendlines
        const p = i - swingL;
        if (p >= swingL) {
            const pv = candles15m[p];
            let isSH = true;
            let isSL = true;
            for (let k = p - swingL; k <= p + swingL; k++) {
                if (k === p) continue;
                const kc = candles15m[k];
                if (k < p) {
                    if (pv.h <= kc.h) isSH = false;
                    if (pv.l >= kc.l) isSL = false;
                } else {
                    if (pv.h < kc.h) isSH = false;
                    if (pv.l > kc.l) isSL = false;
                }
            }
            if (isSH) {
                for (let j = swingHighs.length - 1; j >= Math.max(0, swingHighs.length - 8); j--) {
                    const prevSH = swingHighs[j];
                    if (p - prevSH.i < 4 || pv.h >= prevSH.v) continue;
                    const slope = (pv.h - prevSH.v) / (p - prevSH.i);
                    const cand = { i1: prevSH.i, v1: prevSH.v, i2: p, slope, broken: false };
                    let intact = true;
                    for (let k = prevSH.i + 1; k <= i; k++) {
                        if (candles15m[k].c > lineVal(cand, k)) { intact = false; break; }
                    }
                    if (intact) { activeDown = cand; break; }
                }
                swingHighs.push({ i: p, v: pv.h });
            }
            if (isSL) {
                for (let j = swingLows.length - 1; j >= Math.max(0, swingLows.length - 8); j--) {
                    const prevSL = swingLows[j];
                    if (p - prevSL.i < 4 || pv.l <= prevSL.v) continue;
                    const slope = (pv.l - prevSL.v) / (p - prevSL.i);
                    const cand = { i1: prevSL.i, v1: prevSL.v, i2: p, slope, broken: false };
                    let intact = true;
                    for (let k = prevSL.i + 1; k <= i; k++) {
                        if (candles15m[k].c < lineVal(cand, k)) { intact = false; break; }
                    }
                    if (intact) { activeUp = cand; break; }
                }
                swingLows.push({ i: p, v: pv.l });
            }
        }

        let justBrokeUp = false;
        let justBrokeDown = false;
        if (activeUp && !activeUp.broken && i > activeUp.i2 + swingL && c.c < lineVal(activeUp, i)) {
            activeUp.broken = true;
            justBrokeUp = true;
        }
        if (activeDown && !activeDown.broken && i > activeDown.i2 + swingL && c.c > lineVal(activeDown, i)) {
            activeDown.broken = true;
            justBrokeDown = true;
        }

        let atr = 0;
        for (let k = i - 13; k <= i; k++) {
            const cur = candles15m[k], prev = candles15m[k - 1];
            atr += Math.max(cur.h - cur.l, Math.abs(cur.h - prev.c), Math.abs(cur.l - prev.c));
        }
        atr /= 14;

        const stUp = fullSt[i]?.up;

        if (pos) {
            if (pos.side === 'SELL PE') {
                const tlProtected = (c.c - pos.ref) >= 0.4 * pos.risk || stUp === false;
                if (c.l <= pos.sl) closePos(pos.sl, 'SL', c.ts);
                else if (c.h >= pos.tp1) closePos(pos.tp1, 'TP1', c.ts);
                else if (useTrendlineExit && justBrokeUp && tlProtected) closePos(c.c, 'TL BREAK', c.ts);
            } else {
                const tlProtected = (pos.ref - c.c) >= 0.4 * pos.risk || stUp === true;
                if (c.h >= pos.sl) closePos(pos.sl, 'SL', c.ts);
                else if (c.l <= pos.tp1) closePos(pos.tp1, 'TP1', c.ts);
                else if (useTrendlineExit && justBrokeDown && tlProtected) closePos(c.c, 'TL BREAK', c.ts);
            }
        }

        if (hm >= '15:15' && pos) {
            closePos(c.c, 'EOD', c.ts);
        }

        if (bullOB && (c.c < bullOB.bot || i - bullOB.barIndex > obMaxAge)) bullOB = null;
        if (bearOB && (c.c > bearOB.top || i - bearOB.barIndex > obMaxAge)) bearOB = null;
        if (bullFVG && (c.c < bullFVG.bot || i - bullFVG.barIndex > obMaxAge)) bullFVG = null;
        if (bearFVG && (c.c > bearFVG.top || i - bearFVG.barIndex > obMaxAge)) bearFVG = null;

        let structHigh = -Infinity, structLow = Infinity;
        for (let k = Math.max(0, i - structBars); k < i; k++) {
            if (candles15m[k].h > structHigh) structHigh = candles15m[k].h;
            if (candles15m[k].l < structLow) structLow = candles15m[k].l;
        }

        const lv = lvByDay[c.ymd];
        const inWindow = hm >= '09:30' && hm <= '14:15';
        const hmaCur = fullHma[i], hmaPrev = fullHma[i - 1];
        const hmaUp = hmaCur != null && hmaPrev != null && hmaCur > hmaPrev;
        const hmaDn = hmaCur != null && hmaPrev != null && hmaCur < hmaPrev;
        const bullHma = hmaCur == null || hmaUp;
        const bearHma = hmaCur == null || hmaDn;
        const resRoom = !lv || lv.res.filter(r => r > c.c).every(r => (r - c.c) > 0.8 * atr);
        const supRoom = !lv || lv.sup.filter(s => s < c.c).every(s => (c.c - s) > 0.8 * atr);
        const bullBias = stUp === true && (!lv || c.c >= lv.bot) && bullHma && resRoom;
        const bearBias = stUp === false && (!lv || c.c <= lv.top) && bearHma && supRoom;

        const longOB = bullOB && c.l <= bullOB.top && c.c > bullOB.bot && c.c > c.o;
        const longFVG = bullFVG && c.l <= bullFVG.top && c.c > bullFVG.bot && c.c > c.o;
        const shortOB = bearOB && c.h >= bearOB.bot && c.c < bearOB.top && c.c < c.o;
        const shortFVG = bearFVG && c.h >= bearFVG.bot && c.c < bearFVG.top && c.c < c.o;

        if (c.ymd >= simStartYmd && inWindow && !pos && tradesToday < maxTradesPerDay) {
            if ((longOB || longFVG) && bullBias) {
                const ref = Math.round(c.c);
                const stopBase = bullOB ? bullOB.bot : bullFVG.stopBase;
                const sl = Math.round(stopBase - slBuf * atr);
                const risk = Math.max(ref - sl, atr * 0.5);
                if (risk <= 4 * atr) {
                    const tp1 = Math.round(ref + risk * rrRatio);
                    const setup = longOB && longFVG ? 'OB+FVG' : longOB ? 'OB' : 'FVG';
                    pos = { side: 'SELL PE', ref, sl, tp1, risk, entryTs: c.ts, setup };
                    tradesToday += 1;
                    bullOB = null;
                    bullFVG = null;
                }
            } else if ((shortOB || shortFVG) && bearBias) {
                const ref = Math.round(c.c);
                const stopBase = bearOB ? bearOB.top : bearFVG.stopBase;
                const sl = Math.round(stopBase + slBuf * atr);
                const risk = Math.max(sl - ref, atr * 0.5);
                if (risk <= 4 * atr) {
                    const tp1 = Math.round(ref - risk * rrRatio);
                    const setup = shortOB && shortFVG ? 'OB+FVG' : shortOB ? 'OB' : 'FVG';
                    pos = { side: 'SELL CE', ref, sl, tp1, risk, entryTs: c.ts, setup };
                    tradesToday += 1;
                    bearOB = null;
                    bearFVG = null;
                }
            }
        }

        if (i >= 2) {
            const c2 = candles15m[i - 2];
            if (prevBullImp && c.l > c2.h) bullFVG = { top: c.l, bot: c2.h, stopBase: c2.l, barIndex: i };
            if (prevBearImp && c.h < c2.l) bearFVG = { top: c2.l, bot: c.h, stopBase: c2.h, barIndex: i };
        }

        const bullImpulse = c.c > c.o && (c.c - c.o) > impATR * atr && c.c > structHigh;
        const bearImpulse = c.c < c.o && (c.o - c.c) > impATR * atr && c.c < structLow;

        if (bullImpulse) {
            for (let k = 1; k <= obLookback; k++) {
                const idx = i - k;
                if (idx >= 0 && candles15m[idx].c < candles15m[idx].o) {
                    bullOB = { top: candles15m[idx].h, bot: candles15m[idx].l, barIndex: i };
                    break;
                }
            }
        }
        if (bearImpulse) {
            for (let k = 1; k <= obLookback; k++) {
                const idx = i - k;
                if (idx >= 0 && candles15m[idx].c > candles15m[idx].o) {
                    bearOB = { top: candles15m[idx].h, bot: candles15m[idx].l, barIndex: i };
                    break;
                }
            }
        }

        prevBullImp = bullImpulse;
        prevBearImp = bearImpulse;
    }

    if (pos && candles15m.length) {
        const lastBar = candles15m[candles15m.length - 1];
        closePos(lastBar.c, 'OPEN', lastBar.ts);
    }

    return trades;
}

async function runBacktestSimulation(params = {}) {
    const rawInst = String(params.instrument || 'BOTH').toUpperCase();
    const instrument = ['NIFTY', 'SENSEX', 'BOTH'].includes(rawInst) ? rawInst : 'BOTH';
    const lookbackDays = Math.max(7, Math.min(120, Number(params.lookbackDays) || 30));
    const lots = Math.max(1, Math.min(100, Number(params.lots) || 1));
    const niftyLotSize = Math.max(1, Math.min(5000, Number(params.niftyLotSize) || 25));
    const sensexLotSize = Math.max(1, Math.min(5000, Number(params.sensexLotSize) || 20));
    const niftyQty = lots * niftyLotSize;
    const sensexQty = lots * sensexLotSize;
    const obMaxAge = Math.max(5, Math.min(80, Number(params.obMaxAge) || 25));
    const rrRatio = Math.max(0.5, Math.min(4.0, Number(params.rrRatio) || 1.0));
    const maxTradesPerDay = Math.max(1, Math.min(10, Number(params.maxTradesPerDay) || 3));
    const useTrendlineExit = params.useTrendlineExit !== false && params.useTrendlineExit !== 'false';

    const ist = getISTParts(new Date());
    const simStartYmd = addDaysYmd(ist.ymd, -lookbackDays);
    const targetInsts = instrument === 'BOTH' ? INSTRUMENTS : INSTRUMENTS.filter(i => i.key === instrument);

    const opts = { obMaxAge, rrRatio, maxTradesPerDay, useTrendlineExit, niftyQty, sensexQty };
    const perIndexData = await Promise.all(targetInsts.map(async (inst) => {
        const [candles15m, daily] = await Promise.all([
            fetchCandles15mRange(inst.upstoxKey, ist.ymd, lookbackDays + 21),
            fetchDailyCandles(inst.upstoxKey, ist.ymd, lookbackDays + 35)
        ]);
        const trades = simulateIndexBacktest(inst, candles15m, daily, simStartYmd, opts);
        const simBars = candles15m.filter(c => c.ymd >= simStartYmd);
        return {
            key: inst.key,
            qty: inst.key === 'NIFTY' ? niftyQty : sensexQty,
            barsEvaluated: simBars.length,
            firstYmd: simBars[0]?.ymd || simStartYmd,
            lastYmd: simBars[simBars.length - 1]?.ymd || ist.ymd,
            trades
        };
    }));

    const allTrades = perIndexData
        .flatMap(d => d.trades)
        .sort((a, b) => a.exitTs.localeCompare(b.exitTs) || a.entryTs.localeCompare(b.entryTs));

    let cumPts = 0;
    let cumRupees = 0;
    let peakRupees = 0;
    let maxDrawdownRupees = 0;
    let peakPts = 0;
    let maxDrawdownPts = 0;
    const equityCurve = [{ label: formatDayLabel(simStartYmd), equityPts: 0, equityRupees: 0, pts: 0, pnl: 0 }];

    for (const t of allTrades) {
        cumPts += t.pts;
        cumRupees += t.pnl;
        if (cumPts > peakPts) peakPts = cumPts;
        if (cumPts < peakPts) maxDrawdownPts = Math.max(maxDrawdownPts, peakPts - cumPts);
        if (cumRupees > peakRupees) peakRupees = cumRupees;
        const ddRupees = peakRupees - cumRupees;
        if (ddRupees > maxDrawdownRupees) maxDrawdownRupees = ddRupees;
        equityCurve.push({
            label: `${t.index} ${t.exitTime}`,
            equityPts: Math.round(cumPts),
            equityRupees: Math.round(cumRupees),
            pts: t.pts,
            pnl: t.pnl
        });
    }

    const totalTrades = allTrades.length;
    const wins = allTrades.filter(t => t.pnl > 0).length;
    const losses = allTrades.filter(t => t.pnl < 0).length;
    const breakeven = totalTrades - wins - losses;
    const winRatePct = totalTrades ? r1((wins / totalTrades) * 100) : 0;

    const grossWinRupees = allTrades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
    const grossLossRupees = Math.abs(allTrades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
    const profitFactor = grossLossRupees > 0 ? r2(grossWinRupees / grossLossRupees) : (grossWinRupees > 0 ? 99 : 0);

    const grossWinPts = allTrades.filter(t => t.pts > 0).reduce((s, t) => s + t.pts, 0);
    const grossLossPts = Math.abs(allTrades.filter(t => t.pts < 0).reduce((s, t) => s + t.pts, 0));
    const avgWinPts = wins ? r1(grossWinPts / wins) : 0;
    const avgLossPts = losses ? r1(-grossLossPts / losses) : 0;
    const expectancyPts = totalTrades ? r1(cumPts / totalTrades) : 0;
    const expectancyRupees = totalTrades ? Math.round(cumRupees / totalTrades) : 0;

    const exitReasons = ['TP1', 'TL BREAK', 'SL', 'EOD', 'OPEN'];
    const exitBreakdown = exitReasons.map(reason => {
        const list = allTrades.filter(t => t.exitReason === reason);
        if (!list.length) return null;
        const w = list.filter(t => t.pnl > 0).length;
        const pts = list.reduce((s, t) => s + t.pts, 0);
        const pnl = list.reduce((s, t) => s + t.pnl, 0);
        return {
            reason,
            count: list.length,
            winRate: `${Math.round((w / list.length) * 100)}%`,
            pts: Math.round(pts),
            pnl: Math.round(pnl)
        };
    }).filter(Boolean);

    const perIndex = perIndexData.map(d => {
        const cnt = d.trades.length;
        const w = d.trades.filter(t => t.pnl > 0).length;
        const pts = d.trades.reduce((s, t) => s + t.pts, 0);
        const pnl = d.trades.reduce((s, t) => s + t.pnl, 0);
        return {
            key: d.key,
            qty: d.qty,
            barsEvaluated: d.barsEvaluated,
            trades: cnt,
            wins: w,
            winRate: cnt ? `${r1((w / cnt) * 100)}%` : '0%',
            pts: Math.round(pts),
            pnl: Math.round(pnl)
        };
    });

    const fmtInr = n => `${n < 0 ? '-' : ''}₹ ${Math.abs(Math.round(n)).toLocaleString('en-IN')}`;

    return {
        params: { instrument, lookbackDays, lots, niftyLotSize, sensexLotSize, niftyQty, sensexQty, obMaxAge, rrRatio, maxTradesPerDay, useTrendlineExit },
        startDate: perIndexData.map(d => d.firstYmd).sort()[0] || simStartYmd,
        endDate: perIndexData.map(d => d.lastYmd).sort().pop() || ist.ymd,
        barsEvaluated: perIndexData.reduce((s, d) => s + d.barsEvaluated, 0),
        totalTrades,
        wins,
        losses,
        breakeven,
        winRate: `${winRatePct}%`,
        profitFactor: grossLossRupees === 0 && grossWinRupees > 0 ? '∞' : profitFactor,
        netPts: Math.round(cumPts),
        netPnL: fmtInr(cumRupees),
        netPnLRaw: Math.round(cumRupees),
        maxDrawdownPts: Math.round(maxDrawdownPts),
        maxDrawdown: fmtInr(maxDrawdownRupees),
        maxDrawdownRaw: Math.round(maxDrawdownRupees),
        avgWinPts,
        avgLossPts,
        expectancyPts,
        expectancyRupees,
        equityCurve,
        exitBreakdown,
        perIndex,
        trades: [...allTrades].reverse()
    };
}

async function fetchUpstoxBrokerJournal(token) {
    if (!token) {
        return { available: false, reason: 'Upstox Access Token not set in Settings', brokerTrades: [], positions: [], dayPnl: 0 };
    }
    try {
        const [tradesRes, posRes] = await Promise.all([
            fetchJson(`${UPSTOX_V2}/order/trades/get-trades-for-day`, token).catch(err => ({ _err: err.message })),
            fetchJson(`${UPSTOX_V2}/portfolio/short-term-positions`, token).catch(err => ({ _err: err.message }))
        ]);

        if (tradesRes?._err && posRes?._err) {
            return { available: false, reason: tradesRes._err || posRes._err, brokerTrades: [], positions: [], dayPnl: 0 };
        }

        const rawTrades = Array.isArray(tradesRes?.data) ? tradesRes.data : [];
        const rawPos = Array.isArray(posRes?.data) ? posRes.data : [];

        const brokerTrades = rawTrades.map(t => ({
            id: t.trade_id || t.order_id,
            time: t.exchange_timestamp || t.order_timestamp || '',
            symbol: t.trading_symbol || t.instrument_token || '-',
            exchange: t.exchange || '-',
            side: t.transaction_type || '-',
            qty: Number(t.quantity || 0),
            price: Number(t.average_price || t.price || 0),
            product: t.product || '-'
        }));

        const positions = rawPos.map(p => ({
            symbol: p.trading_symbol || p.instrument_token || '-',
            product: p.product || '-',
            qty: Number(p.quantity || 0),
            buyQty: Number(p.buy_quantity ?? p.day_buy_quantity ?? 0),
            sellQty: Number(p.sell_quantity ?? p.day_sell_quantity ?? 0),
            buyPrice: Number(p.buy_price || 0),
            sellPrice: Number(p.sell_price || 0),
            ltp: Number(p.last_price || 0),
            pnl: r2(Number(p.pnl ?? ((Number(p.realised || 0)) + (Number(p.unrealised || 0)))))
        }));

        const dayPnl = r2(positions.reduce((s, p) => s + (p.pnl || 0), 0));
        return { available: true, reason: null, brokerTrades, positions, dayPnl };
    } catch (err) {
        return { available: false, reason: err?.message || 'Could not fetch Upstox broker journal', brokerTrades: [], positions: [], dayPnl: 0 };
    }
}

const stockChartCache = new Map();

function formatBarTimeIST(isoTs) {
    const d = new Date(isoTs);
    if (Number.isNaN(d.getTime())) return String(isoTs || '');
    return d.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

function formatDayShortIST(ymd) {
    const d = new Date(`${ymd}T09:15:00+05:30`);
    if (Number.isNaN(d.getTime())) return ymd;
    return d.toLocaleDateString('en-GB', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short'
    });
}

async function fetchCandlesTf(upstoxKey, todayYmd, tf = '5m', lookbackDays = 16) {
    const mapTf = {
        '5m': { unit: 'minutes', interval: 5 },
        '15m': { unit: 'minutes', interval: 15 },
        '1h': { unit: 'hours', interval: 1 }
    };
    const spec = mapTf[tf] || mapTf['5m'];
    const fromYmd = addDaysYmd(todayYmd, -lookbackDays);
    const enc = encodeURIComponent(upstoxKey);
    const [hist, intra] = await Promise.all([
        fetchCandleJson(`${UPSTOX_V3}/historical-candle/${enc}/${spec.unit}/${spec.interval}/${todayYmd}/${fromYmd}`, candleTtl(false)),
        fetchCandleJson(`${UPSTOX_V3}/historical-candle/intraday/${enc}/${spec.unit}/${spec.interval}`, candleTtl(true))
    ]);
    const map = new Map();
    for (const c of [...parseCandles(hist?.data?.candles), ...parseCandles(intra?.data?.candles)]) {
        map.set(c.ts, c);
    }
    return Array.from(map.values()).sort((a, b) => a.ts.localeCompare(b.ts));
}

function computeSessionVWAP(candles) {
    let curYmd = '';
    let cumPV = 0;
    let cumV = 0;
    return candles.map(c => {
        if (c.ymd !== curYmd) {
            curYmd = c.ymd;
            cumPV = 0;
            cumV = 0;
        }
        const tp = (c.h + c.l + c.c) / 3;
        const vol = Number(c.v || 0);
        if (vol > 0) {
            cumPV += tp * vol;
            cumV += vol;
            return r2(cumPV / cumV);
        }
        return cumV > 0 ? r2(cumPV / cumV) : null;
    });
}

function computeBarATRSeries(candles, period = 14) {
    const out = new Array(candles.length).fill(0);
    if (candles.length < 2) return out;
    let rolling = 0;
    for (let i = 1; i < candles.length; i++) {
        const cur = candles[i];
        const prev = candles[i - 1];
        const tr = Math.max(cur.h - cur.l, Math.abs(cur.h - prev.c), Math.abs(cur.l - prev.c));
        if (i <= period) {
            rolling += tr;
            out[i] = rolling / i;
        } else {
            out[i] = (out[i - 1] * (period - 1) + tr) / period;
        }
    }
    return out;
}

function computeTrendFromCandles(candles) {
    if (!candles || candles.length < 12) return { dir: 'Flat', bull: null };
    const closes = candles.map(c => c.c);
    const st = computeSupertrend(candles, 10, 3);
    const hma = computeHMA(closes);
    const lastSt = st[st.length - 1];
    const h1 = hma[hma.length - 1];
    const h2 = hma[hma.length - 2];
    const lastC = closes[closes.length - 1];
    const stUp = lastSt ? lastSt.up : null;
    const hmaUp = (h1 != null && h2 != null) ? h1 >= h2 : (h1 != null ? lastC >= h1 : null);
    if (stUp === true && hmaUp !== false) return { dir: 'Up', bull: true };
    if (stUp === false && hmaUp !== true) return { dir: 'Down', bull: false };
    if (hmaUp === true) return { dir: 'Up', bull: true };
    if (hmaUp === false) return { dir: 'Down', bull: false };
    return { dir: 'Flat', bull: null };
}

function detectStockOrderBlocksAndLiquidity(candles, visStartIdx, dailyCandles, tf = '5m') {
    const n = candles.length;
    const atrSeries = computeBarATRSeries(candles, 14);
    const lastAtr = atrSeries[n - 1] || Math.max(1, (candles[n - 1]?.c || 100) * 0.005);
    const maxAgeBars = tf === '1h' ? 24 : (tf === '15m' ? 36 : 48);

    // Detect Order Blocks with strong displacement & optional overlapping FVG
    const rawOBs = [];
    for (let i = 2; i < n - 1; i++) {
        const prev = candles[i - 1];
        const c = candles[i];
        const next = candles[i + 1];
        const c2 = candles[i - 2];
        const atr = Math.max(0.05, atrSeries[i] || lastAtr);
        const body = Math.abs(c.c - c.o);
        const structStart = Math.max(0, i - 4);
        let priorHigh = prev.h;
        let priorLow = prev.l;
        for (let s = structStart; s < i; s++) {
            if (candles[s].h > priorHigh) priorHigh = candles[s].h;
            if (candles[s].l < priorLow) priorLow = candles[s].l;
        }
        const bullImpulse = c.c > c.o && body >= 0.75 * atr && next.c > c.h * 0.998 && (Math.max(c.c, next.c) > priorHigh || body >= 1.15 * atr);
        const bearImpulse = c.c < c.o && body >= 0.75 * atr && next.c < c.l * 1.002 && (Math.min(c.c, next.c) < priorLow || body >= 1.15 * atr);

        if (bullImpulse && prev.c <= prev.o) {
            const top = Math.max(prev.o, prev.c);
            const bot = prev.l;
            const hasFvg = (next.l > prev.h) || (c.l > c2.h);
            if (top > bot && (top - bot) <= 4.5 * atr) {
                rawOBs.push({
                    side: 'BULL',
                    startIdx: i - 1,
                    bot: r2(bot),
                    top: r2(top),
                    mid: r2((bot + top) / 2),
                    hasFvg,
                    tests: 0,
                    status: 'fresh',
                    breakIdx: null,
                    endIdx: n - 1,
                    ageBars: (n - 1) - (i - 1),
                    stale: false
                });
            }
        } else if (bearImpulse && prev.c >= prev.o) {
            const top = prev.h;
            const bot = Math.min(prev.o, prev.c);
            const hasFvg = (next.h < prev.l) || (c.h < c2.l);
            if (top > bot && (top - bot) <= 4.5 * atr) {
                rawOBs.push({
                    side: 'BEAR',
                    startIdx: i - 1,
                    bot: r2(bot),
                    top: r2(top),
                    mid: r2((bot + top) / 2),
                    hasFvg,
                    tests: 0,
                    status: 'fresh',
                    breakIdx: null,
                    endIdx: n - 1,
                    ageBars: (n - 1) - (i - 1),
                    stale: false
                });
            }
        }
    }

    // Track test count & break bar for each OB
    for (const ob of rawOBs) {
        let inTouch = false;
        for (let k = ob.startIdx + 2; k < n; k++) {
            const bar = candles[k];
            if (ob.side === 'BULL') {
                if (bar.c < ob.bot) {
                    ob.status = 'broken';
                    ob.breakIdx = k;
                    ob.endIdx = Math.min(n - 1, k + 3);
                    break;
                }
                const touching = bar.l <= ob.top && bar.h >= ob.bot;
                if (touching && !inTouch) {
                    ob.tests += 1;
                    inTouch = true;
                } else if (!touching) {
                    inTouch = false;
                }
            } else {
                if (bar.c > ob.top) {
                    ob.status = 'broken';
                    ob.breakIdx = k;
                    ob.endIdx = Math.min(n - 1, k + 3);
                    break;
                }
                const touching = bar.h >= ob.bot && bar.l <= ob.top;
                if (touching && !inTouch) {
                    ob.tests += 1;
                    inTouch = true;
                } else if (!touching) {
                    inTouch = false;
                }
            }
        }
        if (ob.status !== 'broken') {
            ob.status = ob.tests > 0 ? 'tested' : 'fresh';
            ob.endIdx = n - 1;
            ob.stale = ob.ageBars > maxAgeBars;
        }
    }

    // Filter out overlapping same-side OBs (keep fresher / non-broken or later ones)
    const filteredOBs = [];
    for (const ob of [...rawOBs].reverse()) {
        if (ob.endIdx < visStartIdx) continue;
        const overlaps = filteredOBs.some(existing =>
            existing.side === ob.side &&
            Math.max(existing.bot, ob.bot) <= Math.min(existing.top, ob.top)
        );
        if (!overlaps) filteredOBs.push(ob);
    }
    filteredOBs.reverse();

    // Limit to clean readable set on chart (prefer active/fresh non-stale & recent broken)
    const activeOBs = filteredOBs.filter(o => o.status !== 'broken' && !o.stale).slice(-5);
    const brokenOBs = filteredOBs.filter(o => o.status === 'broken').slice(-3);
    const visibleOBs = [...brokenOBs, ...activeOBs].sort((a, b) => a.startIdx - b.startIdx);

    const lastPrice = candles[n - 1]?.c || 0;
    // Choose best Trade Zone OB (closest active/fresh OB to price)
    let tradeZone = null;
    const candidates = visibleOBs
        .filter(o => o.status !== 'broken' && !o.stale && o.tests <= 1)
        .sort((a, b) => {
            const scoreA = (a.status === 'fresh' ? 0 : 1) * 1000 + Math.abs(lastPrice - a.mid) / Math.max(1, lastAtr);
            const scoreB = (b.status === 'fresh' ? 0 : 1) * 1000 + Math.abs(lastPrice - b.mid) / Math.max(1, lastAtr);
            return scoreA - scoreB;
        });
    if (candidates.length) {
        tradeZone = candidates[0];
        tradeZone.isTradeZone = true;
    }

    // Swing highs / lows for Liquidity (BSL / SSL) & Support / Resistance
    const swingHighs = [];
    const swingLows = [];
    const wing = 3;
    for (let i = wing; i < n - wing; i++) {
        let isHigh = true;
        let isLow = true;
        for (let k = i - wing; k <= i + wing; k++) {
            if (k === i) continue;
            if (candles[k].h >= candles[i].h) isHigh = false;
            if (candles[k].l <= candles[i].l) isLow = false;
        }
        if (isHigh) swingHighs.push({ idx: i, price: r2(candles[i].h) });
        if (isLow) swingLows.push({ idx: i, price: r2(candles[i].l) });
    }

    // Equal lows / equal highs detection
    const eqTol = Math.max(lastPrice * 0.0008, lastAtr * 0.25);
    const liquidity = [];
    const addLiq = (side, label, price, idx) => {
        if (!Number.isFinite(price) || price <= 0) return;
        const dup = liquidity.find(l => l.side === side && Math.abs(l.price - price) <= eqTol * 0.8);
        if (dup) {
            if (label.includes('Prev day')) dup.label = label;
            else if (!dup.label.includes('Prev day') && dup.label.includes('Swing')) dup.label = side === 'SSL' ? 'Equal lows' : 'Equal highs';
            return;
        }
        liquidity.push({ side, label, price: r2(price), idx });
    };

    // Prev day high / low from daily candles
    const latestYmd = candles[n - 1]?.ymd;
    const prevDaily = [...(dailyCandles || [])].reverse().find(d => d.ymd < latestYmd);
    if (prevDaily) {
        addLiq('BSL', 'Prev day high', prevDaily.h, Math.max(visStartIdx, n - 12));
        addLiq('SSL', 'Prev day low', prevDaily.l, Math.max(visStartIdx, n - 12));
    }

    // Unswept swing highs above price (BSL) and swing lows below price (SSL)
    for (const sh of swingHighs) {
        if (sh.idx < visStartIdx - 10) continue;
        const swept = candles.slice(sh.idx + 1).some(b => b.c > sh.price);
        if (!swept || sh.price > lastPrice) {
            addLiq('BSL', 'Swing high', sh.price, Math.max(visStartIdx, sh.idx));
        }
    }
    for (const sl of swingLows) {
        if (sl.idx < visStartIdx - 10) continue;
        const swept = candles.slice(sl.idx + 1).some(b => b.c < sl.price);
        if (!swept || sl.price < lastPrice) {
            addLiq('SSL', 'Swing low', sl.price, Math.max(visStartIdx, sl.idx));
        }
    }

    const visLows = candles.slice(visStartIdx).map(c => c.l);
    const visHighs = candles.slice(visStartIdx).map(c => c.h);
    const visMin = Math.min(...visLows);
    const visMax = Math.max(...visHighs);
    const bandPad = (visMax - visMin) * 0.25;

    const cleanLiquidity = liquidity
        .filter(l => l.price >= visMin - bandPad && l.price <= visMax + bandPad)
        .sort((a, b) => b.price - a.price)
        .slice(0, 7);

    // Support / Resistance around current price
    const recentVisHigh = Math.max(...candles.slice(Math.max(0, n - 48)).map(c => c.h));
    const recentVisLow = Math.min(...candles.slice(Math.max(0, n - 48)).map(c => c.l));
    const resCandidates = [
        ...swingHighs.filter(s => s.price >= lastPrice).map(s => s.price),
        ...(prevDaily && prevDaily.h >= lastPrice ? [prevDaily.h] : []),
        recentVisHigh
    ].sort((a, b) => a - b);
    const supCandidates = [
        ...swingLows.filter(s => s.price <= lastPrice).map(s => s.price),
        ...(prevDaily && prevDaily.l <= lastPrice ? [prevDaily.l] : []),
        recentVisLow
    ].sort((a, b) => b - a);

    const resistance = r2(resCandidates[0] || recentVisHigh);
    const support = r2(supCandidates[0] || recentVisLow);

    // Structure reading (BOS up / down / Ranging)
    let structure = 'Ranging';
    const priorHighs = swingHighs.filter(s => s.idx < n - 3).slice(-3);
    const priorLows = swingLows.filter(s => s.idx < n - 3).slice(-3);
    const lastHigh = priorHighs[priorHighs.length - 1];
    const lastLow = priorLows[priorLows.length - 1];
    if (lastHigh && lastPrice > lastHigh.price) structure = 'Broke up';
    else if (lastLow && lastPrice < lastLow.price) structure = 'Broke down';
    else if (priorHighs.length >= 2 && priorLows.length >= 2) {
        const hh = priorHighs[priorHighs.length - 1].price > priorHighs[priorHighs.length - 2].price;
        const hl = priorLows[priorLows.length - 1].price > priorLows[priorLows.length - 2].price;
        const ll = priorLows[priorLows.length - 1].price < priorLows[priorLows.length - 2].price;
        const lh = priorHighs[priorHighs.length - 1].price < priorHighs[priorHighs.length - 2].price;
        if (hh && hl) structure = 'Broke up';
        else if (ll && lh) structure = 'Broke down';
    }

    return {
        atr: r2(lastAtr),
        visibleOBs,
        tradeZone,
        swingHighs,
        swingLows,
        liquidity: cleanLiquidity,
        resistance,
        support,
        structure
    };
}

function isObAlignedWithContext(obSide, ctx = {}) {
    if (obSide === 'BULL') {
        if (ctx.aboveVwap === false) return { ok: false, reason: 'Price is below VWAP (counter-trend Bull OB skipped).' };
        if (ctx.structure === 'Broke down') return { ok: false, reason: 'Market structure broke down (counter-trend Bull OB skipped).' };
        if (ctx.trend === 'Down') return { ok: false, reason: 'Current timeframe trend is Down (counter-trend Bull OB skipped).' };
        if (ctx.trend15m === 'Down' || ctx.trend1h === 'Down') {
            return { ok: false, reason: 'Higher timeframe trend (15m/1h) is Down (counter-trend Bull OB skipped).' };
        }
        if (ctx.trend15m != null && ctx.trend1h != null && ctx.trend15m !== 'Up' && ctx.trend1h !== 'Up' && ctx.trend !== 'Up') {
            return { ok: false, reason: 'No Up trend confirmation across 15m/1h.' };
        }
        return { ok: true, reason: '' };
    }
    if (obSide === 'BEAR') {
        if (ctx.aboveVwap === true) return { ok: false, reason: 'Price is above VWAP (counter-trend Bear OB skipped).' };
        if (ctx.structure === 'Broke up') return { ok: false, reason: 'Market structure broke up (counter-trend Bear OB skipped).' };
        if (ctx.trend === 'Up') return { ok: false, reason: 'Current timeframe trend is Up (counter-trend Bear OB skipped).' };
        if (ctx.trend15m === 'Up' || ctx.trend1h === 'Up') {
            return { ok: false, reason: 'Higher timeframe trend (15m/1h) is Up (counter-trend Bear OB skipped).' };
        }
        if (ctx.trend15m != null && ctx.trend1h != null && ctx.trend15m !== 'Down' && ctx.trend1h !== 'Down' && ctx.trend !== 'Down') {
            return { ok: false, reason: 'No Down trend confirmation across 15m/1h.' };
        }
        return { ok: true, reason: '' };
    }
    return { ok: true, reason: '' };
}

function buildObTradePlan(ob, price, swingHighs = [], swingLows = [], resistance = null, support = null, atr = 0, ctx = {}) {
    if (!ob || !Number.isFinite(price) || price <= 0) return null;
    if (ob.status === 'broken' || ob.stale || Number(ob.tests || 0) > 1) return null;

    const inside = price >= ob.bot && price <= ob.top;
    const distPts = inside ? 0 : Math.min(Math.abs(price - ob.top), Math.abs(price - ob.bot));
    const distPct = r2((distPts / price) * 100);
    const maxDistLimit = Number(ctx.maxDistPct) > 0 ? Number(ctx.maxDistPct) : null;
    if (maxDistLimit && distPct > maxDistLimit) return null;

    const aligned = isObAlignedWithContext(ob.side, ctx);
    if (!aligned.ok) return null;

    const position = inside ? 'INSIDE' : (price > ob.top ? 'ABOVE' : 'BELOW');

    // Only keep actionable alignment:
    // Bull OB (demand) -> price must be INSIDE or pulling back from ABOVE
    // Bear OB (supply) -> price must be INSIDE or bouncing up from BELOW
    if (ob.side === 'BULL' && position === 'BELOW') return null;
    if (ob.side === 'BEAR' && position === 'ABOVE') return null;

    const zoneHeight = Math.max(price * 0.001, ob.top - ob.bot);
    const slBuffer = Math.max(0.05, Math.min(zoneHeight * 0.15, (atr || zoneHeight) * 0.15));

    let entry;
    let sl;
    let risk;
    let target;

    if (ob.side === 'BULL') {
        entry = r2(inside ? price : ob.top);
        sl = r2(ob.bot - slBuffer);
        risk = Math.max(price * 0.0015, entry - sl);

        const overhead = [
            ...(swingHighs || []).filter(s => s.price > entry + risk * 1.4).map(s => s.price),
            ...(resistance && resistance > entry + risk * 1.4 ? [resistance] : [])
        ].sort((a, b) => a - b);

        // Reject if an immediate closer ceiling caps reward below 1.3R
        const immediateCap = [
            ...(swingHighs || []).filter(s => s.price > entry).map(s => s.price),
            ...(resistance && resistance > entry ? [resistance] : [])
        ].sort((a, b) => a - b)[0];

        if (immediateCap && (immediateCap - entry) < risk * 1.3 && overhead.length === 0) {
            return null;
        }
        target = r2(overhead.length ? Math.min(overhead[0], entry + risk * 3.0) : (entry + risk * 2.0));
    } else {
        entry = r2(inside ? price : ob.bot);
        sl = r2(ob.top + slBuffer);
        risk = Math.max(price * 0.0015, sl - entry);

        const belowTargets = [
            ...(swingLows || []).filter(s => s.price < entry - risk * 1.4).map(s => s.price),
            ...(support && support < entry - risk * 1.4 ? [support] : [])
        ].sort((a, b) => b - a);

        const immediateFloor = [
            ...(swingLows || []).filter(s => s.price < entry).map(s => s.price),
            ...(support && support < entry ? [support] : [])
        ].sort((a, b) => b - a)[0];

        if (immediateFloor && (entry - immediateFloor) < risk * 1.3 && belowTargets.length === 0) {
            return null;
        }
        target = r2(belowTargets.length ? Math.max(belowTargets[0], entry - risk * 3.0) : (entry - risk * 2.0));
    }

    const reward = ob.side === 'BULL' ? (target - entry) : (entry - target);
    const rr = r2(reward / Math.max(0.01, risk));
    if (rr < 1.4) return null;

    return {
        action: ob.side === 'BULL' ? 'BUY' : 'SELL',
        obSide: ob.side,
        entry,
        sl,
        target,
        rr,
        distPct,
        inside,
        position,
        opportunity: inside ? 'AT ENTRY' : 'APPROACHING'
    };
}

async function getStockChartAnalysis(symbol, opts = {}) {
    const rawSym = String(symbol || '').trim().toUpperCase();
    const matchedStock = NIFTY_50_STOCKS.find(s => s.symbol.toUpperCase() === rawSym)
        || INSTRUMENTS.map(i => ({ symbol: i.key, sector: 'Index', upstoxKey: i.upstoxKey })).find(i => i.symbol === rawSym);

    if (!matchedStock) {
        throw new Error(`Unknown stock symbol: ${symbol}`);
    }

    const tf = ['5m', '15m', '1h'].includes(opts.timeframe) ? opts.timeframe : '5m';
    const days = [1, 2, 5].includes(Number(opts.days)) ? Number(opts.days) : 2;
    const token = opts.token || '';
    const cacheKey = `${matchedStock.symbol}:${tf}:${days}:${token ? token.slice(-8) : 'no-tok'}`;
    const hit = stockChartCache.get(cacheKey);
    if (!opts.force && hit && (Date.now() - hit.ts) < 15000) {
        return hit.data;
    }

    const ist = getISTParts(new Date());
    const lookback = tf === '1h' ? 28 : days === 5 ? 18 : 14;

    const [candlesAll, candles15m, candles1h, dailyCandles, batchQuotes] = await Promise.all([
        fetchCandlesTf(matchedStock.upstoxKey, ist.ymd, tf, lookback),
        tf === '15m' ? Promise.resolve(null) : fetchCandlesTf(matchedStock.upstoxKey, ist.ymd, '15m', 14),
        tf === '1h' ? Promise.resolve(null) : fetchCandlesTf(matchedStock.upstoxKey, ist.ymd, '1h', 25),
        fetchDailyCandles(matchedStock.upstoxKey, ist.ymd, 25),
        token ? fetchBatchQuotes([matchedStock.upstoxKey], token) : Promise.resolve({})
    ]);

    if (!candlesAll.length) {
        if (hit?.data) return hit.data;
        throw new Error(Date.now() < v3RateLimitedUntil
            ? `Upstox candle API rate-limited — please retry ${matchedStock.symbol} in a few seconds`
            : `No Upstox ${tf} candles returned for ${matchedStock.symbol}`);
    }

    const c15 = candles15m || candlesAll;
    const c1h = candles1h || candlesAll;

    const distinctDays = Array.from(new Set(candlesAll.map(c => c.ymd))).sort();
    const keepDays = distinctDays.slice(-days);
    const firstYmd = keepDays[0] || candlesAll[0].ymd;
    const visStartIdx = Math.max(0, candlesAll.findIndex(c => c.ymd >= firstYmd));

    const vwapAll = computeSessionVWAP(candlesAll);
    const analysis = detectStockOrderBlocksAndLiquidity(candlesAll, visStartIdx, dailyCandles, tf);

    const visibleCandles = candlesAll.slice(visStartIdx).map((c, idx) => {
        const gIdx = visStartIdx + idx;
        return {
            ts: c.ts,
            ymd: c.ymd,
            time: formatBarTimeIST(c.ts),
            dayLabel: formatDayShortIST(c.ymd),
            o: r2(c.o),
            h: r2(c.h),
            l: r2(c.l),
            c: r2(c.c),
            v: Math.round(c.v || 0),
            vwap: vwapAll[gIdx]
        };
    });

    const dayCounts = keepDays.map(ymd => ({
        ymd,
        label: formatDayShortIST(ymd),
        count: visibleCandles.filter(c => c.ymd === ymd).length
    }));

    const mappedOBs = analysis.visibleOBs.map(ob => ({
        side: ob.side,
        startIdx: Math.max(0, ob.startIdx - visStartIdx),
        endIdx: Math.max(0, Math.min(visibleCandles.length - 1, ob.endIdx - visStartIdx)),
        bot: ob.bot,
        top: ob.top,
        mid: ob.mid,
        hasFvg: ob.hasFvg,
        tests: ob.tests,
        status: ob.status,
        isTradeZone: Boolean(ob.isTradeZone)
    }));

    const lastBar = visibleCandles[visibleCandles.length - 1];
    const latestYmd = lastBar.ymd;
    const prevDaily = [...dailyCandles].reverse().find(d => d.ymd < latestYmd);
    const quote = findQuoteForKey(batchQuotes, matchedStock.upstoxKey);

    let lastPrice = lastBar.c;
    let prevClose = prevDaily ? r2(prevDaily.c) : lastBar.o;
    let change = r2(lastPrice - prevClose);
    let changePct = prevClose ? r2((change / prevClose) * 100) : 0;

    if (quote && quote.last_price != null && quote.net_change != null) {
        const qp = Number(quote.last_price);
        const qc = Number(quote.net_change);
        const qprev = qp - qc;
        if (qp > 0 && qprev > 0 && (qc !== 0 || isMarketOpenIST(new Date()))) {
            lastPrice = r2(qp);
            prevClose = r2(qprev);
            change = r2(qc);
            changePct = r2((qc / qprev) * 100);
        }
    }

    const lastVwap = lastBar.vwap;
    const aboveVwap = lastVwap != null ? lastPrice >= lastVwap : null;
    const trendTf = computeTrendFromCandles(candlesAll);
    const trend15m = computeTrendFromCandles(c15);
    const trend1h = computeTrendFromCandles(c1h);

    const planCtx = {
        aboveVwap,
        structure: analysis.structure,
        trend: trendTf.dir,
        trend15m: trend15m.dir,
        trend1h: trend1h.dir,
        maxDistPct: tf === '1h' ? 3.5 : 2.5
    };

    // Build clean trade plan matching the closest trend-aligned actionable OB (same ranking as X-Ray OB Radar)
    let tradePlan = null;
    let planRawOb = null;
    let skippedReason = '';
    const activeRawOBs = (analysis.visibleOBs || []).filter(o => o.status !== 'broken' && !o.stale && o.tests <= 1);
    const rankedPlans = [];
    for (const candidate of activeRawOBs) {
        const alignCheck = isObAlignedWithContext(candidate.side, planCtx);
        if (!alignCheck.ok) {
            if (!skippedReason) skippedReason = alignCheck.reason;
            continue;
        }
        const plan = buildObTradePlan(candidate, lastPrice, analysis.swingHighs, analysis.swingLows, analysis.resistance, analysis.support, analysis.atr, planCtx);
        if (!plan) continue;
        const rankScore = plan.distPct + (candidate.status === 'fresh' ? 0 : 0.08) - (candidate.hasFvg ? 0.04 : 0) - (plan.rr >= 2 ? 0.03 : 0);
        rankedPlans.push({ candidate, plan, rankScore });
    }
    rankedPlans.sort((a, b) => a.rankScore - b.rankScore);
    if (rankedPlans.length) {
        const { candidate, plan } = rankedPlans[0];
        planRawOb = candidate;
        tradePlan = {
            ...plan,
            bot: candidate.bot,
            top: candidate.top,
            status: candidate.status.toUpperCase(),
            tests: candidate.tests,
            hasFvg: Boolean(candidate.hasFvg),
            note: plan.inside
                ? `Price is inside the ${plan.obSide === 'BULL' ? 'Bullish demand' : 'Bearish supply'} OB (${Number(candidate.bot).toFixed(2)}–${Number(candidate.top).toFixed(2)}).`
                : `${plan.distPct}% away from ${plan.obSide === 'BULL' ? 'Bullish demand' : 'Bearish supply'} OB — wait near ${Number(plan.entry).toFixed(2)}.`
        };
    }

    // Keep chart clean: show ONLY the primary trend-aligned actionable OB zone (never plot counter-trend trap zones)
    const activeChartOBs = mappedOBs.filter(o => o.status !== 'broken');
    const primaryOb = (planRawOb && activeChartOBs.find(o => o.bot === planRawOb.bot && o.top === planRawOb.top && o.side === planRawOb.side)) || null;
    if (primaryOb) primaryOb.isTradeZone = true;
    const cleanChartOBs = primaryOb ? [primaryOb] : [];

    const strengthBias = tradePlan
        ? (tradePlan.action === 'BUY' ? 'Bullish Setup' : 'Bearish Setup')
        : (aboveVwap === true && trend15m.bull === true ? 'Bullish' : (aboveVwap === false && trend15m.bull === false ? 'Bearish' : 'Neutral'));

    const result = {
        symbol: matchedStock.symbol,
        sector: matchedStock.sector,
        upstoxKey: matchedStock.upstoxKey,
        timeframe: tf,
        days,
        price: lastPrice,
        prevClose,
        change,
        changePct,
        fetchedAt: new Date().toISOString(),
        candles: visibleCandles,
        dayCounts,
        orderBlocks: cleanChartOBs,
        tradePlan,
        strength: {
            bias: strengthBias
        },
        reading: {
            structure: analysis.structure,
            vsVwap: lastVwap != null ? { above: aboveVwap, vwap: lastVwap } : null,
            trend: trendTf.dir,
            trend15m: trend15m.dir,
            trend1h: trend1h.dir,
            note: tradePlan ? '' : (skippedReason || '')
        }
    };

    stockChartCache.set(cacheKey, { ts: Date.now(), data: result });
    return result;
}

const obScanCache = new Map();
const obScanInFlight = new Map();

async function scanNifty50OrderBlocks(opts = {}) {
    const tf = ['5m', '15m', '1h'].includes(opts.timeframe) ? opts.timeframe : '5m';
    const maxDistPct = Math.max(0.05, Math.min(1.0, Number(opts.maxDistPct) || 0.25));
    const token = opts.token || '';
    const force = Boolean(opts.force);
    const cacheKey = `${tf}:${token ? token.slice(-8) : 'no-tok'}`;
    const scanTtl = isMarketOpenIST() ? 180000 : 600000;

    const formatScanResponse = (entry) => {
        const filtered = entry.items.filter(item => item.distPct <= maxDistPct);
        return {
            timeframe: tf,
            maxDistPct,
            scannedCount: entry.scannedCount,
            matchedCount: filtered.length,
            insideCount: filtered.filter(i => i.inside).length,
            scannedAt: entry.scannedAt,
            items: filtered
        };
    };

    const cached = obScanCache.get(cacheKey);
    if (!force && cached && (Date.now() - cached.ts) < scanTtl) {
        return formatScanResponse(cached);
    }

    if (!force && obScanInFlight.has(cacheKey)) {
        const entry = await obScanInFlight.get(cacheKey);
        return formatScanResponse(entry);
    }

    const runPromise = (async () => {
        const ist = getISTParts(new Date());
        const lookback = tf === '1h' ? 22 : 10;
        const marketOpen = isMarketOpenIST(new Date());
        let stockMap = opts.stockMap instanceof Map ? opts.stockMap : null;

        let batchQuotes = {};
        if (!stockMap && token) {
            batchQuotes = await fetchBatchQuotes(NIFTY_50_STOCKS.map(s => s.upstoxKey), token);
        }

        let gotCandlesCount = 0;
        const rows = await mapWithConcurrency(NIFTY_50_STOCKS, 3, async (st) => {
            try {
                if (Date.now() < v3RateLimitedUntil) return null;
                const candles = await fetchCandlesTf(st.upstoxKey, ist.ymd, tf, lookback);
                await new Promise(r => setTimeout(r, 80));
                if (!candles || candles.length < 15) return null;
                gotCandlesCount++;

                const distinctDays = Array.from(new Set(candles.map(c => c.ymd))).sort();
                const keepDays = distinctDays.slice(-2);
                const firstYmd = keepDays[0] || candles[0].ymd;
                const visStartIdx = Math.max(0, candles.findIndex(c => c.ymd >= firstYmd));

                const analysis = detectStockOrderBlocksAndLiquidity(candles, visStartIdx, [], tf);
                const unbrokenOBs = (analysis.visibleOBs || []).filter(o => o.status !== 'broken' && !o.stale && o.tests <= 1);
                if (!unbrokenOBs.length) return null;

                const vwapSeries = computeSessionVWAP(candles);
                const lastBar = candles[candles.length - 1];
                const lastVwap = vwapSeries[vwapSeries.length - 1];
                const trendTf = computeTrendFromCandles(candles);

                let price = r2(lastBar.c);
                let changePct = 0;
                const mapped = stockMap?.get(st.symbol);
                if (mapped) {
                    price = mapped.price;
                    changePct = mapped.changePct;
                } else {
                    const q = findQuoteForKey(batchQuotes, st.upstoxKey);
                    if (q && q.last_price != null && q.net_change != null) {
                        const qp = Number(q.last_price);
                        const qc = Number(q.net_change);
                        const qprev = qp - qc;
                        if (qp > 0 && qprev > 0 && (qc !== 0 || marketOpen)) {
                            price = r2(qp);
                            changePct = r2((qc / qprev) * 100);
                        }
                    } else {
                        const prevDayIdx = candles.findIndex(c => c.ymd === lastBar.ymd) - 1;
                        if (prevDayIdx >= 0) {
                            const prevC = candles[prevDayIdx].c;
                            if (prevC > 0) changePct = r2(((price - prevC) / prevC) * 100);
                        }
                    }
                }

                const aboveVwap = lastVwap != null ? price >= lastVwap : null;
                const baseCtx = {
                    aboveVwap,
                    structure: analysis.structure,
                    trend: trendTf.dir,
                    maxDistPct: 1.0
                };

                // Keep ONLY stocks with a valid, trend & VWAP aligned trading opportunity near the Order Block
                let best = null;
                for (const ob of unbrokenOBs) {
                    const plan = buildObTradePlan(
                        ob,
                        price,
                        analysis.swingHighs,
                        analysis.swingLows,
                        analysis.resistance,
                        analysis.support,
                        analysis.atr,
                        baseCtx
                    );
                    if (!plan || plan.distPct > 1.0) continue;
                    const rankScore = plan.distPct + (ob.status === 'fresh' ? 0 : 0.08) - (ob.hasFvg ? 0.04 : 0) - (plan.rr >= 2 ? 0.03 : 0);
                    if (!best || rankScore < best.rankScore) {
                        best = { ob, plan, rankScore };
                    }
                }
                if (!best) return null;

                const { ob, plan } = best;
                return {
                    upstoxKey: st.upstoxKey,
                    symbol: st.symbol,
                    sector: st.sector,
                    price,
                    changePct,
                    action: plan.action,
                    obSide: ob.side,
                    bot: ob.bot,
                    top: ob.top,
                    entry: plan.entry,
                    sl: plan.sl,
                    target: plan.target,
                    rr: plan.rr,
                    opportunity: plan.opportunity,
                    status: ob.status.toUpperCase(),
                    tests: ob.tests,
                    hasFvg: Boolean(ob.hasFvg),
                    inside: plan.inside,
                    distPct: plan.distPct,
                    position: plan.position,
                    aboveVwap,
                    vwap: lastVwap,
                    structure: analysis.structure,
                    trend: trendTf.dir
                };
            } catch (_) {
                return null;
            }
        });

        // Confirm higher timeframe (15m / 1h) alignment for the surviving candidates so radar matches stock X-Ray 1:1
        const confirmed = await mapWithConcurrency(rows.filter(Boolean), 5, async (item) => {
            try {
                const [c15, c1h] = await Promise.all([
                    tf === '15m' ? Promise.resolve(null) : fetchCandlesTf(item.upstoxKey, ist.ymd, '15m', 14),
                    tf === '1h' ? Promise.resolve(null) : fetchCandlesTf(item.upstoxKey, ist.ymd, '1h', 25)
                ]);
                const trend15m = c15 && c15.length ? computeTrendFromCandles(c15).dir : item.trend;
                const trend1h = c1h && c1h.length ? computeTrendFromCandles(c1h).dir : item.trend;
                const htfAligned = isObAlignedWithContext(item.obSide, {
                    aboveVwap: item.aboveVwap,
                    structure: item.structure,
                    trend: item.trend,
                    trend15m,
                    trend1h
                });
                if (!htfAligned.ok) return null;
                const { upstoxKey, ...cleanItem } = item;
                return { ...cleanItem, trend15m, trend1h };
            } catch (_) {
                return null;
            }
        });

        const items = confirmed
            .filter(Boolean)
            .sort((a, b) => {
                if (a.inside !== b.inside) return a.inside ? -1 : 1;
                if (a.distPct !== b.distPct) return a.distPct - b.distPct;
                if (a.status !== b.status) return a.status === 'FRESH' ? -1 : 1;
                return b.rr - a.rr;
            });

        if (gotCandlesCount === 0 && cached) {
            return cached;
        }

        const entry = {
            ts: Date.now(),
            scannedAt: new Date().toISOString(),
            scannedCount: NIFTY_50_STOCKS.length,
            items
        };
        obScanCache.set(cacheKey, entry);
        return entry;
    })();

    obScanInFlight.set(cacheKey, runPromise);
    try {
        const entry = await runPromise;
        return formatScanResponse(entry);
    } finally {
        obScanInFlight.delete(cacheKey);
    }
}

function clearMarketCache() {
    cache.clear();
    stockChartCache.clear();
    obScanCache.clear();
    lastXraySnapshot = { ts: 0, tokenTail: '', data: null };
}

module.exports = { getLiveMarketSnapshot, clearMarketCache, runBacktestSimulation, fetchUpstoxBrokerJournal, isMarketOpenIST, getStockChartAnalysis, scanNifty50OrderBlocks };
