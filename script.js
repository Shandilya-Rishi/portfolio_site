document.addEventListener('DOMContentLoaded', () => {
    // Select all tab buttons, triggers, and panels
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabTriggers = document.querySelectorAll('.tab-trigger'); // e.g. text links that act as tabs
    const tabPanels = document.querySelectorAll('.tab-panel');

    // Function to switch tabs
    function switchTab(targetId) {
        // Remove 'active' class from all buttons and panels
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));

        // Add 'active' class to the corresponding nav buttons
        tabBtns.forEach(btn => {
            if (btn.getAttribute('data-target') === targetId) {
                btn.classList.add('active');
            }
        });

        // Add 'active' class to the target panel
        const targetPanel = document.getElementById(targetId);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }

        // Optionally update the URL hash without scrolling
        history.pushState(null, null, `#${targetId}`);
    }

    // Attach click events to nav buttons
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = btn.getAttribute('data-target');
            switchTab(targetId);
        });
    });

    // Attach click events to inline triggers
    tabTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = trigger.getAttribute('data-target');
            switchTab(targetId);
        });
    });

    // --- Blog Post Toggle Logic ---
    const blogToggles = document.querySelectorAll('.toggle-blog');
    blogToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const article = toggle.closest('.log-entry');
            const content = article.querySelector('.log-content');
            const arrow = toggle.querySelector('.arrow');

            if (article.classList.contains('expanded')) {
                // Collapse
                article.classList.remove('expanded');
                content.style.display = 'none';
                arrow.textContent = '↓';
                arrow.style.transform = 'translateY(0)';
            } else {
                // Expand
                article.classList.add('expanded');
                content.style.display = 'block';
                arrow.textContent = '↑';
                arrow.style.transform = 'translateY(-2px)';
            }
        });
    });

    // Handle initial load with hash if present
    if (window.location.hash) {
        const hash = window.location.hash.substring(1); // remove '#'
        const isValidTab = Array.from(tabBtns).some(btn => btn.getAttribute('data-target') === hash);
        if (isValidTab) {
            switchTab(hash);
        }
    }

    // --- Header Scroll Effect ---
    const header = document.querySelector('.main-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // --- Project Carousel Logic ---
    const carousels = document.querySelectorAll('.project-carousel');
    carousels.forEach(carousel => {
        const track = carousel.querySelector('.carousel-track');
        const images = track.querySelectorAll('.carousel-img');
        const prevBtn = carousel.querySelector('.prev-btn');
        const nextBtn = carousel.querySelector('.next-btn');
        const indicator = carousel.querySelector('.carousel-indicator');

        let currentIndex = 0;

        function updateCarousel() {
            // Hide all images
            images.forEach((img, index) => {
                img.classList.remove('active');
                if (index === currentIndex) {
                    img.classList.add('active');
                }
            });
            // Update step indicator
            if (indicator) {
                indicator.textContent = `${currentIndex + 1} / ${images.length}`;
            }
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                currentIndex = (currentIndex > 0) ? currentIndex - 1 : images.length - 1;
                updateCarousel();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                currentIndex = (currentIndex < images.length - 1) ? currentIndex + 1 : 0;
                updateCarousel();
            });
        }
    });

    // --- Dynamic Network Background ---
    const canvas = document.getElementById('bg-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width, height;
        let particles = [];

        // Settings for neural network vibe
        const particleCount = window.innerWidth < 768 ? 40 : 80;
        const maxDistance = 120;
        // Use the github purple accent color in rgba form
        const colorBase = '163, 113, 247';

        let mouse = { x: null, y: null };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            init(); // Reinitialize on resize
        }

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 1.0;
                this.vy = (Math.random() - 0.5) * 1.0;
                this.radius = Math.random() * 1.5 + 0.5;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                // Bounce off edges
                if (this.x < 0 || this.x > width) this.vx = -this.vx;
                if (this.y < 0 || this.y > height) this.vy = -this.vy;
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${colorBase}, 0.5)`;
                ctx.fill();
            }
        }

        function init() {
            particles = [];
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle());
            }
        }

        function animate() {
            ctx.clearRect(0, 0, width, height);

            // Draw lines
            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();

                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < maxDistance) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(${colorBase}, ${1 - distance / maxDistance})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }

                // Interactive connection to mouse
                if (mouse.x != null && mouse.y != null) {
                    const dx = particles[i].x - mouse.x;
                    const dy = particles[i].y - mouse.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < maxDistance * 1.5) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(${colorBase}, ${(1 - distance / (maxDistance * 1.5)) * 0.8})`;
                        ctx.lineWidth = 1;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(mouse.x, mouse.y);
                        ctx.stroke();

                        // slight attraction to mouse
                        particles[i].x -= dx * 0.01;
                        particles[i].y -= dy * 0.01;
                    }
                }
            }

            requestAnimationFrame(animate);
        }

        // Add mouse interaction
        window.addEventListener('mousemove', (e) => {
            mouse.x = e.x;
            mouse.y = e.y;
        });

        window.addEventListener('mouseout', () => {
            mouse.x = null;
            mouse.y = null;
        });

        // Initialize and start loop
        window.addEventListener('resize', resize);
        resize();
        animate();
    }
});
