# TradingMobile

TradingMobile is a mobile trading demo built with React Native, Expo, and TypeScript. It lets users browse currency quotes, explore candlestick charts, and practice opening and closing trades with virtual funds. All prices, balances, and order executions are simulated.

## Features

- **Quotes** — Browse instruments, view bid and ask prices, and add, remove, or reorder symbols in the watchlist.
- **Charts** — Open candlestick charts, change the timeframe with the radial menu, inspect prices with the crosshair, and explore indicators and chart windows.
- **Demo orders** — Choose Buy or Sell, enter a trade size, and submit a simulated market order.
- **Trade and History** — Monitor open positions and their estimated profit or loss, close a position, and review the result in History.
- **Messages and Accounts** — Explore the Messages screen, Register and Sign In demo forms, and account tools in the sidebar.

## Tech stack

- React Native for the mobile UI
- Expo for development and Android preview
- TypeScript for application code
- React Native SVG for chart rendering

## Run on Android

You’ll need Node.js, npm, and a compatible version of Expo Go on your Android device.

From the project folder, run:

```bash
npm ci
npm start
```

On Windows PowerShell, use `npm.cmd ci` and `npm.cmd start` if PowerShell blocks the npm script.

Connect your phone and computer to the same Wi-Fi network. Open Expo Go on your phone and scan the QR code displayed in the terminal.

## Try the trading workflow

1. Open **Quotes** and select **EUR/USD**.
2. Open its chart and use the timeframe menu to change the chart interval.
3. Open **New Order**, choose **Buy** or **Sell**, enter a trade size, and submit the demo order.
4. Open **Trade** to see the position and its estimated profit or loss.
5. Close the position and open **History** to review the result.

## Project structure

| Path | Purpose |
|---|---|
| `App.tsx` | App shell, screen navigation, and shared demo account state |
| `index.ts` | App entry point |
| `src/screens/` | Quotes, charts, order entry, trade, history, messages, accounts, authentication forms, and sidebar |
| `assets/` | App icons and screen images |
| `app.json` | Expo app configuration |

## Demo scope

The app runs as a simulated trading experience. Registration and sign-in demonstrate the interface and validation. Live market data, broker execution, and server-backed authentication require additional integrations.
