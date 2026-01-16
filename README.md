# OCTWA DEX

Intent-based DEX for OCT ⇄ ETH swaps. Preview version using Sepolia testnet.

## Features

- Bidirectional swaps: OCT → ETH and ETH → OCT
- Real-time quotes with dynamic oracle pricing
- Swap history tracking
- Public explorer for all transactions
- Liquidity monitoring
- Sepolia testnet support (configurable for mainnet)

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

## Configuration

Create `.env` file:

```env
# Intents API Backend
VITE_INTENTS_API_URL=http://localhost:3001

# Block Explorers
VITE_OCTRA_EXPLORER=https://octrascan.io
VITE_SEPOLIA_EXPLORER=https://sepolia.etherscan.io

# Network Label (empty for mainnet)
VITE_ETH_NETWORK_LABEL=Sepolia

# Etherscan API Key (for tx status)
VITE_ETHERSCAN_API_KEY=your_api_key
```

## Pages

### Swap (`/`)
Main swap interface:
- Connect wallet
- Authorize DEX
- Toggle OCT → ETH or ETH → OCT
- Enter amount, view quote
- Execute swap with real-time status

### Explorer (`/explorer`)
Public transaction explorer:
- View all swaps
- Filter by status/direction
- Pagination
- Transaction links to block explorers

## Swap Flow

### OCT → ETH
1. Connect Octra wallet
2. Authorize DEX (grants capability)
3. Enter OCT amount
4. Review quote and rate
5. Click Swap
6. Sign intent in wallet
7. Send OCT to escrow
8. Wait for ETH delivery

### ETH → OCT
1. Connect Octra wallet
2. Authorize DEX
3. Switch to ETH → OCT
4. Enter ETH amount
5. Review quote
6. Click Swap
7. Sign intent
8. Send ETH to escrow (with intent in tx.data)
9. Wait for OCT delivery

## Components

```
src/
├── pages/
│   ├── SwapPage.tsx      # Main swap UI
│   └── ExplorerPage.tsx  # Public explorer
├── components/
│   ├── Layout.tsx        # App layout with header
│   ├── Panel.tsx         # Card component
│   ├── Button.tsx        # Button with loading state
│   └── StatusBadge.tsx   # Status indicator
├── sdk/
│   ├── octra.ts          # Wallet SDK wrapper
│   └── intents.ts        # Intents API client
├── store/
│   └── index.ts          # Zustand store
├── config/
│   └── index.ts          # App configuration
└── types/
    └── intent.ts         # TypeScript types
```

## SDK Integration

Uses `@octwa/sdk` for wallet integration:

```typescript
import { initSDK, connect, requestCapability, invoke } from '../sdk/octra';

// Initialize
await initSDK();

// Connect
const connection = await connect('swap_intent_v1');

// Request capability
const capability = await requestCapability({
  methods: ['get_balance', 'sign_intent', 'send_transaction', 'send_evm_transaction'],
  scope: 'write',
  encrypted: false,
  ttlSeconds: 7200,
});

// Invoke
const result = await invoke({
  capabilityId: capability.id,
  method: 'get_balance',
});
```

## Intents API Client

```typescript
import { getQuote, submitIntent, waitForFulfillment } from '../sdk/intents';

// Get quote
const quote = await getQuote(100); // 100 OCT

// Submit after sending to escrow
const result = await submitIntent(octraTxHash);

// Wait for completion
const status = await waitForFulfillment(result.intentId);
```

## Development

```bash
# Development server
npm run dev

# Build
npm run build

# Preview production build
npm run preview
```

## Requirements

- Node.js 18+
- Octra Wallet extension installed
- Running `intents-api` backend

## Mainnet Migration

To switch from Sepolia to mainnet:

1. Update `.env`:
```env
VITE_ETH_NETWORK_LABEL=
VITE_SEPOLIA_EXPLORER=https://etherscan.io
```

2. Update `intents-api` configuration with mainnet RPC and escrow addresses

## License

MIT
