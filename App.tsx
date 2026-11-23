import { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AccountAuthScreen, { type AuthMode } from './src/screens/AccountAuthScreen';
import ChartScreen from './src/screens/ChartScreen';
import HistoryScreen, { type HistoryTrade } from './src/screens/HistoryScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import OrderScreen, { type DemoOrder } from './src/screens/OrderScreen';
import QuotesScreen, {
  BottomTabs,
  quotes,
  type SymbolQuote,
} from './src/screens/QuotesScreen';
import SidebarMenu, { SidebarTabsContext } from './src/screens/SidebarMenu';
import TradeScreen, { type DemoPosition } from './src/screens/TradeScreen';

type Tab = 'Quotes' | 'Charts' | 'Trade' | 'History' | 'Messages';
type OrderOrigin = 'Quotes' | 'Charts' | 'Trade';
type Screen = Tab | 'Order' | AuthMode;

type DemoAccount = {
  balance: number;
  positions: DemoPosition[];
  history: HistoryTrade[];
};

const DEMO_DEPOSIT = 5000;

const initialQuote: SymbolQuote = {
  symbol: 'NZDUSD.x',
  bid: '0.54782',
  ask: '0.54789',
};

export default function App() {
  const [screen, setScreen] = useState<Screen>('Quotes');
  const [chartQuote, setChartQuote] = useState(initialQuote);
  const [orderQuote, setOrderQuote] = useState(initialQuote);
  const [orderOrigin, setOrderOrigin] = useState<OrderOrigin>('Quotes');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [simple, setSimple] = useState(false);
  const [depositedAt] = useState(Date.now);
  const [account, setAccount] = useState<DemoAccount>({
    balance: DEMO_DEPOSIT,
    positions: [],
    history: [],
  });
  const nextPositionId = useRef(1);

  const authMode =
    screen === 'Register' || screen === 'SignIn' ? screen : null;

  useEffect(() => {
    if (screen === 'Quotes') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sidebarOpen) {
        setSidebarOpen(false);
      } else if (screen === 'Order') {
        setScreen(orderOrigin);
      } else {
        setScreen(authMode ? 'Messages' : 'Quotes');
      }

      return true;
    });

    return () => subscription.remove();
  }, [screen, orderOrigin, sidebarOpen, authMode]);

  function changeTab(tab: Tab) {
    setSidebarOpen(false);
    setScreen(tab);
  }

  function renderSidebarTabs(closeSidebar: () => void) {
    if (screen === 'Order' || screen === 'Register' || screen === 'SignIn') {
      return null;
    }

    return (
      <BottomTabs
        active={null}
        onChange={(tab) => {
          closeSidebar();
          changeTab(tab);
        }}
      />
    );
  }
  
  function renderSidebarTabs(closeSidebar: () => void) {
    if (screen === 'Order' || screen === 'Register' || screen === 'SignIn') {
      return null;
    }

    return (
      <BottomTabs
        active={null}
        onChange={(tab) => {
          closeSidebar();
          changeTab(tab);
        }}
      />
    );
  }

  function openAuth(mode: AuthMode) {
    setSidebarOpen(false);
    setScreen(mode);
  }

  function openOrder(quote: SymbolQuote, origin: OrderOrigin) {
    setSidebarOpen(false);
    setOrderQuote(quote);
    setOrderOrigin(origin);
    setScreen('Order');
  }

  function openChartOrder(symbol: string) {
    const quote =
      symbol === chartQuote.symbol
        ? chartQuote
        : quotes.find((item) => item.symbol === symbol);

    if (!quote) {
      Alert.alert('Quote unavailable', `There is no demo bid and ask for ${symbol}.`);
      return;
    }

    openOrder(quote, 'Charts');
  }

  function submitDemoOrder(order: DemoOrder) {
    const position: DemoPosition = {
      ...order,
      id: nextPositionId.current++,
      bid: orderQuote.bid,
      ask: orderQuote.ask,
    };

    const trade: HistoryTrade = {
      id: position.id,
      symbol: order.symbol,
      side: order.side,
      lots: order.lots,
      price: order.price,
      openedAt: Date.now(),
    };

    setAccount((current) => ({
      ...current,
      positions: [position, ...current.positions],
      history: [trade, ...current.history],
    }));

    const side = order.side === 'buy' ? 'Buy' : 'Sell';

    Alert.alert(
      'Demo order filled',
      `${side} ${order.lots.toFixed(2)} ${order.symbol} at ${order.price}`,
      [{ text: 'OK', onPress: () => changeTab('Trade') }],
      { cancelable: false },
    );
  }

  function closePosition(id: number, profit: number) {
    if (!Number.isFinite(profit)) {
      Alert.alert('Position could not close', 'The demo price is unavailable.');
      return;
    }

    const time = Date.now();
    const realizedProfit = Math.round(profit * 100) / 100;

    setAccount((current) => {
      const position = current.positions.find((item) => item.id === id);
      if (!position) return current;

      const price = position.side === 'buy' ? position.bid : position.ask;

      return {
        balance: Math.round((current.balance + realizedProfit) * 100) / 100,
        positions: current.positions.filter((item) => item.id !== id),
        history: current.history.map((trade) =>
          trade.id === id
            ? { ...trade, closed: { time, price, profit: realizedProfit } }
            : trade,
        ),
      };
    });
  }

  const keepChartMounted =
    screen === 'Charts' || (screen === 'Order' && orderOrigin === 'Charts');

  return (
    <SafeAreaProvider>
      <SidebarTabsContext.Provider
  value={{
    renderTabs: renderSidebarTabs,
    openTrade: () => changeTab('Trade'),
  }}
>
        <SafeAreaView style={[styles.app, authMode && styles.authSafeArea]}>
          <StatusBar style="light" />

          {screen === 'Quotes' && (
            <QuotesScreen
              positions={account.positions}
              simple={simple}
              onToggleView={() => setSimple((current) => !current)}
              onOpenChart={(quote) => {
                setChartQuote(quote);
                changeTab('Charts');
              }}
              onNewOrder={(quote) => openOrder(quote, 'Quotes')}
            />
          )}

          {keepChartMounted && (
            <View style={screen === 'Charts' ? styles.chart : styles.hidden}>
              <ChartScreen
                symbol={chartQuote.symbol}
                bid={chartQuote.bid}
                onBack={() => changeTab('Quotes')}
                onOpenMenu={() => setSidebarOpen(true)}
                onNewOrder={openChartOrder}
              />
            </View>
          )}

          {screen === 'Order' && (
            <OrderScreen
              quote={orderQuote}
              onBack={() => changeTab(orderOrigin)}
              onSubmit={submitDemoOrder}
            />
          )}

          {screen === 'Trade' && (
            <TradeScreen
              balance={account.balance}
              positions={account.positions}
              onNewOrder={() => openOrder(orderQuote, 'Trade')}
              onClosePosition={closePosition}
            />
          )}

          {screen === 'History' && (
            <HistoryScreen
              trades={account.history}
              deposit={DEMO_DEPOSIT}
              depositedAt={depositedAt}
              balance={account.balance}
              onOpenMenu={() => setSidebarOpen(true)}
            />
          )}

          {screen === 'Messages' && (
            <MessagesScreen
              onOpenMenu={() => setSidebarOpen(true)}
              onRegister={() => openAuth('Register')}
              onSignIn={() => openAuth('SignIn')}
            />
          )}

          {authMode && (
            <AccountAuthScreen
              mode={authMode}
              onBack={() => changeTab('Messages')}
              onSwitch={openAuth}
            />
          )}

          {screen !== 'Order' && screen !== 'Register' && screen !== 'SignIn' && (
            <BottomTabs active={screen} onChange={changeTab} />
          )}

          {sidebarOpen &&
            (screen === 'Charts' ||
              screen === 'History' ||
              screen === 'Messages') && (
              <SidebarMenu onClose={() => setSidebarOpen(false)} />
            )}
        </SafeAreaView>
      </SidebarTabsContext.Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#087CF1' },
  authSafeArea: { backgroundColor: '#456DA7' },
  chart: { flex: 1 },
  hidden: { display: 'none' },
});