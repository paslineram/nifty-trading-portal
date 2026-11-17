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

const { isMarketOpenIST } = require('./upstoxMarket');

const UPSTOX_V2 = 'https://api.upstox.com/v2';
const UPSTOX_HFT_V3 = 'https://api-hft.upstox.com/v3';
const UPSTOX_SANDBOX_V3 = 'https://api-sandbox.upstox.com/v3';

const DATA_DIR = getWritableDataDir('nifty_orders_data');
const ORDERS_FILE = path.join(DATA_DIR, 'upstox_orders.json');

const INDEX_META = {
    NIFTY: { key: 'NIFTY', upstoxKey: 'NSE_INDEX|Nifty 50', defaultLot: 25 },
    SENSEX: { key: 'SENSEX', upstoxKey: 'BSE_INDEX|SENSEX', defaultLot: 20 }
};

function defaultOrderState() {
    return {
        seeded: false,
        seenSignalKeys: [],
        logs: [],
        lastOrderAt: null
    };
}

function loadOrderState() {
    try {
        if (!fs.existsSync(ORDERS_FILE)) return defaultOrderState();
        const raw = fs.readFileSync(ORDERS_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return {
            seeded: Boolean(parsed?.seeded),
            seenSignalKeys: Array.isArray(parsed?.seenSignalKeys) ? parsed.seenSignalKeys.slice(-500) : [],
            logs: Array.isArray(parsed?.logs) ? parsed.logs.slice(0, 100) : [],
            lastOrderAt: parsed?.lastOrderAt || null
        };
    } catch (_) {
        return defaultOrderState();
    }
}

function saveOrderState(state) {
    try {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        const trimmed = {
            seeded: Boolean(state.seeded),
            seenSignalKeys: (state.seenSignalKeys || []).slice(-500),
            logs: (state.logs || []).slice(0, 100),
            lastOrderAt: state.lastOrderAt || null
        };
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(trimmed, null, 2), 'utf8');
    } catch (_) {}
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

function getTodayYmdIST() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
}

async function upstoxFetch(url, token, options = {}) {
    const resp = await fetch(url, {
        method: options.method || 'GET',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...(options.body ? { 'Content-Type': 'application/json' } : {})
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(10000)
    });
    const payload = await resp.json().catch(() => ({}));
    return { ok: resp.ok && payload?.status !== 'error', status: resp.status, payload };
}

function parseSignalSide(sideRaw) {
    const s = String(sideRaw || 'SELL PE').trim().toUpperCase();
    const txnType = s.startsWith('BUY') ? 'BUY' : 'SELL';
    const optType = s.includes('CE') ? 'CE' : 'PE';
    return { sideLabel: `${txnType} ${optType}`, txnType, optType };
}

async function resolveSignalOptionContract({ indexKey, side, spotPrice, token }) {
    const inst = INDEX_META[String(indexKey || 'NIFTY').toUpperCase()] || INDEX_META.NIFTY;
    const { sideLabel, txnType, optType } = parseSignalSide(side);

    if (!token) {
        return { ok: false, error: 'Upstox Access Token is required to resolve option contracts.' };
    }

    const contractRes = await upstoxFetch(
        `${UPSTOX_V2}/option/contract?instrument_key=${encodeURIComponent(inst.upstoxKey)}`,
        token
    );
    if (!contractRes.ok || !Array.isArray(contractRes.payload?.data) || !contractRes.payload.data.length) {
        const msg = contractRes.payload?.errors?.[0]?.message || contractRes.payload?.message || `Upstox option/contract HTTP ${contractRes.status}`;
        return { ok: false, error: msg };
    }

    const todayYmd = getTodayYmdIST();
    const contracts = contractRes.payload.data.filter(c => String(c.instrument_type || '').toUpperCase() === optType);
    const expiries = [...new Set(contracts.map(c => c.expiry).filter(Boolean))].sort();
    const expiry = expiries.find(e => e >= todayYmd) || expiries[0];
    const expiryList = contracts.filter(c => c.expiry === expiry);

    if (!expiryList.length) {
        return { ok: false, error: `No active ${optType} option contract found for ${inst.key}.` };
    }

    let refSpot = Number(spotPrice);
    if (!Number.isFinite(refSpot) || refSpot <= 0) {
        const spotRes = await upstoxFetch(
            `${UPSTOX_V2}/market-quote/quotes?instrument_key=${encodeURIComponent(inst.upstoxKey)}`,
            token
        ).catch(() => null);
        const qVal = spotRes?.payload?.data ? Object.values(spotRes.payload.data)[0] : null;
        refSpot = Number(qVal?.last_price || expiryList[Math.floor(expiryList.length / 2)].strike_price);
    }

    let chosen = expiryList[0];
    let bestDiff = Infinity;
    for (const c of expiryList) {
        const diff = Math.abs(Number(c.strike_price) - refSpot);
        if (diff < bestDiff) {
            bestDiff = diff;
            chosen = c;
        }
    }

    // Fetch live LTP of chosen option contract (best effort)
    let ltp = null;
    const quoteRes = await upstoxFetch(
        `${UPSTOX_V2}/market-quote/quotes?instrument_key=${encodeURIComponent(chosen.instrument_key)}`,
        token
    ).catch(() => null);
    if (quoteRes?.ok && quoteRes.payload?.data) {
        const qObj = quoteRes.payload.data[chosen.instrument_key]
            || quoteRes.payload.data[chosen.instrument_key.replace('|', ':')]
            || Object.values(quoteRes.payload.data)[0];
        if (qObj?.last_price != null) ltp = Number(qObj.last_price);
    }

    const lotSize = Number(chosen.lot_size) || inst.defaultLot;

    return {
        ok: true,
        index: inst.key,
        sideLabel,
        txnType,
        optType,
        spotPrice: Math.round(refSpot * 100) / 100,
        contract: {
            instrumentToken: chosen.instrument_key,
            tradingSymbol: chosen.trading_symbol,
            exchange: chosen.exchange,
            expiry: chosen.expiry,
            strikePrice: Number(chosen.strike_price),
            instrumentType: chosen.instrument_type,
            lotSize,
            ltp
        }
    };
}

