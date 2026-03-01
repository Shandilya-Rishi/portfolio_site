const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
    // Enable CORS for development and specific domains
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this in production
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
            await sql`
                INSERT INTO contacts (name, email, message, created_at)
                VALUES (${name}, ${email}, ${message}, NOW())
            `;
            return res.status(200).json({ success: true, message: 'Message sent successfully!' });
        } catch (error) {
            console.error('Failed to submit contact form:', error);
            // Handle table not existing (first run)
            if (error.message.includes('relation "contacts" does not exist')) {
                try {
                    await sql`
                         CREATE TABLE contacts (
                             id SERIAL PRIMARY KEY,
                             name VARCHAR(255) NOT NULL,
                             email VARCHAR(255) NOT NULL,
                             message TEXT NOT NULL,
                             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                         );
                     `;
                    await sql`
                        INSERT INTO contacts (name, email, message, created_at)
                        VALUES (${name}, ${email}, ${message}, NOW())
                    `;
                    return res.status(200).json({ success: true, message: 'Message sent successfully (Table auto-created)!' });
                } catch (innerError) {
                    console.error('Failed to create table and insert:', innerError);
                    return res.status(500).json({ error: 'Internal Server Error after creating table' });
                }
            }
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    } else if (req.method === 'GET') {
        // This GET route is for the dashboard to fetch messages
        // In a real app, protect this with authentication!

        const authHeader = req.headers.authorization;
        // Extremely basic auth for this demo dashboard
        if (authHeader !== `Bearer ${process.env.ADMIN_SECRET || 'dev_secret_key'}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        try {
            // Check if table exists first by querying it, catch error if not
            const { rows } = await sql`SELECT * FROM contacts ORDER BY created_at DESC`;
            return res.status(200).json({ messages: rows });
        } catch (error) {
            if (error.message.includes('relation "contacts" does not exist')) {
                return res.status(200).json({ messages: [] }); // No table = no messages yet
            }
            return res.status(500).json({ error: 'Failed to fetch messages' });
        }
    } else {
        res.setHeader('Allow', ['POST', 'GET', 'OPTIONS']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
