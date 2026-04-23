const entry = JSON.parse(sessionStorage.getItem('lb_selected') || '{}');
const username = sessionStorage.getItem('lb_username') || 'STUDIO';

const DYNAMIC_STYLE_ROOT = document.getElementById('export-box');

const GRADIENTS = [
    '#0b0c0e', // Dark charcoal/black
    '#1c0f0a', // Warm burnt umber dark
    '#0a141c', // Deep oceanic blue
    '#0d140e', // Deep forest green
    '#170b13', // Deep plum
    'radial-gradient(circle at center, #1e1e3f 0%, #0b0c0e 100%)',
];

const ACCENTS = ['#ff8000', '#00e054', '#00b1f1', '#ff4d4d', '#ffffff', '#ffd700'];

function init() {
    populateData();
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

function populateData() {
    // Basic Mapping
    setImages('.cv-poster', entry.posterUrl || '');
    setText('.cv-title', entry.movieTitle || 'UNKNOWN');
    setText('.cv-year', entry.movieYear || '');
    setText('.cv-user', username.toUpperCase());
    
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
