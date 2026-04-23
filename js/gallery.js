const entriesRaw = JSON.parse(sessionStorage.getItem('lb_entries') || '[]');
const username = sessionStorage.getItem('lb_username') || 'STUDIO';

// Extract Date formatting
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

let targetMonth = "Archive";
let targetYear = "";

if (entriesRaw.length > 0) {
    const d = new Date(entriesRaw[0].pubDate);
    targetMonth = months[d.getMonth()];
    targetYear = d.getFullYear();
}

document.getElementById('gallery-subtitle-text').innerText = `${username.toUpperCase()}'S`;
document.getElementById('gallery-title').innerText = `${targetMonth} ${targetYear}`;

// 1. Setup Color Picker
const BG_COLORS = [
    '#1c2833', // Deep slate
    '#000000', // Pitch Black
    '#ffffff', // White
    '#3e2723', // Bronze
    '#311b2b', // Deep purple
    '#1c1a2f', // Indigo
    '#17202a', // Dark Gray
    '#304c4b', // Mockup Green
];

const colorContainer = document.getElementById('gallery-colors');
BG_COLORS.forEach((color, idx) => {
    const btn = document.createElement('button');
    btn.className = `w-5 h-5 rounded-full border transition-all duration-300 outline outline-0 outline-offset-2 hover:scale-110 active:scale-95 ${idx === BG_COLORS.length - 1 ? 'border-white/50 outline-white/30' : 'border-white/20 hover:outline-white/20'}`;
    btn.style.backgroundColor = color;
    btn.onclick = () => {
        document.body.style.setProperty('--dynamic-bg', color);
        // Reset borders
        Array.from(colorContainer.children).forEach(b => {
            b.classList.remove('border-white/50', 'outline-white/30');
            b.classList.add('border-white/20');
        });
        btn.classList.add('border-white/50', 'outline-white/30');
        btn.classList.remove('border-white/20');
    };
    colorContainer.appendChild(btn);
});
// Set default to Mockup Green
document.body.style.setProperty('--dynamic-bg', '#304c4b');

// 2. Setup Posters & TMDB Fetch
const grid = document.getElementById('grid-container');

async function renderGallery() {
    for (let i = 0; i < entriesRaw.length; i++) {
        const item = entriesRaw[i];
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

        // Attempt high-res proxy tmdb fetch
        try {
            const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(movieTitle)}`);
            const data = await res.json();
            if (data && data.results && data.results.length > 0) {
                let match = data.results[0];
                if (movieYear) {
                    const ym = data.results.find((r) => r.release_date && r.release_date.startsWith(movieYear));
                    if (ym) match = ym;
                }
                if (match.poster_path) {
                    posterUrl = `https://image.tmdb.org/t/p/w500${match.poster_path}`;
                }
            }
        } catch(e) {
            console.warn("Failed tmdb fetch for gallery item");
        }

        // Like/Heart status
        const isHearted = content.includes(" Watched on "); // Basic heuristic, RSS doesn't directly expose hearts well, but we can assume popular reviews get hearts, or just fake it for UI demo. Actually wait, RSS fullTitle contains " - ★★★★" or something. Let's just randomly set it or check if rating is 5.
        const heartHTML = rating >= 4 ? `<span class="text-white ml-0.5 mt-[1px]">♥</span>` : '';

        const entryData = {
            movieTitle, movieYear, rating, posterUrl, content: content.replace(/<[^>]*>/g, '').trim(), pubDate: item.pubDate
        };

        const card = document.createElement('div');
        card.className = 'w-full flex flex-col gap-1.5 cursor-pointer group';
        card.onclick = () => {
            sessionStorage.setItem('lb_selected', JSON.stringify(entryData));
            window.location.href = '/editor.html';
        };

        const fullStars = Math.max(0, Math.floor(rating));
        const halfStar = (rating % 1 !== 0) ? '½' : '';
        const ratingStr = '★'.repeat(fullStars) + halfStar;

        card.innerHTML = `
            <div class="aspect-[2/3] w-full rounded-md overflow-hidden bg-white/5 border border-white/10 shadow-lg group-hover:border-white/40 transition-colors">
                <img src="/api/proxy-image?url=${encodeURIComponent(posterUrl)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" crossorigin="anonymous">
            </div>
            <div class="flex justify-between items-center px-0.5">
                <div class="flex text-[10px] text-white/90">
                    <span>${ratingStr}</span>
                    ${heartHTML}
                </div>
                <span class="text-[9px] font-bold text-white/50">${22 - i}</span>
            </div>
        `;

        grid.appendChild(card);
    }
}

renderGallery();
