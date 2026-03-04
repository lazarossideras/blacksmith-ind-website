import { Application } from 'https://esm.sh/@splinetool/runtime';

// Load Spline 3D scene
const canvas = document.getElementById('canvas3d');
const app = new Application(canvas);
app.load('https://prod.spline.design/PJGgP8Fu-UTvdRDo/scene.splinecode');

// Tubelight nav
const navLinks = document.querySelectorAll('[data-nav]');
const lamp = document.querySelector('.tubelight-lamp');

function moveLamp(link) {
    const pill = document.querySelector('.tubelight-pill');
    const pillRect = pill.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const left = linkRect.left - pillRect.left + (linkRect.width / 2) - (lamp.offsetWidth / 2);
    lamp.style.left = left + 'px';
}

// Position lamp on load
window.addEventListener('load', () => {
    const active = document.querySelector('.tubelight-link.active');
    if (active && lamp) moveLamp(active);
});

// Move lamp on click
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        moveLamp(link);
    });
});

// Reposition on resize
window.addEventListener('resize', () => {
    const active = document.querySelector('.tubelight-link.active');
    if (active && lamp) moveLamp(active);
    syncNavBtnWidth();
});

// Match "Let's Talk" button width to logo width
function syncNavBtnWidth() {
    const logo = document.querySelector('.nav-logo');
    const btn = document.querySelector('.btn-colorful--nav');
    if (logo && btn) btn.style.width = logo.offsetWidth + 'px';
}
syncNavBtnWidth();

// ===== SCROLL-BASED ACTIVE NAV =====
const sections = document.querySelectorAll('section[id]');
const navMap = {};
navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) navMap[href.slice(1)] = link;
});

const navCtaBtn = document.querySelector('.btn-colorful--nav');

const navLogo = document.querySelector('.nav-logo');

const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const id = entry.target.id;
            const matchingLink = navMap[id];
            if (id === 'hero' && navLogo) {
                navLinks.forEach(l => l.classList.remove('active'));
                navLogo.classList.add('active');
                if (lamp) moveLamp(navLogo);
            } else if (id === 'contact' && navCtaBtn) {
                navLinks.forEach(l => l.classList.remove('active'));
                if (navLogo) navLogo.classList.remove('active');
                if (lamp) moveLamp(navCtaBtn);
            } else if (matchingLink && matchingLink.classList.contains('tubelight-link')) {
                navLinks.forEach(l => l.classList.remove('active'));
                if (navLogo) navLogo.classList.remove('active');
                matchingLink.classList.add('active');
                if (lamp) moveLamp(matchingLink);
            }
        }
    });
}, { rootMargin: '-40% 0px -50% 0px' });

sections.forEach(section => scrollObserver.observe(section));

// ===== MOBILE HAMBURGER MENU =====
const hamburger = document.getElementById('mobile-hamburger');
const mobileMenu = document.getElementById('mobile-menu');

if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('open');
        mobileMenu.classList.toggle('open');
        document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });

    document.querySelectorAll('[data-mobile-nav]').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('open');
            mobileMenu.classList.remove('open');
            document.body.style.overflow = '';
        });
    });
}

// Ticker scrolls continuously — no pause on hover

