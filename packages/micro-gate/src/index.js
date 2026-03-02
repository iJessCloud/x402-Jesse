import express from 'express';
import dotenv from 'dotenv';
import { paymentMiddleware } from 'x402-express';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT ?? 3001);
const PAY_TO = process.env.PAY_TO_ADDRESS ?? '0x0000000000000000000000000000000000000000';

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'micro-gate', network: 'base', amount: '0.05' });
});

app.get(
  '/premium/market-data/:ticker',
  paymentMiddleware(PAY_TO, {
    '/premium/market-data/*': {
      price: '$0.05',
      network: 'base',
      config: {
        description: 'Premium market data via x402 paywall'
      }
    }
  }),
  (req, res) => {
    const ticker = req.params.ticker.toUpperCase();
    const quote = Number((Math.random() * 1000 + 10).toFixed(2));

    res.json({
      ticker,
      network: 'base',
      paid: true,
      amountUsdc: 0.05,
      snapshot: {
        price: quote,
        currency: 'USD',
        source: 'x402 Autonomous Commerce Suite'
      },
      generatedAt: new Date().toISOString()
    });
  }
);

app.listen(PORT, () => {
  console.log(`micro-gate listening on port ${PORT}`);
});
