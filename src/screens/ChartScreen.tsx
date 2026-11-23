import Ionicons from '@expo/vector-icons/Ionicons';
import { Fragment, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { quotes } from './QuotesScreen';
import SidebarMenu from './SidebarMenu';
type Props = {
  symbol: string;
  bid: string;
  onBack: () => void;
  onOpenMenu?: () => void;
  onNewOrder?: (symbol: string) => void;
};

const BLUE = '#087CF1';
const TEAL = '#167D78';
const UP = '#259C91';
const DOWN = '#E25353';
const WHITE = '#FFFFFF';
const INK = '#20252A';
const MUTED = '#626B73';
const GRID = '#E4E8EB';
const AXIS_WIDTH = 70;
const TIME_AXIS_HEIGHT = 23;
const VISIBLE_BARS = 52;
const MAX_WINDOWS = 3;

const frameMinutes = {
  M1: 1,
  M5: 5,
  M15: 15,
  M30: 30,
  H1: 60,
  H4: 240,
  D1: 1440,
  W1: 10080,
  MN: 43200,
} as const;

type Frame = keyof typeof frameMinutes;
const frames = Object.keys(frameMinutes) as Frame[];

const instruments = [
  { symbol: 'NZDUSD.x', name: 'New Zealand Dollar vs US Dollar', bid: '0.54980' },
  { symbol: 'AUDUSD.x', name: 'Australian Dollar vs US Dollar', bid: '0.66660' },
  { symbol: 'EURUSD.x', name: 'Euro vs US Dollar', bid: '1.09824' },
  { symbol: 'GBPUSD.x', name: 'British Pound vs US Dollar', bid: '1.31042' },
  { symbol: 'USDCAD.x', name: 'US Dollar vs Canadian Dollar', bid: '1.43162' },
  { symbol: 'USDJPY.x', name: 'US Dollar vs Japanese Yen', bid: '158.810' },
  { symbol: 'USDCHF.x', name: 'US Dollar vs Swiss Franc', bid: '0.84102' },
  { symbol: 'XAUUSD.x', name: 'Gold vs US Dollar', bid: '3571.03' },
  { symbol: 'XAGUSD.x', name: 'Silver vs US Dollar', bid: '31.520' },
  { symbol: 'XPDUSD.x', name: 'Palladium vs US Dollar', bid: '1028.30' },
  { symbol: 'XPTUSD.x', name: 'Platinum vs US Dollar', bid: '1050.10' },
];

type Instrument = (typeof instruments)[number];
type IconName = ComponentProps<typeof Ionicons>['name'];

const indicatorNames = [
  'Moving Average',
  'Bollinger Bands',
  'Relative Strength Index',
  'Average True Range',
  'Average Directional Movement Index',
] as const;

type IndicatorName = (typeof indicatorNames)[number];

type Indicator = {
  name: IndicatorName;
  period: number;
  color: string;
  levels: number[];
  frames: Frame[];
};

type Series = Indicator & {
  values: (number | null)[][];
};

type ChartWindow = {
  id: number;
  symbol: string;
  bid: string;
  frame: Frame;
  indicators: Indicator[];
};

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type Point = { x: number; y: number };

type Panel =
  | 'wheel'
  | 'symbols'
  | 'windows'
  | 'addWindow'
  | 'indicators'
  | 'catalog'
  | 'indicatorSettings'
  | 'chartSettings'
  | 'chartType';

type ChartType = 'candles' | 'line';

const indicatorGroups = [
  {
    title: 'Trend',
    names: [
      'Average Directional Movement Index', 'Bollinger Bands', 'Envelopes',
      'Ichimoku Kinko Hyo', 'Moving Average', 'Parabolic SAR', 'Standard Deviation',
    ],
  },
  {
    title: 'Oscillators',
    names: [
      'Average True Range', 'Bears Power', 'Bulls Power', 'Commodity Channel Index',
      'DeMarker', 'Force Index', 'MACD', 'Momentum', 'Moving Average of Oscillator',
      'Relative Strength Index', 'Relative Vigor Index', 'Stochastic Oscillator',
      "Williams' Percent Range",
    ],
  },
  {
    title: 'Volumes',
    names: ['Accumulation/Distribution', 'Money Flow Index', 'On Balance Volume', 'Volumes'],
  },
  {
    title: 'Bill Williams',
    names: [
      'Accelerator Oscillator', 'Alligator', 'Awesome Oscillator', 'Fractals',
      'Gator Oscillator', 'Market Facilitation Index',
    ],
  },
] as const;

const indicatorColors = ['#7653C1', '#087CF1', UP, DOWN, '#B66B16'];

function indicatorDefaults(name: IndicatorName): Indicator {
  return {
    name,
    period: name === 'Bollinger Bands' ? 20 : 14,
    color: indicatorColors[0],
    levels: name === 'Relative Strength Index' ? [30, 70] : [],
    frames: [],
  };
}

function isPriceOverlay(name: IndicatorName) {
  return name === 'Moving Average' || name === 'Bollinger Bands';
}

function makeCandles(symbol: string, bid: string, frame: Frame, now: number) {
  const fallback = instruments.find((item) => item.symbol === symbol)?.bid ?? '1.00000';
  const input = String(bid ?? '').trim();
  const number = Number(input);
  const priceText = /^\d+(\.\d+)?$/.test(input) && Number.isFinite(number) && number > 0
    ? input
    : fallback;
  const price = Number(priceText);
  const decimals = Math.min(8, priceText.split('.')[1]?.length ?? 0);
  const tick = Math.min(price, 10 ** -decimals);
  const interval = frameMinutes[frame] * 60_000;
  const latest = Math.floor(now / interval) * interval;
  const movement = Math.max(tick, price * 0.00035 * Math.sqrt(frameMinutes[frame] / 5));

  let seed = 0;
  for (const character of symbol + frame) {
    seed = (Math.imul(seed, 31) + character.charCodeAt(0)) >>> 0;
  }

  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  const candles: Candle[] = [];
  let close = price;

  for (let index = 0; index < 120; index += 1) {
    const open = Math.max(tick, close + (random() - 0.49) * movement * 2);
    const high = Math.max(open, close) + (0.1 + random() * 0.5) * movement;
    const low = Math.max(tick, Math.min(open, close) - (0.1 + random() * 0.5) * movement);

    candles.push({ time: latest - index * interval, open, high, low, close });
    close = open;
  }

  return { candles: candles.reverse(), decimals };
}

function calculateIndicator(candles: Candle[], indicator: Indicator): (number | null)[][] {
  const { name, period } = indicator;

  if (isPriceOverlay(name)) {
    const statistics = candles.map((_, index) => {
      if (index + 1 < period) return null;

      const sample = candles.slice(index + 1 - period, index + 1);
      const mean = sample.reduce((sum, candle) => sum + candle.close, 0) / period;
      const variance = sample.reduce(
        (sum, candle) => sum + (candle.close - mean) ** 2,
        0,
      ) / period;

      return { mean, deviation: Math.sqrt(variance) };
    });

    const offsets = name === 'Bollinger Bands' ? [-2, 0, 2] : [0];

    return offsets.map((offset) => statistics.map((point) =>
      point === null ? null : point.mean + offset * point.deviation,
    ));
  }

  const primary: (number | null)[] = [null];
  const positive: (number | null)[] = [null];
  const negative: (number | null)[] = [null];
  let gain = 0;
  let loss = 0;
  let range = 0;
  let up = 0;
  let down = 0;
  let adx = 0;

  for (let index = 1; index < candles.length; index += 1) {
    const candle = candles[index];
    const previous = candles[index - 1];
    const change = candle.close - previous.close;
    const rise = candle.high - previous.high;
    const fall = previous.low - candle.low;
    const trueRange = Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previous.close),
      Math.abs(candle.low - previous.close),
    );

    const divisor = Math.min(index, period);
    gain += (Math.max(change, 0) - gain) / divisor;
    loss += (Math.max(-change, 0) - loss) / divisor;
    range += (trueRange - range) / divisor;
    up += ((rise > fall && rise > 0 ? rise : 0) - up) / divisor;
    down += ((fall > rise && fall > 0 ? fall : 0) - down) / divisor;

    if (index < period) {
      primary.push(null);
      positive.push(null);
      negative.push(null);
      continue;
    }

    if (name === 'Relative Strength Index') {
      primary.push(loss > 0 ? 100 - 100 / (1 + gain / loss) : gain > 0 ? 100 : 50);
    } else if (name === 'Average True Range') {
      primary.push(range);
    } else {
      const plus = range > 0 ? 100 * up / range : 0;
      const minus = range > 0 ? 100 * down / range : 0;
      const total = plus + minus;
      const dx = total > 0 ? 100 * Math.abs(plus - minus) / total : 0;

      adx += (dx - adx) / Math.min(index - period + 1, period);
      primary.push(index >= 2 * period - 1 ? adx : null);
      positive.push(plus);
      negative.push(minus);
    }
  }

  return name === 'Average Directional Movement Index'
    ? [primary, positive, negative]
    : [primary];
}

