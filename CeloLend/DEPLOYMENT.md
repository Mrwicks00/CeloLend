# CeloLend Deployment Guide

## Prerequisites

1. **Node.js** (v18+ recommended)
2. **npm** or **yarn**
3. **Alfajores testnet CELO** for deployment
4. **Private key** of deployment wallet

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```bash
# Deployment Configuration
PRIVATE_KEY=your_private_key_here

# Celo Scan API Key for contract verification (optional)
CELOSCAN_API_KEY=your_celoscan_api_key_here

# Self Protocol Configuration (Alfajores)
SELF_HUB_ADDRESS=0x68c931C9a534D37aa78094877F46fE46a49F1A51
SELF_SCOPE_HASH=293608c951e9ebb45305919fb9f347829c571e319c310a40b4b71da9ee79cbf1
SELF_CONFIG_ID=your_config_id_from_tools_self_xyz
```

### 3. Get Alfajores CELO

- Visit [Celo Faucet](https://faucet.celo.org/alfajores)
- Request CELO for your deployment wallet

### 4. Create Self Protocol Configuration

1. Visit [Self Tools](https://tools.self.xyz)
2. Create a new verification configuration:
   - Minimum age: 18 (for lending)
   - Excluded countries: (optional)
   - OFAC screening: Configure as needed
3. Copy the generated `configId` to your `.env` file

## Deployment

### Compile Contracts

```bash
npm run compile
```

### Deploy to Alfajores

```bash
npm run deploy:alfajores
```

The deployment script will:

1. Deploy all contracts in the correct order
2. Configure permissions between contracts
3. Initialize Mento stablecoin support
4. Display deployment addresses

### Verify Contracts (Optional)

After deployment, verify on Alfajores explorer:

```bash
npm run verify:alfajores <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## Deployment Order

The contracts are deployed in this specific order:

1. **PriceOracle** - Price feeds for collateral valuation
2. **MentoIntegration** - Celo stablecoin support
3. **CollateralVault** - Manages loan collateral
4. **CreditScore** - User credit scoring system
5. **CeloLend** - Main lending platform contract

## Post-Deployment

### 1. Contract Configuration

The deployment script automatically:

- Sets CeloLend as the platform in CreditScore
- Sets CeloLend as the platform in CollateralVault
- Initializes supported Mento stablecoins

### 2. Frontend Integration

Update your frontend with the deployed contract addresses:

- CeloLend main contract
- Self Protocol Hub address
- Scope hash for QR code generation

### 3. Testing

1. Create a test loan request
2. Test Self Protocol verification flow
3. Verify Mento stablecoin support

## Network Information

### Alfajores Testnet

- **RPC**: `https://alfajores-forno.celo-testnet.org`
- **Chain ID**: `44787`
- **Explorer**: https://alfajores.celoscan.io
- **Self Hub**: `0x68c931C9a534D37aa78094877F46fE46a49F1A51`

## Troubleshooting

### Common Issues

1. **Insufficient Gas**: Increase gas limit in hardhat.config.ts
2. **Self Config Error**: Ensure you created a valid configuration at tools.self.xyz
3. **Permission Errors**: Check that platform addresses are set correctly
4. **Mento Tokens Not Loading**: Verify MentoIntegration deployment

### Gas Optimization

- Contracts use optimizer (200 runs)
- Typical deployment cost: ~0.1-0.2 CELO

## Contract Addresses (Example)

After deployment, your addresses will look like:

```
PriceOracle:      0x1234...
MentoIntegration: 0x5678...
CollateralVault:  0x9abc...
CreditScore:      0xdef0...
CeloLend:         0x1111...
```

Save these addresses for frontend integration!