async function checkOrderMarginAndFunds({ instrumentToken, quantity, product, txnType, token }) {
    const [marginRes, fundsRes] = await Promise.all([
        upstoxFetch(`${UPSTOX_V2}/charges/margin`, token, {
            method: 'POST',
            body: {
                instruments: [{
                    instrument_key: instrumentToken,
                    quantity,
                    product,
                    transaction_type: txnType,
                    variety: 'regular'
                }]
            }
        }).catch(err => ({ ok: false, status: 0, payload: { message: err.message } })),
        upstoxFetch(`${UPSTOX_V2}/user/get-funds-and-margin?segment=SEC`, token)
            .catch(() => null)
    ]);

    const marginData = marginRes.payload?.data || {};
    const requiredMargin = marginData.required_margin != null
        ? Number(marginData.required_margin)
        : (marginData.final_margin != null ? Number(marginData.final_margin) : null);
    const availableMargin = fundsRes?.ok && fundsRes.payload?.data?.equity?.available_margin != null
        ? Number(fundsRes.payload.data.equity.available_margin)
        : null;

    return {
        marginOk: marginRes.ok,
        marginError: marginRes.ok ? null : (marginRes.payload?.errors?.[0]?.message || marginRes.payload?.message || `HTTP ${marginRes.status}`),
        requiredMargin,
        finalMargin: marginData.final_margin != null ? Number(marginData.final_margin) : null,
        availableMargin,
        rawMargin: marginRes.payload
    };
}

let orderQueue = Promise.resolve();
function withOrderLock(fn) {
    const run = orderQueue.then(fn, fn);
    orderQueue = run.catch(() => {});
    return run;
}

