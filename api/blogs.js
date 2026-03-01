const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // --- GET ALL BLOG POSTS (Public) ---
    if (req.method === 'GET') {
        try {
            const { rows } = await sql`SELECT * FROM blogs ORDER BY date DESC`;
            return res.status(200).json({ blogs: rows });
        } catch (error) {
            // Handle table not existing
            if (error.message.includes('relation "blogs" does not exist')) {
                return res.status(200).json({ blogs: [] });
            }
            console.error('Error fetching blogs:', error);
            return res.status(500).json({ error: 'Failed to fetch blogs' });
        }
    }

    // --- Authentication for POST/DELETE (Protected Dashboard features) ---
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET || 'dev_secret_key'}`) {
        return res.status(401).json({ error: 'Unauthorized to modify blogs' });
    }

    // --- CREATE/UPDATE BLOG (Protected) ---
    if (req.method === 'POST') {
        const { title, date, content } = req.body;

        if (!title || !date || !content) {
            return res.status(400).json({ error: 'Title, date, and content are required' });
        }

        try {
            await sql`
                INSERT INTO blogs (title, date, content)
                VALUES (${title}, ${date}, ${content})
            `;
            return res.status(200).json({ success: true });
        } catch (error) {
            // Handle table not existing
            if (error.message.includes('relation "blogs" does not exist')) {
                try {
                    await sql`
                         CREATE TABLE blogs (
                             id SERIAL PRIMARY KEY,
                             title VARCHAR(255) NOT NULL,
                             date DATE NOT NULL,
                             content TEXT NOT NULL
                         );
                     `;
                    // Retry insert
                    await sql`
                        INSERT INTO blogs (title, date, content)
                        VALUES (${title}, ${date}, ${content})
                    `;
                    return res.status(200).json({ success: true });
                } catch (innerError) {
                    console.error('Failed to create blogs table:', innerError);
                    return res.status(500).json({ error: 'Internal Server Error' });
                }
            }
            console.error('Error creating blog:', error);
            return res.status(500).json({ error: 'Failed to create blog post' });
        }
    }

    // --- DELETE BLOG (Protected) ---
    else if (req.method === 'DELETE') {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'Blog ID required' });

        try {
            await sql`DELETE FROM blogs WHERE id = ${id}`;
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error deleting blog:', error);
            return res.status(500).json({ error: 'Failed to delete blog post' });
        }
    }

    else {
        res.setHeader('Allow', ['GET', 'POST', 'DELETE', 'OPTIONS']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
