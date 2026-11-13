export class Candle {
    constructor(
        public timestamp: i64,
        public open: f64,
        public high: f64,
        public low: f64,
        public close: f64,
        public volume: f64
    ) {}
}

export class StrategyInputs {
    constructor(
        public impATR: f64 = 0.8,
        public structBars: i32 = 6,
        public obLookback: i32 = 10,
        public obMaxAge: i32 = 25,
        public showOB: boolean = true,
        public useFallback: boolean = false,
        public useVol: boolean = true,
        public volLen: i32 = 20,
        public volImpMult: f64 = 1.0,
        public volReactMult: f64 = 1.0,
        public biasMode: i32 = 2,
        public useCPR: boolean = false,
        public atrLen: i32 = 14,
        public slBuf: f64 = 0.25,
        public rrRatio: f64 = 1.5,
        public maxTrades: i32 = 3,
        public smaFastLen: i32 = 20,
        public smaMidLen: i32 = 50,
        public smaSlowLen: i32 = 200
    ) {}
}

export class OrderBlock {
    constructor(
        public top: f64,
        public bot: f64,
        public barIndex: i32,
        public type: i32
    ) {}
}

export class IntradayOrderBlockStrategy {
    private tradesToday: i32 = 0;
    private bullishBlock: OrderBlock | null = null;
    private bearishBlock: OrderBlock | null = null;
    public positionSize: i32 = 0;
    public positionAvgPrice: f64 = 0.0;
    public sigStop: f64 = NaN;
    public targetPrice: f64 = NaN;
    private candles: Array<Candle> = new Array<Candle>();

    constructor(public inputs: StrategyInputs = new StrategyInputs()) {}

