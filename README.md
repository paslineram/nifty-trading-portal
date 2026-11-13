# Nifty & Sensex Algorithmic Trading Portal (Vercel Ready)

A full-stack, secure algorithmic trading portal featuring a modern login screen, real-time operational dashboard, Xray backtesting engine, trade history logs, and comprehensive Upstox/instrument configuration tools.

## Features Included:
1. **Secure Login Portal:** Session-authenticated dashboard access (`admin` / `nifty2026`).
2. **Operational Dashboard:** Live bot control switch (Start/Stop), daily trade counter, Gamma environment monitor, and distance-to-wall indicator.
3. **Xray Backtest Tab:** Instantaneous strategy backtesting simulator providing win rate, profit factor, net PnL, and equity curves.
4. **Trade History Tab:** Detailed trade log tracking execution prices, realized PnL, and timestamps.
5. **Settings Tab:** Update your Upstox access token, switch between Nifty, Sensex, and BankNifty, adjust lot sizes, set buy/sell action filters, and configure order block parameters.
6. **Optimized WASM Strategy:** Built with AssemblyScript for blazing-fast candle processing and order block retest calculations.

## Deployment on Vercel:
1. Push this folder to a GitHub repository.
2. Import the repository into your Vercel Dashboard.
3. Configure Environment Variables in Vercel (`UPSTOX_ACCESS_TOKEN`, `ADMIN_USER`, `ADMIN_PASS`).
4. Click **Deploy**.
