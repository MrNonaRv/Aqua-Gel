import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers for Vercel
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { amount, description, orderId } = req.body;
    
    const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
    if (!PAYMONGO_SECRET_KEY) {
      return res.status(500).json({ error: 'PAYMONGO_SECRET_KEY is not configured.' });
    }

    // Convert amount to centavos
    const amountInCentavos = Math.round(amount * 100);

    const host = req.headers.host || 'localhost:3000';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${protocol}://${host}`;

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

    res.status(200).json({ checkoutUrl: data.data.attributes.checkout_url, sessionId: data.data.id });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
