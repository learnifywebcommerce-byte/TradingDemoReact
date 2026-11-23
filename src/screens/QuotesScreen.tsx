import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import {
  FlatList,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import SidebarMenu from './SidebarMenu';
import Svg, { Line, Polygon, Rect } from 'react-native-svg';
const colors = {
  blue: '#087CF1',
  red: '#D45145',
  ink: '#404040',
  muted: '#767676',
  white: '#FFFFFF',
  tabBackground: '#F5F5F5',
};

const condensed = Platform.OS === 'android' ? 'sans-serif-condensed' : undefined;

type PriceDirection = 'up' | 'down';
type AvailableTab = 'Quotes' | 'Charts' | 'Trade' | 'History' | 'Messages';
type SheetView = 'actions' | 'properties' | 'statistics';

export type SymbolQuote = {
  symbol: string;
  bid: string;
  ask: string;
};

type Quote = SymbolQuote & {
  points: string;
  change: string;
  time: string;
  spread: number;
  low: string;
  high: string;
  bidDirection: PriceDirection;
  askDirection: PriceDirection;
};

type PositionSide = 'buy' | 'sell';

type QuotesScreenProps = {
  positions?: readonly { symbol: string; side: PositionSide }[];
  simple: boolean;
  onToggleView: () => void;
  onOpenChart: (quote: SymbolQuote) => void;
  onNewOrder: (quote: SymbolQuote) => void;
};

export const quotes: Quote[] = [
  {
    symbol: 'NZDUSD.x',
    bid: '0.54782', ask: '0.54789',
    points: '-32', change: '-0.06%', time: '23:25:44', spread: 7,
    low: '0.54732', high: '0.55116',
    bidDirection: 'up', askDirection: 'up',
  },
  {
    symbol: 'AUDUSD.x',
    bid: '0.66279', ask: '0.66283',
    points: '-305', change: '-0.46%', time: '23:25:41', spread: 4,
    low: '0.66275', high: '0.66822',
    bidDirection: 'up', askDirection: 'up',
  },
  {
    symbol: 'EURUSD.x',
    bid: '1.09716', ask: '1.09718',
    points: '-507', change: '-0.46%', time: '23:25:46', spread: 2,
    low: '1.09568', high: '1.09992',
    bidDirection: 'down', askDirection: 'down',
  },
  {
    symbol: 'GBPUSD.x',
    bid: '1.30976', ask: '1.30982',
    points: '+105', change: '0.08%', time: '23:25:47', spread: 6,
    low: '1.30781', high: '1.31290',
    bidDirection: 'up', askDirection: 'up',
  },
  {
    symbol: 'USDCAD.x',
    bid: '1.43356', ask: '1.43360',
    points: '+673', change: '0.47%', time: '23:25:46', spread: 4,
    low: '1.42990', high: '1.43511',
    bidDirection: 'up', askDirection: 'up',
  },
  {
    symbol: 'USDJPY.x',
    bid: '158.757', ask: '158.760',
    points: '-910', change: '-0.57%', time: '23:25:46', spread: 3,
    low: '158.550', high: '159.838',
    bidDirection: 'up', askDirection: 'up',
  },
  {
    symbol: 'USDCHF.x',
    bid: '0.83970', ask: '0.83980',
    points: '-432', change: '-0.51%', time: '23:25:46', spread: 10,
    low: '0.83763', high: '0.84435',
    bidDirection: 'down', askDirection: 'down',
  },
  {
    symbol: 'XAUUSD.x',
    bid: '3529.06', ask: '3529.12',
    points: '-7707', change: '-2.14%', time: '23:25:47', spread: 6,
    low: '3 515.05', high: '3 687.71',
    bidDirection: 'up', askDirection: 'down',
  },
];

const ROW_HEIGHT = 68;
const categories = ['FX Majors', 'FX Exotics', 'FX Minors', 'Cryptocurrencies', 'Indices', 'Commodities'] as const;
type Category = (typeof categories)[number];

const symbolNames: Record<string, string> = {
  'NZDUSD.x': 'New Zealand Dollar vs US Dollar',
  'AUDUSD.x': 'Australian Dollar vs US Dollar',
  'EURUSD.x': 'Euro vs US Dollar',
  'GBPUSD.x': 'British Pound vs US Dollar',
  'USDCAD.x': 'US Dollar vs Canadian Dollar',
  'USDJPY.x': 'US Dollar vs Japanese Yen',
  'USDCHF.x': 'US Dollar vs Swiss Franc',
  'XAUUSD.x': 'Gold vs US Dollar',
  'XAGUSD.x': 'Silver vs US Dollar',
  'XPDUSD.x': 'Palladium vs US Dollar',
  'XPTUSD.x': 'Platinum vs US Dollar',
  'USDZAR.x': 'US Dollar vs South African Rand',
  'EURGBP.x': 'Euro vs British Pound',
  'BTCUSD.x': 'Bitcoin vs US Dollar',
  'US500.x': 'US 500 Index',
};

const catalogCategories: Partial<Record<string, Category>> = {
  'USDZAR.x': 'FX Exotics',
  'EURGBP.x': 'FX Minors',
  'BTCUSD.x': 'Cryptocurrencies',
  'US500.x': 'Indices',
};

const demoCatalog = [
  { symbol: 'XAGUSD.x', bid: '31.520', ask: '31.540' },
  { symbol: 'XPDUSD.x', bid: '1028.30', ask: '1029.30' },
  { symbol: 'XPTUSD.x', bid: '1050.10', ask: '1051.10' },
  { symbol: 'USDZAR.x', bid: '17.6400', ask: '17.6450' },
  { symbol: 'EURGBP.x', bid: '0.86420', ask: '0.86429' },
  { symbol: 'BTCUSD.x', bid: '95000.00', ask: '95030.00' },
  { symbol: 'US500.x', bid: '5900.00', ask: '5900.50' },
];

for (const quote of demoCatalog) {
  const decimals = quote.bid.split('.')[1].length;
  quotes.push({
    ...quote,
    change: '0.00%',
    points: '0',
    time: '23:25:47',
    spread: Math.round((Number(quote.ask) - Number(quote.bid)) * 10 ** decimals),
    low: quote.bid,
    high: quote.ask,
    bidDirection: 'up',
    askDirection: 'up',
  });
}

const QUOTE_REFRESH_MS = 1000;
const quoteClock = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

function nextDemoQuote(current: Quote, base: Quote, time: string): Quote {
  const decimals = base.bid.split('.')[1].length;
  const scale = 10 ** decimals;
  const baseBid = Math.round(Number(base.bid) * scale);
  const currentBid = Math.round(Number(current.bid) * scale);
  const spread = Math.round(Number(base.ask) * scale) - baseBid;
  const direction = Math.random() < 0.5 ? -1 : 1;
  const step = direction * (1 + Math.floor(Math.random() * 3));
  const limit = Math.max(10, Math.round(baseBid * 0.001));
  const minimum = Math.max(1, baseBid - limit);
  const maximum = baseBid + limit;
  const candidate = currentBid + step;
  const bidTicks = candidate < minimum || candidate > maximum ? currentBid - step : candidate;
  const bid = (bidTicks / scale).toFixed(decimals);
  const ask = ((bidTicks + spread) / scale).toFixed(decimals);
  const movement = bidTicks > currentBid ? 'up' : 'down';
  const points = bidTicks - baseBid + Number(base.points);
  const previousClose = baseBid - Number(base.points);

  return {
    ...current,
    time,
    bid,
    ask,
    spread,
    bidDirection: movement,
    askDirection: movement,
    points: points > 0 ? `+${points}` : String(points),
    change: `${((points / previousClose) * 100).toFixed(2)}%`,
    low: Number(bid) < Number(current.low.replace(/\s/g, '')) ? bid : current.low,
    high: Number(bid) > Number(current.high.replace(/\s/g, '')) ? bid : current.high,
  };
}

let sessionWatchlist = quotes.slice(0, 8).map(({ symbol }) => symbol);

function categoryOf(symbol: string): Category {
  return catalogCategories[symbol] ?? (symbol.startsWith('X') ? 'Commodities' : 'FX Majors');
}

type WatchlistPage = 'add' | 'edit' | 'remove';
type CloseWatchlist = () => void;

function WatchlistManager({ page, setPage, symbols, update, close }: {
  page: WatchlistPage;
  setPage: (page: WatchlistPage) => void;
  symbols: string[];
  update: (symbols: string[]) => void;
  close: CloseWatchlist;
}) {
  const [category, setCategory] = useState<Category | null>(null);
  const [search, setSearch] = useState('');
  const [marked, setMarked] = useState<string[]>([]);
  const [drag, setDrag] = useState<{ symbol: string; dy: number } | null>(null);
  const addReturn = useRef<'edit' | null>(null);
  const query = search.trim().toLowerCase();
  const allMarked = symbols.length > 0 && marked.length === symbols.length;

  function back() {
    if (page === 'remove') {
      setPage('edit');
    } else if (page === 'add' && (category || query)) {
      setCategory(null);
      setSearch('');
    } else if (page === 'add' && addReturn.current) {
      addReturn.current = null;
      setPage('edit');
    } else {
      close();
    }
  }

  function move(symbol: string, offset: number) {
    const from = symbols.indexOf(symbol);
    if (from < 0) return;
    const to = Math.max(0, Math.min(symbols.length - 1, from + offset));
    if (to === from) return;
    const reordered = [...symbols];
    reordered.splice(from, 1);
    reordered.splice(to, 0, symbol);
    update(reordered);
  }

  const managerTitle = page === 'edit' ? 'Selected symbols' : page === 'remove' ? 'Remove symbols' : 'Add symbol';
  const available = quotes.filter(({ symbol }) => (
    query
      ? (symbol + ' ' + (symbolNames[symbol] ?? '')).toLowerCase().includes(query)
      : categoryOf(symbol) === category
  ));

  return (
    <Modal visible animationType="slide" onRequestClose={back}>
      <SafeAreaView style={watchStyles.safe}>
        <View style={watchStyles.header}>
          <WatchTool icon="arrow-back-outline" label="Back" onPress={back} />
          <Text style={watchStyles.title} accessibilityRole="header">{managerTitle}</Text>
          {page === 'edit' && (
            <>
              <WatchTool icon="add-outline" label="Add symbol" onPress={() => {
                addReturn.current = 'edit';
                setPage('add');
              }} />
              <WatchTool icon="trash-outline" label="Select symbols to remove"
                disabled={!symbols.length} onPress={() => {
                  setMarked([]);
                  setPage('remove');
                }} />
            </>
          )}
          {page === 'remove' && (
            <>
              <WatchTool icon="checkbox-outline" label={allMarked ? 'Clear selection' : 'Select all'}
                onPress={() => setMarked(allMarked ? [] : [...symbols])} />
              <WatchTool icon="trash-outline" label="Remove selected symbols"
                disabled={!marked.length} onPress={() => {
                  update(symbols.filter((symbol) => !marked.includes(symbol)));
                  setMarked([]);
                  setPage('edit');
                }} />
            </>
          )}
        </View>

        {page === 'add' && (
          <View style={watchStyles.search}>
            <Ionicons name="search-outline" size={23} color={colors.muted} />
            <TextInput value={search} onChangeText={setSearch} autoCapitalize="none"
              autoCorrect={false} placeholder="Find symbols" placeholderTextColor={colors.muted}
              accessibilityLabel="Find symbols" style={watchStyles.searchInput} />
          </View>
        )}

        <ScrollView style={styles.screen} scrollEnabled={drag === null}
          keyboardShouldPersistTaps="handled" key={page === 'add' ? category ?? 'categories' : page}>
          {page === 'add' && !category && !query && categories.map((item) => (
            <Pressable key={item} style={watchStyles.folder} onPress={() => setCategory(item)}
              accessibilityRole="button">
              <Ionicons name="folder-open-outline" size={24} color={colors.blue} />
              <Text style={watchStyles.symbol}>{item}</Text>
            </Pressable>
          ))}

          {page === 'add' && (category || query) && available.map(({ symbol }) => {
            const alreadyAdded = symbols.includes(symbol);
            return (
              <Pressable key={symbol} style={watchStyles.row} disabled={alreadyAdded}
                accessibilityRole="button" accessibilityLabel={`Add ${symbol}`}
                accessibilityState={{ disabled: alreadyAdded, selected: alreadyAdded }}
                onPress={() => update([...symbols, symbol])}>
                <WatchSymbol symbol={symbol} />
                <Ionicons name={alreadyAdded ? 'checkmark-circle-outline' : 'add-circle-outline'}
                  size={23} color={colors.blue} />
              </Pressable>
            );
          })}
          {page === 'add' && (category || query) && !available.length && (
            <Text style={watchStyles.empty}>No matching symbols.</Text>
          )}

          {page === 'edit' && symbols.map((symbol, index) => (
            <View key={symbol} style={[
              watchStyles.row,
              drag?.symbol === symbol && [watchStyles.dragging, { transform: [{ translateY: drag.dy }] }],
            ]}>
              <DragHandle symbol={symbol} onDrag={(dy) => setDrag({ symbol, dy })}
                onEnd={(dy) => { move(symbol, Math.round(dy / ROW_HEIGHT)); setDrag(null); }}
                onCancel={() => setDrag(null)}
                canMoveUp={index > 0} canMoveDown={index < symbols.length - 1}
                onMove={(offset) => move(symbol, offset)} />
              <WatchSymbol symbol={symbol} />
            </View>
          ))}

          {page === 'remove' && symbols.map((symbol) => {
            const checked = marked.includes(symbol);
            return (
              <Pressable key={symbol} style={watchStyles.row} accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                onPress={() => setMarked((current) => checked
                  ? current.filter((item) => item !== symbol)
                  : [...current, symbol])}>
                <WatchSymbol symbol={symbol} />
                <Ionicons name={checked ? 'checkbox-outline' : 'square-outline'}
                  size={23} color={checked ? colors.blue : colors.muted} />
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function WatchTool({ icon, label, onPress, disabled = false }: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable style={watchStyles.tool} accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}>
      <Ionicons name={icon} size={24} color={disabled ? '#B7DAFF' : colors.white} />
    </Pressable>
  );
}

function WatchSymbol({ symbol }: { symbol: string }) {
  return (
    <View style={watchStyles.symbolBody}>
      <Text style={watchStyles.symbol}>{symbol}</Text>
      <Text style={watchStyles.description}>{symbolNames[symbol] ?? symbol}</Text>
    </View>
  );
}

function DragHandle({ symbol, onDrag, onEnd, onCancel, canMoveUp, canMoveDown, onMove }: {
  symbol: string;
  onDrag: (dy: number) => void;
  onEnd: (dy: number) => void;
  onCancel: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (offset: number) => void;
}) {
  const callbacks = useRef({ onDrag, onEnd, onCancel });
  callbacks.current = { onDrag, onEnd, onCancel };

  const [responder] = useState(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => callbacks.current.onDrag(0),
    onPanResponderMove: (_, gesture) => callbacks.current.onDrag(gesture.dy),
    onPanResponderRelease: (_, gesture) => callbacks.current.onEnd(gesture.dy),
    onPanResponderTerminate: () => callbacks.current.onCancel(),
    onPanResponderTerminationRequest: () => false,
  }));

  return (
    <View {...responder.panHandlers} style={watchStyles.handle} accessible
      accessibilityLabel={`Reorder ${symbol}`}
      accessibilityActions={[
        ...(canMoveUp ? [{ name: 'moveUp', label: 'Move up' }] : []),
        ...(canMoveDown ? [{ name: 'moveDown', label: 'Move down' }] : []),
      ]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === 'moveUp') onMove(-1);
        if (nativeEvent.actionName === 'moveDown') onMove(1);
      }}>
      <Ionicons name="reorder-three-outline" size={22} color={colors.muted} />
    </View>
  );
}

const watchStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.blue },
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
  title: { flex: 1, color: colors.white, fontSize: 18, fontWeight: '600' },
  tool: { width: 46, height: 48, alignItems: 'center', justifyContent: 'center' },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16,
    minHeight: 52, backgroundColor: colors.white, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D6DDE4',
  },
  searchInput: { flex: 1, minHeight: 48, color: colors.ink, fontSize: 16 },
  folder: {
    minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D6DDE4',
  },
  row: {
    height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    backgroundColor: colors.white, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D6DDE4',
  },
  symbolBody: { flex: 1 },
  symbol: { fontSize: 16, fontWeight: '600', color: colors.ink },
  description: { color: colors.muted, marginTop: 4, fontSize: 13 },
  handle: { width: 42, height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  dragging: { zIndex: 1, elevation: 4, backgroundColor: '#EAF4FF' },
  empty: { padding: 16, color: colors.muted },
});

