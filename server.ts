import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // PayMongo Payment Intent Route
  app.post('/api/paymongo/create-checkout', async (req, res) => {
    try {
      const { amount, description, orderId } = req.body;
      
      const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
      if (!PAYMONGO_SECRET_KEY) {
        return res.status(500).json({ error: 'PAYMONGO_SECRET_KEY is not configured.' });
      }

      // Convert amount to centavos (PayMongo requirement)
      const amountInCentavos = Math.round(amount * 100);

      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      const baseUrl = `${protocol}://${host}`;

      // We'll create a checkout session (PayMongo Links) for GCash
      const options = {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: `Basic ${Buffer.from(PAYMONGO_SECRET_KEY).toString('base64')}`
        },
        body: JSON.stringify({
          data: {
            attributes: {
              amount: amountInCentavos,
              description: description || `Order ${orderId}`,
              payment_method_types: ['card', 'paymaya', 'gcash', 'grab_pay', 'billease'],
              send_email_receipt: false,
              show_description: true,
              show_line_items: true,
              cancel_url: `${baseUrl}/customer`,
              success_url: `${baseUrl}/customer?payment_success=true&order_id=${orderId}`,
              reference_number: orderId,
              line_items: [
                {
                  currency: 'PHP',
                  amount: amountInCentavos,
                  description: description || 'Refilling Order',
                  name: 'Refilling Service',
                  quantity: 1
                }
              ]
            }
          }
        })
      };

      const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', options);
      const data = await response.json();

      if (data.errors) {
        console.error('PayMongo API Error:', data.errors);
        return res.status(400).json({ error: 'PayMongo Error: ' + JSON.stringify(data.errors) });
      }

      // Return the checkout URL to the frontend
      res.json({ checkoutUrl: data.data.attributes.checkout_url, sessionId: data.data.id });
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Real-time server store endpoints with disk persistence for cross-device sync
  const DATA_FILE = path.join(process.cwd(), 'data', 'store.json');

  function loadStore(): Record<string, any> {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const content = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(content);
      }
    } catch (e) {
      console.error('Error loading store file:', e);
    }
    return {};
  }

  function saveStore(store: Record<string, any>) {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving store file:', e);
    }
  }

  let persistentStore = loadStore();

  const sseClients = new Set<express.Response>();

  app.get('/api/sync/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    persistentStore = loadStore();
    res.write(`data: ${JSON.stringify({ type: 'init', data: persistentStore })}\n\n`);
    sseClients.add(res);

    const keepAlive = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch (e) {
        clearInterval(keepAlive);
        sseClients.delete(res);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
  });

  function broadcastChange(type: string, data: any) {
    const message = `data: ${JSON.stringify({ type, data, time: Date.now() })}\n\n`;
    for (const client of Array.from(sseClients)) {
      try {
        client.write(message);
      } catch (e) {
        sseClients.delete(client);
      }
    }
  }

  app.get('/api/store', (req, res) => {
    persistentStore = loadStore();
    res.json({ store: persistentStore });
  });

  app.get('/api/store/:key', (req, res) => {
    const key = req.params.key;
    persistentStore = loadStore();
    res.json({ value: persistentStore[key] || null });
  });

  app.post('/api/store/:key', (req, res) => {
    const key = req.params.key;
    const { value } = req.body;
    persistentStore = loadStore();

    if (key === 'orders' && Array.isArray(value)) {
      const orderMap = new Map();
      for (const o of (persistentStore.orders || [])) {
        if (o && o.id) orderMap.set(o.id, o);
      }
      for (const o of value) {
        if (o && o.id) {
          const prev = orderMap.get(o.id);
          orderMap.set(o.id, prev ? { ...prev, ...o } : o);
        }
      }
      persistentStore.orders = Array.from(orderMap.values()).sort((a: any, b: any) => (b.date || 0) - (a.date || 0));
    } else if (key === 'customers' && Array.isArray(value)) {
      const custMap = new Map();
      for (const c of (persistentStore.customers || [])) {
        if (c && c.id) custMap.set(c.id, c);
      }
      for (const c of value) {
        if (c && c.id) {
          const prev = custMap.get(c.id);
          custMap.set(c.id, prev ? { ...prev, ...c } : c);
        }
      }
      persistentStore.customers = Array.from(custMap.values());
    } else {
      persistentStore[key] = value;
    }

    saveStore(persistentStore);
    broadcastChange(key, persistentStore[key]);
    res.json({ success: true, data: persistentStore[key] });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