function linePath(
  values: (number | null)[],
  x: (index: number) => number,
  y: (value: number) => number,
) {
  let drawing = false;

  return values.map((value, index) => {
    if (value === null) {
      drawing = false;
      return '';
    }

    const command = drawing ? 'L' : 'M';
    drawing = true;

    return `${command}${x(index)} ${y(value)} `;
  }).join('');
}

function numericValues(values: (number | null)[][]) {
  return values.flat().filter((value): value is number => value !== null);
}

function formatTime(time: number, frame: Frame, full = false) {
  const date = new Date(time);
  const clock = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  if (full) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day} ${clock}`;
  }

  if (frame === 'D1' || frame === 'W1' || frame === 'MN') {
    return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }

  return clock;
}

function ChartTool({ icon, text, label, selected, onPress }: {
  icon?: IconName;
  text?: string;
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.tool, selected && styles.active]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? undefined : { selected }}
    >
      {icon ? (
        <Ionicons name={icon} size={23} color={WHITE} />
      ) : (
        <Text style={styles.toolText}>{text}</Text>
      )}
    </Pressable>
  );
}

function SymbolTool({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      style={styles.tool}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Switch symbol"
    >
      <View style={styles.currencyIcon} pointerEvents="none">
        <Ionicons name="swap-horizontal-outline" size={30} color={WHITE} />
        <Text style={styles.currencyDollar}>$</Text>
      </View>
    </Pressable>
  );
}

function OrderTool({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      style={styles.tool}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="New order"
    >
      <Svg width={25} height={25} viewBox="0 0 24 24">
        <Path
          d="M5 2.5h9l5 5V21H5z M14 2.5V8h5 M8.5 14h7 M12 10.5v7"
          fill="none"
          stroke={WHITE}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

function Option({ label, detail, selected, onPress }: {
  label: string;
  detail?: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.option, selected && styles.selectedRow]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={selected === undefined ? undefined : { selected }}
    >
      <Text style={[styles.optionText, selected && styles.selectedText]}>{label}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </Pressable>
  );
}

function PriceTag({ x, y, text, color }: {
  x: number;
  y: number;
  text: string;
  color: string;
}) {
  const top = Math.max(0, y - 8);

  return (
    <>
      <Rect x={x} y={top} width={AXIS_WIDTH} height={16} fill={color} />
      <SvgText x={x + 4} y={top + 11} fill={WHITE} fontSize={10}>
        {text}
      </SvgText>
    </>
  );
}

function IndicatorLines({ series, width, x, y, minimum, maximum }: {
  series: Series;
  width: number;
  x: (index: number) => number;
  y: (value: number) => number;
  minimum: number;
  maximum: number;
}) {
  const colors = series.name === 'Average Directional Movement Index'
    ? [series.color, UP, DOWN]
    : [series.color];

  return (
    <>
      {series.values.map((values, index) => {
        const path = linePath(values, x, y);

        return path ? (
          <Path
            key={index}
            d={path}
            stroke={colors[index] ?? series.color}
            strokeWidth={1.3}
            fill="none"
          />
        ) : null;
      })}

      {series.levels.filter((level) => level >= minimum && level <= maximum).map((level) => (
        <Line
          key={level}
          x1={0}
          x2={width}
          y1={y(level)}
          y2={y(level)}
          stroke={series.color}
          strokeDasharray="4 3"
        />
      ))}
    </>
  );
}

const CHART_TICK_MS = 1000;
const PRICE_TRANSITION_MS = 650;

function advanceDemoCandles(candles: Candle[], frame: Frame, decimals: number, now: number): Candle[] {
  const last = candles[candles.length - 1];
  const interval = frameMinutes[frame] * 60_000;
  const time = Math.floor(now / interval) * interval;
  if (time < last.time) return candles;

  const tick = 10 ** -decimals;
  const direction = Math.random() < 0.5 ? -1 : 1;
  const visible = candles.slice(-VISIBLE_BARS);
  const visibleHigh = Math.max(...visible.map((candle) => candle.high));
  const visibleLow = Math.min(...visible.map((candle) => candle.low));
  const visibleRange = visibleHigh - visibleLow;
  // Scale demo movement to the displayed range so a wide timeframe still moves visibly.
  const magnitude = Math.max(1, Math.round(visibleRange * 0.022 / tick));
  const close = Math.max(tick, last.close + direction * magnitude * tick);
  const candle = time === last.time ? last : {
    time, open: last.close, high: last.close, low: last.close, close: last.close,
  };
  const updated = {
    ...candle,
    close,
    high: Math.max(candle.high, close),
    low: Math.min(candle.low, close),
  };

  return time === last.time
    ? [...candles.slice(0, -1), updated]
    : [...candles.slice(1), updated];
}

function LiveCandle({ candle, preceding, x, previousX, step, width, height, decimals, chartType, toY }: {
  candle: Candle;
  preceding: Candle;
  x: number;
  previousX: number;
  step: number;
  width: number;
  height: number;
  decimals: number;
  chartType: ChartType;
  toY: (value: number) => number;
}) {
  const visiblePrice = useRef(candle.close);
  const [price, setPrice] = useState(candle.close);

  useEffect(() => {
    const from = visiblePrice.current;
    const to = candle.close;
    if (from === to) return;

    let start: number | null = null;
    let id = requestAnimationFrame(function draw(timestamp) {
      start ??= timestamp;
      const progress = Math.min(1, (timestamp - start) / PRICE_TRANSITION_MS);
      visiblePrice.current = from + (to - from) * progress;
      setPrice(visiblePrice.current);
      if (progress < 1) id = requestAnimationFrame(draw);
    });

    return () => cancelAnimationFrame(id);
  }, [candle.close]);

  const priceY = toY(price);
  const openY = toY(candle.open);
  const color = price >= candle.open ? UP : DOWN;
  const bodyWidth = Math.max(0.7, step * 0.62);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width + AXIS_WIDTH} height={height + TIME_AXIS_HEIGHT}>
        {chartType === 'line' ? (
          <Line x1={previousX} y1={toY(preceding.close)} x2={x} y2={priceY}
            stroke={BLUE} strokeWidth={1.5} />
        ) : (
          <>
            <Line x1={x} x2={x} y1={toY(Math.max(candle.high, price))}
              y2={toY(Math.min(candle.low, price))} stroke={color} />
            <Rect x={x - bodyWidth / 2} y={Math.min(openY, priceY)}
              width={bodyWidth} height={Math.max(1, Math.abs(openY - priceY))} fill={color} />
          </>
        )}
        <Line x1={0} x2={width} y1={priceY} y2={priceY} stroke={UP} />
        <Circle cx={x} cy={priceY} r={2.5} fill={color} />
        <PriceTag x={width} y={priceY} text={price.toFixed(decimals)} color={UP} />
      </Svg>
    </View>
  );
}

function ChartPlot({ chart, crosshair, chartType, showGrid, onMenu }: {
  chart: ChartWindow;
  crosshair: boolean;
  chartType: ChartType;
  showGrid: boolean;
  onMenu: (point: Point) => void;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { symbol, bid, frame, indicators } = chart;

  const [initial] = useState(() => makeCandles(symbol, bid, frame, Date.now()));
  const [candles, setCandles] = useState(initial.candles);
  const { decimals } = initial;
  const [historyEndTime, setHistoryEndTime] = useState<number | null>(null);
  const gesture = useRef<{ x: number; end: number; moved: boolean } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCandles((current) => advanceDemoCandles(current, frame, decimals, Date.now()));
    }, CHART_TICK_MS);
    return () => clearInterval(timer);
  }, [frame, decimals]);

  const latestTime = candles[candles.length - 1].time;
  const interval = frameMinutes[frame] * 60_000;
  const earliestEnd = Math.min(VISIBLE_BARS, candles.length);
  const end = historyEndTime === null
    ? candles.length
    : Math.max(earliestEnd, Math.min(candles.length, candles.length -
      Math.round((latestTime - historyEndTime) / interval)));
  const start = Math.max(0, end - VISIBLE_BARS);
  const atLatest = end === candles.length;
  const bars = useMemo(() => candles.slice(start, end), [candles, start, end]);
  const allSeries = useMemo<Series[]>(() => indicators
    .filter((item) => item.frames.length === 0 || item.frames.includes(frame))
    .map((item) => ({ ...item, values: calculateIndicator(candles, item) })),
  [candles, frame, indicators]);
  const series = useMemo(() => allSeries.map((item) => ({
    ...item,
    values: item.values.map((line) => line.slice(start, end)),
  })), [allSeries, start, end]);

  const overlays = series.filter((item) => isPriceOverlay(item.name));
  const panes = series.filter((item) => !isPriceOverlay(item.name));
  const width = Math.max(1, size.width - AXIS_WIDTH);
  const height = Math.max(1, size.height - TIME_AXIS_HEIGHT);
  const paneHeight = panes.length ? height * 0.35 / panes.length : 0;
  const plotHeight = height - paneHeight * panes.length;
  const step = width / bars.length;
  const rowCount = Math.max(2, Math.min(16, Math.floor(plotHeight / 24)));

  const overlayValues = overlays.flatMap((item) => numericValues(item.values));
  const high = Math.max(...bars.map((bar) => bar.high), ...overlayValues);
  const low = Math.min(...bars.map((bar) => bar.low), ...overlayValues);
  const padding = Math.max(10 ** -decimals, (high - low) * 0.08);
  const top = high + padding;
  const bottom = low - padding;
  const range = top - bottom;

  const x = (index: number) => (index + 0.5) * step;
  const y = (value: number) => (top - value) / range * plotHeight;
  const last = bars[bars.length - 1];
  const history = atLatest ? bars.slice(0, -1) : bars;
  const name = instruments.find((item) => item.symbol === symbol)?.name ?? symbol;
  function measure({ nativeEvent: { layout } }: LayoutChangeEvent) {
    setSize({ width: layout.width, height: layout.height });
  }

  function startPan({ nativeEvent }: GestureResponderEvent) {
    gesture.current = { x: nativeEvent.pageX, end, moved: false };
  }

  function movePan({ nativeEvent }: GestureResponderEvent) {
    const drag = gesture.current;
    if (!drag) return;

    const distance = nativeEvent.pageX - drag.x;
    if (!drag.moved && Math.abs(distance) < 7) return;
    drag.moved = true;

    const nextEnd = Math.max(earliestEnd, Math.min(
      candles.length, drag.end - Math.round(distance / step),
    ));
    setHistoryEndTime(nextEnd === candles.length ? null : candles[nextEnd - 1].time);
  }

  function finishPan(event: GestureResponderEvent) {
    const drag = gesture.current;
    if (!drag) return;
    if (drag.moved || Math.abs(event.nativeEvent.pageX - drag.x) >= 7) {
      movePan(event);
    } else {
      onMenu({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
    }
    gesture.current = null;
  }

  let upPath = '';
  let downPath = '';

  for (const [index, candle] of history.entries()) {
    const center = x(index);
    const bodyWidth = Math.max(0.7, step * 0.62);
    const bodyY = y(Math.max(candle.open, candle.close));
    const bodyHeight = Math.max(1, Math.abs(y(candle.open) - y(candle.close)));

    const wick = `M${center} ${y(candle.high)}V${y(candle.low)}`;
    const body = `M${center - bodyWidth / 2} ${bodyY}h${bodyWidth}v${bodyHeight}h-${bodyWidth}Z`;

    if (candle.close >= candle.open) {
      upPath += `${wick} ${body} `;
    } else {
      downPath += `${wick} ${body} `;
    }
  }

  return (
    <View style={styles.plot} onLayout={measure}>
      {size.width > AXIS_WIDTH + 10 && size.height > TIME_AXIS_HEIGHT + 10 && (
        <View pointerEvents="none">
          <Svg width={size.width} height={size.height}>
            <Rect
              x={0.5}
              y={0.5}
              width={width - 1}
              height={height - 1}
              stroke={GRID}
              fill="none"
            />

            {Array.from({ length: rowCount }, (_, index) => {
              const fraction = (index + 1) / (rowCount + 1);
              const rowY = fraction * plotHeight;

              return (
                <Fragment key={index}>
                  {showGrid && (
                    <Line x1={0} x2={width} y1={rowY} y2={rowY}
                      stroke={GRID} strokeDasharray="3 4" />
                  )}
                  <SvgText x={width + 4} y={rowY + 4} fill={INK} fontSize={10}>
                    {(top - fraction * range).toFixed(decimals)}
                  </SvgText>
                </Fragment>
              );
            })}

            {[0, 1, 2, 3].map((index) => {
              const candleIndex = Math.round((bars.length - 1) * index / 3);
              const labelX = x(candleIndex);

              return (
                <Fragment key={index}>
                  {showGrid && (
                    <Line x1={labelX} x2={labelX} y1={0} y2={height}
                      stroke={GRID} strokeDasharray="3 4" />
                  )}
                  <SvgText
                    x={labelX}
                    y={height + 15}
                    fill={MUTED}
                    fontSize={10}
                    textAnchor={index === 0 ? 'start' : index === 3 ? 'end' : 'middle'}
                  >
                    {formatTime(bars[candleIndex].time, frame)}
                  </SvgText>
                </Fragment>
              );
            })}

            {chartType === 'candles' ? (
              <>
                {upPath !== '' && <Path d={upPath} fill={UP} stroke={UP} strokeWidth={0.7} />}
                {downPath !== '' && <Path d={downPath} fill={DOWN} stroke={DOWN} strokeWidth={0.7} />}
              </>
            ) : (
              <Path d={linePath(history.map((bar) => bar.close), x, y)}
                fill="none" stroke={TEAL} strokeWidth={1.5} />
            )}

            {overlays.map((item) => (
              <IndicatorLines key={item.name} series={item} width={width}
                x={x} y={y} minimum={bottom} maximum={top} />
            ))}

            {panes.map((item, index) => {
              const paneTop = plotHeight + index * paneHeight;
              const bounded = item.name !== 'Average True Range';
              const min = bounded ? 0 : Math.min(0, ...item.levels);
              const max = bounded
                ? 100
                : Math.max(0.000001, ...numericValues(item.values), ...item.levels) * 1.1;
              const paneY = (value: number) =>
                paneTop + (max - value) / (max - min) * paneHeight;

              return (
                <Fragment key={item.name}>
                  <Line x1={0} x2={width} y1={paneTop} y2={paneTop} stroke={GRID} />
                  <IndicatorLines series={item} width={width} x={x} y={paneY}
                    minimum={min} maximum={max} />
                  {paneHeight > 15 && (
                    <SvgText x={5} y={paneTop + 11} fill={item.color} fontSize={9}>
                      {`${item.name} (${item.period})`}
                    </SvgText>
                  )}
                </Fragment>
              );
            })}

            <SvgText x={5} y={14} fill={INK} fontSize={11}>{`${symbol}, ${frame}`}</SvgText>
            <SvgText x={5} y={27} fill={MUTED} fontSize={10}>{name}</SvgText>
            <SvgText x={5} y={40} fill={MUTED} fontSize={10}>Market open · Demo</SvgText>
          </Svg>
        </View>
      )}

      {atLatest && size.width > AXIS_WIDTH + 10 && size.height > TIME_AXIS_HEIGHT + 10 && (
        <LiveCandle candle={last} preceding={history[history.length - 1]}
          x={x(bars.length - 1)} previousX={x(bars.length - 2)}
          step={step} width={width} height={height} decimals={decimals}
          chartType={chartType} toY={y} />
      )}

      {crosshair ? (
        <CrosshairOverlay symbol={symbol} bars={bars} frame={frame}
          canvasWidth={size.width} canvasHeight={size.height}
          width={width} height={height} plotHeight={plotHeight}
          top={top} range={range} decimals={decimals} />
      ) : (
        <View
          style={StyleSheet.absoluteFill}
          onStartShouldSetResponder={() => true}
          onResponderGrant={startPan}
          onResponderMove={movePan}
          onResponderRelease={finishPan}
          onResponderTerminate={() => { gesture.current = null; }}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Open timeframe wheel for ${symbol}`}
          onAccessibilityTap={() => onMenu({ x: size.width / 2, y: size.height / 2 })}
        />
      )}
      {!atLatest && (
        <Pressable style={styles.latestButton} onPress={() => setHistoryEndTime(null)}
          accessibilityRole="button" accessibilityLabel="Jump to latest candle">
          <Text style={styles.latestButtonText}>Latest ›</Text>
        </Pressable>
      )}
    </View>
  );
}

