import { get } from '@vercel/edge-config';
import { localData, isDev } from './localData.js';

export default async function handler(req, res) {
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
            let blogs;
            if (isDev) {
                blogs = localData.blogs;
            } else {
                blogs = await get('blogs') || [];
            }
            return res.status(200).json({ blogs: blogs.reverse() });
        } catch (error) {
            console.error('Error fetching blogs:', error);
            return res.status(500).json({ error: 'Failed to fetch blogs' });
        }
    }

    // --- Authentication for POST/DELETE (Protected Dashboard features) ---
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET || 'dev_secret_key'}`) {
        return res.status(401).json({ error: 'Unauthorized to modify blogs' });
    }

    // Helper to call Vercel REST API
    async function updateEdgeConfig(key, value) {
        const updateRes = await fetch(`https://api.vercel.com/v1/edge-config/${process.env.EDGE_CONFIG_ID}/items`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                items: [{ operation: 'upsert', key, value }],
            }),
        });
        if (!updateRes.ok) throw new Error('Failed to update Edge Config via Vercel API');
    }

    // --- CREATE/UPDATE BLOG (Protected) ---
    if (req.method === 'POST') {
        const { title, date, content } = req.body;

        if (!title || !date || !content) {
            return res.status(400).json({ error: 'Title, date, and content are required' });
        }

        try {
            let blogs;
            if (isDev) {
                blogs = localData.blogs;
            } else {
                blogs = await get('blogs') || [];
            }

            const newBlog = {
                id: Date.now(),
                title,
                date,
                content
            };

            blogs.push(newBlog);

            if (!isDev) {
                await updateEdgeConfig('blogs', blogs);
            }

            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error creating blog:', error);
            return res.status(500).json({ error: 'Failed to save blog' });
        }
    }

    // --- DELETE BLOG (Protected) ---
    else if (req.method === 'DELETE') {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'Blog ID required' });

        try {
            let blogs;
            if (isDev) {
                blogs = localData.blogs;
            } else {
                blogs = await get('blogs') || [];
            }
            blogs = blogs.filter(b => b.id !== id);

            if (!isDev) {
                await updateEdgeConfig('blogs', blogs);
            }

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
