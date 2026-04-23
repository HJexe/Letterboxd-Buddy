let entry = JSON.parse(sessionStorage.getItem('lb_selected') || 'null');
const entriesRaw = JSON.parse(sessionStorage.getItem('lb_entries') || '[]');
const username = sessionStorage.getItem('lb_username') || 'STUDIO';

function parseRawItem(item) {
    if (!item) return {};
    const fullTitle = (item.title || "").toString();
    const movieTitle = fullTitle.split(", ")[0] || "Untitled";
    const yearMatch = fullTitle.match(/\d{4}/);
    const movieYear = yearMatch ? yearMatch[0] : "";
    const content = (item.content || "").toString();
    
    const ratingMatch = content.match(/<p>Rated (.*?)<\/p>/);
    let rating = 0;
    if (ratingMatch) {
        const stars = ratingMatch[1];
        rating = stars.split('★').length - 1;
        if (stars.includes('½')) rating += 0.5;
    }
    
    const imgMatch = content.match(/<img src="(.*?)"/);
    let posterUrl = imgMatch ? imgMatch[1] : "";
    
    return {
        movieTitle, movieYear, rating, posterUrl, 
        content: content.replace(/<[^>]*>/g, '').trim(), 
        pubDate: item.pubDate
    };
}

if (!entry && entriesRaw.length > 0) {
    entry = parseRawItem(entriesRaw[0]);
    sessionStorage.setItem('lb_selected', JSON.stringify(entry));
} else if (!entry) {
    entry = {};
}

const DYNAMIC_STYLE_ROOT = document.getElementById('export-box');

// 1. COLORS MATCHING SCREENSHOT
const GRADIENTS = [
    '#1c2833', // Deep slate
    '#050505', // Pitch Black
    '#ffffff', // White
    '#3e2723', // Bronze
    '#311b2b', // Deep purple
    '#1c1a2f', // Indigo
    '#17202a', // Dark Gray
    '#304c4b', // Mockup Green
];

const ACCENTS = [
    '#00e054', // Letterboxd Green
    '#00b1f1', // Letterboxd Blue
    '#ff8000', // Letterboxd Orange
    '#ffffff', // White
    '#ff4d4d', // Coral Red
    '#ff00ff', // Pink
    '#a67c00'  // Gold/Brown
];

async function init() {
    renderFilmStrip();
    await populateData();
    renderControls();
    attachListeners();
}

function renderFilmStrip() {
    const strip = document.getElementById('film-strip');
    strip.innerHTML = '';
    
    // Limit to 10 for performance, or use all
    const topEntries = entriesRaw.slice(0, 15);
    
    topEntries.forEach((item, idx) => {
        const fullTitle = (item.title || "").toString();
        const movieTitle = fullTitle.split(", ")[0] || "Untitled";
        const content = (item.content || "").toString();
        const imgMatch = content.match(/<img src="(.*?)"/);
        let posterUrl = imgMatch ? imgMatch[1] : "";

        const div = document.createElement('div');
        div.className = `flex-none w-14 h-20 rounded-md overflow-hidden cursor-pointer border-2 transition-all hover:scale-105 ${entry.movieTitle === movieTitle ? 'border-accent shadow-[0_0_15px_var(--accent-color)]' : 'border-white/10 opacity-50 hover:opacity-100'}`;
        div.innerHTML = `<img src="${posterUrl}" class="w-full h-full object-cover">`;
        
        div.onclick = async () => {
            entry = parseRawItem(item);
            sessionStorage.setItem('lb_selected', JSON.stringify(entry));
            
            // Re-render UI
            renderFilmStrip(); // Update active border
            await populateData();
        };

        strip.appendChild(div);
    });
}

function setText(selector, text) {
    document.querySelectorAll(selector).forEach(el => el.innerText = text);
}

function setImages(selector, src) {
    document.querySelectorAll(selector).forEach(el => el.src = src);
}

async function populateData() {
    setText('.cv-title', entry.movieTitle || 'UNKNOWN');
    setText('.cv-year', entry.movieYear ? `— ${entry.movieYear} —` : ''); // Styled like mockup
    setText('.cv-user', username.toUpperCase());
    
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

    if (finalPoster) {
        const fetchUrl = finalPoster.includes('tmdb.org') ? finalPoster : `/api/proxy-image?url=${encodeURIComponent(finalPoster)}`;
        try {
            // Direct blob translation prevents ANY export-taint from html2canvas/html-to-image
            const imgRes = await fetch(fetchUrl);
            const blob = await imgRes.blob();
            setImages('.cv-poster', URL.createObjectURL(blob));
        } catch (err) {
            console.warn("Blob conversion failed, using raw src:", err);
            setImages('.cv-poster', fetchUrl);
        }
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
            el.innerText = `${entry.content.substring(0, 180)}${entry.content.length > 180 ? '...' : ''}`;
            el.classList.remove('hidden');
        });
        revContainers.forEach(el => el.classList.remove('hidden'));
    } else {
        reviewSelectors.forEach(el => {
            el.innerText = `Watched on Letterboxd.`;
        });
    }
}