function CrosshairOverlay({
  symbol, bars, frame, canvasWidth, canvasHeight, width, height, plotHeight, top, range, decimals,
}: {
  symbol: string;
  bars: Candle[];
  frame: Frame;
  canvasWidth: number;
  canvasHeight: number;
  width: number;
  height: number;
  plotHeight: number;
  top: number;
  range: number;
  decimals: number;
}) {
  const [cursor, setCursor] = useState<Point | null>(null);
  const latestTouch = useRef<Point | null>(null);
  const pendingFrame = useRef<number | null>(null);
  const step = width / bars.length;

  useEffect(() => () => {
    if (pendingFrame.current !== null) cancelAnimationFrame(pendingFrame.current);
  }, []);

  function moveCrosshair({ nativeEvent }: GestureResponderEvent) {
    latestTouch.current = {
      x: Math.max(0, Math.min(width, nativeEvent.locationX)),
      y: Math.max(0, Math.min(plotHeight, nativeEvent.locationY)),
    };
    if (pendingFrame.current !== null) return;

    pendingFrame.current = requestAnimationFrame(() => {
      pendingFrame.current = null;
      setCursor(latestTouch.current);
    });
  }

  const cursorY = Math.min(plotHeight, cursor?.y ?? plotHeight / 2);
  const cursorX = Math.min(width, cursor?.x ?? width / 2);
  const selectedBar = Math.min(bars.length - 1, Math.floor(cursorX / step));
  const selectedTime = bars[selectedBar].time;
  const timeLabel = useMemo(() => formatTime(selectedTime, frame, true), [selectedTime, frame]);
  const crosshairX = (selectedBar + 0.5) * step;
  const timeWidth = Math.min(width, 124);
  const timeX = Math.max(0, Math.min(width - timeWidth, crosshairX - timeWidth / 2));

  return (
    <View style={StyleSheet.absoluteFill}
      onStartShouldSetResponder={() => true}
      onResponderGrant={moveCrosshair}
      onResponderMove={moveCrosshair}
      accessibilityLabel={`${symbol} chart crosshair`}>
      {canvasWidth > AXIS_WIDTH + 10 && canvasHeight > TIME_AXIS_HEIGHT + 10 && (
        <View pointerEvents="none">
          <Svg width={canvasWidth} height={canvasHeight}>
            <Line x1={crosshairX} x2={crosshairX} y1={0} y2={height} stroke={INK} />
            <Line x1={0} x2={width} y1={cursorY} y2={cursorY} stroke={INK} />
            <PriceTag x={width} y={cursorY}
              text={(top - (cursorY / plotHeight) * range).toFixed(decimals)} color={INK} />
            <Rect x={timeX} y={height} width={timeWidth} height={18} fill={INK} />
            <SvgText x={timeX + timeWidth / 2} y={height + 12}
              fill={WHITE} fontSize={10} textAnchor="middle">
              {timeLabel}
            </SvgText>
          </Svg>
        </View>
      )}
    </View>
  );
}

