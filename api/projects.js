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

    // --- GET ALL PROJECTS (Public) ---
    if (req.method === 'GET') {
        try {
            let projects;
            if (isDev) {
                projects = localData.projects;
            } else {
                projects = await get('projects') || [];
            }
            return res.status(200).json({ projects: projects.reverse() });
        } catch (error) {
            console.error('Error fetching projects:', error);
            return res.status(500).json({ error: 'Failed to fetch projects' });
        }
    }

    // --- Authentication for POST/DELETE (Protected Dashboard features) ---
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET || 'dev_secret_key'}`) {
        return res.status(401).json({ error: 'Unauthorized to modify projects' });
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

    // --- CREATE/UPDATE PROJECT (Protected) ---
    if (req.method === 'POST') {
        const { title, description, link, language, images } = req.body;

        if (!title || !description) {
            return res.status(400).json({ error: 'Title and description are required' });
        }

        try {
            let projects;
            if (isDev) {
                projects = localData.projects;
            } else {
                projects = await get('projects') || [];
            }

            const newProject = {
                id: Date.now(),
                title,
                description,
                link: link || '',
                language: language || '',
                images: images || [],
                created_at: new Date().toISOString()
            };

            projects.push(newProject);

            if (!isDev) {
                await updateEdgeConfig('projects', projects);
            }

            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error creating project:', error);
            return res.status(500).json({ error: 'Failed to save project' });
        }
    }

    // --- DELETE PROJECT (Protected) ---
    else if (req.method === 'DELETE') {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'Project ID required' });

        try {
            let projects;
            if (isDev) {
                projects = localData.projects;
            } else {
                projects = await get('projects') || [];
            }
            projects = projects.filter(p => p.id !== id);

            if (!isDev) {
                await updateEdgeConfig('projects', projects);
            }

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