// ===== CASE STUDIES CAROUSEL =====
const caseStudies = [
    {
        name: "Insurance Group — €50M+ in Annual Premiums",
        subtitle: "Southeastern Europe",
        status: "RETAINED",
        statusClass: "retained",
        icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>',
        text: "Built the first operational intelligence layer for a multi-entity insurance group. Decision logic, compliance checkpoints, and cross-departmental workflows unified into one system.",
        tags: ["Operational Intelligence", "Process Architecture", "Claims Automation", "AI Strategy"],
        highlight: "6+ month retained engagement — ongoing"
    },
    {
        name: "Multi-Entity Financial & Development Group",
        subtitle: "Australia",
        status: "DEPLOYED",
        statusClass: "deployed",
        icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
        text: "AI voice infrastructure screening and routing calls across three entities in real time. Warm-transfers, structured intelligence capture, and instant post-call briefs to leadership.",
        tags: ["Voice AI", "Intelligent Routing", "Real-Time Classification", "Post-Call Intelligence"],
        highlight: "Live 24/7 — 100% of inbound communications"
    },
    {
        name: "Wedding & Event Photography Studio",
        subtitle: "Australia",
        status: "DEPLOYED",
        statusClass: "deployed",
        icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>',
        text: "Full customer journey automation from inquiry to post-delivery. CRM pipelines, email sequences, quote generation, payment scheduling, gallery tracking, and review collection.",
        tags: ["CRM Automation", "Customer Journey Design", "Email Sequences", "Payment Automation"],
        highlight: "Admin on autopilot — inquiry to post-delivery"
    },
    {
        name: "$20M+ Streetwear Ecommerce Brand",
        subtitle: "Toronto",
        status: "IN PROGRESS",
        statusClass: "in-progress",
        icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
        text: "End-to-end wholesale automation. AI intent classification, 7-stage buyer pipeline, auto-generated Shopify orders, and intelligent scraping for prospect identification at scale.",
        tags: ["AI Intent Classification", "CRM Pipeline", "Shopify API", "DM Automation", "Lead Scraping"],
        highlight: "Currently building — active engagement"
    }
];

