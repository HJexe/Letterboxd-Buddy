let entry = JSON.parse(sessionStorage.getItem('lb_selected') || 'null');
const RAW_CACHE = JSON.parse(sessionStorage.getItem('lb_entries') || '[]');
const entriesRaw = Array.isArray(RAW_CACHE) ? RAW_CACHE : [];
const username = sessionStorage.getItem('lb_username') || 'STUDIO';

// State for custom poster cycling via Fanart TV
let currentTmdbId = null;
let alternatePosters = [];
let altPosterIndex = 0;
let isFetchingAltPosters = false;

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
    if (!entry && entriesRaw.length > 0) {
        entry = parseRawItem(entriesRaw[0]);
    } else if (!entry) {
        entry = {}; // Fallback empty
    }

    try {
        renderFilmStrip();
        await populateData();
    } catch (e) {
        console.error("Init population error:", e);
    }
    
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
        const isActive = entry && entry.movieTitle === movieTitle;
        div.className = `flex-none w-14 h-20 rounded-md overflow-hidden cursor-pointer border-2 transition-all hover:scale-105 ${isActive ? 'border-accent shadow-[0_0_15px_var(--accent-color)]' : 'border-white/10 opacity-50 hover:opacity-100'}`;
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

function populateMonthSelector() {
    const selector = document.getElementById('month-selector');
    if (!selector || entriesRaw.length === 0) return;

    if (selector.options.length <= 1 && selector.options[0].value === "test") {
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const availableMonths = new Set();
        const monthData = [];

        entriesRaw.forEach(e => {
            if(!e.pubDate) return;
            const d = new Date(e.pubDate);
            if(isNaN(d.valueOf())) return;
            const label = `${months[d.getMonth()]} ${d.getFullYear()}`;
            const val = `${d.getFullYear()}-${d.getMonth()}`;
            if(!availableMonths.has(val)) {
                availableMonths.add(val);
                monthData.push({ label, val });
            }
        });

        selector.innerHTML = monthData.map((m, i) => `<option value="${m.val}" ${i === 0 ? 'selected' : ''}>${m.label}</option>`).join('');
        
        selector.onchange = () => {
            renderMonthlyTemplate();
        };
    }
}

function renderMonthlyTemplate() {
    populateMonthSelector();
    const grid = document.getElementById('monthly-grid');
    const selector = document.getElementById('month-selector');
    if (!grid) return;
    grid.innerHTML = '';
    
    let targetMonth = "Archive";
    let targetYear = "";
    
    let filtered = entriesRaw;
    if(selector && selector.value && selector.value !== "test") {
        filtered = entriesRaw.filter(e => {
            if(!e.pubDate) return false;
            const d = new Date(e.pubDate);
            if(isNaN(d.valueOf())) return false;
            return `${d.getFullYear()}-${d.getMonth()}` === selector.value;
        });
        
        const [y, m] = selector.value.split('-');
        const monthsNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        targetYear = y;
        targetMonth = monthsNames[parseInt(m)];
    } else if (entriesRaw.length > 0) {
        // Fallback to first available item's date if selection failed or was uninitialized
        const d = new Date(entriesRaw[0].pubDate);
        if(!isNaN(d.valueOf())) {
            const monthsNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            targetYear = d.getFullYear();
            targetMonth = monthsNames[d.getMonth()];
        }
    }

    // Top 6 latest entries from that specific month
    const top6 = filtered.slice(0, 6);
    
    top6.forEach((e, i) => {
        const item = parseRawItem(e);
        let heartHTML = item.rating >= 4 ? `<span class="text-white ml-0.5" style="font-size:7px;">♥</span>` : '';
        const fullStars = Math.max(0, Math.floor(item.rating));
        const halfStar = (item.rating % 1 !== 0) ? '½' : '';
        const ratingStr = '★'.repeat(fullStars) + halfStar;
        
        const cell = document.createElement('div');
        cell.className = 'flex flex-col';
        cell.innerHTML = `
            <div class="aspect-[2/3] w-full rounded shadow-[0_5px_15px_rgba(0,0,0,0.5)] overflow-hidden bg-white/5 border border-white/10 mb-1.5 relative">
                <img src="/api/proxy-image?url=${encodeURIComponent(item.posterUrl)}" class="w-full h-full object-cover">
            </div>
            <div class="flex justify-between items-center text-[7.5px] text-white/80 px-0.5">
                <div class="flex items-center">
                    <span class="tracking-widest">${ratingStr}</span> ${heartHTML}
                </div>
            </div>
        `;
        grid.appendChild(cell);
        
        // Lazy load high-res into the grid cells specifically
        fetch(`/api/tmdb/search?query=${encodeURIComponent(item.movieTitle)}`)
            .then(res => res.json())
            .then(data => {
                if (data?.results?.length > 0) {
                    let match = data.results[0];
                    if (item.movieYear) {
                        const ym = data.results.find(r => r.release_date && r.release_date.startsWith(item.movieYear));
                        if (ym) match = ym;
                    }
                    if (match?.poster_path) {
                        const highResUrl = `https://image.tmdb.org/t/p/w300${match.poster_path}`;
                        const imgEl = cell.querySelector('img');
                        // Absolute CORS/Taint fix for html-to-image loop iteration
                        fetch(`/api/proxy-image?url=${encodeURIComponent(highResUrl)}`)
                            .then(r => r.blob())
                            .then(blob => {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    if (imgEl) imgEl.src = reader.result;
                                };
                                reader.readAsDataURL(blob);
                            }).catch(() => {});
                    }
                }
            })
            .catch(e => console.warn(e));
    });

    const titleEl = document.getElementById('monthly-title');
    if (titleEl) titleEl.innerText = `${targetMonth} ${targetYear}`;
}