type WheelItem = {
  label: string;
  text?: string;
  icon?: IconName;
  selected?: boolean;
  onPress: () => void;
};

function TimeframeWheel({ ready, point, frame, onFrame, onIndicators, onCrosshair, onSettings, onType }: {
  ready: boolean;
  point: Point | null;
  frame: Frame;
  onFrame: (frame: Frame) => void;
  onIndicators: () => void;
  onCrosshair: () => void;
  onSettings: () => void;
  onType: () => void;
}) {
  const [entrance] = useState(() => new Animated.Value(0));
  const scale = useMemo(() => entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1],
  }), [entrance]);

  const rotate = useMemo(() => entrance.interpolate({
    inputRange: [0, 1],
    outputRange: ['-75deg', '0deg'],
  }), [entrance]);

  useEffect(() => {
    if (!ready) return;

    const animation = Animated.timing(entrance, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [entrance, ready]);

  const window = useWindowDimensions();
  const [bounds, setBounds] = useState({ width: window.width, height: window.height });
  const diameter = Math.min(266, bounds.width, bounds.height);
  const center = diameter / 2;
  const thickness = diameter * 0.21;
  const radius = center - thickness / 2;
  const button = Math.min(44, diameter * 0.17);
  const left = Math.max(0, Math.min(bounds.width - diameter, (point?.x ?? bounds.width / 2) - center));
  const top = Math.max(0, Math.min(bounds.height - diameter, (point?.y ?? bounds.height / 2) - center));

  const items: WheelItem[] = [
    ...frames.map((value) => ({
      label: `Timeframe ${value}`,
      text: value,
      selected: frame === value,
      onPress: () => onFrame(value),
    })),
    { label: 'Indicators', text: 'ƒ', onPress: onIndicators },
    { label: 'Crosshair', icon: 'locate-outline', onPress: onCrosshair },
    { label: 'Chart settings', icon: 'settings-outline', onPress: onSettings },
    { label: 'Chart type', icon: 'stats-chart-outline', onPress: onType },
  ];

  const step = 360 / items.length;
  const startAngle = -90 - frames.indexOf('M30') * step;

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
      onLayout={({ nativeEvent: { layout } }) =>
        setBounds({ width: layout.width, height: layout.height })}
    >
      <Animated.View
        style={[
          styles.wheel,
          { left, top, width: diameter, height: diameter, opacity: entrance, transform: [{ rotate }, { scale }] },
        ]}
        pointerEvents="box-none"
      >
        <View pointerEvents="none">
          <Svg width={diameter} height={diameter}>
            <Circle cx={center} cy={center} r={radius}
              fill="none" stroke={BLUE} strokeWidth={thickness} strokeOpacity={0.8} />
          </Svg>
        </View>

        {items.map((item, index) => {
          const degrees = startAngle + index * step;
          const angle = degrees * Math.PI / 180;

          return (
            <Pressable
              key={item.label}
              style={[
                styles.wheelItem,
                {
                  width: button,
                  height: button,
                  borderRadius: button / 2,
                  left: center + radius * Math.cos(angle) - button / 2,
                  top: center + radius * Math.sin(angle) - button / 2,
                },
              ]}
              onPress={item.onPress}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={item.selected === undefined ? undefined : { selected: item.selected }}
            >
              {item.icon ? (
                <Ionicons name={item.icon} size={21} color={WHITE} />
              ) : (
                <Text style={[
                  styles.wheelText,
                  item.selected && styles.wheelSelectedText,
                  item.selected !== undefined && {
                    transform: [{ rotate: `${degrees + 90}deg` }],
                  },
                ]}>
                  {item.text}
                </Text>
              )}
            </Pressable>
          );
        })}
      </Animated.View>
    </View>
  );
}

