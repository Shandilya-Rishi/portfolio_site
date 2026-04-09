// Local development data store
let localData = {
  projects: [
    {
      id: 1,
      title: "Portfolio Website",
      description: "A modern portfolio website built with HTML, CSS, and JavaScript",
      link: "https://github.com/Shandilya-Rishi/portfolio_site",
      language: "JavaScript",
      images: ["assets/projects/portfolio1.jpg"]
    }
  ],
  blogs: [
    {
      id: 1,
      title: "Getting Started with Web Development",
      date: "2024-01-15",
      content: "An introduction to modern web development practices..."
    }
  ],
  messages: []
};

// Check if we're in development mode
const isDev = !process.env.VERCEL_API_TOKEN;

if (isDev) {
  console.log('Running in development mode with local data store');
}

export { localData, isDev };