function renderControls() {
    // 1. Render Atmospheric Colors
    const bgList = document.getElementById('bg-list');
    bgList.innerHTML = '';
    GRADIENTS.forEach((c, idx) => {
        const b = document.createElement('button');
        // Setup ring logic directly replicating the mockup green ring
        b.className = `w-8 h-8 rounded-full border transition-all duration-300 outline outline-0 outline-offset-[3px] hover:scale-110 active:scale-95 ${idx === 3 ? 'border-accent outline-accent' : 'border-white/10 hover:outline-white/20'}`;
        b.style.backgroundColor = c;
        b.onclick = () => {
            Array.from(bgList.children).forEach(child => {
                child.classList.remove('border-accent', 'outline-accent');
                child.classList.add('border-white/10');
            });
            b.classList.add('border-accent', 'outline-accent');
            b.classList.remove('border-white/10');
            DYNAMIC_STYLE_ROOT.style.setProperty('--bg-color', c);
        };
        bgList.appendChild(b);
    });
    // Set initial
    DYNAMIC_STYLE_ROOT.style.setProperty('--bg-color', GRADIENTS[3]); // Bronze

    // 2. Render Accents
    const accList = document.getElementById('accent-list');
    accList.innerHTML = '';
    ACCENTS.forEach((c, idx) => {
        const b = document.createElement('button');
        b.className = `w-8 h-8 rounded-full border transition-all duration-300 outline outline-0 outline-offset-2 hover:scale-110 active:scale-95 border-white/20 hover:outline-white/20`;
        b.style.backgroundColor = c;
        b.onclick = () => {
            DYNAMIC_STYLE_ROOT.style.setProperty('--accent-color', c);
            // Re-render UI to update active borders if needed
        };
        accList.appendChild(b);
    });
}

function attachListeners() {
    // Template Switch Logic
    document.querySelectorAll('.tpl-btn').forEach(btn => {
        btn.onclick = () => {
            // Reset
            document.querySelectorAll('.tpl-btn').forEach(b => {
                b.className = 'tpl-btn p-4 rounded-xl border border-white/5 bg-white/[0.02] text-[9.5px] font-black uppercase text-white/50 tracking-[0.1em] hover:bg-white/5 hover:text-white/80 transition-all';
            });
            // Activate current
            btn.className = 'tpl-btn p-4 rounded-xl border-accent bg-accent/5 text-[9.5px] font-black uppercase text-accent tracking-[0.1em] transition-all shadow-[0_0_15px_rgba(var(--accent-color),0.1)_inset]';

            document.querySelectorAll('.tpl-layer').forEach(layer => layer.classList.add('hidden'));
            const targetId = btn.getAttribute('data-tpl');
            document.getElementById(targetId).classList.remove('hidden');
        };
    });

    // Dimensions Logic
    document.querySelectorAll('.dim-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.dim-btn').forEach(b => {
                b.className = 'dim-btn p-3 rounded-xl border border-white/5 bg-black/20 text-[9px] font-black text-white/40 tracking-widest hover:bg-white/5 transition-all';
            });
            btn.className = 'dim-btn active p-3 rounded-xl border border-white/10 bg-white/5 text-[9px] font-black text-white/80 tracking-widest transition-all outline outline-0 outline-offset-2 outline-white/20';
            
            const dim = btn.getAttribute('data-dim');
            DYNAMIC_STYLE_ROOT.className = `w-full max-w-[360px] aspect-[${dim}] bg-bg rounded-[2rem] overflow-hidden shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)] relative transition-all duration-500 will-change-transform`;
        };
    });

    // Review Toggle (Eye Icon) Logic
    let showingReview = true;
    document.getElementById('toggle-review').onclick = () => {
        showingReview = !showingReview;
        const box = document.getElementById('eye-icon-box');
        const icon = box.querySelector('i');
        const revContainers = document.querySelectorAll('.cv-rev-container, .cv-review-text');
        
        if (showingReview) {
            box.className = 'w-6 h-6 rounded-md bg-accent/20 flex items-center justify-center border border-accent/30 text-accent transition-colors';
            icon.setAttribute('data-lucide', 'eye');
            revContainers.forEach(el => el.classList.remove('!hidden'));
        } else {
            box.className = 'w-6 h-6 rounded-md bg-white/5 flex items-center justify-center border border-white/10 text-white/50 transition-colors';
            icon.setAttribute('data-lucide', 'eye-off');
            revContainers.forEach(el => el.classList.add('!hidden'));
        }
        lucide.createIcons();
    };

    // Custom Poster Upload Logic
    const btnCustomPoster = document.getElementById('btn-custom-poster');
    const inputPosterUpload = document.getElementById('poster-upload');
    
    if (btnCustomPoster && inputPosterUpload) {
        btnCustomPoster.onclick = () => inputPosterUpload.click();
        inputPosterUpload.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const objectUrl = URL.createObjectURL(file);
            setImages('.cv-poster', objectUrl); // Update all templates
        };
    }

    // Download Logic via html-to-image
    document.getElementById('btn-download').onclick = async () => {
        const btn = document.getElementById('btn-download');
        const ogText = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> RENDERING...';
        lucide.createIcons();
        btn.disabled = true;
        
        try {
            const dataUrl = await htmlToImage.toPng(DYNAMIC_STYLE_ROOT, { 
                pixelRatio: 3,
                style: { transform: 'scale(1)', margin: '0' },
                cacheBust: true
            });
            const link = document.createElement('a');
            link.download = `buddy-${entry.movieTitle || 'export'}.png`;
            link.href = dataUrl;
            link.click();
        } catch(err) {
            console.error("Export failed:", err);
            alert("Failed to render. Please try again or check console.");
        } finally {
            btn.disabled = false;
            btn.innerHTML = ogText;
            lucide.createIcons();
        }
    };
}

init();
