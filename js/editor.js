const entry = JSON.parse(sessionStorage.getItem('lb_selected') || '{}');
const username = sessionStorage.getItem('lb_username') || 'STUDIO';

// Elements
const canvas = {
    box: document.getElementById('export-box'),
    poster: document.getElementById('cv-poster'),
    posterLayer: document.getElementById('layer-poster'),
    title: document.getElementById('cv-title'),
    year: document.getElementById('cv-year'),
    rating: document.getElementById('cv-rating'),
    reviewBox: document.getElementById('cv-review-box'),
    reviewText: document.getElementById('cv-review-text'),
    user: document.getElementById('cv-user'),
    layers: document.getElementById('layer-content')
};

const GRADIENTS = [
    'radial-gradient(circle at top left, #1e1e3f 0%, #0d0f11 100%)',
    'radial-gradient(circle at top left, #2d1b33 0%, #1c1421 100%)',
    'radial-gradient(circle at top left, #1b2d1b 0%, #0f140f 100%)',
    'linear-gradient(135deg, #14181c 0%, #242c34 100%)',
    '#000000', '#14181c'
];

const ACCENTS = ['#00e054', '#ff8000', '#00b1f1', '#ff4d4d', '#ffffff'];

function init() {
    renderCanvas();
    renderControls();
    attachListeners();
}

function renderCanvas() {
    canvas.poster.src = entry.posterUrl;
    canvas.title.innerText = entry.movieTitle;
    canvas.year.innerText = entry.movieYear;
    canvas.user.innerText = username;
    canvas.rating.innerText = '★'.repeat(Math.max(0, Math.floor(entry.rating))) + (entry.rating % 1 !== 0 ? '½' : '');
    
    if (entry.content && entry.content.length > 5) {
        canvas.reviewBox.classList.remove('hidden');
        canvas.reviewText.innerText = entry.content.substring(0, 180) + (entry.content.length > 180 ? '...' : '');
    }
}

function renderControls() {
    // Accents
    const accList = document.getElementById('accent-list');
    ACCENTS.forEach(c => {
        const b = document.createElement('button');
        b.className = 'w-10 h-10 rounded-full border-2 border-white/5 hover:scale-110 transition-all';
        b.style.backgroundColor = c;
        b.onclick = () => { canvas.rating.style.color = c; };
        accList.appendChild(b);
    });

    // Bgs
    const bgList = document.getElementById('bg-list');
    GRADIENTS.forEach(g => {
        const b = document.createElement('button');
        b.className = 'w-full aspect-square rounded-xl border border-white/5 hover:scale-110 transition-all';
        b.style.background = g;
        b.onclick = () => { canvas.box.style.background = g; };
        bgList.appendChild(b);
    });
}

function attachListeners() {
    // Download
    document.getElementById('btn-download').onclick = async () => {
        const btn = document.getElementById('btn-download');
        btn.disabled = true;
        try {
            const dataUrl = await htmlToImage.toPng(canvas.box, { pixelRatio: 2, cacheBust: true });
            const link = document.createElement('a');
            link.download = `buddy-${entry.movieTitle}.png`;
            link.href = dataUrl;
            link.click();
        } finally {
            btn.disabled = false;
        }
    };

    // Template Switch
    document.querySelectorAll('.tpl-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tpl-btn').forEach(b => b.classList.remove('active', 'border-[#00e054]/50', 'bg-[#00e054]/5', 'opacity-100'));
            document.querySelectorAll('.tpl-btn').forEach(b => b.classList.add('opacity-50'));
            
            btn.classList.add('active', 'border-[#00e054]/50', 'bg-[#00e054]/5', 'opacity-100');
            btn.classList.remove('opacity-50');

            if (btn.dataset.tpl === 'alt') {
                canvas.layers.classList.add('items-center', 'text-center', 'justify-center');
                canvas.layers.classList.remove('justify-end');
                canvas.posterLayer.classList.add('opacity-30', 'blur-md', 'scale-110');
            } else {
                canvas.layers.classList.remove('items-center', 'text-center', 'justify-center');
                canvas.layers.classList.add('justify-end');
                canvas.posterLayer.classList.remove('opacity-30', 'blur-md', 'scale-110');
            }
        };
    });
}

init();
