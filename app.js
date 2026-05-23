// app.js
// ========== CONFIGURATION ==========
const ADMIN_PASSWORD = "admin123";  // Change this to your own password!
let isAdmin = false;
let allMods = [];
let currentPage = 1;
const modsPerPage = 24;
let filteredMods = [];

// ========== STORAGE KEYS ==========
const STORAGE_KEY = "sri_lankan_bus_mods";

// ========== DOM ELEMENTS ==========
const modsContainer = document.getElementById('modsContainer');
const searchInput = document.getElementById('searchInput');
const prevBtn = document.getElementById('prevPageBtn');
const nextBtn = document.getElementById('nextPageBtn');
const pageInfoSpan = document.getElementById('pageInfo');
const adminPanel = document.getElementById('adminPanel');
const loginSection = document.getElementById('loginSection');
const showLoginBtn = document.getElementById('showLoginBtn');
const loginModal = document.getElementById('loginModal');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');
const adminPassword = document.getElementById('adminPassword');
const logoutBtn = document.getElementById('logoutBtn');
const addModForm = document.getElementById('addModForm');

// ========== HELPER FUNCTIONS ==========
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ========== STORAGE FUNCTIONS ==========
function loadModsFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        allMods = JSON.parse(stored);
    } else {
        // Default sample mods
        allMods = [
            {
                id: "1",
                name: "Sample Sri Lankan Bus Mod",
                version: "1.59",
                author: "LK Modder",
                imageUrl: "",
                downloadUrl: "#",
                description: "This is a sample bus mod. Add your own mods using the admin panel.",
                timestamp: new Date().toISOString()
            }
        ];
        saveModsToStorage();
    }
    applyFilters();
}

function saveModsToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allMods));
}

// ========== ADMIN FUNCTIONS ==========
function checkAdminStatus() {
    const adminStatus = sessionStorage.getItem('bus_mods_admin');
    if (adminStatus === 'true') {
        isAdmin = true;
        adminPanel.style.display = 'block';
        loginSection.style.display = 'none';
    } else {
        isAdmin = false;
        adminPanel.style.display = 'none';
        loginSection.style.display = 'block';
    }
}

function login(password) {
    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('bus_mods_admin', 'true');
        isAdmin = true;
        adminPanel.style.display = 'block';
        loginSection.style.display = 'none';
        loginModal.style.display = 'none';
        adminPassword.value = '';
        alert('Login successful!');
    } else {
        alert('Wrong password!');
    }
}

function logout() {
    sessionStorage.removeItem('bus_mods_admin');
    isAdmin = false;
    adminPanel.style.display = 'none';
    loginSection.style.display = 'block';
    alert('Logged out successfully!');
}

function addMod(mod) {
    mod.id = Date.now().toString();
    mod.timestamp = new Date().toISOString();
    allMods.unshift(mod);
    saveModsToStorage();
    applyFilters();
    alert('Mod added successfully!');
}

function deleteMod(modId) {
    if (confirm('Are you sure you want to delete this mod?')) {
        allMods = allMods.filter(mod => mod.id !== modId);
        saveModsToStorage();
        applyFilters();
        alert('Mod deleted!');
    }
}

// ========== FILTER & SEARCH ==========
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase().trim();

    filteredMods = allMods.filter(mod => {
        const matchesSearch = searchTerm === '' ||
            (mod.name && mod.name.toLowerCase().includes(searchTerm)) ||
            (mod.author && mod.author.toLowerCase().includes(searchTerm)) ||
            (mod.description && mod.description.toLowerCase().includes(searchTerm));

        return matchesSearch;
    });

    currentPage = 1;
    renderCurrentPage();
}

