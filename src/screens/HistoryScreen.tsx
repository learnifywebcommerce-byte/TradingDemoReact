import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line } from 'react-native-svg';

export type HistoryTrade = {
  id: number;
  symbol: string;
  side: 'buy' | 'sell';
  lots: number;
  price: string;
  openedAt: number;
  closed?: { time: number; price: string; profit: number };
};

type Props = {
  trades: HistoryTrade[];
  deposit: number;
  depositedAt: number;
  balance: number;
  onOpenMenu: () => void;
};

const tabs = ['Positions', 'Orders', 'Deals'] as const;
const sorts = ['Symbol', 'Ticket', 'Type', 'Volume', 'Open time', 'Close time', 'Profit'] as const;
const periods = ['Today', 'Last week', 'Last month', 'Last 3 months', 'Custom period'] as const;

type Tab = (typeof tabs)[number];
type Sort = (typeof sorts)[number];
type Period = (typeof periods)[number];
type Menu = 'symbol' | 'sort' | 'period' | 'custom';
type Range = { from: number; to: number };
type Entry = {
  key: string;
  kind: 'deposit' | 'position' | 'order' | 'entry' | 'exit';
  time: number;
  trade?: HistoryTrade;
};

const BLUE = '#087CF1';
const WHITE = '#FFFFFF';
const INK = '#202A36';
const MUTED = '#586777';
const LINE = '#E3E9EF';

const numberFormat = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});
const timeFormat = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function money(value: number) {
  return numberFormat.format(value).replace(/,/g, '\u00A0');
}

function dateInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDay(value: string) {
  const input = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;

  const date = new Date(`${input}T00:00:00`);
  return Number.isFinite(date.getTime()) && dateInput(date) === input ? date : null;
}

function dateRange(period: Period, custom?: Range): Range {
  if (period === 'Custom period' && custom) return custom;

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  if (period === 'Last week') start.setDate(start.getDate() - 7);

  if (period === 'Last month' || period === 'Last 3 months') {
    const day = start.getDate();
    start.setDate(1);
    start.setMonth(start.getMonth() - (period === 'Last month' ? 1 : 3));
    const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    start.setDate(Math.min(day, lastDay));
  }

  return { from: start.getTime(), to: end.getTime() };
}

function sortValue(entry: Entry, sort: Sort): string | number {
  const trade = entry.trade;

  switch (sort) {
    case 'Symbol': return trade?.symbol ?? '';
    case 'Ticket': return trade?.id ?? 0;
    case 'Type':
      return entry.kind === 'exit'
        ? (trade?.side === 'buy' ? 'sell' : 'buy')
        : trade?.side ?? entry.kind;
    case 'Volume': return trade?.lots ?? 0;
    case 'Open time': return trade?.openedAt ?? entry.time;
    case 'Close time': return trade?.closed?.time ?? entry.time;
    case 'Profit':
      return entry.kind === 'position' || entry.kind === 'exit'
        ? trade?.closed?.profit ?? 0
        : 0;
  }
}

function Tool({ icon, label, onPress }: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.tool}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={24} color={WHITE} />
    </Pressable>
  );
}

function MenuRow({ label, detail, marker, icon, onPress }: {
  label: string;
  detail?: string;
  marker?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress} accessibilityRole="button">
      {icon && (
        <View style={{ width: 34 }} accessible={false}>
          <Ionicons name={icon} size={23} color={MUTED} />
        </View>
      )}

      <View style={styles.grow}>
        <Text style={styles.mainText}>{label}</Text>
        {detail ? <Text style={styles.secondary}>{detail}</Text> : null}
      </View>

      {marker ? <Text style={styles.amount}>{marker}</Text> : null}
    </Pressable>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.entryTitle}>{label}:</Text>

      <View style={styles.summaryLeader} pointerEvents="none">
        <Svg width="100%" height={8}>
          <Line
            x1={2}
            y1={4}
            x2="100%"
            y2={4}
            stroke="#CCD4DD"
            strokeWidth={2}
            strokeDasharray="1 7"
            strokeLinecap="round"
          />
        </Svg>
      </View>

      <Text style={[styles.amount, value < 0 && styles.negative]}>
        {money(value)}
      </Text>
    </View>
  );
}

