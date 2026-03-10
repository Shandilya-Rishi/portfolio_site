import express from 'express';
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('.')); // Serve static files

// Import API handlers
import contactHandler from './api/contact.js';
import projectsHandler from './api/projects.js';
import blogsHandler from './api/blogs.js';

// API routes
app.all('/api/contact', contactHandler);
app.all('/api/projects', projectsHandler);
app.all('/api/blogs', blogsHandler);

// Start server
app.listen(port, () => {
  console.log(`Portfolio site running at http://localhost:${port}`);
});