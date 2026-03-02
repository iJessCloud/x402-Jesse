import dotenv from 'dotenv';
import axios, { type AxiosInstance } from 'axios';
import { Wallet } from 'ethers';
import { privateKeyToAccount } from 'viem/accounts';
import { withPaymentInterceptor } from 'x402-axios';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

dotenv.config();

type MarketDataResponse = {
  ticker: string;
  network: string;
  paid: boolean;
  amountUsdc: number;
  snapshot: {
    price: number;
    currency: string;
    source: string;
  };
  generatedAt: string;
};

const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY;
const BASE_URL = process.env.MARKET_DATA_URL ?? 'http://localhost:3001';
const NETWORK = process.env.X402_NETWORK ?? 'base';

if (!AGENT_PRIVATE_KEY) {
  throw new Error('AGENT_PRIVATE_KEY is required to initialize the payment wallet.');
}

const normalizedPrivateKey = (AGENT_PRIVATE_KEY.startsWith('0x')
  ? AGENT_PRIVATE_KEY
  : `0x${AGENT_PRIVATE_KEY}`) as `0x${string}`;

const signingWallet = new Wallet(normalizedPrivateKey);
const account = privateKeyToAccount(normalizedPrivateKey);

function createPaidHttpClient(): AxiosInstance {
  const baseClient = axios.create({ baseURL: BASE_URL, timeout: 20_000 });
  return withPaymentInterceptor(baseClient, account);
}

const mcpServer = new McpServer({ name: 'x402-agent-client', version: '1.0.0' });

const buyMarketDataInput = z.object({
  ticker: z.string().min(1).describe('Ticker symbol such as BTC, ETH, or AAPL.')
});

mcpServer.registerTool(
  'buy_market_data',
  {
    title: 'Buy market data',
    description: 'Purchases premium market data protected by HTTP 402 for 0.05 USDC.',
    inputSchema: buyMarketDataInput
  },
  async ({ ticker }) => {
    const paidClient = createPaidHttpClient();
    const response = await paidClient.get<MarketDataResponse>(
      `/premium/market-data/${encodeURIComponent(ticker)}`
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              purchased: true,
              network: NETWORK,
              amountUsdc: 0.05,
              ticker,
              data: response.data,
              buyerWallet: signingWallet.address
            },
            null,
            2
          )
        }
      ]
    };
  }
);

const transport = new StdioServerTransport();
await mcpServer.connect(transport);