function initCaseStudies() {
    const track = document.getElementById('cs-track');
    const viewport = track?.parentElement;
    const dotsContainer = document.getElementById('cs-dots');
    const prevBtn = document.getElementById('cs-prev');
    const nextBtn = document.getElementById('cs-next');

    if (!track || !viewport) return;

    const total = caseStudies.length;
    let currentIndex = total; // start at first card of middle set
    let autoTimer;
    let isTransitioning = false;

    const starSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#facc15" stroke="#facc15" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';

    function buildCardHTML(t, index) {
        const stars = Array(5).fill(starSVG).join('');
        const tags = t.tags.map(r => `<div class="cs-result">${r}</div>`).join('');

        return `
            <div class="cs-card" data-index="${index}">
                <span class="cs-status cs-status--${t.statusClass}">${t.status}</span>
                <div class="cs-slide-content">
                    <div class="cs-user">
                        <div class="cs-avatar-wrapper">
                            <div class="cs-icon">${t.icon}</div>
                            <div class="cs-avatar-ring"></div>
                        </div>
                        <div class="cs-user-info">
                            <div class="cs-name">${t.name}</div>
                            <div class="cs-role">${t.subtitle}</div>
                            <div class="cs-stars">${stars}</div>
                        </div>
                    </div>
                    <div class="cs-body">
                        <p class="cs-quote-text">${t.text}</p>
                        <div class="cs-highlight">${t.highlight}</div>
                        <div class="cs-results">${tags}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Render 3 copies for seamless infinite loop
    const extended = [...caseStudies, ...caseStudies, ...caseStudies];
    track.innerHTML = extended.map((t, i) => buildCardHTML(t, i)).join('');

    function updateCardStates() {
        const cards = track.querySelectorAll('.cs-card');
        cards.forEach((card, i) => {
            card.classList.remove('cs-card--active', 'cs-card--prev', 'cs-card--next', 'cs-card--far');
            const diff = i - currentIndex;
            if (diff === 0) card.classList.add('cs-card--active');
            else if (diff === -1) card.classList.add('cs-card--prev');
            else if (diff === 1) card.classList.add('cs-card--next');
            else card.classList.add('cs-card--far');
        });
    }

    function positionTrack(animate) {
        const cards = track.querySelectorAll('.cs-card');
        const activeCard = cards[currentIndex];
        if (!activeCard) return;

        if (!animate) track.style.transition = 'none';

        const viewportWidth = viewport.offsetWidth;
        const cardLeft = activeCard.offsetLeft;
        const cardWidth = activeCard.offsetWidth;
        const offset = (viewportWidth / 2) - cardLeft - (cardWidth / 2);

        track.style.transform = `translateX(${offset}px)`;

        if (!animate) {
            track.offsetHeight; // force reflow
            track.style.transition = '';
        }

        updateCardStates();
    }

    // After animation, silently snap back to middle set if needed
    function snapIfNeeded() {
        if (currentIndex >= total * 2) {
            currentIndex -= total;
            positionTrack(false);
        } else if (currentIndex < total) {
            currentIndex += total;
            positionTrack(false);
        }
    }

    function goToSlide(newIndex) {
        if (newIndex === currentIndex || isTransitioning) return;
        isTransitioning = true;

        currentIndex = newIndex;
        positionTrack(true);
        updateDots();

        setTimeout(() => {
            isTransitioning = false;
            snapIfNeeded();
        }, 700);

        resetTimer();
    }

    function next() {
        goToSlide(currentIndex + 1);
    }

    function prev() {
        goToSlide(currentIndex - 1);
    }

    function createDots() {
        dotsContainer.innerHTML = caseStudies.map((_, i) =>
            `<button class="cs-dot ${i === 0 ? 'cs-dot--active' : ''}" data-index="${i}" aria-label="Go to case study ${i + 1}"></button>`
        ).join('');

        dotsContainer.querySelectorAll('.cs-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                const targetReal = parseInt(dot.dataset.index);
                const currentReal = currentIndex % total;
                let diff = targetReal - currentReal;
                // Pick shortest path
                if (diff > total / 2) diff -= total;
                if (diff < -total / 2) diff += total;
                goToSlide(currentIndex + diff);
            });
        });
    }

    function updateDots() {
        const realIndex = ((currentIndex % total) + total) % total;
        dotsContainer.querySelectorAll('.cs-dot').forEach((dot, i) => {
            dot.classList.toggle('cs-dot--active', i === realIndex);
        });
    }

    let pauseTimeout;

    function pauseAutoplay(cooldown = 12000) {
        clearInterval(autoTimer);
        clearTimeout(pauseTimeout);
        pauseTimeout = setTimeout(() => {
            autoTimer = setInterval(next, 6000);
        }, cooldown);
    }

    function resetTimer() {
        clearInterval(autoTimer);
        clearTimeout(pauseTimeout);
        autoTimer = setInterval(next, 6000);
    }

    // Init
    createDots();
    positionTrack(false);

    prevBtn.addEventListener('click', () => { prev(); pauseAutoplay(); });
    nextBtn.addEventListener('click', () => { next(); pauseAutoplay(); });

    // Hover pauses autoplay
    const csSection = document.querySelector('.cs-carousel');
    if (csSection) {
        csSection.addEventListener('mouseenter', () => {
            clearInterval(autoTimer);
            clearTimeout(pauseTimeout);
        });
        csSection.addEventListener('mouseleave', () => {
            pauseAutoplay(4000);
        });
    }

    // Touch swipe support
    let touchStartX = 0;
    let touchEndX = 0;
    const swipeThreshold = 50;

    viewport.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        clearInterval(autoTimer);
    }, { passive: true });

    viewport.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) next();
            else prev();
        }
        pauseAutoplay();
    }, { passive: true });

    window.addEventListener('resize', () => positionTrack(false));

    resetTimer();
}

initCaseStudies();


// ===== HIW MOBILE CAROUSEL DOTS =====
function initHiwCarousel() {
    const grid = document.querySelector('.hiw-grid');
    const dots = document.querySelectorAll('.hiw-dot');
    if (!grid || !dots.length) return;

    // Click dot → scroll to card
    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            const index = parseInt(dot.dataset.index);
            const cards = grid.querySelectorAll('.hiw-card');
            if (cards[index]) {
                cards[index].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        });
    });

    // Scroll → update active dot
    let scrollTimeout;
    grid.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const cards = grid.querySelectorAll('.hiw-card');
            const gridRect = grid.getBoundingClientRect();
            const center = gridRect.left + gridRect.width / 2;
            let closest = 0;
            let minDist = Infinity;

            cards.forEach((card, i) => {
                const cardRect = card.getBoundingClientRect();
                const cardCenter = cardRect.left + cardRect.width / 2;
                const dist = Math.abs(cardCenter - center);
                if (dist < minDist) {
                    minDist = dist;
                    closest = i;
                }
            });

            dots.forEach(d => d.classList.remove('active'));
            if (dots[closest]) dots[closest].classList.add('active');
        }, 50);
    });
}

initHiwCarousel();

// ===== LIVE DASHBOARD ANIMATION =====
function initLiveDashboard() {
    const panel = document.querySelector('.sys-card-panel');
    if (!panel) return;

    const statValues = panel.querySelectorAll('.sys-dash-stat-value');
    const statChanges = panel.querySelectorAll('.sys-dash-stat-change');
    const bars = panel.querySelectorAll('.sys-dash-bar');
    if (!statValues.length || !bars.length) return;

    const lerp = (a, b, t) => a + (b - a) * t;
    const ease = 0.008; // very slow drift

    // Current displayed values
    let tasks = 1284, tasksTarget = 1284;
    let uptime = 99.8, uptimeTarget = 99.8;
    let errors = 3, errorsTarget = 3;

    // Bar heights (current + target)
    const barCurrent = [];
    const barTarget = [];
    bars.forEach(bar => {
        const h = parseFloat(bar.style.height) || 50;
        barCurrent.push(h);
        barTarget.push(h);
    });

    // Pick new random targets periodically
    function pickNewTargets() {
        tasksTarget = 1100 + Math.random() * 400;
        uptimeTarget = 99.2 + Math.random() * 0.8;
        errorsTarget = Math.floor(Math.random() * 8);
        barTarget.forEach((_, i) => {
            barTarget[i] = 20 + Math.random() * 75;
        });
    }

    // Pick new targets every 6s so drift direction changes
    setInterval(pickNewTargets, 6000);
    // Stagger initial target pick
    setTimeout(pickNewTargets, 2000);

    let lastText = 0;

    function tick(now) {
        // Lerp all values toward targets
        tasks = lerp(tasks, tasksTarget, ease);
        uptime = lerp(uptime, uptimeTarget, ease * 0.5);
        errors = lerp(errors, errorsTarget, ease * 0.3);

        barCurrent.forEach((_, i) => {
            barCurrent[i] = lerp(barCurrent[i], barTarget[i], ease);
            bars[i].style.height = barCurrent[i] + '%';
        });

        // Update text at ~4fps to avoid flicker
        if (now - lastText > 250) {
            lastText = now;
            statValues[0].textContent = Math.round(tasks).toLocaleString();
            statValues[1].textContent = uptime.toFixed(1) + '%';
            statValues[2].textContent = Math.round(errors);

            const td = ((tasks - 1200) / 1200 * 100);
            statChanges[0].textContent = (td >= 0 ? '+' : '') + td.toFixed(0) + '%';
            statChanges[1].textContent = '+' + (uptime - 99).toFixed(1) + '%';
            statChanges[2].textContent = (errors <= 3 ? '-' : '+') + Math.abs(Math.round((errors - 5) / 5 * 100)) + '%';
        }

        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
}

initLiveDashboard();

// ===== INTERACTIVE GLOBE =====
function initGlobe() {
    const canvas = document.getElementById('globe-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Config
    const DOT_COLOR = 'rgba(123, 97, 255, ALPHA)';
    const ARC_COLOR = 'rgba(168, 85, 247, 0.4)';
    const MARKER_COLOR = 'rgba(200, 171, 255, 1)';
    const AUTO_ROTATE_SPEED = 0.002;

    const MARKERS = [
        { lat: 37.78, lng: -122.42, label: 'San Francisco' },
        { lat: 51.51, lng: -0.13, label: 'London' },
        { lat: 35.68, lng: 139.69, label: 'Tokyo' },
        { lat: -33.87, lng: 151.21, label: 'Sydney' },
        { lat: 1.35, lng: 103.82, label: 'Singapore' },
        { lat: 55.76, lng: 37.62, label: 'Moscow' },
        { lat: -23.55, lng: -46.63, label: 'São Paulo' },
        { lat: 19.43, lng: -99.13, label: 'Mexico City' },
        { lat: 28.61, lng: 77.21, label: 'Delhi' },
        { lat: 37.98, lng: 23.73, label: 'Athens' },
    ];

    const CONNECTIONS = [
        { from: [37.78, -122.42], to: [51.51, -0.13] },
        { from: [51.51, -0.13], to: [35.68, 139.69] },
        { from: [35.68, 139.69], to: [-33.87, 151.21] },
        { from: [37.78, -122.42], to: [1.35, 103.82] },
        { from: [51.51, -0.13], to: [28.61, 77.21] },
        { from: [37.78, -122.42], to: [-23.55, -46.63] },
        { from: [1.35, 103.82], to: [-33.87, 151.21] },
        { from: [28.61, 77.21], to: [37.98, 23.73] },
        { from: [51.51, -0.13], to: [37.98, 23.73] },
    ];

    // State
    let rotY = 0.4;
    let rotX = 0.3;
    let time = 0;
    let animId = 0;
    const drag = { active: false, startX: 0, startY: 0, startRotY: 0, startRotX: 0 };

    // Generate dots (Fibonacci sphere)
    const dots = [];
    const NUM_DOTS = 1200;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < NUM_DOTS; i++) {
        const theta = (2 * Math.PI * i) / goldenRatio;
        const phi = Math.acos(1 - (2 * (i + 0.5)) / NUM_DOTS);
        dots.push([
            Math.cos(theta) * Math.sin(phi),
            Math.cos(phi),
            Math.sin(theta) * Math.sin(phi),
        ]);
    }

    // Math helpers
    function latLngToXYZ(lat, lng, r) {
        const phi = ((90 - lat) * Math.PI) / 180;
        const theta = ((lng + 180) * Math.PI) / 180;
        return [
            -(r * Math.sin(phi) * Math.cos(theta)),
            r * Math.cos(phi),
            r * Math.sin(phi) * Math.sin(theta),
        ];
    }

    function rotateYAxis(x, y, z, a) {
        const c = Math.cos(a), s = Math.sin(a);
        return [x * c + z * s, y, -x * s + z * c];
    }

    function rotateXAxis(x, y, z, a) {
        const c = Math.cos(a), s = Math.sin(a);
        return [x, y * c - z * s, y * s + z * c];
    }

    function project(x, y, z, cx, cy, fov) {
        const scale = fov / (fov + z);
        return [x * scale + cx, y * scale + cy, z];
    }

    // Draw loop
    function draw() {
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);

        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(w, h) * 0.38;
        const fov = 600;

        if (!drag.active) rotY += AUTO_ROTATE_SPEED;
        time += 0.015;

        ctx.clearRect(0, 0, w, h);

        // Outer glow
        const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius * 1.5);
        glowGrad.addColorStop(0, 'rgba(123, 97, 255, 0.03)');
        glowGrad.addColorStop(1, 'rgba(123, 97, 255, 0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, w, h);

        // Globe outline
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(123, 97, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw dots
        for (let i = 0; i < dots.length; i++) {
            let [x, y, z] = dots[i];
            x *= radius; y *= radius; z *= radius;
            [x, y, z] = rotateXAxis(x, y, z, rotX);
            [x, y, z] = rotateYAxis(x, y, z, rotY);

            if (z > 0) continue;

            const [sx, sy] = project(x, y, z, cx, cy, fov);
            const depthAlpha = Math.max(0.1, 1 - (z + radius) / (2 * radius));
            const dotSize = 1 + depthAlpha * 0.8;

            ctx.beginPath();
            ctx.arc(sx, sy, dotSize, 0, Math.PI * 2);
            ctx.fillStyle = DOT_COLOR.replace('ALPHA', depthAlpha.toFixed(2));
            ctx.fill();
        }

        // Draw connections
        for (const conn of CONNECTIONS) {
            const [lat1, lng1] = conn.from;
            const [lat2, lng2] = conn.to;

            let [x1, y1, z1] = latLngToXYZ(lat1, lng1, radius);
            let [x2, y2, z2] = latLngToXYZ(lat2, lng2, radius);

            [x1, y1, z1] = rotateXAxis(x1, y1, z1, rotX);
            [x1, y1, z1] = rotateYAxis(x1, y1, z1, rotY);
            [x2, y2, z2] = rotateXAxis(x2, y2, z2, rotX);
            [x2, y2, z2] = rotateYAxis(x2, y2, z2, rotY);

            if (z1 > radius * 0.3 && z2 > radius * 0.3) continue;

            const [sx1, sy1] = project(x1, y1, z1, cx, cy, fov);
            const [sx2, sy2] = project(x2, y2, z2, cx, cy, fov);

            // Elevated midpoint for arc
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const midZ = (z1 + z2) / 2;
            const midLen = Math.sqrt(midX * midX + midY * midY + midZ * midZ);
            const arcH = radius * 1.25;
            const [scx, scy] = project(
                (midX / midLen) * arcH,
                (midY / midLen) * arcH,
                (midZ / midLen) * arcH,
                cx, cy, fov
            );

            ctx.beginPath();
            ctx.moveTo(sx1, sy1);
            ctx.quadraticCurveTo(scx, scy, sx2, sy2);
            ctx.strokeStyle = ARC_COLOR;
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Traveling dot
            const t = (Math.sin(time * 1.2 + lat1 * 0.1) + 1) / 2;
            const tx = (1 - t) * (1 - t) * sx1 + 2 * (1 - t) * t * scx + t * t * sx2;
            const ty = (1 - t) * (1 - t) * sy1 + 2 * (1 - t) * t * scy + t * t * sy2;

            ctx.beginPath();
            ctx.arc(tx, ty, 2, 0, Math.PI * 2);
            ctx.fillStyle = MARKER_COLOR;
            ctx.fill();
        }

        // Draw markers
        for (const marker of MARKERS) {
            let [x, y, z] = latLngToXYZ(marker.lat, marker.lng, radius);
            [x, y, z] = rotateXAxis(x, y, z, rotX);
            [x, y, z] = rotateYAxis(x, y, z, rotY);

            if (z > radius * 0.1) continue;

            const [sx, sy] = project(x, y, z, cx, cy, fov);

            // Pulse ring
            const pulse = Math.sin(time * 2 + marker.lat) * 0.5 + 0.5;
            ctx.beginPath();
            ctx.arc(sx, sy, 4 + pulse * 4, 0, Math.PI * 2);
            ctx.strokeStyle = MARKER_COLOR.replace('1)', `${(0.2 + pulse * 0.15).toFixed(2)})`);
            ctx.lineWidth = 1;
            ctx.stroke();

            // Core dot
            ctx.beginPath();
            ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = MARKER_COLOR;
            ctx.fill();

            // Label
            if (marker.label) {
                ctx.font = "10px 'Inter', system-ui, sans-serif";
                ctx.fillStyle = MARKER_COLOR.replace('1)', '0.6)');
                ctx.fillText(marker.label, sx + 8, sy + 3);
            }
        }

        animId = requestAnimationFrame(draw);
    }

    // Pointer drag handlers
    canvas.addEventListener('pointerdown', (e) => {
        drag.active = true;
        drag.startX = e.clientX;
        drag.startY = e.clientY;
        drag.startRotY = rotY;
        drag.startRotX = rotX;
        canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', (e) => {
        if (!drag.active) return;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        rotY = drag.startRotY + dx * 0.005;
        rotX = Math.max(-1, Math.min(1, drag.startRotX + dy * 0.005));
    });

    canvas.addEventListener('pointerup', () => { drag.active = false; });
    canvas.addEventListener('pointercancel', () => { drag.active = false; });

    animId = requestAnimationFrame(draw);
}

initGlobe();
