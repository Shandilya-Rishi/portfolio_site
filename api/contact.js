const { get } = require('@vercel/edge-config');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'POST') {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Name, email, and message are required.' });
        }

        try {
            // Read existing messages from Edge Config
            let messages = await get('messages') || [];

            const newMessage = {
                id: Date.now(),
                name,
                email,
                message,
                created_at: new Date().toISOString()
            };

            messages.push(newMessage);

            // Edge Configs cannot be updated directly via the SDK. We must use the Vercel REST API.
            // Requires VERCEL_API_TOKEN environment variable.
            const updateRes = await fetch(`https://api.vercel.com/v1/edge-config/${process.env.EDGE_CONFIG_ID}/items`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items: [
                        {
                            operation: 'upsert',
                            key: 'messages',
                            value: messages,
                        },
                    ],
                }),
            });

            if (!updateRes.ok) throw new Error('Failed to update Edge Config via Vercel API');

            return res.status(200).json({ success: true, message: 'Message sent successfully!' });
        } catch (error) {
            console.error('Failed to submit contact form:', error);
            return res.status(500).json({ error: 'Failed to save to Edge Config. Note: VERCEL_API_TOKEN and EDGE_CONFIG_ID env vars must be set.' });
        }
    }

    else if (req.method === 'GET') {
        const authHeader = req.headers.authorization;
        if (authHeader !== `Bearer ${process.env.ADMIN_SECRET || 'dev_secret_key'}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        try {
            const messages = await get('messages') || [];
            // Return newest first
            return res.status(200).json({ messages: messages.reverse() });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to fetch messages from Edge Config' });
        }
    }

    else {
        res.setHeader('Allow', ['POST', 'GET', 'OPTIONS']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
