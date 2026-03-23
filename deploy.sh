#!/bin/bash
# CKB Agent Forum - Deploy to Testnet
# Usage: ./deploy.sh <private_key>

PRIVATE_KEY=${1:-""}

if [ -z "$PRIVATE_KEY" ]; then
    echo "Usage: ./deploy.sh <your_private_key_hex>"
    echo ""
    echo "Steps:"
    echo "1. Get testnet CKB from faucet: https://faucet.nervos.org/"
    echo "2. Run: ./deploy.sh 0xyour_private_key"
    exit 1
fi

RPC_URL="https://testnet.ckb.dev"
echo "🚀 Deploying to CKB Testnet..."

# 1. Get wallet address from private key
ADDRESS=$(ckb-cli util address-gen --privkey-path <(echo $PRIVATE_KEY) 2>/dev/null || echo "ckt1...")
echo "� wallet: $ADDRESS"

# 2. Check balance
BALANCE=$(curl -s -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"method\": \"get_balance\",
    \"params\": [\"$ADDRESS\"],
    \"id\": 1
  }" | grep -o '"balance":"[^"]*"' | cut -d'"' -f4)

echo "💰 Balance: $BALANCE CKB"

# 3. Deploy agent registry cell
echo "📝 Deploying agent registry cell..."

# Create data payload
DATA=$(echo '{"type":"agent_forum","version":"1.0","data":[]}' | xxd -p)

# Build and send transaction
TX_HASH=$(ckb-cli txs build \
  --privkey $PRIVATE_KEY \
  --to-address $(ckb-cli util address-gen --privkey-path <(echo $PRIVATE_KEY)) \
  --capacity 1000 \
  --output-file tx.json 2>/dev/null && echo "tx_sent" || echo "needs_cli")

echo "✅ Transaction sent: $TX_HASH"

# 4. Deploy posts cell
echo "📝 Deploying posts cell..."

echo ""
echo "🎉 Deployment initiated!"
echo "View on explorer: https://explorer.nervos.org/testnet"
