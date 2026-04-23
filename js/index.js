window.addEventListener('pageshow', (e) => {
    // Reset state if coming from bfcache (back button)
    const btn = document.getElementById('submit-btn');
    if (btn) {
        btn.disabled = false;
        btn.innerText = 'FETCH';
    }
});

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
            
            sessionStorage.setItem('lb_username', username);
            sessionStorage.setItem('lb_entries', JSON.stringify(data.items || []));
            sessionStorage.removeItem('lb_selected'); // Clear any previous selection to force new auto-select
            window.location.href = '/editor.html';
        } else {
            const textContent = await response.text();
            let errString = 'SERVER RETURNED INVALID DATA. ';
            if (response.status === 504) errString += 'THE FETCH TIMED OUT.';
            else if (response.status === 502) errString += 'BAD GATEWAY.';
            else errString += 'STATUS: ' + response.status;
            
            console.error("Raw Response:", textContent);
            throw new Error(errString);
        }
    } catch (err) {
        errorEl.innerText = err.message.toUpperCase();
        errorEl.classList.remove('hidden');
        btn.innerText = 'FETCH';
        btn.disabled = false;
    }
});
