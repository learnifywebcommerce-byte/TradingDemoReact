import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { SymbolQuote } from './QuotesScreen';

const blue = '#087CF1';
const red = '#D53928';
const ink = '#404040';
const divider = '#CCCCCC';
const condensed = Platform.OS === 'android' ? 'sans-serif-condensed' : undefined;

const policies = ['Fill or Kill', 'Immediate or Cancel'] as const;
type FillPolicy = (typeof policies)[number];
type Side = 'buy' | 'sell';

export type DemoOrder = {
  symbol: string;
  side: Side;
  lots: number;
  price: string;
  stopLoss: number | null;
  takeProfit: number | null;
  fillPolicy: FillPolicy;
};

type Props = {
  quote: SymbolQuote;
  onBack: () => void;
  onSubmit: (order: DemoOrder) => void;
};

const instrumentNames: Record<string, string> = {
  'NZDUSD.x': 'New Zealand Dollar vs US Dollar',
  'AUDUSD.x': 'Australian Dollar vs US Dollar',
  'EURUSD.x': 'Euro vs US Dollar',
  'GBPUSD.x': 'British Pound vs US Dollar',
  'USDCAD.x': 'US Dollar vs Canadian Dollar',
  'USDJPY.x': 'US Dollar vs Japanese Yen',
  'USDCHF.x': 'US Dollar vs Swiss Franc',
  'XAUUSD.x': 'Gold vs US Dollar',
};

const askTrace = [0.45, 0.45, 0.31, 0.45, 0.38, 0.38, 0.38, 0.31, 0.18, 0.25, 0.11, 0.25, 0.18, 0.31];
const bidTrace = [0.59, 0.66, 0.59, 0.73, 0.87, 0.87, 0.94, 0.8, 0.94, 0.8, 0.8, 0.66, 0.52, 0.59];

function decimal(value: string) {
  const input = value.trim().replace(',', '.');
  return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(input) ? Number(input) : NaN;
}

function OrderPrice({ value }: { value: string }) {
  const decimals = value.split('.')[1]?.length ?? 0;
  const raised = decimals > 2;
  const end = value.length - (raised ? 1 : 0);

  return (
    <View style={styles.price} accessible accessibilityLabel={value}>
      <View style={styles.priceDigits}>
        <Text style={styles.pricePrefix}>{value.slice(0, end - 2)}</Text>
        <Text style={styles.priceMain}>{value.slice(end - 2, end)}</Text>
      </View>
      {raised && <Text style={styles.priceRaised}>{value.slice(-1)}</Text>}
    </View>
  );
}

function StepButton({ label, hint, onPress }: {
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.step}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint}
    >
      <Text style={styles.stepText}>{label}</Text>
    </Pressable>
  );
}

function StopField({ label, value, tint, onChange, onStep }: {
  label: 'SL' | 'TP';
  value: string;
  tint: string;
  onChange: (value: string) => void;
  onStep: (direction: -1 | 1) => void;
}) {
  return (
    <View style={styles.stopField}>
      <View style={styles.stopControls}>
        <StepButton label="−" hint={`Decrease ${label}`} onPress={() => onStep(-1)} />
        <TextInput
          style={styles.stopInput}
          value={value}
          placeholder={label}
          placeholderTextColor="#767676"
          onChangeText={onChange}
          keyboardType="decimal-pad"
          accessibilityLabel={label === 'SL' ? 'Stop Loss' : 'Take Profit'}
        />
        <StepButton label="+" hint={`Increase ${label}`} onPress={() => onStep(1)} />
      </View>
      <View
        style={[styles.bracket, { borderColor: tint }]}
        importantForAccessibility="no"
      />
    </View>
  );
}

function PricePreview({ bid, ask }: { bid: string; ask: string }) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  function drawTrace(values: number[], color: string, value: string) {
    const tagWidth = Math.min(76, size.width * 0.3);
    const traceEnd = size.width * 0.35;
    const points = values.map((level, index) => ({
      x: traceEnd * index / (values.length - 1),
      y: level * size.height,
    }));
    const last = points[points.length - 1];
    points.push({ x: size.width - tagWidth, y: last.y });

    return (
      <>
        {points.slice(1).map((end, index) => {
          const start = points[index];
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const length = Math.hypot(dx, dy);

          return (
            <View
              key={index}
              style={[
                styles.line,
                {
                  width: length,
                  left: (start.x + end.x - length) / 2,
                  top: (start.y + end.y) / 2,
                  backgroundColor: color,
                  transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
                },
              ]}
            />
          );
        })}
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[
            styles.lineLabel,
            { top: last.y - 9, width: tagWidth, backgroundColor: color },
          ]}
        >
          {value}
        </Text>
      </>
    );
  }

  return (
    <View
      style={styles.preview}
      onLayout={({ nativeEvent: { layout } }) => {
        setSize({ width: layout.width, height: layout.height });
      }}
      accessible
      accessibilityLabel={`Simulated price preview. Ask ${ask}. Bid ${bid}.`}
    >
      {size.width > 0 && size.height > 0 && (
        <>
          {drawTrace(askTrace, red, ask)}
          {drawTrace(bidTrace, blue, bid)}
        </>
      )}
    </View>
  );
}