function IndicatorSettings({ initial, exists, onSave, onRemove }: {
  initial: Indicator;
  exists: boolean;
  onSave: (indicator: Indicator) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [period, setPeriod] = useState(String(initial.period));
  const [levels, setLevels] = useState(initial.levels.join(', '));
  const [error, setError] = useState('');

  function save() {
    const parsedPeriod = Number(period.trim());
    const maximum = draft.name === 'Average Directional Movement Index' ? 55 : 100;
    const parsedLevels = levels.trim()
      ? levels.split(',').map((level) => level.trim() ? Number(level) : NaN)
      : [];
    const bounded = draft.name === 'Relative Strength Index'
      || draft.name === 'Average Directional Movement Index';

    if (!Number.isInteger(parsedPeriod) || parsedPeriod < 2 || parsedPeriod > maximum) {
      setError(`Enter a whole period from 2 to ${maximum}.`);
      return;
    }

    if (parsedLevels.some((level) => !Number.isFinite(level)
      || (bounded && (level < 0 || level > 100)))) {
      setError(bounded
        ? 'Enter comma-separated levels from 0 to 100.'
        : 'Enter comma-separated numbers.');
      return;
    }

    onSave({ ...draft, period: parsedPeriod, levels: [...new Set(parsedLevels)] });
  }

  function reset() {
    const next = indicatorDefaults(initial.name);
    setDraft(next);
    setPeriod(String(next.period));
    setLevels(next.levels.join(', '));
    setError('');
  }

  return (
    <>
      <Text style={styles.sectionTitle}>Period</Text>
      <TextInput style={styles.input} value={period} onChangeText={setPeriod}
        keyboardType="number-pad" accessibilityLabel="Indicator period" />

      <Text style={styles.sectionTitle}>Line color</Text>
      <View style={styles.chips}>
        {indicatorColors.map((color) => (
          <Pressable
            key={color}
            style={[styles.swatch, { backgroundColor: color }]}
            onPress={() => setDraft((current) => ({ ...current, color }))}
            accessibilityRole="button"
            accessibilityLabel={`Line color ${color}`}
            accessibilityState={{ selected: draft.color === color }}
          >
            {draft.color === color && <Ionicons name="checkmark" size={20} color={WHITE} />}
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Levels</Text>
      <TextInput style={styles.input} value={levels} onChangeText={setLevels}
        placeholder="30, 70" placeholderTextColor={MUTED}
        accessibilityLabel="Comma-separated indicator levels" />

      <Text style={styles.sectionTitle}>Timeframes</Text>
      <View style={styles.chips}>
        {frames.map((frame) => {
          const selected = draft.frames.includes(frame);

          return (
            <Pressable
              key={frame}
              style={[styles.chip, selected && styles.active]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setDraft((current) => ({
                ...current,
                frames: current.frames.includes(frame)
                  ? current.frames.filter((value) => value !== frame)
                  : [...current.frames, frame],
              }))}
            >
              <Text style={selected ? styles.whiteText : styles.optionText}>{frame}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.help}>Applies to all timeframes when none are selected.</Text>
      {error !== '' && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      <Option label="Save" onPress={save} />
      <Option label="Reset to default" onPress={reset} />
      {exists && <Option label="Remove indicator" onPress={onRemove} />}
    </>
  );
}

export default function ChartScreen(props: Props) {
  return <ChartSession key={props.symbol} {...props} />;
}

function ChartSession({ symbol, bid, onOpenMenu, onNewOrder }: Props) {
  const [windows, setWindows] = useState<ChartWindow[]>([
    { id: 0, symbol, bid, frame: 'M5', indicators: [] },
  ]);
  const [activeId, setActiveId] = useState(0);
  const [stacked, setStacked] = useState(false);
  const [crosshair, setCrosshair] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [panel, setPanel] = useState<Panel | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalReady, setModalReady] = useState(false);
  const [wheelPoint, setWheelPoint] = useState<Point | null>(null);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Indicator | null>(null);
  const nextId = useRef(1);

  const active = windows.find((item) => item.id === activeId) ?? windows[0];
  const query = search.trim().toLowerCase();
  const matching = instruments.filter((item) =>
    item.symbol.toLowerCase().includes(query) || item.name.toLowerCase().includes(query),
  );
  const canRemove = checkedIds.length > 0 && checkedIds.length < windows.length;

  function updateActive(update: Partial<ChartWindow>) {
    setWindows((current) => current.map((item) =>
      item.id === active.id ? { ...item, ...update } : item,
    ));
  }

  function openWheel(id: number, point: Point) {
    setActiveId(id);
    setWheelPoint(point);
    setModalReady(false);
    setPanel('wheel');
  }

  function openWindows() {
    setCheckedIds([]);
    setPanel('windows');
  }

  function openPicker(mode: 'symbols' | 'addWindow') {
    setSearch('');
    setPanel(mode);
  }

  function chooseSymbol(item: Instrument) {
    const nextBid = item.symbol === symbol
  ? bid
  : quotes.find((quote) => quote.symbol === item.symbol)?.bid ?? item.bid;
    if (panel === 'addWindow') {
      if (windows.length >= MAX_WINDOWS) return;

      const id = nextId.current++;
      setWindows((current) => [...current, {
        id,
        symbol: item.symbol,
        bid: nextBid,
        frame: active.frame,
        indicators: [],
      }]);
      setActiveId(id);
      setStacked(true);
      setCheckedIds([]);
    } else {
      updateActive({ symbol: item.symbol, bid: nextBid });
    }

    setPanel(null);
  }

  function toggleWindowSelection(id: number) {
    setCheckedIds((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id]);
  }

  function removeWindows() {
    if (!canRemove) return;

    const remaining = windows.filter((item) => !checkedIds.includes(item.id));
    setWindows(remaining);
    setCheckedIds([]);

    if (!remaining.some((item) => item.id === activeId)) {
      setActiveId(remaining[0].id);
    }

    if (remaining.length === 1) setStacked(false);
  }

  function editIndicator(name: IndicatorName) {
    setEditing(active.indicators.find((item) => item.name === name) ?? indicatorDefaults(name));
    setPanel('indicatorSettings');
  }

  function saveIndicator(indicator: Indicator) {
    const exists = active.indicators.some((item) => item.name === indicator.name);
    const indicators = exists
      ? active.indicators.map((item) => item.name === indicator.name ? indicator : item)
      : [...active.indicators, indicator];

    updateActive({ indicators });
    setPanel('indicators');
  }

  function clearIndicators() {
    Alert.alert('Remove indicators?', 'This removes the indicators from the selected chart.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => updateActive({ indicators: [] }) },
    ]);
  }

  function openOrder() {
    if (onNewOrder) {
      onNewOrder(active.symbol);
      return;
    }

    Alert.alert('Order ticket unavailable', 'Connect the existing order screen in App.tsx.');
  }

  function closePanel() {
    if (panel === 'catalog' || panel === 'indicatorSettings') {
      setPanel('indicators');
    } else if (panel === 'addWindow') {
      setPanel('windows');
    } else {
      setPanel(null);
    }
  }

  const titles: Record<Panel, string> = {
    wheel: 'Timeframes',
    symbols: 'Switch symbol',
    windows: 'Charts',
    addWindow: 'New Window',
    indicators: `Indicators on ${active.symbol}, ${active.frame}`,
    catalog: 'Indicators',
    indicatorSettings: editing?.name ?? 'Indicator settings',
    chartSettings: 'Chart settings',
    chartType: 'Chart type',
  };

  const popup = panel === 'windows' || panel === 'symbols' || panel === 'addWindow';
  const floating = popup || panel === 'wheel';

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <ChartTool icon="menu-outline" label="Open main menu"
          onPress={onOpenMenu ?? (() => setSidebarOpen(true))} />
        <View style={styles.spacer} />
        <ChartTool icon={crosshair ? 'move-outline' : 'locate-outline'}
          label="Toggle crosshair" selected={crosshair}
          onPress={() => setCrosshair((value) => !value)} />
        <ChartTool text="ƒ" label="Indicators" onPress={() => setPanel('indicators')} />
        <SymbolTool onPress={() => openPicker('symbols')} />
        <ChartTool icon="copy-outline" label="Chart windows" onPress={openWindows} />
        <OrderTool onPress={openOrder} />
      </View>

      {(stacked ? windows : [active]).map((item) => {
        const selected = item.id === active.id;
        const dragging = crosshair && selected;

        return (
          <View key={item.id} style={styles.chartWindow}>
            {stacked && (
              <Pressable
                style={[styles.windowTitle, selected && styles.selectedRow]}
                onPress={() => setActiveId(item.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={selected ? styles.selectedText : styles.optionText}>
                  {`${item.symbol} · ${item.frame}`}
                </Text>
              </Pressable>
            )}

            <ChartPlot
              key={`${item.symbol}:${item.frame}:${item.bid}`}
              chart={item.symbol === symbol ? { ...item, bid } : item}
              crosshair={dragging}
              chartType={chartType}
              showGrid={showGrid}
              onMenu={(point) => openWheel(item.id, point)}
            />
          </View>
        );
      })}

      {sidebarOpen && <SidebarMenu onClose={() => setSidebarOpen(false)} />}

      {panel !== null && (
        <Modal visible transparent animationType={panel === 'wheel' ? 'none' : 'fade'}
          onShow={() => setModalReady(true)} onRequestClose={closePanel}>
          <View style={styles.overlay} accessibilityViewIsModal>
            {floating && (
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={closePanel}
                accessibilityRole="button"
                accessibilityLabel="Dismiss chart controls"
              />
            )}

            {panel === 'wheel' && (
              <TimeframeWheel
                ready={modalReady}
                point={wheelPoint}
                frame={active.frame}
                onFrame={(frame) => {
                  updateActive({ frame });
                  setPanel(null);
                }}
                onIndicators={() => setPanel('indicators')}
                onCrosshair={() => {
                  setCrosshair(true);
                  setPanel(null);
                }}
                onSettings={() => setPanel('chartSettings')}
                onType={() => setPanel('chartType')}
              />
            )}

            {popup && (
              <SafeAreaView edges={['top', 'bottom']} style={styles.popupLayer} pointerEvents="box-none">
                {panel === 'windows' ? (
                  <View style={styles.windowsPopup}>
                    <Text style={styles.popupTitle} accessibilityRole="header">Charts</Text>

                    {windows.length < MAX_WINDOWS && (
                      <Option label="+  New Window" onPress={() => openPicker('addWindow')} />
                    )}

                    <ScrollView style={styles.popupList}>
                      {windows.map((item) => {
                        const checked = checkedIds.includes(item.id);
                        const selected = item.id === active.id;

                        return (
                          <View key={item.id} style={styles.windowRow}>
                            <Pressable
                              style={styles.checkbox}
                              onPress={() => toggleWindowSelection(item.id)}
                              accessibilityRole="checkbox"
                              accessibilityLabel={`Select ${item.symbol} for removal`}
                              accessibilityState={{ checked }}
                            >
                              <Ionicons name={checked ? 'checkbox' : 'square-outline'}
                                size={22} color={checked ? TEAL : MUTED} />
                            </Pressable>

                            <Pressable
                              style={styles.windowName}
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                              onPress={() => {
                                setActiveId(item.id);
                                setPanel(null);
                              }}
                            >
                              <Text style={selected ? styles.selectedText : styles.optionText}>
                                {`${item.symbol}, ${item.frame}`}
                              </Text>
                            </Pressable>
                          </View>
                        );
                      })}

                      {windows.length > 1 && (
                        <Option label={stacked ? 'Show single chart' : 'Show stacked charts'}
                          onPress={() => {
                            setStacked((value) => !value);
                            setPanel(null);
                          }} />
                      )}
                    </ScrollView>

                    <Pressable
                      style={[styles.removeButton, !canRemove && styles.disabled]}
                      disabled={!canRemove}
                      onPress={removeWindows}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !canRemove }}
                    >
                      <Text style={styles.whiteText}>REMOVE</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.symbolPopup}>
                    {panel === 'addWindow' && (
                      <>
                        <Text style={styles.popupTitle} accessibilityRole="header">New Window</Text>
                        <TextInput
                          style={styles.input}
                          value={search}
                          onChangeText={setSearch}
                          placeholder="Search symbols"
                          placeholderTextColor={MUTED}
                          accessibilityLabel="Search symbols"
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </>
                    )}

                    <ScrollView style={styles.popupList} keyboardShouldPersistTaps="handled">
                      {matching.length === 0 && (
                        <Text style={styles.help}>No matching symbols.</Text>
                      )}

                      {matching.map((item) => (
                        <Option key={item.symbol} label={item.symbol}
                          selected={panel === 'symbols' && item.symbol === active.symbol}
                          onPress={() => chooseSymbol(item)} />
                      ))}
                    </ScrollView>
                  </View>
                )}
              </SafeAreaView>
            )}

            {!floating && (
              <SafeAreaView style={styles.fullPanel}>
                <View style={styles.panelHeader}>
                  <ChartTool icon="arrow-back-outline" label="Back" onPress={closePanel} />
                  <Text style={styles.panelTitle} accessibilityRole="header">{titles[panel]}</Text>
                  {panel === 'indicators' && (
                    <Pressable
                      style={styles.tool}
                      disabled={active.indicators.length === 0}
                      accessibilityRole="button"
                      accessibilityLabel="Remove all indicators"
                      accessibilityState={{ disabled: active.indicators.length === 0 }}
                      onPress={clearIndicators}
                    >
                      <Ionicons name="trash-outline" size={23}
                        color={active.indicators.length > 0 ? WHITE : '#BCE0FF'} />
                    </Pressable>
                  )}
                </View>

                <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
                  {panel === 'indicators' && (
                    <>
                      <View style={styles.indicatorHeader}>
                        <Text style={styles.indicatorHeading}>MAIN CHART</Text>
                        <Pressable style={styles.indicatorAdd}
                          onPress={() => setPanel('catalog')}
                          accessibilityRole="button" accessibilityLabel="Add indicator">
                          <Text style={styles.indicatorAddText}>ƒ</Text>
                          <Ionicons name="add-circle-outline" size={17} color={BLUE} />
                        </Pressable>
                      </View>

                      {active.indicators.map((item) => (
                        <Option key={item.name} label={item.name} detail={`Period ${item.period}`}
                          onPress={() => editIndicator(item.name)} />
                      ))}
                    </>
                  )}

                  {panel === 'catalog' && (
                    <View style={styles.indicatorCatalog}>
                      {indicatorGroups.map((group) => (
                        <View key={group.title}>
                          <Text style={styles.indicatorGroupTitle} accessibilityRole="header">
                            {group.title.toUpperCase()}
                          </Text>

                          {group.names.map((name) => {
                            const supported = indicatorNames.find((item) => item === name);

                            return (
                              <Pressable
                                key={name}
                                style={styles.indicatorCatalogRow}
                                disabled={supported === undefined}
                                accessibilityRole="button"
                                accessibilityState={{ disabled: supported === undefined }}
                                onPress={() => {
                                  if (supported !== undefined) editIndicator(supported);
                                }}
                              >
                                <Text style={[styles.indicatorCatalogLabel,
                                  supported === undefined && styles.unavailableIndicator]}>
                                  {name}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  )}

                  {panel === 'indicatorSettings' && editing && (
                    <IndicatorSettings
                      key={`${active.id}:${editing.name}`}
                      initial={editing}
                      exists={active.indicators.some((item) => item.name === editing.name)}
                      onSave={saveIndicator}
                      onRemove={() => {
                        updateActive({
                          indicators: active.indicators.filter((item) => item.name !== editing.name),
                        });
                        setPanel('indicators');
                      }}
                    />
                  )}

                  {panel === 'chartSettings' && (
                    <View style={styles.settingRow}>
                      <Text style={styles.optionText}>Show grid</Text>
                      <Switch value={showGrid} onValueChange={setShowGrid}
                        accessibilityLabel="Show chart grid" />
                    </View>
                  )}

                  {panel === 'chartType' && (
                    <>
                      <Option label="Candlesticks" selected={chartType === 'candles'} onPress={() => {
                        setChartType('candles');
                        setPanel(null);
                      }} />
                      <Option label="Line chart" selected={chartType === 'line'} onPress={() => {
                        setChartType('line');
                        setPanel(null);
                      }} />
                    </>
                  )}
                </ScrollView>
              </SafeAreaView>
            )}
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: WHITE },
  toolbar: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BLUE,
    borderBottomWidth: 2,
    borderBottomColor: TEAL,
  },
  spacer: { flex: 1 },
  tool: {
    width: '13.5%',
    maxWidth: 56,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolText: { color: WHITE, fontSize: 26, fontWeight: '600' },
  active: { backgroundColor: TEAL },
  currencyIcon: { alignItems: 'center', justifyContent: 'center' },
  currencyDollar: {
    position: 'absolute',
    backgroundColor: BLUE,
    color: WHITE,
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '700',
    paddingHorizontal: 1,
  },
  chartWindow: { flex: 1 },
  windowTitle: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#F3F6F9' },
  latestButton: {
    position: 'absolute', right: AXIS_WIDTH + 6, bottom: TIME_AXIS_HEIGHT + 6,
    backgroundColor: BLUE, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6,
  },
  latestButtonText: { color: WHITE, fontWeight: '600', fontSize: 12 },
  plot: { flex: 1, overflow: 'hidden' },
  overlay: { flex: 1 },
  wheel: { position: 'absolute' },
  wheelItem: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  wheelSelectedText: { color: '#BCE0FF' },
  wheelText: { color: WHITE, fontWeight: '700', fontSize: 15 },
  popupLayer: { flex: 1, paddingTop: 38, paddingHorizontal: 16 },
  windowsPopup: {
    width: '88%',
    maxWidth: 340,
    maxHeight: '82%',
    backgroundColor: WHITE,
    borderRadius: 10,
    elevation: 9,
  },
  symbolPopup: {
    alignSelf: 'flex-end',
    marginRight: '16%',
    width: 160,
    maxHeight: '84%',
    backgroundColor: WHITE,
    borderRadius: 10,
    elevation: 9,
  },
  popupTitle: { color: INK, fontWeight: '700', fontSize: 18, padding: 14 },
  popupList: { flexGrow: 0, flexShrink: 1 },
  windowRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GRID,
  },
  checkbox: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  windowName: { flex: 1, minHeight: 48, justifyContent: 'center', paddingRight: 12 },
  removeButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    backgroundColor: BLUE,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  disabled: { opacity: 0.45 },
  fullPanel: { flex: 1, backgroundColor: BLUE },
  panelHeader: { minHeight: 54, flexDirection: 'row', alignItems: 'center' },
  panelTitle: { flex: 1, color: WHITE, fontSize: 17, fontWeight: '600' },
  option: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GRID,
  },
  optionText: { color: INK, fontSize: 15 },
  selectedRow: { backgroundColor: '#EDF6F5' },
  selectedText: { color: TEAL, fontWeight: '700' },
  detail: { color: MUTED, marginTop: 4 },
  input: {
    minHeight: 44,
    marginHorizontal: 12,
    paddingHorizontal: 6,
    color: INK,
    borderBottomWidth: 1,
    borderBottomColor: GRID,
  },
  indicatorHeader: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  indicatorHeading: { color: BLUE, fontSize: 16, fontWeight: '700' },
  indicatorAdd: {
    minWidth: 48, minHeight: 48, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  indicatorAddText: { color: BLUE, fontSize: 27, fontWeight: '700', fontStyle: 'italic' },
  indicatorCatalog: { paddingTop: 8, paddingBottom: 16 },
  indicatorGroupTitle: {
    marginLeft: 16, paddingTop: 18, paddingBottom: 7,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: GRID,
    color: INK, fontSize: 14, fontWeight: '700',
  },
  indicatorCatalogRow: {
    minHeight: 50, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 10,
  },
  indicatorCatalogLabel: { color: INK, fontSize: 16 },
  unavailableIndicator: { color: MUTED },
  sectionTitle: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, color: INK, fontWeight: '700' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  whiteText: { color: WHITE, fontWeight: '700' },
  help: { color: MUTED, padding: 16 },
  error: { color: '#BA352B', padding: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16 },
  chip: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4F7',
  },
  swatch: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});