export default function HistoryScreen({
  trades,
  deposit,
  depositedAt,
  balance,
  onOpenMenu,
}: Props) {
  const [tab, setTab] = useState<Tab>('Positions');
  const [symbol, setSymbol] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>('Open time');
  const [ascending, setAscending] = useState(true);
  const [period, setPeriod] = useState<Period>('Today');
  const [custom, setCustom] = useState(() => dateRange('Today'));
  const [menu, setMenu] = useState<Menu | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');

  const symbolLabel = symbol ?? 'All symbols';
  const symbols = [...new Set(trades.map((trade) => trade.symbol))].sort();
  const range = dateRange(period, custom);
  const inRange = (time: number) => time >= range.from && time < range.to;
  const filtered = trades.filter((trade) => symbol === null || trade.symbol === symbol);
  const showDeposit = symbol === null && inRange(depositedAt);
  const profit = filtered.reduce((total, trade) =>
    trade.closed && inRange(trade.closed.time) ? total + trade.closed.profit : total, 0);

  const entries: Entry[] = [];

  if (tab !== 'Orders' && showDeposit) {
    entries.push({ key: 'deposit', kind: 'deposit', time: depositedAt });
  }

  for (const trade of filtered) {
    if (tab === 'Positions') {
      if (trade.closed) {
        entries.push({ key: `p-${trade.id}`, kind: 'position', trade, time: trade.closed.time });
      }
    } else if (tab === 'Orders') {
      entries.push({ key: `o-${trade.id}`, kind: 'order', trade, time: trade.openedAt });
    } else {
      entries.push({ key: `in-${trade.id}`, kind: 'entry', trade, time: trade.openedAt });
      if (trade.closed) {
        entries.push({ key: `out-${trade.id}`, kind: 'exit', trade, time: trade.closed.time });
      }
    }
  }

  const visible = entries.filter((entry) => inRange(entry.time)).sort((a, b) => {
    const left = sortValue(a, sort);
    const right = sortValue(b, sort);
    const difference = typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left).localeCompare(String(right));
    return (ascending ? difference : -difference) || a.time - b.time;
  });

  const summary = [
    ['Profit', profit],
    ['Deposit', showDeposit ? deposit : 0],
    ['Swap', 0],
    ['Commission', 0],
    ['Balance', balance],
  ] as const;

  function selectPeriod(value: Period) {
    if (value === 'Custom period') {
      setFrom(dateInput(new Date(custom.from)));
      setTo(dateInput(new Date(custom.to - 1)));
      setError('');
      setMenu('custom');
    } else {
      setPeriod(value);
      setMenu(null);
    }
  }

  function applyCustom() {
    const start = parseDay(from);
    const end = parseDay(to);

    if (!start || !end || end < start) {
      setError('Enter valid start and end dates in YYYY-MM-DD order.');
      return;
    }

    end.setDate(end.getDate() + 1);
    setCustom({ from: start.getTime(), to: end.getTime() });
    setPeriod('Custom period');
    setMenu(null);
  }

  function renderEntry({ item }: { item: Entry }) {
    const { trade, kind, time } = item;
    const closing = kind === 'position' || kind === 'exit';
    const result = closing ? trade?.closed?.profit : undefined;
    const side = trade?.side === 'buy' ? 'Buy' : 'Sell';
    const dealSide = kind === 'exit' ? (side === 'Buy' ? 'Sell' : 'Buy') : side;

    const detail = !trade
      ? 'Demo deposit'
      : kind === 'position'
        ? `${side} · ${trade.lots.toFixed(2)} lots · ${trade.price} → ${trade.closed?.price}`
        : `${dealSide} · ${trade.lots.toFixed(2)} lots · ${closing ? trade.closed?.price : trade.price} · #${trade.id}`;

    const value = !trade
      ? money(deposit)
      : result !== undefined
        ? money(result)
        : kind === 'order' ? 'Filled' : 'Entry';

    return (
      <View style={styles.entry}>
        <View style={styles.grow}>
          <Text style={styles.entryTitle}>{trade?.symbol ?? 'Balance'}</Text>
          <Text style={styles.secondary}>{detail}</Text>
        </View>
        <View style={styles.entryRight}>
          <Text style={styles.secondary}>
            {dateFormat.format(time)} {timeFormat.format(time)}
          </Text>
          <Text style={[styles.amount, result !== undefined && result < 0 && styles.negative]}>
            {value}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Tool icon="menu-outline" label="Open sidebar" onPress={onOpenMenu} />

        <View style={styles.heading}>
          <Text style={styles.title} accessibilityRole="header">History</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{symbolLabel}</Text>
        </View>

        <Pressable
          style={styles.tool}
          onPress={() => setMenu('symbol')}
          accessibilityRole="button"
          accessibilityLabel={`Filter symbols, ${symbolLabel}`}
        >
          <View style={styles.symbolIcon} pointerEvents="none">
            <Ionicons name="swap-horizontal-outline" size={29} color={WHITE} />
            <Text style={styles.symbolDollar}>$</Text>
          </View>
        </Pressable>

        <Tool icon="swap-vertical-outline" label="Sort history" onPress={() => setMenu('sort')} />
        <Tool icon="calendar-outline" label="Date range" onPress={() => setMenu('period')} />
      </View>

      <View style={styles.tabs}>
        {tabs.map((name) => (
          <Pressable
            key={name}
            style={[styles.tab, name === tab && styles.activeTab]}
            onPress={() => setTab(name)}
            accessibilityRole="tab"
            accessibilityState={{ selected: name === tab }}
          >
            <Text style={[styles.tabText, name === tab && styles.activeText]}>{name}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        style={styles.grow}
        data={visible}
        keyExtractor={(item) => item.key}
        renderItem={renderEntry}
        ListHeaderComponent={tab === 'Positions' ? (
          <View style={styles.summary}>
            {summary.map(([label, value]) => (
              <SummaryRow key={label} label={label} value={value} />
            ))}
          </View>
        ) : null}
        ListEmptyComponent={<Text style={styles.empty}>No {tab.toLowerCase()} in this period.</Text>}
      />

      {menu !== null && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setMenu(null)}>
          <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setMenu(null)}
              accessibilityRole="button"
              accessibilityLabel="Dismiss history menu"
            />

            <View style={[
              styles.popup,
              menu === 'symbol' && styles.symbolPopup,
              menu === 'sort' && styles.sortPopup,
            ]}>
              <ScrollView keyboardShouldPersistTaps="handled">
                {menu === 'symbol' && [null, ...symbols].map((value) => (
                  <MenuRow
                    key={value ?? 'all'}
                    label={value ?? 'All symbols'}
                    marker={symbol === value ? '✓' : undefined}
                    onPress={() => {
                      setSymbol(value);
                      setMenu(null);
                    }}
                  />
                ))}

                {menu === 'sort' && sorts.map((value) => (
                  <MenuRow
                    key={value}
                    label={value}
                    marker={sort === value ? (ascending ? '↑' : '↓') : undefined}
                    onPress={() => {
                      setAscending(value === sort ? !ascending : true);
                      setSort(value);
                      setMenu(null);
                    }}
                  />
                ))}

                {menu === 'period' && periods.map((value) => {
                  const dates = dateRange(value, custom);
                  const start = dateFormat.format(dates.from);
                  const end = dateFormat.format(dates.to - 1);

                  return (
                    <MenuRow
                      key={value}
                      icon="calendar-outline"
                      label={value}
                      detail={start === end ? start : `${start} – ${end}`}
                      marker={period === value ? '✓' : undefined}
                      onPress={() => selectPeriod(value)}
                    />
                  );
                })}

                {menu === 'custom' && (
                  <View style={styles.form}>
                    <Text style={styles.entryTitle}>Custom period</Text>
                    <Text style={styles.secondary}>From (YYYY-MM-DD)</Text>
                    <TextInput
                      style={styles.input}
                      value={from}
                      onChangeText={setFrom}
                      accessibilityLabel="Start date"
                      autoCorrect={false}
                    />
                    <Text style={styles.secondary}>To (YYYY-MM-DD)</Text>
                    <TextInput
                      style={styles.input}
                      value={to}
                      onChangeText={setTo}
                      accessibilityLabel="End date"
                      autoCorrect={false}
                    />
                    {error !== '' && (
                      <Text style={styles.negative} accessibilityRole="alert">{error}</Text>
                    )}
                    <MenuRow label="Apply" onPress={applyCustom} />
                    <MenuRow label="Back" onPress={() => setMenu('period')} />
                  </View>
                )}
              </ScrollView>
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: WHITE },
  grow: { flex: 1 },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BLUE,
  },
  tool: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, minWidth: 0, minHeight: 48, justifyContent: 'center' },
  title: { color: WHITE, fontSize: 17, fontWeight: '600' },
  subtitle: { color: WHITE, fontSize: 16, marginTop: 2 },
  symbolIcon: { alignItems: 'center', justifyContent: 'center' },
  symbolDollar: {
    position: 'absolute',
    color: WHITE,
    backgroundColor: BLUE,
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '700',
    paddingHorizontal: 1,
  },
  tabs: { flexDirection: 'row', gap: 5, padding: 8, backgroundColor: '#F5F9FD' },
  tab: { flex: 1, minHeight: 42, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  activeTab: { backgroundColor: '#DDEEFF' },
  tabText: { color: MUTED, fontWeight: '600' },
  activeText: { color: '#005BBA' },
  summary: { marginHorizontal: 14, paddingVertical: 6, borderBottomWidth: 1, borderColor: LINE },
  summaryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  summaryLeader: { flex: 1, minWidth: 0, marginHorizontal: 10 },
  entry: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: LINE,
  },
  entryTitle: { color: INK, fontSize: 15, fontWeight: '700' },
  entryRight: { alignItems: 'flex-end', gap: 4 },
  mainText: { color: INK, fontSize: 15 },
  secondary: { color: MUTED, fontSize: 12, marginTop: 3 },
  amount: { color: '#0067CD', fontWeight: '700', fontVariant: ['tabular-nums'] },
  negative: { color: '#B42318' },
  empty: { color: MUTED, textAlign: 'center', margin: 18 },
  modal: { flex: 1 },
  popup: {
    alignSelf: 'flex-end',
    marginTop: 52,
    marginRight: 10,
    width: 230,
    maxHeight: '78%',
    backgroundColor: WHITE,
    borderRadius: 12,
    elevation: 8,
    shadowOpacity: 0.15,
    shadowRadius: 9,
  },
  symbolPopup: { marginRight: 96, width: 180 },
  sortPopup: { marginRight: 54, width: 180 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: LINE,
  },
  form: { padding: 14, gap: 5 },
  input: { minHeight: 44, borderBottomWidth: 1, borderColor: LINE, color: INK },
});