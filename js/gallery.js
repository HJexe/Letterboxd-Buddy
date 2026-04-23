function parseEntry(item) {
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
    const posterUrl = imgMatch ? imgMatch[1] : "";

    return {
        movieTitle,
        movieYear,
        rating,
        posterUrl,
        content: content.replace(/<[^>]*>/g, '').trim(),
        pubDate: item.pubDate
    };
}

const entriesRaw = JSON.parse(sessionStorage.getItem('lb_entries') || '[]');
const username = sessionStorage.getItem('lb_username') || 'STUDIO';
const entries = entriesRaw.map(parseEntry);

document.getElementById('page-title').innerText = `${username.toUpperCase()}'S DIARY`;

const grid = document.getElementById('grid-container');

entries.forEach((entry, index) => {
    const card = document.createElement('div');
    card.className = 'group relative aspect-[2/3] bg-[#242c34] rounded-2xl overflow-hidden cursor-pointer shadow-2xl transition-all hover:scale-105 border border-white/5 hover:border-[#00e054]/50';
    
    card.innerHTML = `
        <img src="${entry.posterUrl}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="">
        <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>
        <div class="absolute inset-x-0 bottom-0 p-5 flex flex-col justify-end">
            <h3 class="text-xs font-black uppercase tracking-tight leading-tight mb-1">${entry.movieTitle}</h3>
            <div class="flex text-[#00e054] text-[10px]">
                ${'★'.repeat(Math.max(0, Math.floor(entry.rating)))}${entry.rating % 1 !== 0 ? '½' : ''}
            </div>
        </div>
    `;

    card.onclick = () => {
        sessionStorage.setItem('lb_selected', JSON.stringify(entry));
        window.location.href = '/editor.html';
    };

    grid.appendChild(card);
});
