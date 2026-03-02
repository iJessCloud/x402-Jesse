import dotenv from 'dotenv';
import axios from 'axios';
import { Wallet } from 'ethers';
import { privateKeyToAccount } from 'viem/accounts';
import { withPaymentInterceptor } from 'x402-axios';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const BASE_URL = process.env.MARKET_DATA_URL ?? 'http://localhost:3001';
const NETWORK = process.env.X402_NETWORK ?? 'base';

if (!PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY is required to initialize the payment wallet.');
}

const signingWallet = new Wallet(PRIVATE_KEY);
const account = privateKeyToAccount(PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`);

function createPaidHttpClient() {
  const baseClient = axios.create({ baseURL: BASE_URL, timeout: 20_000 });
  return withPaymentInterceptor(baseClient, account);
}

const mcpServer = new McpServer({ name: 'x402-agent-client', version: '1.0.0' });

mcpServer.registerTool(
  'buy_market_data',
  {
    title: 'Buy market data',
    description: 'Purchases premium market data protected by HTTP 402 for 0.05 USDC.',
    inputSchema: { ticker: { type: 'string', description: 'Ticker symbol such as BTC, ETH, or AAPL.' } }
  },
  async ({ ticker }) => {
    const paidClient = createPaidHttpClient();
    const response = await paidClient.get(`/premium/market-data/${encodeURIComponent(ticker)}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            purchased: true,
            network: NETWORK,
            amountUsdc: 0.05,
            ticker,
            data: response.data,
            buyerWallet: signingWallet.address
          }, null, 2)
        }
      ]
    };
  }
);

const transport = new StdioServerTransport();
await mcpServer.connect(transport);
