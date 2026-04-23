const entry = JSON.parse(sessionStorage.getItem('lb_selected') || '{}');
const username = sessionStorage.getItem('lb_username') || 'STUDIO';

const DYNAMIC_STYLE_ROOT = document.getElementById('export-box');

const GRADIENTS = [
    '#0b0c0e', // Dark charcoal
    '#1a100c', // Dark Bronze / Warm
    '#0f171e', // Deep Navy / Amazon
    '#121613', // Deep Forest / Matrix
    '#1c1216', // Deep Rose / Wine
    'radial-gradient(circle at center, #1e1e3f 0%, #0b0c0e 100%)',
];

const ACCENTS = [
    '#E4CDA7', // Premium Champagne Gold
    '#FF8000', // Letterboxd Orange
    '#00E054', // Letterboxd Green
    '#00B1F1', // Letterboxd Blue
    '#D9534F', // Soft Crimson
    '#E2E8F0', // Platinum Silver
    '#FBBF24', // Amber
    '#A78BFA'  // Elegant Lavender
];

async function init() {
    await populateData();
    renderControls();
    attachListeners();
    // Default to template 01
    document.querySelector('[data-tpl="tpl-01"]').click();
}

function setText(selector, text) {
    document.querySelectorAll(selector).forEach(el => el.innerText = text);
}

function setImages(selector, src) {
    document.querySelectorAll(selector).forEach(el => el.src = src);
}

async function populateData() {
    // 1. Text Mapping
    setText('.cv-title', entry.movieTitle || 'UNKNOWN');
    setText('.cv-year', entry.movieYear || '');
    setText('.cv-user', username.toUpperCase());
    
    // 2. High-Res Image Fetching (TMDB API via Backend)
    let finalPoster = entry.posterUrl || '';
    try {
        const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(entry.movieTitle)}`);
        const data = await res.json();
        if (data && data.results && data.results.length > 0) {
            let match = data.results[0];
            if (entry.movieYear) {
                const yearMatch = data.results.find(r => r.release_date && r.release_date.startsWith(entry.movieYear));
                if (yearMatch) match = yearMatch;
            }
            if (match.poster_path) {
                finalPoster = `https://image.tmdb.org/t/p/w780${match.poster_path}`;
            }
        }
    } catch (e) {
        console.warn("TMDB fetch failed, using fallback RSS poster.");
    }

    // 3. SECURE IMAGE PROXY (Crucial for html-to-image CORS)
    if (finalPoster) {
        setImages('.cv-poster', `/api/proxy-image?url=${encodeURIComponent(finalPoster)}`);
    }
    
    // Rating Stars
    const fullStars = Math.max(0, Math.floor(entry.rating || 0));
    const halfStar = (entry.rating % 1 !== 0) ? '½' : '';
    const ratingStr = '★'.repeat(fullStars) + halfStar;
    setText('.cv-rating', ratingStr);
    
    // Review Content
    const reviewSelectors = document.querySelectorAll('.cv-review-text');
    const revContainers = document.querySelectorAll('.cv-rev-container');
    
    if (entry.content && entry.content.length > 5) {
        reviewSelectors.forEach(el => {
            el.innerText = `${entry.content.substring(0, 150)}${entry.content.length > 150 ? '...' : ''}`;
        });
        revContainers.forEach(el => el.classList.remove('hidden'));
    } else {
        // Fallback for no review
        reviewSelectors.forEach(el => {
            el.innerText = `Watched on Letterboxd.`;
        });
    }
}

function renderControls() {
    // 1. Render Accents
    const accList = document.getElementById('accent-list');
    ACCENTS.forEach(c => {
        const b = document.createElement('button');
        b.className = 'w-8 h-8 rounded-full border border-white/10 hover:scale-110 active:scale-95 transition-all outline outline-0 outline-offset-2 hover:outline-white/20';
        b.style.backgroundColor = c;
        b.onclick = () => {
            DYNAMIC_STYLE_ROOT.style.setProperty('--accent-color', c);
        };
        accList.appendChild(b);
    });

    // 2. Render Backgrounds
    const bgList = document.getElementById('bg-list');
    GRADIENTS.forEach(g => {
        const b = document.createElement('button');
        b.className = 'w-10 h-10 w-full basis-[30%] grow aspect-video rounded-md border border-white/5 hover:border-white/30 transition-all';
        b.style.background = g;
        b.onclick = () => {
            if (g.includes('gradient')) {
                DYNAMIC_STYLE_ROOT.style.background = g;
                DYNAMIC_STYLE_ROOT.style.setProperty('--bg-color', 'transparent');
            } else {
                DYNAMIC_STYLE_ROOT.style.background = g;
                DYNAMIC_STYLE_ROOT.style.setProperty('--bg-color', g);
            }
        };
        bgList.appendChild(b);
    });
}

function attachListeners() {
    // Template Switch Logic
    document.querySelectorAll('.tpl-btn').forEach(btn => {
        btn.onclick = () => {
            // Reset all buttons
            document.querySelectorAll('.tpl-btn').forEach(b => {
                b.classList.remove('active', 'border-accent', 'opacity-100');
                b.classList.add('opacity-50', 'border-white/5');
            });
            // Activate clicked
            btn.classList.add('active', 'border-accent', 'opacity-100');
            btn.classList.remove('opacity-50', 'border-white/5');

            // Hide all templates
            document.querySelectorAll('.tpl-layer').forEach(layer => {
                layer.classList.add('hidden');
            });
            
            // Show target template
            const targetId = btn.getAttribute('data-tpl');
            document.getElementById(targetId).classList.remove('hidden');
        };
    });

    // Review Bubble Switch Logic
    document.querySelectorAll('.rev-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.rev-btn').forEach(b => {
                b.classList.remove('active', 'border-accent', 'opacity-100');
                b.classList.add('opacity-50', 'border-white/5');
            });
            btn.classList.add('active', 'border-accent', 'opacity-100');
            btn.classList.remove('opacity-50', 'border-white/5');

            const style = btn.getAttribute('data-rev');
            const revContainers = document.querySelectorAll('.cv-rev-container, .cv-review-text');
            
            if (style === 'none') {
                revContainers.forEach(el => el.classList.add('!hidden'));
            } else {
                revContainers.forEach(el => el.classList.remove('!hidden'));
            }
        };
    });

    // Download / Export Image logic
    document.getElementById('btn-download').onclick = async () => {
        const btn = document.getElementById('btn-download');
        const ogText = btn.innerText;
        btn.disabled = true;
        btn.innerText = 'RENDERING...';
        
        try {
            const dataUrl = await htmlToImage.toPng(DYNAMIC_STYLE_ROOT, { 
                pixelRatio: 3, // High Quality for IG 
                cacheBust: true 
            });
            const link = document.createElement('a');
            link.download = `buddy-${entry.movieTitle || 'export'}.png`;
            link.href = dataUrl;
            link.click();
        } catch(err) {
            console.error("Export failed:", err);
            alert("Failed to render. Please try again.");
        } finally {
            btn.disabled = false;
            btn.innerText = ogText;
        }
    };
}

// Start
init();
