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
        const contentType = response.headers.get("content-type");
        
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'User not found or profile access denied');
            }
            
            // Store data and username for the next page
            sessionStorage.setItem('lb_username', username);
            sessionStorage.setItem('lb_entries', JSON.stringify(data.items || []));
            
            // Redirect to gallery
            window.location.href = '/gallery.html';
        } else {
            // Handle non-JSON response (likely HTML error from server)
            throw new Error('SERVER RETURNED INVALID DATA. PLEASE TRY AGAIN LATER.');
        }
    } catch (err) {
        errorEl.innerText = err.message.toUpperCase();
        errorEl.classList.remove('hidden');
        btn.innerText = 'FETCH';
        btn.disabled = false;
    }
});