async function populateData() {
    if (!entry) return; // Immediate bailout if totally invalid
    
    setText('.cv-title', entry.movieTitle || 'UNKNOWN');
    setText('.cv-year', entry.movieYear ? `— ${entry.movieYear} —` : ''); // Styled like mockup
    setText('.cv-user', username.toUpperCase());
    
    let finalPoster = entry.posterUrl || '';
    if (entry.movieTitle) {
        try {
            const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(entry.movieTitle)}`);
            const data = await res.json();
            if (data && data.results && data.results.length > 0) {
                let match = data.results[0];
                if (entry.movieYear) {
                    const yearMatch = data.results.find(r => r.release_date && r.release_date.startsWith(entry.movieYear));
                    if (yearMatch) match = yearMatch;
                }
                
                // Capture for alt posters
                currentTmdbId = match.id;
                alternatePosters = [];
                altPosterIndex = 0;

                if (match.poster_path) {
                    finalPoster = `https://image.tmdb.org/t/p/w780${match.poster_path}`;
                    alternatePosters.push(finalPoster);
                }
            }
        } catch (e) {
            console.warn("TMDB fetch failed, using fallback RSS poster.");
        }
    }

    if (finalPoster) {
        // ALWAYS route via proxy, and encode to Base64 to bypass strict html-to-image origin rules
        const fetchUrl = `/api/proxy-image?url=${encodeURIComponent(finalPoster)}`;
        try {
            const imgRes = await fetch(fetchUrl);
            const blob = await imgRes.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
                setImages('.cv-poster', reader.result);
            };
            reader.readAsDataURL(blob);
        } catch (err) {
            console.warn("Base64 conversion failed, using raw src backup:", err);
            setImages('.cv-poster', finalPoster);
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

    renderMonthlyTemplate();
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
                const colSpan = b.getAttribute('data-tpl') === 'tpl-05' ? ' col-span-2' : '';
                b.className = 'tpl-btn p-4 rounded-xl border border-white/5 bg-white/[0.02] text-[9.5px] font-black uppercase text-white/50 tracking-[0.1em] hover:bg-white/5 hover:text-white/80 transition-all' + colSpan;
            });
            // Activate current
            const activeColSpan = btn.getAttribute('data-tpl') === 'tpl-05' ? ' col-span-2' : '';
            btn.className = 'tpl-btn p-4 rounded-xl border-accent bg-accent/5 text-[9.5px] font-black uppercase text-accent tracking-[0.1em] transition-all shadow-[0_0_15px_rgba(var(--accent-color),0.1)_inset]' + activeColSpan;

            document.querySelectorAll('.tpl-layer').forEach(layer => layer.classList.add('hidden'));
            const targetId = btn.getAttribute('data-tpl');
            document.getElementById(targetId).classList.remove('hidden');
            
            const monthControls = document.getElementById('monthly-controls-section');
            if (monthControls) {
                if (targetId === 'tpl-05') {
                    monthControls.classList.remove('hidden');
                } else {
                    monthControls.classList.add('hidden');
                }
            }
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
    const toggleBtn = document.getElementById('toggle-review');
    if (toggleBtn) {
        toggleBtn.onclick = () => {
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
    }

    // Alternate Poster Logic (Fanart.tv)
    const btnAltPoster = document.getElementById('btn-alt-poster');
    if (btnAltPoster) {
        btnAltPoster.onclick = async () => {
            if (!currentTmdbId) return alert('No TMDB ID found for this movie to fetch alternate posters.');
            if (isFetchingAltPosters) return;
            
            isFetchingAltPosters = true;
            const ogHtml = btnAltPoster.innerHTML;
            btnAltPoster.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> FETCHING...';
            lucide.createIcons();

            try {
                // Fetch fanart only on the first cycle query
                if (alternatePosters.length <= 1) {
                    const res = await fetch(`/api/fanart/movie/${currentTmdbId}`);
                    const data = await res.json();
                    if (data && data.movieposter && data.movieposter.length > 0) {
                        const altUrls = data.movieposter.map(p => p.url);
                        alternatePosters = [...alternatePosters, ...altUrls];
                    }
                }

                if (alternatePosters.length > 1) {
                    altPosterIndex = (altPosterIndex + 1) % alternatePosters.length;
                    const nextPoster = alternatePosters[altPosterIndex];
                    
                    // Proxy as base64 for export reliability
                    const fetchUrl = `/api/proxy-image?url=${encodeURIComponent(nextPoster)}`;
                    const imgRes = await fetch(fetchUrl);
                    const blob = await imgRes.blob();
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        setImages('.cv-poster', reader.result);
                    };
                    reader.readAsDataURL(blob);
                } else {
                    alert('No textless/alternate posters found on Fanart.tv for this specific film.');
                }
            } catch (err) {
                console.error("Alt poster fetch failed:", err);
                alert("Could not fetch alternate posters.");
            } finally {
                isFetchingAltPosters = false;
                btnAltPoster.innerHTML = ogHtml;
                lucide.createIcons();
            }
        };
    }

    // Download Logic via html2canvas
    const btnDownload = document.getElementById('btn-download');
    if (btnDownload) {
        btnDownload.onclick = async () => {
            const btn = document.getElementById('btn-download');
            const ogText = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> RENDERING...';
            lucide.createIcons();
            btn.disabled = true;
            
            try {
                const canvas = await window.html2canvas(DYNAMIC_STYLE_ROOT, {
                    scale: 3,
                    useCORS: true,
                    allowTaint: false,
                    backgroundColor: null,
                    logging: false,
                    onclone: (clonedDoc) => {
                        // Optional fixes in cloned doc if needed
                    }
                });
                const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                const link = document.createElement('a');
                link.download = `buddy-${entry.movieTitle || 'export'}.jpg`;
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
}

init();