async function executeUpstoxOrderSignal(params, config = {}) {
    return withOrderLock(async () => {
        const state = loadOrderState();
        const indexKey = String(params.index || 'NIFTY').toUpperCase();
        const side = String(params.side || 'SELL PE').toUpperCase();
        const mode = ['DRY_RUN', 'SANDBOX', 'LIVE'].includes(String(params.mode || '').toUpperCase())
            ? String(params.mode).toUpperCase()
            : (config.upstoxOrderMode || 'DRY_RUN');
        const lots = Math.max(1, Math.min(50, Number(params.lots) || Number(config.upstoxOrderLots) || 1));
        const product = ['I', 'D'].includes(String(params.product || config.upstoxOrderProduct || 'I').toUpperCase())
            ? String(params.product || config.upstoxOrderProduct || 'I').toUpperCase()
            : 'I';
        const orderType = ['MARKET', 'LIMIT'].includes(String(params.orderType || 'MARKET').toUpperCase())
            ? String(params.orderType || 'MARKET').toUpperCase()
            : 'MARKET';
        const isAmo = Boolean(params.isAmo);
        const token = config.upstoxToken || '';
        const sandboxToken = config.upstoxSandboxToken || token;

        if (!token && mode !== 'SANDBOX') {
            const logItem = {
                id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                time: fmtIstNow(),
                index: indexKey,
                signalSide: side,
                tradingSymbol: '-',
                instrumentToken: '-',
                transactionType: parseSignalSide(side).txnType,
                product,
                orderType,
                lots,
                lotSize: indexKey === 'SENSEX' ? 20 : 25,
                qty: lots * (indexKey === 'SENSEX' ? 20 : 25),
                mode,
                status: 'FAILED',
                message: 'Upstox Access Token not configured in Settings.'
            };
            state.logs.unshift(logItem);
            saveOrderState(state);
            return { ok: false, log: logItem, state };
        }

        const resolved = await resolveSignalOptionContract({
            indexKey,
            side,
            spotPrice: params.spotPrice,
            token: token || sandboxToken
        });

        if (!resolved.ok) {
            const logItem = {
                id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                time: fmtIstNow(),
                index: indexKey,
                signalSide: side,
                tradingSymbol: '-',
                instrumentToken: '-',
                transactionType: parseSignalSide(side).txnType,
                product,
                orderType,
                lots,
                lotSize: indexKey === 'SENSEX' ? 20 : 25,
                qty: lots * (indexKey === 'SENSEX' ? 20 : 25),
                mode,
                status: 'FAILED',
                message: resolved.error
            };
            state.logs.unshift(logItem);
            saveOrderState(state);
            return { ok: false, log: logItem, state };
        }

        const c = resolved.contract;
        const qty = lots * c.lotSize;
        const limitPrice = orderType === 'LIMIT'
            ? Number(params.limitPrice || c.ltp || 0)
            : 0;
        const tag = String(params.tag || `pas-${indexKey.slice(0, 3)}-${Date.now().toString(36)}`).slice(0, 20);

        const orderPayload = {
            quantity: qty,
            product,
            validity: 'DAY',
            price: limitPrice,
            tag,
            instrument_token: c.instrumentToken,
            order_type: orderType,
            transaction_type: resolved.txnType,
            disclosed_quantity: 0,
            trigger_price: 0,
            is_amo: isAmo,
            slice: true
        };

        // Always perform live margin/funds verification if regular token is present
        const marginCheck = token
            ? await checkOrderMarginAndFunds({
                instrumentToken: c.instrumentToken,
                quantity: qty,
                product,
                txnType: resolved.txnType,
                token
            })
            : { marginOk: false, marginError: 'No regular token for margin check', requiredMargin: null, availableMargin: null };

        let status = 'VALIDATED';
        let ok = true;
        let orderId = null;
        let message = '';
        let apiResponse = null;

        if (mode === 'DRY_RUN') {
            ok = true;
            status = marginCheck.marginOk ? 'VALIDATED' : 'CONTRACT_OK';
            message = marginCheck.marginOk
                ? `Dry-run validated by Upstox Margin API (Req: ₹${Math.round(marginCheck.requiredMargin || 0).toLocaleString('en-IN')}${marginCheck.availableMargin != null ? ` / Avail: ₹${Math.round(marginCheck.availableMargin).toLocaleString('en-IN')}` : ''})`
                : `Contract resolved (${c.tradingSymbol}); Margin API note: ${marginCheck.marginError}`;
            apiResponse = marginCheck.rawMargin;
        } else {
            const targetBase = mode === 'SANDBOX' ? UPSTOX_SANDBOX_V3 : UPSTOX_HFT_V3;
            const authToken = mode === 'SANDBOX' ? (sandboxToken || token) : token;
            const placeRes = await upstoxFetch(`${targetBase}/order/place`, authToken, {
                method: 'POST',
                body: orderPayload
            }).catch(err => ({ ok: false, status: 0, payload: { message: err.message } }));

            apiResponse = placeRes.payload;
            if (placeRes.ok) {
                const ids = placeRes.payload?.data?.order_ids || (placeRes.payload?.data?.order_id ? [placeRes.payload.data.order_id] : []);
                orderId = ids.join(', ') || 'ACCEPTED';
                status = mode === 'SANDBOX' ? 'SANDBOX_SENT' : 'LIVE_SENT';
                ok = true;
                state.lastOrderAt = new Date().toISOString();
                message = `Upstox ${mode} order accepted (Order ID: ${orderId})`;
            } else {
                ok = false;
                status = 'FAILED';
                const errDetail = placeRes.payload?.errors?.[0]?.message || placeRes.payload?.message || `Upstox returned HTTP ${placeRes.status}`;
                message = `${mode} order rejected: ${errDetail}`;
            }
        }

        const logItem = {
            id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            time: fmtIstNow(),
            index: resolved.index,
            signalSide: resolved.sideLabel,
            spotPrice: resolved.spotPrice,
            tradingSymbol: c.tradingSymbol,
            instrumentToken: c.instrumentToken,
            expiry: c.expiry,
            strikePrice: c.strikePrice,
            ltp: c.ltp,
            transactionType: resolved.txnType,
            product,
            orderType,
            lots,
            lotSize: c.lotSize,
            qty,
            price: limitPrice,
            isAmo,
            mode,
            status,
            orderId,
            requiredMargin: marginCheck.requiredMargin,
            availableMargin: marginCheck.availableMargin,
            message,
            payload: orderPayload,
            response: apiResponse
        };

        state.logs.unshift(logItem);
        if (state.logs.length > 100) state.logs.length = 100;
        saveOrderState(state);

        return { ok, log: logItem, state };
    });
}