const tabs = [
  { label: 'Quotes', icon: 'swap-vertical-outline' },
  { label: 'Charts', icon: 'bar-chart-outline' },
  { label: 'Trade', icon: 'trending-up-outline' },
  { label: 'History', icon: 'time-outline' },
  { label: 'Messages', icon: 'chatbubbles-outline' },
] as const;

function SpreadIcon() {
  return (
    <View style={styles.spreadIcon}>
      <View style={[styles.spreadBracket, styles.spreadBracketTop]} />
      <View style={[styles.spreadBracket, styles.spreadBracketBottom]} />
    </View>
  );
}

function QuotePrice({
  value,
  direction,
}: {
  value: string;
  direction: PriceDirection;
}) {
  const color = direction === 'down' ? colors.red : colors.blue;
  const decimals = value.split('.')[1] ?? '';
  const hasRaisedDigit = decimals.length > 2;
  const mainEnd = hasRaisedDigit ? value.length - 1 : value.length;

  return (
    <View style={styles.price}>
      <View style={styles.priceDigits}>
        <Text style={[styles.pricePrefix, { color }]}>
          {value.slice(0, mainEnd - 2)}
        </Text>
        <Text style={[styles.priceMain, { color }]}>
          {value.slice(mainEnd - 2, mainEnd)}
        </Text>
      </View>

      {hasRaisedDigit && (
        <Text style={[styles.priceLast, { color }]}>{value.slice(-1)}</Text>
      )}
    </View>
  );
}

