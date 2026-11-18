const XLSX = require('xlsx');

const TAB_NAMES = {
    JOURNAL: 'Personal Journal',
    TELEGRAM: 'Telegram Logs',
    ORDERS: 'Upstox Order Logs',
    STRATEGY: 'Strategy Signals',
    SETTINGS: 'Settings'
};

function buildSheetsDatasets({
    journalEntries = [],
    telegramLogs = [],
    orderLogs = [],
    strategyTrades = [],
    safeConfig = {},
    exportedAt = new Date().toISOString()
}) {
    const journalRows = [
        ['ID', 'Entry Time', 'Exit Time', 'Symbol', 'Side', 'Lots', 'Lot Size', 'Qty', 'Entry Price', 'Exit Price', 'SL', 'TP', 'Exit Reason', 'Setup', 'PnL (INR)', 'Status', 'Notes', 'Broker Ref'],
        ...journalEntries.map(e => [
            e.id ?? '',
            e.entryTime ?? '',
            e.exitTime ?? '',
            e.symbol ?? '',
            e.side ?? '',
            e.lots ?? 1,
            e.lotSize ?? '',
            e.qty ?? '',
            e.entryPrice ?? '',
            e.exitPrice ?? '',
            e.sl ?? '',
            e.tp ?? '',
            e.exitReason ?? '',
            e.setup ?? '',
            e.pnl ?? '',
            e.status ?? '',
            e.notes ?? '',
            e.brokerRef ?? ''
        ])
    ];

    const telegramRows = [
        ['ID', 'Logged At', 'Index', 'Type', 'Side', 'Price', 'Status', 'Summary', 'Error'],
        ...telegramLogs.map(l => [
            l.id ?? '',
            l.loggedAt ?? '',
            l.index ?? '',
            l.type ?? '',
            l.side ?? '',
            l.price ?? '',
            l.status ?? '',
            l.summary ?? '',
            l.error ?? ''
        ])
    ];

    const orderRows = [
        ['ID', 'Time', 'Mode', 'Index', 'Signal Side', 'Trading Symbol', 'Instrument Token', 'Transaction', 'Qty', 'Lots', 'Lot Size', 'Product', 'Order Type', 'LTP', 'Req Margin', 'Avail Margin', 'Status', 'Order ID', 'Message'],
        ...orderLogs.map(o => [
            o.id ?? '',
            o.time ?? '',
            o.mode ?? '',
            o.index ?? '',
            o.signalSide ?? '',
            o.tradingSymbol ?? '',
            o.instrumentToken ?? '',
            o.transactionType ?? '',
            o.qty ?? '',
            o.lots ?? '',
            o.lotSize ?? '',
            o.product ?? '',
            o.orderType ?? '',
            o.ltp ?? '',
            o.requiredMargin ?? '',
            o.availableMargin ?? '',
            o.status ?? '',
            o.orderId ?? '',
            o.message ?? ''
        ])
    ];

    const strategyRows = [
        ['Entry Time', 'Index', 'Side', 'Qty', 'Entry Price', 'SL', 'TP1', 'Exit Time', 'Exit Price', 'Exit Reason', 'Pts', 'PnL (INR)', 'Setup'],
        ...strategyTrades.map(t => [
            t.entryTime ?? '',
            t.index ?? '',
            t.side ?? '',
            t.qty ?? '',
            t.entryPrice ?? '',
            t.sl ?? '',
            t.tp1 ?? '',
            t.exitTime ?? '',
            t.exitPrice ?? '',
            t.exitReason ?? '',
            t.pts ?? '',
            t.pnl ?? '',
            t.setup ?? ''
        ])
    ];

    const settingsRows = [
        ['Key', 'Value', 'Description'],
        ['instrument', safeConfig.instrument ?? 'BOTH', 'Active signal instrument: BOTH, NIFTY, or SENSEX'],
        ['maxTrades', safeConfig.maxTrades ?? 3, 'Maximum strategy trades per day'],
        ['obMaxAge', safeConfig.obMaxAge ?? 25, 'Maximum Order Block age in 15-min bars'],
        ['impATR', safeConfig.impATR ?? 0.8, 'Impulse displacement threshold (x ATR)'],
        ['telegramChatId', safeConfig.telegramChatId ?? '', 'Telegram chat or channel ID'],
        ['telegramEnabled', String(Boolean(safeConfig.telegramEnabled)), 'Enable Telegram signal alerts (true/false)'],
        ['telegramNotifyEntries', String(safeConfig.telegramNotifyEntries !== false), 'Send Telegram notifications on signal entries'],
        ['telegramNotifyExits', String(safeConfig.telegramNotifyExits !== false), 'Send Telegram notifications on signal exits'],
        ['telegramAutoMonitor', String(safeConfig.telegramAutoMonitor !== false), 'Run 30s background signal monitor'],
        ['upstoxOrderMode', safeConfig.upstoxOrderMode ?? 'DRY_RUN', 'Order execution mode: DRY_RUN, SANDBOX, or LIVE'],
        ['upstoxAutoOrder', String(Boolean(safeConfig.upstoxAutoOrder)), 'Automatically execute new signals (true/false)'],
        ['upstoxOrderProduct', safeConfig.upstoxOrderProduct ?? 'I', 'Order product: I (Intraday) or D (Delivery/NRML)'],
        ['upstoxOrderLots', safeConfig.upstoxOrderLots ?? 1, 'Default order lots (1-50)'],
        ['upstoxTokenMasked', safeConfig.hasUpstoxToken ? (safeConfig.upstoxTokenMasked || 'SET') : 'NOT SET', 'Masked Upstox access token status (secrets are not exported)'],
        ['upstoxTokenDay', safeConfig.upstoxTokenDay ?? '', 'Trading day of saved Upstox token'],
        ['telegramTokenMasked', safeConfig.hasTelegramToken ? (safeConfig.telegramTokenMasked || 'SET') : 'NOT SET', 'Masked Telegram bot token status (secrets are not exported)'],
        ['exportedAt', exportedAt, 'Timestamp of Excel workbook export (UTC)']
    ];

    return {
        [TAB_NAMES.JOURNAL]: journalRows,
        [TAB_NAMES.TELEGRAM]: telegramRows,
        [TAB_NAMES.ORDERS]: orderRows,
        [TAB_NAMES.STRATEGY]: strategyRows,
        [TAB_NAMES.SETTINGS]: settingsRows
    };
}

function sanitizeExcelCell(val) {
    if (typeof val !== 'string' || val === '') return val;
    if (/^[=+\-@\t\r]/.test(val)) return `'${val}`;
    return val;
}

function buildExcelWorkbookBuffer(datasets) {
    const wb = XLSX.utils.book_new();
    for (const [sheetName, rows] of Object.entries(datasets)) {
        const safeRows = rows.map(row => row.map(sanitizeExcelCell));
        const ws = XLSX.utils.aoa_to_sheet(safeRows);
        const colCount = (safeRows[0] || []).length;
        ws['!cols'] = Array.from({ length: colCount }, (_, ci) => {
            const maxLen = safeRows.slice(0, 60).reduce((mx, r) => Math.max(mx, String(r[ci] ?? '').length), 10);
            return { wch: Math.min(44, maxLen + 3) };
        });
        XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    }
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
    TAB_NAMES,
    buildSheetsDatasets,
    buildExcelWorkbookBuffer
};