async function fetchUpstoxOrderBook(token) {
    if (!token) {
        return { available: false, reason: 'Upstox Access Token not set in Settings', orders: [] };
    }
    try {
        const res = await upstoxFetch(`${UPSTOX_V2}/order/retrieve-all`, token);
        if (!res.ok) {
            const msg = res.payload?.errors?.[0]?.message || res.payload?.message || `Upstox returned HTTP ${res.status}`;
            return { available: false, reason: msg, orders: [] };
        }
        const raw = Array.isArray(res.payload?.data) ? res.payload.data : [];
        const orders = raw.map(o => ({
            orderId: o.order_id,
            time: o.order_timestamp || o.exchange_timestamp || '-',
            symbol: o.trading_symbol || o.instrument_token || '-',
            side: o.transaction_type || '-',
            qty: Number(o.quantity || 0),
            filledQty: Number(o.filled_quantity || 0),
            product: o.product || '-',
            orderType: o.order_type || '-',
            price: Number(o.average_price || o.price || 0),
            status: o.status || '-',
            statusMessage: o.status_message || '',
            tag: o.tag || ''
        }));
        return { available: true, reason: null, orders };
    } catch (err) {
        return { available: false, reason: err?.message || 'Could not fetch Upstox order book', orders: [] };
    }
}

async function processSnapshotForAutoOrder(snapshot, config = {}) {
    const state = loadOrderState();
    const seen = new Set(state.seenSignalKeys || []);
    const instruments = Array.isArray(snapshot?.instruments) ? snapshot.instruments : [];

    if (!state.seeded) {
        for (const inst of instruments) {
            for (const sig of (inst.signals || [])) {
                seen.add(`ORD|${inst.key}|${sig.ts || sig.time}|${sig.side}|${sig.ref}`);
            }
        }
        state.seenSignalKeys = Array.from(seen).slice(-500);
        state.seeded = true;
        saveOrderState(state);
        return { seededJustNow: true, dispatched: [] };
    }

    const activeInsts = instruments.filter(i => i.signalsEnabled !== false);
    const dispatched = [];
    for (const inst of activeInsts) {
        const ordered = [...(inst.signals || [])].reverse();
        for (const sig of ordered) {
            if (sig.exitReason) continue; // Only auto-dispatch fresh open entry signals
            const key = `ORD|${inst.key}|${sig.ts || sig.time}|${sig.side}|${sig.ref}`;
            if (seen.has(key)) continue;
            seen.add(key);
            state.seenSignalKeys = Array.from(seen).slice(-500);
            saveOrderState(state);

            if (config.upstoxAutoOrder) {
                const res = await executeUpstoxOrderSignal({
                    index: inst.key,
                    side: sig.side,
                    spotPrice: sig.ref || inst.price,
                    lots: config.upstoxOrderLots || 1,
                    product: config.upstoxOrderProduct || 'I',
                    orderType: 'MARKET',
                    mode: config.upstoxOrderMode || 'DRY_RUN',
                    tag: `auto-${inst.key.slice(0, 3).toLowerCase()}`
                }, config);
                dispatched.push(res.log);
            }
        }
    }
    return { seededJustNow: false, dispatched };
}

function clearOrderLogs() {
    return withOrderLock(async () => {
        const state = loadOrderState();
        state.logs = [];
        saveOrderState(state);
        return state;
    });
}

module.exports = {
    loadOrderState,
    saveOrderState,
    resolveSignalOptionContract,
    checkOrderMarginAndFunds,
    executeUpstoxOrderSignal,
    fetchUpstoxOrderBook,
    processSnapshotForAutoOrder,
    clearOrderLogs
};