function QuoteRow({
  quote,
  simple,
  positionSide,
  onPress,
}: {
  quote: Quote;
  simple: boolean;
  positionSide?: PositionSide;
  onPress: () => void;
}) {
  const changeColor = quote.change.startsWith('-') ? colors.red : colors.blue;
  const priceLabel = `${quote.symbol}. Bid ${quote.bid}. Ask ${quote.ask}.` +
    (positionSide ? ` Open demo ${positionSide} position.` : '');
  const detailsLabel =
    ` Change ${quote.change}. Updated at ${quote.time}.` +
    ` Spread ${quote.spread} points. Low ${quote.low}. High ${quote.high}.`;

  return (
    <Pressable
      style={[styles.row, simple && styles.simpleRow]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={simple ? priceLabel : priceLabel + detailsLabel}
      accessibilityHint="Opens quote actions"
    >
      {positionSide && (
        <View style={styles.positionBadge} pointerEvents="none" accessible={false}>
          <Svg width={15} height={15} viewBox="0 0 15 15">
            <Polygon points="0,0 15,0 0,15"
              fill={positionSide === 'buy' ? colors.blue : colors.red} />
          </Svg>
        </View>
      )}
      <View style={styles.symbolColumn}>
        {!simple && (
          <Text style={styles.metadata}>
            {quote.points}{' '}
            <Text style={{ color: changeColor }}>{quote.change}</Text>
          </Text>
        )}

        <Text style={styles.symbol}>{quote.symbol}</Text>

        {!simple && (
          <View style={styles.quoteMetaRow}>
            <Text style={styles.metadata}>{quote.time}</Text>
            <SpreadIcon />
            <Text style={styles.metadata}>{quote.spread}</Text>
          </View>
        )}
      </View>

      <View style={styles.quoteColumn}>
        <QuotePrice value={quote.bid} direction={quote.bidDirection} />
        {!simple && <Text style={styles.detail}>L: {quote.low}</Text>}
      </View>

      <View style={styles.quoteColumn}>
        <QuotePrice value={quote.ask} direction={quote.askDirection} />
        {!simple && <Text style={styles.detail}>H: {quote.high}</Text>}
      </View>
    </Pressable>
  );
}

function SheetAction({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={styles.sheetAction}
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !onPress }}
    >
      <Text style={[styles.sheetActionText, !onPress && styles.disabledAction]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function QuotesScreen({
  positions,
  simple,
  onToggleView,
  onOpenChart,
  onNewOrder,
}: QuotesScreenProps) {
  const [selected, setSelected] = useState<Quote | null>(null);
  const [sheetView, setSheetView] = useState<SheetView>('actions');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [symbols, setSymbols] = useState(sessionWatchlist);
  const [watchlistPage, setWatchlistPage] = useState<WatchlistPage | null>(null);
  const [liveQuotes, setLiveQuotes] = useState(quotes);

  useEffect(() => {
    if (watchlistPage || sidebarOpen) return;
    const timer = setInterval(() => {
      const time = quoteClock.format(new Date());
      setLiveQuotes((current) => current.map((quote, index) =>
        nextDemoQuote(quote, quotes[index], time),
      ));
    }, QUOTE_REFRESH_MS);
    return () => clearInterval(timer);
  }, [watchlistPage, sidebarOpen]);

  const positionSides = useMemo(() => {
    const sides = new Map<string, PositionSide>();
    for (const position of positions ?? []) {
      if (!sides.has(position.symbol)) sides.set(position.symbol, position.side);
    }
    return sides;
  }, [positions]);
  const visibleQuotes = symbols.flatMap((symbol) => {
    const quote = liveQuotes.find((item) => item.symbol === symbol);
    return quote ? [quote] : [];
  });

  function updateWatchlist(next: string[]) {
    sessionWatchlist = next;
    setSymbols(next);
  }
  const insets = useSafeAreaInsets();

  function openActions(quote: Quote) {
    setSheetView('actions');
    setSelected(quote);
  }

  function closeSheet() {
    setSelected(null);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <Pressable
          onPress={() => setSidebarOpen(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Open sidebar"
        >
          <Ionicons name="menu-outline" size={25} color={colors.white} />
        </Pressable>

        <Text style={styles.title} accessibilityRole="header">
          Quotes
        </Text>

        <View style={styles.toolbarIcons}>
          <WatchTool icon="add-outline" label="Add symbol" onPress={() => setWatchlistPage('add')} />
          <WatchTool icon="pencil-outline" label="Edit selected symbols" onPress={() => setWatchlistPage('edit')} />
        </View>
      </View>

      <FlatList
        style={styles.list}
        data={visibleQuotes}
        ListEmptyComponent={<Text style={watchStyles.empty}>Tap + to add a symbol.</Text>}
        extraData={simple}
        keyExtractor={(quote) => quote.symbol}
        renderItem={({ item }) => (
          <QuoteRow
            quote={item}
            positionSide={positionSides.get(item.symbol)}
            simple={simple}
            onPress={() => openActions(item)}
          />
        )}
      />

      <Modal
        visible={selected !== null}
        transparent
        animationType="fade"
        onRequestClose={closeSheet}
      >
        <View style={styles.sheetOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={closeSheet}
            accessibilityRole="button"
            accessibilityLabel="Dismiss quote actions"
          />

          {selected && (
            <View
              style={[styles.sheet, { paddingBottom: insets.bottom }]}
              accessibilityViewIsModal
            >
              <ScrollView bounces={false}>
                <Text style={styles.sheetTitle} accessibilityRole="header">
                  {selected.symbol}
                </Text>

                {sheetView === 'actions' ? (
                  <>
                    <SheetAction
                      label="New Order"
                      onPress={() => {
                        closeSheet();
                        onNewOrder(liveQuotes.find((quote) => quote.symbol === selected.symbol) ?? selected);
                      }}
                    />
                    <SheetAction
                      label="Chart"
                      onPress={() => {
                        closeSheet();
                        onOpenChart(liveQuotes.find((quote) => quote.symbol === selected.symbol) ?? selected);
                      }}
                    />
                    <SheetAction
                      label="Properties"
                      onPress={() => setSheetView('properties')}
                    />
                    <SheetAction label="Depth Of Market" />
                    <SheetAction
                      label="Market Statistics"
                      onPress={() => setSheetView('statistics')}
                    />
                    <SheetAction
                      label={simple ? 'Advanced view mode' : 'Simple view mode'}
                      onPress={() => {
                        closeSheet();
                        onToggleView();
                      }}
                    />
                  </>
                ) : (
                  <>
                    <View style={styles.sheetDetails}>
                      <Text style={styles.sheetActionText}>
                        {sheetView === 'properties'
                          ? `Bid  ${selected.bid}\nAsk  ${selected.ask}`
                          : `Sample spread  ${selected.spread} points`}
                      </Text>
                    </View>
                    <SheetAction label="Close" onPress={closeSheet} />
                  </>
                )}
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>

      {watchlistPage && (
        <WatchlistManager page={watchlistPage} setPage={setWatchlistPage}
          symbols={symbols} update={updateWatchlist} close={() => setWatchlistPage(null)} />
      )}

      {sidebarOpen && (
        <SidebarMenu onClose={() => setSidebarOpen(false)} />
      )}
    </View>
  );
}

export function BottomTabs({
  active,
  onChange,
}: {
   active: AvailableTab | null;
  onChange: (tab: AvailableTab) => void;
}) {
  return (
    <View style={styles.bottomBar}>
      {tabs.map(({ label, icon }) => {
        const selected = label === active;
        const color = selected ? colors.blue : colors.muted;
        const onPress = () => onChange(label);
        return (
          <Pressable
            key={label}
            style={styles.tab}
            disabled={!onPress}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled: !onPress }}
          >
            {label === 'Charts' ? (
              <Svg width={22} height={22} viewBox="0 0 24 24">
                <Line x1={7} y1={3} x2={7} y2={21} stroke={color} strokeWidth={1.8} />
                <Rect x={4.5} y={7} width={5} height={9} fill={color} rx={0.7} />
                <Line x1={17} y1={2} x2={17} y2={20} stroke={color} strokeWidth={1.8} />
                <Rect x={14.5} y={5} width={5} height={9} fill={color} rx={0.7} />
              </Svg>
            ) : (
              <Ionicons name={icon} size={22} color={color} />
            )}
            <Text style={[styles.tabLabel, { color }, selected && styles.selectedTab]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  toolbar: {
    minHeight: 54,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.blue,
  },
  title: {
    flex: 1,
    color: colors.white,
    fontFamily: condensed,
    fontSize: 18,
    fontWeight: '500',
  },
  toolbarIcons: { flexDirection: 'row', alignItems: 'center' },
  list: { flex: 1 },
  row: {
    minHeight: 76,
    paddingHorizontal: 15,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  simpleRow: { minHeight: 54 },
  positionBadge: { position: 'absolute', top: 0, left: 0 },
  symbolColumn: { flex: 1.75 },
  symbol: {
    marginVertical: 2,
    color: colors.ink,
    fontFamily: condensed,
    fontSize: 17,
    fontWeight: '500',
  },
  metadata: {
    color: colors.muted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  quoteMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  spreadIcon: { width: 10, height: 8, justifyContent: 'space-between' },
  spreadBracket: {
    height: 3,
    borderColor: colors.muted,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  spreadBracketTop: { borderBottomWidth: 1 },
  spreadBracketBottom: { borderTopWidth: 1 },
  quoteColumn: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
  price: { flexDirection: 'row', alignItems: 'flex-start' },
  priceDigits: { flexDirection: 'row', alignItems: 'baseline' },
  pricePrefix: {
    fontFamily: condensed,
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  priceMain: {
    fontFamily: condensed,
    fontSize: 25,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  priceLast: {
    marginTop: 1,
    fontFamily: condensed,
    fontSize: 12,
    fontWeight: '700',
  },
  detail: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  bottomBar: {
    minHeight: 62,
    flexDirection: 'row',
    backgroundColor: colors.tabBackground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DDDDDD',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tabLabel: { fontFamily: condensed, fontSize: 12, fontWeight: '500' },
  selectedTab: { fontWeight: '700' },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.40)',
  },
  sheet: { maxHeight: '85%', backgroundColor: colors.white },
  sheetTitle: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.ink,
    fontSize: 17,
    fontWeight: '600',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDDDDD',
  },
  sheetAction: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sheetActionText: { color: colors.ink, fontSize: 16, lineHeight: 23 },
  sheetDetails: { paddingHorizontal: 16, paddingVertical: 14 },
  disabledAction: { color: '#999999' },
});






