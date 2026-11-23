import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { DemoOrder } from './OrderScreen';
import SidebarMenu from './SidebarMenu';

const blue = '#087CF1';
const lossRed = '#D53928';

export type DemoPosition = DemoOrder & {
  id: number;
  bid: string;
  ask: string;
};

type Props = {
  balance: number;
  positions: readonly DemoPosition[];
  onNewOrder: () => void;
  onClosePosition: (id: number, profit: number) => void;
};

function money(amount: number) {
  const rounded = Math.round(amount * 100) / 100;
  const [whole, cents] = Math.abs(rounded).toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${rounded < 0 ? '-' : ''}${grouped}.${cents}`;
}

function markPosition(position: DemoPosition) {
  const isBuy = position.side === 'buy';
  const mark = isBuy ? position.bid : position.ask;
  const currentPrice = Number(mark);
  const instrument = position.symbol.split('.')[0];
  const unitsPerLot = instrument === 'XAUUSD' ? 100 : 100_000;
  const move = currentPrice - Number(position.price);
  const quoteCurrencyProfit =
    move * (isBuy ? 1 : -1) * position.lots * unitsPerLot;

  // Convert the demo USD-base currency pairs' P/L back to USD.
  const profit = instrument.startsWith('USD')
    ? quoteCurrencyProfit / currentPrice
    : quoteCurrencyProfit;

  return { ...position, mark, profit };
}

function AccountMetric({ label, value }: { label: string; value: number }) {
  return (
    <View
      style={styles.metric}
      accessible
      accessibilityLabel={`${label} ${money(value)} USD`}
    >
      <Text style={styles.metricLabel}>{label}:</Text>
      <View style={styles.leaderTrack} importantForAccessibility="no">
        <Text style={styles.leader} numberOfLines={1} ellipsizeMode="clip">
          {'· '.repeat(100)}
        </Text>
      </View>
      <Text style={styles.metricValue}>{money(value)}</Text>
    </View>
  );
}

export default function TradeScreen({
  balance,
  positions,
  onNewOrder,
  onClosePosition,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newestFirst, setNewestFirst] = useState(true);

  const markedPositions = positions.map(markPosition);
  const rows = newestFirst ? markedPositions : [...markedPositions].reverse();
  const totalProfit = markedPositions.reduce((total, row) => total + row.profit, 0);
  const equity = balance + totalProfit;
  const hasPositions = rows.length > 0;
  const toolbarColor = totalProfit < -0.005 ? '#DF5448' : blue;

  function confirmClose(position: ReturnType<typeof markPosition>) {
    Alert.alert(
      'Close demo position?',
      `${position.symbol}, ${position.side} ${position.lots.toFixed(2)}\n` +
        `Close price: ${position.mark}\n` +
        `P/L: ${money(position.profit)} USD`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close position',
          onPress: () => onClosePosition(position.id, position.profit),
        },
      ],
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.toolbar, { backgroundColor: toolbarColor }]}>
        <Pressable
          style={styles.toolbarButton}
          onPress={() => setSidebarOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open sidebar"
        >
          <Ionicons name="menu-outline" size={25} color="#FFFFFF" />
        </Pressable>

        <View style={styles.heading}>
          <Text style={styles.title} accessibilityRole="header">Trade</Text>
          {hasPositions && (
            <Text style={styles.totalProfit}>{money(totalProfit)} USD</Text>
          )}
        </View>

        <Pressable
          style={styles.toolbarButton}
          onPress={() => setNewestFirst((current) => !current)}
          accessibilityRole="button"
          accessibilityLabel={newestFirst ? 'Sort oldest first' : 'Sort newest first'}
        >
          <Ionicons name="swap-vertical-outline" size={24} color="#FFFFFF" />
        </Pressable>

        <Pressable
          style={styles.toolbarButton}
          onPress={onNewOrder}
          accessibilityRole="button"
          accessibilityLabel="New demo order"
        >
          <Ionicons name="document-outline" size={24} color="#FFFFFF" />
          <View style={styles.plusBadge} pointerEvents="none">
            <Ionicons name="add" size={11} color="#FFFFFF" />
          </View>
        </Pressable>
      </View>

      <View style={styles.summary}>
        <AccountMetric label="Balance" value={balance} />
        <AccountMetric label="Equity" value={equity} />
        <AccountMetric label="Free margin" value={equity} />
      </View>

      {hasPositions && (
        <>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Positions
          </Text>

          <FlatList
            style={styles.list}
            data={rows}
            keyExtractor={(row) => String(row.id)}
            renderItem={({ item }) => {
              const sideColor = item.side === 'buy' ? blue : lossRed;
              const profitColor = item.profit < -0.005 ? lossRed : blue;

              return (
                <Pressable
                  style={styles.positionRow}
                  onPress={() => confirmClose(item)}
                  accessibilityRole="button"
                  accessibilityHint="Opens the close position confirmation"
                >
                  <View style={styles.positionDetails}>
                    <Text style={styles.positionTitle}>
                      {item.symbol},{' '}
                      <Text style={{ color: sideColor }}>
                        {item.side} {item.lots.toFixed(2)}
                      </Text>
                    </Text>
                    <Text style={styles.positionPrices}>
                      {item.price} → {item.mark}
                    </Text>
                  </View>
                  <Text style={[styles.positionProfit, { color: profitColor }]}>
                    {money(item.profit)}
                  </Text>
                </Pressable>
              );
            }}
          />
        </>
      )}

      {sidebarOpen && (
        <SidebarMenu onClose={() => setSidebarOpen(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  toolbar: { minHeight: 54, flexDirection: 'row', alignItems: 'center' },
  toolbarButton: {
    width: 50,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBadge: { position: 'absolute', top: 20, left: 20 },
  heading: { flex: 1, paddingVertical: 4 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  totalProfit: { color: '#FFFFFF', fontSize: 14 },
  summary: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#CCCCCC',
  },
  metric: { minHeight: 26, flexDirection: 'row', alignItems: 'center' },
  metricLabel: { color: '#444444', fontSize: 14, fontWeight: '700' },
  leaderTrack: { flex: 1, minWidth: 0, marginHorizontal: 8, overflow: 'hidden' },
  leader: { color: '#AAAAAA', fontSize: 14 },
  metricValue: {
    color: blue,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sectionTitle: {
    backgroundColor: '#F5F5F5',
    color: '#626262',
    paddingHorizontal: 14,
    paddingVertical: 5,
    fontSize: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#CCCCCC',
  },
  list: { flex: 1 },
  positionRow: {
    minHeight: 49,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#CCCCCC',
  },
  positionDetails: { flex: 1 },
  positionTitle: { color: '#252525', fontSize: 15, fontWeight: '600' },
  positionPrices: { color: '#626262', fontSize: 12, marginTop: 2 },
  positionProfit: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});