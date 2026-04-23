document.getElementById('fetch-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const btn = document.getElementById('submit-btn');
    const errorEl = document.getElementById('error-msg');

    if (!username) return;

    btn.disabled = true;
    btn.innerText = 'WAIT...';
    errorEl.classList.add('hidden');

    try {
        const response = await fetch(`/api/letterboxd/${username}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'User not found or profile access denied');
        }
        
        const feed = data;
        
        // Store data and username for the next page
        sessionStorage.setItem('lb_username', username);
        sessionStorage.setItem('lb_entries', JSON.stringify(feed.items));
        
        // Redirect to gallery
        window.location.href = '/gallery.html';
    } catch (err) {
        errorEl.innerText = err.message.toUpperCase();
        errorEl.classList.remove('hidden');
        btn.innerText = 'FETCH';
        btn.disabled = false;
    }
});