export default function OrderScreen({ quote, onBack, onSubmit }: Props) {
  const [volume, setVolume] = useState('1.00');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [policy, setPolicy] = useState<FillPolicy>('Fill or Kill');
  const [policyOpen, setPolicyOpen] = useState(false);
  const [error, setError] = useState('');

  const decimals = quote.bid.split('.')[1]?.length ?? 2;
  const tick = 10 ** -decimals;

  function stepVolume(delta: number) {
    const current = decimal(volume);
    const next = (Number.isFinite(current) ? current : 1) + delta;
    setVolume(Math.max(0.01, Math.min(100, next)).toFixed(2));
    setError('');
  }

  function stepStop(value: string, direction: -1 | 1, update: (value: string) => void) {
    const current = decimal(value);
    const base = Number.isFinite(current) ? current : Number(quote.bid);
    update(Math.max(tick, base + direction * tick).toFixed(decimals));
    setError('');
  }

  function submit(side: Side) {
    const lots = decimal(volume);
    const price = side === 'buy' ? quote.ask : quote.bid;
    const entry = Number(price);
    const stopLoss = sl.trim() ? decimal(sl) : null;
    const takeProfit = tp.trim() ? decimal(tp) : null;

    if (
      !Number.isFinite(lots) ||
      lots < 0.01 ||
      lots > 100 ||
      Math.abs(lots * 100 - Math.round(lots * 100)) > 0.000001
    ) {
      setError('Enter 0.01 to 100.00 lots in steps of 0.01.');
      return;
    }

    if (
      stopLoss !== null &&
      (!Number.isFinite(stopLoss) || stopLoss <= 0 ||
        (side === 'buy' ? stopLoss >= entry : stopLoss <= entry))
    ) {
      setError(`For a ${side}, Stop Loss must be ${side === 'buy' ? 'below' : 'above'} ${price}.`);
      return;
    }

    if (
      takeProfit !== null &&
      (!Number.isFinite(takeProfit) || takeProfit <= 0 ||
        (side === 'buy' ? takeProfit <= entry : takeProfit >= entry))
    ) {
      setError(`For a ${side}, Take Profit must be ${side === 'buy' ? 'above' : 'below'} ${price}.`);
      return;
    }

    setError('');
    Keyboard.dismiss();
    onSubmit({ symbol: quote.symbol, side, lots, price, stopLoss, takeProfit, fillPolicy: policy });
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          style={styles.back}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to Quotes"
        >
          <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.symbol} accessibilityRole="header">{quote.symbol}</Text>
          <Text style={styles.instrument}>{instrumentNames[quote.symbol] ?? quote.symbol}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.execution}>Market Execution</Text>

        <View style={styles.volumeRow}>
          <StepButton label="−0.1" hint="Decrease volume by 0.1" onPress={() => stepVolume(-0.1)} />
          <StepButton label="−0.01" hint="Decrease volume by 0.01" onPress={() => stepVolume(-0.01)} />
          <TextInput
            style={styles.volumeInput}
            value={volume}
            onChangeText={setVolume}
            keyboardType="decimal-pad"
            accessibilityLabel="Order volume in lots"
          />
          <StepButton label="+0.01" hint="Increase volume by 0.01" onPress={() => stepVolume(0.01)} />
          <StepButton label="+0.1" hint="Increase volume by 0.1" onPress={() => stepVolume(0.1)} />
        </View>

        <View style={styles.prices}>
          <OrderPrice value={quote.bid} />
          <OrderPrice value={quote.ask} />
        </View>

        <View style={styles.stops}>
          <StopField label="SL" value={sl} tint="#E89C9C" onChange={setSl}
            onStep={(direction) => stepStop(sl, direction, setSl)} />
          <StopField label="TP" value={tp} tint="#9BC126" onChange={setTp}
            onStep={(direction) => stepStop(tp, direction, setTp)} />
        </View>

        <View style={styles.policyArea}>
          <Pressable
            style={styles.policyRow}
            onPress={() => {
              Keyboard.dismiss();
              setPolicyOpen((open) => !open);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Fill policy, ${policy}`}
            accessibilityState={{ expanded: policyOpen }}
          >
            <Text style={styles.policyLabel}>Fill policy</Text>
            <Text style={styles.policyValue}>{policy}</Text>
            <Ionicons name="caret-down" size={13} color="#6C7078" />
          </Pressable>

          {policyOpen && (
            <View style={styles.policyMenu}>
              {policies.map((option) => (
                <Pressable
                  key={option}
                  style={styles.policyOption}
                  onPress={() => {
                    setPolicy(option);
                    setPolicyOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: policy === option }}
                >
                  <Text style={styles.optionText}>{option}</Text>
                  {policy === option && (
                    <Ionicons name="checkmark" size={18} color={blue} />
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <PricePreview bid={quote.bid} ask={quote.ask} />
      </ScrollView>

      <Text style={styles.notice} accessibilityLiveRegion="polite">
        {error || 'Demo market execution. Orders use the simulated bid or ask shown above.'}
      </Text>

      <View style={styles.actions}>
        <Pressable style={styles.tradeButton} onPress={() => submit('sell')}
          accessibilityRole="button" accessibilityLabel="Sell by Market">
          <Text style={[styles.side, { color: red }]}>SELL</Text>
          <Text style={[styles.byMarket, { color: red }]}>BY MARKET</Text>
        </Pressable>

        <Pressable style={[styles.tradeButton, styles.buyButton]} onPress={() => submit('buy')}
          accessibilityRole="button" accessibilityLabel="Buy by Market">
          <Text style={[styles.side, { color: blue }]}>BUY</Text>
          <Text style={[styles.byMarket, { color: blue }]}>BY MARKET</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', backgroundColor: blue },
  back: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, paddingRight: 12, paddingVertical: 6 },
  symbol: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  instrument: { color: '#FFFFFF', fontSize: 14 },
  scroll: { flex: 1 },
  content: { flexGrow: 1 },
  execution: {
    paddingVertical: 13, textAlign: 'center', color: ink, fontSize: 18,
    borderBottomWidth: StyleSheet.hairlineWidth, borderColor: divider,
  },
  volumeRow: {
    minHeight: 52, flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth, borderColor: divider,
  },
  step: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: blue, fontSize: 16, fontWeight: '500' },
  volumeInput: {
    width: 66, minHeight: 37, paddingVertical: 5, textAlign: 'center',
    borderBottomWidth: 1, borderColor: divider, color: ink, fontWeight: '700', fontSize: 18,
  },
  prices: {
    minHeight: 63, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  price: { flexDirection: 'row', alignItems: 'flex-start' },
  priceDigits: { flexDirection: 'row', alignItems: 'baseline' },
  pricePrefix: { color: red, fontFamily: condensed, fontWeight: '700', fontSize: 16 },
  priceMain: { color: red, fontFamily: condensed, fontWeight: '700', fontSize: 25 },
  priceRaised: { color: red, fontFamily: condensed, fontWeight: '700', fontSize: 12, marginTop: 2 },
  stops: { flexDirection: 'row', paddingHorizontal: 16, gap: 16 },
  stopField: { flex: 1 },
  stopControls: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  stopInput: { flex: 3, minWidth: 0, paddingHorizontal: 0, textAlign: 'center', color: ink, fontSize: 15 },
  bracket: { height: 4, borderBottomWidth: 1, borderLeftWidth: 1, borderRightWidth: 1 },
  policyArea: { marginHorizontal: 16, zIndex: 2 },
  policyRow: {
    minHeight: 49, flexDirection: 'row', alignItems: 'center', gap: 9,
    paddingHorizontal: 8, borderBottomWidth: 1, borderColor: divider,
  },
  policyLabel: { color: ink, fontSize: 16 },
  policyValue: { flex: 1, color: '#626262', fontSize: 15, textAlign: 'right' },
  policyMenu: {
    position: 'absolute', top: '100%', right: 0, width: 210, maxWidth: '100%',
    backgroundColor: '#FFFFFF', borderColor: divider, borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 4, elevation: 5, shadowColor: '#000000', shadowOpacity: 0.18,
    shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  policyOption: {
    minHeight: 44, paddingHorizontal: 12, flexDirection: 'row',
    alignItems: 'center', gap: 8,
  },
  optionText: { flex: 1, color: ink, fontSize: 15 },
  preview: { flex: 1, minHeight: 116, overflow: 'hidden' },
  line: { position: 'absolute', height: StyleSheet.hairlineWidth },
  lineLabel: {
    position: 'absolute', right: 0, paddingHorizontal: 3, color: '#FFFFFF',
    fontSize: 12, lineHeight: 18,
  },
  notice: {
    paddingHorizontal: 16, paddingVertical: 11, textAlign: 'center',
    color: '#555555', backgroundColor: '#F5F5F5', fontSize: 13,
  },
  actions: {
    flexDirection: 'row', backgroundColor: '#F5F5F5',
    borderTopWidth: StyleSheet.hairlineWidth, borderColor: divider,
  },
  tradeButton: { flex: 1, minHeight: 54, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
  buyButton: { borderLeftWidth: StyleSheet.hairlineWidth, borderColor: divider },
  side: { fontFamily: condensed, fontSize: 18, fontWeight: '800' },
  byMarket: { fontFamily: condensed, fontSize: 13, fontWeight: '500' },
});