    public onBar(candle: Candle, inSession: boolean, squareOff: boolean, isNewDay: boolean, positiveGammaEnv: boolean = false, distanceToWall: f64 = 100.0): void {
        this.candles.push(candle);
        const barIndex = this.candles.length - 1;

        if (isNewDay) {
            this.tradesToday = 0;
        }

        const minLen = Math.max(this.inputs.smaSlowLen, Math.max(this.inputs.atrLen, this.inputs.volLen));
        if (barIndex < minLen) return;

        const atrVal = this.calculateATR(this.inputs.atrLen);
        const avgVol = this.calculateVolumeSMA(this.inputs.volLen);
        const hasVol = avgVol > 0.0;
        const volReactOK = !this.inputs.useVol || !hasVol || candle.volume > avgVol * this.inputs.volReactMult;

        let structHigh = -999999999.0;
        let structLow = 999999999.0;
        const startStruct = barIndex - this.inputs.structBars;
        for (let i = startStruct; i < barIndex; i++) {
            if (i >= 0) {
                const c = this.candles[i];
                if (c.high > structHigh) structHigh = c.high;
                if (c.low < structLow) structLow = c.low;
            }
        }

        const bullImpulse = candle.close > candle.open && (candle.close - candle.open) > this.inputs.impATR * atrVal && candle.close > structHigh;
        const bearImpulse = candle.close < candle.open && (candle.open - candle.close) > this.inputs.impATR * atrVal && candle.close < structLow;

        if (this.bullishBlock !== null) {
            if (candle.close < this.bullishBlock!.bot || barIndex - this.bullishBlock!.barIndex > this.inputs.obMaxAge) {
                this.bullishBlock = null;
            }
        }
        if (this.bearishBlock !== null) {
            if (candle.close > this.bearishBlock!.top || barIndex - this.bearishBlock!.barIndex > this.inputs.obMaxAge) {
                this.bearishBlock = null;
            }
        }

        const canTrade = inSession && this.tradesToday < this.inputs.maxTrades && this.positionSize === 0 && !positiveGammaEnv;
        const wallCheckPasses = distanceToWall > (1.5 * atrVal);

        const longRetest = this.bullishBlock !== null && candle.low <= this.bullishBlock!.top && candle.close > this.bullishBlock!.bot && candle.close > candle.open && volReactOK;
        const shortRetest = this.bearishBlock !== null && candle.high >= this.bearishBlock!.bot && candle.close < this.bearishBlock!.top && candle.close < candle.open && volReactOK;

        const longSignal = longRetest && canTrade && wallCheckPasses;
        const shortSignal = shortRetest && canTrade && wallCheckPasses;

        if (this.positionSize !== 0) {
            if (this.positionSize > 0) {
                if ((!isNaN(this.sigStop) && candle.low <= this.sigStop) || (!isNaN(this.targetPrice) && candle.high >= this.targetPrice)) {
                    this.closePosition();
                }
            } else if (this.positionSize < 0) {
                if ((!isNaN(this.sigStop) && candle.high >= this.sigStop) || (!isNaN(this.targetPrice) && candle.low <= this.targetPrice)) {
                    this.closePosition();
                }
            }
        }

        if (squareOff && this.positionSize !== 0) {
            this.closePosition();
        }

        if (longSignal && this.positionSize === 0) {
            if (this.bullishBlock !== null) {
                this.sigStop = this.bullishBlock!.bot - this.inputs.slBuf * atrVal;
                this.bullishBlock = null;
            } else {
                this.sigStop = candle.close - 1.5 * atrVal;
            }
            this.openPosition(1, candle.close);
        } else if (shortSignal && this.positionSize === 0) {
            if (this.bearishBlock !== null) {
                this.sigStop = this.bearishBlock!.top + this.inputs.slBuf * atrVal;
                this.bearishBlock = null;
            } else {
                this.sigStop = candle.close + 1.5 * atrVal;
            }
            this.openPosition(-1, candle.close);
        }

        if (bullImpulse) {
            for (let i = 1; i <= this.inputs.obLookback; i++) {
                const idx = barIndex - i;
                if (idx >= 0 && this.candles[idx].close < this.candles[idx].open) {
                    this.bullishBlock = new OrderBlock(this.candles[idx].high, this.candles[idx].low, barIndex, 0);
                    break;
                }
            }
        }

        if (bearImpulse) {
            for (let i = 1; i <= this.inputs.obLookback; i++) {
                const idx = barIndex - i;
                if (idx >= 0 && this.candles[idx].close > this.candles[idx].open) {
                    this.bearishBlock = new OrderBlock(this.candles[idx].high, this.candles[idx].low, barIndex, 1);
                    break;
                }
            }
        }
    }

    private openPosition(direction: i32, price: f64): void {
        this.positionSize = direction;
        this.positionAvgPrice = price;
        this.tradesToday++;
        const risk = direction > 0 ? (price - this.sigStop) : (this.sigStop - price);
        if (risk > 0.0) {
            this.targetPrice = direction > 0 ? price + risk * this.inputs.rrRatio : price - risk * this.inputs.rrRatio;
        }
    }

    private closePosition(): void {
        this.positionSize = 0;
        this.positionAvgPrice = 0.0;
        this.sigStop = NaN;
        this.targetPrice = NaN;
    }

    private calculateVolumeSMA(length: i32): f64 {
        const len = this.candles.length;
        if (len < length) return len > 0 ? this.candles[len - 1].volume : 0.0;
        let sum = 0.0;
        for (let i = len - length; i < len; i++) sum += this.candles[i].volume;
        return sum / <f64>length;
    }

    private calculateATR(length: i32): f64 {
        const len = this.candles.length;
        if (len < length + 1) return 0.0;
        let trSum = 0.0;
        for (let i = len - length; i < len; i++) {
            const c = this.candles[i];
            const prevClose = this.candles[i - 1].close;
            const tr = Math.max(c.high - c.low, Math.max(Math.abs(c.high - prevClose), Math.abs(c.low - prevClose)));
            trSum += tr;
        }
        return trSum / <f64>length;
    }
}

export function calc(): void {}