// ========== RENDER FUNCTIONS ==========
function renderCurrentPage() {
    if (!filteredMods.length) {
        modsContainer.innerHTML = '<div class="no-mods">No bus mods found. Add your first mod using admin panel!</div>';
        updatePaginationInfo();
        return;
    }

    const start = (currentPage - 1) * modsPerPage;
    const end = start + modsPerPage;
    const pageMods = filteredMods.slice(start, end);

    modsContainer.innerHTML = '';
    pageMods.forEach(mod => {
        const card = document.createElement('div');
        card.className = 'mod-card';
        card.setAttribute('data-mod-id', mod.id);

        const imgUrl = mod.imageUrl && mod.imageUrl.trim() ? mod.imageUrl : 'https://via.placeholder.com/300x150?text=Bus+Mod';
        const versionLabel = mod.version || 'N/A';
        const authorLabel = mod.author || 'Unknown';
        const desc = mod.description ? (mod.description.length > 100 ? mod.description.substring(0, 100) + '…' : mod.description) : 'No description';

        let adminButtons = '';
        if (isAdmin) {
            adminButtons = `<button class="delete-btn" data-id="${mod.id}">Delete</button>`;
        }

        card.innerHTML = `
            <img src="${imgUrl}" alt="${escapeHtml(mod.name)}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x150?text=Image+Error'">
            <h3>${escapeHtml(mod.name)}</h3>
            <div class="mod-badges">
                <span class="badge version-badge">v${escapeHtml(versionLabel)}</span>
            </div>
            <div class="mod-meta">${escapeHtml(authorLabel)}</div>
            <div class="mod-desc">${escapeHtml(desc)}</div>
            <div style="display: flex; gap: 8px;">
                <button class="download-btn" data-url="${escapeHtml(mod.downloadUrl)}">Download</button>
                ${adminButtons}
            </div>
        `;
        modsContainer.appendChild(card);
    });

    // Attach card click for details modal
    document.querySelectorAll('.mod-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('download-btn') || e.target.classList.contains('delete-btn')) return;
            const modId = card.getAttribute('data-mod-id');
            const mod = allMods.find(m => m.id === modId);
            if (mod) openDetailsModal(mod);
        });
    });

    // Attach download button events
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const url = btn.getAttribute('data-url');
            if (url && url !== '#') {
                openDownloadModal(url);
            } else {
                alert('Download link not available');
            }
        });
    });

    // Attach delete button events
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            deleteMod(id);
        });
    });

    updatePaginationInfo();
}

function updatePaginationInfo() {
    const totalPages = Math.ceil(filteredMods.length / modsPerPage);
    pageInfoSpan.textContent = `Page ${currentPage} of ${totalPages || 1}`;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderCurrentPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredMods.length / modsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderCurrentPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ========== MODAL FUNCTIONS ==========
function openDetailsModal(mod) {
    const modal = document.getElementById('detailsModal');
    const container = document.getElementById('detailsContent');
    const imgUrl = mod.imageUrl && mod.imageUrl.trim() ? mod.imageUrl : 'https://via.placeholder.com/400x200?text=No+Image';

    container.innerHTML = `
        <div class="details-image">
            <img src="${imgUrl}" alt="${escapeHtml(mod.name)}" onerror="this.src='https://via.placeholder.com/400x200?text=No+Image'">
        </div>
        <h2>${escapeHtml(mod.name)}</h2>
        <div class="details-meta">
            <span class="badge version-badge">Version: ${escapeHtml(mod.version || 'N/A')}</span>
        </div>
        <p class="details-author"><strong>Author:</strong> ${escapeHtml(mod.author || 'Unknown')}</p>
        <div class="details-description">
            <strong>Description:</strong>
            <p>${escapeHtml(mod.description || 'No description available.')}</p>
        </div>
        <button class="download-details-btn" data-url="${escapeHtml(mod.downloadUrl)}">Download Mod</button>
    `;

    modal.style.display = 'flex';

    const detailsBtn = container.querySelector('.download-details-btn');
    if (detailsBtn) {
        detailsBtn.addEventListener('click', (e) => {
            const url = detailsBtn.getAttribute('data-url');
            if (url && url !== '#') {
                openDownloadModal(url);
            } else {
                alert('Download link not available');
            }
        });
    }
}

function openDownloadModal(url) {
    const modal = document.getElementById('downloadModal');
    const iframe = document.getElementById('modalIframe');
    if (modal && iframe) {
        iframe.src = url;
        modal.style.display = 'flex';
    } else {
        window.open(url, '_blank');
    }
}

function closeModals() {
    document.getElementById('detailsModal').style.display = 'none';
    document.getElementById('downloadModal').style.display = 'none';
    document.getElementById('loginModal').style.display = 'none';
    const iframe = document.getElementById('modalIframe');
    if (iframe) iframe.src = 'about:blank';
}

// ========== EVENT LISTENERS ==========
searchInput.addEventListener('input', applyFilters);
prevBtn.addEventListener('click', prevPage);
nextBtn.addEventListener('click', nextPage);

showLoginBtn.addEventListener('click', () => {
    loginModal.style.display = 'flex';
});

loginSubmitBtn.addEventListener('click', () => {
    login(adminPassword.value);
});

logoutBtn.addEventListener('click', logout);

addModForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newMod = {
        name: document.getElementById('modName').value,
        version: document.getElementById('modVersion').value,
        author: document.getElementById('modAuthor').value,
        imageUrl: document.getElementById('modImage').value,
        downloadUrl: document.getElementById('modDownload').value,
        description: document.getElementById('modDescription').value
    };
    addMod(newMod);
    addModForm.reset();
});

// Close modals
document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', closeModals);
});
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) closeModals();
});

// ========== INITIALIZATION ==========
loadModsFromStorage();
checkAdminStatus();

// ImgBB API Key (for image upload - optional feature)
const IMGBB_API_KEY = "2e6555f84f2cba4982c98e35ff987554";
