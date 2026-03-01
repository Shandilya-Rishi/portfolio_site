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

    // --- GET ALL PROJECTS (Public) ---
    if (req.method === 'GET') {
        try {
            const { rows } = await sql`SELECT * FROM projects ORDER BY created_at DESC`;
            return res.status(200).json({ projects: rows });
        } catch (error) {
            // Handle table not existing yet (first run)
            if (error.message.includes('relation "projects" does not exist')) {
                return res.status(200).json({ projects: [] });
            }
            console.error('Error fetching projects:', error);
            return res.status(500).json({ error: 'Failed to fetch projects' });
        }
    }

    // --- Authentication for POST/DELETE (Protected Dashboard features) ---
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET || 'dev_secret_key'}`) {
        return res.status(401).json({ error: 'Unauthorized to modify projects' });
    }

    // --- CREATE/UPDATE PROJECT (Protected) ---
    if (req.method === 'POST') {
        const { title, description, link, language, images } = req.body;

        if (!title || !description) {
            return res.status(400).json({ error: 'Title and description are required' });
        }

        try {
            await sql`
                INSERT INTO projects (title, description, link, language, images, created_at)
                VALUES (${title}, ${description}, ${link || ''}, ${language || ''}, ${JSON.stringify(images || [])}, NOW())
            `;
            return res.status(200).json({ success: true });
        } catch (error) {
            // Handle table not existing
            if (error.message.includes('relation "projects" does not exist')) {
                try {
                    await sql`
                         CREATE TABLE projects (
                             id SERIAL PRIMARY KEY,
                             title VARCHAR(255) NOT NULL,
                             description TEXT NOT NULL,
                             link VARCHAR(255),
                             language VARCHAR(50),
                             images JSONB,
                             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                         );
                     `;
                    // Retry insert
                    await sql`
                        INSERT INTO projects (title, description, link, language, images, created_at)
                        VALUES (${title}, ${description}, ${link || ''}, ${language || ''}, ${JSON.stringify(images || [])}, NOW())
                    `;
                    return res.status(200).json({ success: true });
                } catch (innerError) {
                    console.error('Failed to create projects table:', innerError);
                    return res.status(500).json({ error: 'Internal Server Error' });
                }
            }
            console.error('Error creating project:', error);
            return res.status(500).json({ error: 'Failed to create project' });
        }
    }

    // --- DELETE PROJECT (Protected) ---
    else if (req.method === 'DELETE') {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'Project ID required' });

        try {
            await sql`DELETE FROM projects WHERE id = ${id}`;
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error deleting project:', error);
            return res.status(500).json({ error: 'Failed to delete project' });
        }
    }

    else {
        res.setHeader('Allow', ['GET', 'POST', 'DELETE', 'OPTIONS']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
