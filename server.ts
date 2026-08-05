import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

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
              payment_method_types: ['gcash', 'paymaya', 'grab_pay', 'qrph'],
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
        return res.status(400).json({ error: data.errors[0].detail });
      }

      // Return the checkout URL to the frontend
      res.json({ checkoutUrl: data.data.attributes.checkout_url, sessionId: data.data.id });
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
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
