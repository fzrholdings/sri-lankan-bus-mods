// script.js - Sri Lankan Bus Mods with GitHub Admin
let allMods = [];
let filteredMods = [];
let currentPage = 1;
const modsPerPage = 24;
let gitHubToken = null;
let isAdmin = false;

// GitHub repo details
const REPO_OWNER = "fzrholdings";
const REPO_NAME = "sri-lankan-bus-mods";
const FILE_PATH = "mods.json";
const RAW_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${FILE_PATH}`;
const API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

// DOM elements
const modsContainer = document.getElementById("modsContainer");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const versionFilter = document.getElementById("versionFilter");
const prevBtn = document.getElementById("prevPageBtn");
const nextBtn = document.getElementById("nextPageBtn");
const pageInfoSpan = document.getElementById("pageInfo");
const mainTitle = document.getElementById("mainTitle");
const adminPanelDiv = document.getElementById("adminPanelBtn");
const addModBtn = document.getElementById("addModBtn");
const adminModal = document.getElementById("adminModal");
const adminModalTitle = document.getElementById("adminModalTitle");
const adminForm = document.getElementById("adminModForm");
const cancelAdminBtn = document.getElementById("cancelAdminBtn");

// Helper: Escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Load mods from GitHub raw
async function loadModsFromGitHub() {
    try {
        const res = await fetch(RAW_URL + "?t=" + Date.now());
        if (!res.ok) throw new Error("HTTP " + res.status);
        let data = await res.json();
        if (!Array.isArray(data)) data = [];
        // Normalize old fields: if "version" exists but not "gameVersion", map it
        allMods = data.map(mod => ({
            ...mod,
            gameVersion: mod.gameVersion || mod.version || "1.50",
            category: mod.category || "Bus Mod"
        }));
        applyFilters();
    } catch (err) {
        modsContainer.innerHTML = `<div class="error">Failed to load mods: ${err.message}</div>`;
    }
}

// Filter & Search
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const category = categoryFilter.value;
    const version = versionFilter.value;

    filteredMods = allMods.filter(mod => {
        const matchSearch = searchTerm === "" ||
            mod.name?.toLowerCase().includes(searchTerm) ||
            mod.author?.toLowerCase().includes(searchTerm) ||
            mod.description?.toLowerCase().includes(searchTerm);
        const matchCategory = category === "all" || mod.category === category;
        const matchVersion = version === "all" || (mod.gameVersion && mod.gameVersion.includes(version));
        return matchSearch && matchCategory && matchVersion;
    });
    currentPage = 1;
    renderCurrentPage();
}

// Render mods with admin icons if isAdmin
function renderCurrentPage() {
    if (!filteredMods.length) {
        modsContainer.innerHTML = '<div class="no-mods">No mods found.</div>';
        updatePaginationInfo();
        return;
    }
    const start = (currentPage-1)*modsPerPage;
    const pageMods = filteredMods.slice(start, start+modsPerPage);
    modsContainer.innerHTML = "";
    pageMods.forEach(mod => {
        const card = document.createElement("div");
        card.className = "mod-card";
        const imgUrl = mod.imageUrl && mod.imageUrl.trim() ? mod.imageUrl : "https://via.placeholder.com/300x150?text=No+Image";
        card.innerHTML = `
            <img src="${escapeHtml(imgUrl)}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x150?text=Error'">
            <h3>${escapeHtml(mod.name)}</h3>
            <div class="mod-badges">
                <span class="badge game-badge">${escapeHtml(mod.category)}</span>
                <span class="badge version-badge">v${escapeHtml(mod.gameVersion)}</span>
            </div>
            <div class="mod-meta">${escapeHtml(mod.author)}</div>
            <div class="mod-desc">${escapeHtml(mod.description?.substring(0,100) || '')}</div>
            <button class="download-btn" data-url="${escapeHtml(mod.downloadUrl)}">Download</button>
            ${isAdmin ? `<div class="admin-icons">
                <span class="edit-mod" data-id="${mod.id}">✏️</span>
                <span class="delete-mod" data-id="${mod.id}">🗑️</span>
            </div>` : ''}
        `;
        modsContainer.appendChild(card);
    });

    // Download buttons
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const url = btn.getAttribute('data-url');
            if(url && url !== '#') openDownloadModal(url);
            else alert("No download link");
        });
    });
    // Card click for details
    document.querySelectorAll('.mod-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if(e.target.closest('.download-btn') || e.target.closest('.admin-icons')) return;
            const name = card.querySelector('h3')?.innerText;
            const mod = allMods.find(m => m.name === name);
            if(mod) openDetailsModal(mod);
        });
    });
    // Admin edit/delete
    if(isAdmin) {
        document.querySelectorAll('.edit-mod').forEach(span => {
            span.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = span.getAttribute('data-id');
                const mod = allMods.find(m => m.id == id);
                if(mod) openEditModal(mod);
            });
        });
        document.querySelectorAll('.delete-mod').forEach(span => {
            span.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = span.getAttribute('data-id');
                if(confirm("Delete this mod permanently?")) {
                    await deleteModById(id);
                }
            });
        });
    }
    updatePaginationInfo();
}

// GitHub Commit helper
async function commitToGitHub(newContentArray) {
    if(!gitHubToken) throw new Error("Not authenticated");
    // Get current file SHA
    const res = await fetch(API_URL, {
        headers: { Authorization: `token ${gitHubToken}`, Accept: "application/vnd.github.v3+json" }
    });
    if(!res.ok) throw new Error("Failed to fetch file info");
    const fileData = await res.json();
    const sha = fileData.sha;
    const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(newContentArray, null, 2))));
    const putRes = await fetch(API_URL, {
        method: "PUT",
        headers: { Authorization: `token ${gitHubToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            message: "Update mods.json via web admin",
            content: contentBase64,
            sha: sha,
            branch: "main"
        })
    });
    if(!putRes.ok) throw new Error("Commit failed");
    return true;
}

// Add / Update mod
async function saveMod(modData, isEdit = false) {
    let newMods = [...allMods];
    if(isEdit) {
        const index = newMods.findIndex(m => m.id === modData.id);
        if(index !== -1) newMods[index] = modData;
        else return false;
    } else {
        modData.id = Date.now().toString();
        modData.timestamp = new Date().toISOString();
        newMods.push(modData);
    }
    try {
        await commitToGitHub(newMods);
        await loadModsFromGitHub();
        closeAllModals();
        alert("Mod saved successfully!");
        return true;
    } catch(err) {
        alert("Error saving: " + err.message);
        return false;
    }
}
async function deleteModById(id) {
    const newMods = allMods.filter(m => m.id != id);
    try {
        await commitToGitHub(newMods);
        await loadModsFromGitHub();
        alert("Mod deleted.");
    } catch(err) {
        alert("Delete failed: "+err.message);
    }
}

// Modal helpers
function openDownloadModal(url) {
    const modal = document.getElementById('downloadModal');
    const iframe = document.getElementById('modalIframe');
    iframe.src = url;
    modal.style.display = 'flex';
}
function openDetailsModal(mod) {
    const modal = document.getElementById('detailsModal');
    const container = document.getElementById('detailsContent');
    container.innerHTML = `
        <img src="${mod.imageUrl || 'https://via.placeholder.com/400x200'}" style="width:100%; border-radius:20px;">
        <h2>${escapeHtml(mod.name)}</h2>
        <p><strong>Author:</strong> ${escapeHtml(mod.author)}</p>
        <p><strong>Version:</strong> ${escapeHtml(mod.gameVersion)}</p>
        <p><strong>Category:</strong> ${escapeHtml(mod.category)}</p>
        <p>${escapeHtml(mod.description)}</p>
        <button id="detailDownloadBtn">Download</button>
    `;
    modal.style.display = 'flex';
    document.getElementById("detailDownloadBtn")?.addEventListener("click",()=>openDownloadModal(mod.downloadUrl));
}
function openEditModal(mod) {
    adminModalTitle.innerText = "Edit Mod";
    document.getElementById("editModId").value = mod.id;
    document.getElementById("modName").value = mod.name;
    document.getElementById("modVersion").value = mod.gameVersion;
    document.getElementById("modAuthor").value = mod.author;
    document.getElementById("modImageUrl").value = mod.imageUrl || "";
    document.getElementById("modDownloadUrl").value = mod.downloadUrl;
    document.getElementById("modDescription").value = mod.description || "";
    document.getElementById("modCategory").value = mod.category || "Bus Mod";
    adminModal.style.display = 'flex';
}
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    document.getElementById("modalIframe").src = "about:blank";
}
function resetAdminForm() {
    adminForm.reset();
    document.getElementById("editModId").value = "";
    adminModalTitle.innerText = "Add New Mod";
}

// Admin login: double-click title
mainTitle.addEventListener("dblclick", async () => {
    const token = prompt("🔐 Enter GitHub Personal Access Token (repo scope):");
    if(!token) return;
    // verify token by testing API
    try {
        const test = await fetch(API_URL, { headers: { Authorization: `token ${token}` }});
        if(test.ok) {
            gitHubToken = token;
            isAdmin = true;
            adminPanelDiv.style.display = "block";
            alert("Admin mode enabled!");
            renderCurrentPage(); // refresh to show edit icons
        } else {
            alert("Invalid token or no permission to repo.");
        }
    } catch(e) {
        alert("Connection error.");
    }
});

// Add button event
addModBtn.addEventListener("click", () => {
    resetAdminForm();
    adminModal.style.display = "flex";
});
adminForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("editModId").value;
    const modData = {
        id: id || null,
        name: document.getElementById("modName").value.trim(),
        gameVersion: document.getElementById("modVersion").value.trim(),
        author: document.getElementById("modAuthor").value.trim(),
        imageUrl: document.getElementById("modImageUrl").value.trim(),
        downloadUrl: document.getElementById("modDownloadUrl").value.trim(),
        description: document.getElementById("modDescription").value.trim(),
        category: document.getElementById("modCategory").value,
        timestamp: new Date().toISOString()
    };
    if(!modData.name || !modData.gameVersion || !modData.author || !modData.downloadUrl) {
        alert("Please fill required fields: Name, Version, Author, Download URL");
        return;
    }
    await saveMod(modData, !!id);
});
cancelAdminBtn.addEventListener("click", closeAllModals);

// Pagination
function updatePaginationInfo() {
    const total = Math.ceil(filteredMods.length / modsPerPage);
    pageInfoSpan.innerText = `Page ${currentPage} of ${total || 1}`;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= total;
}
function prevPage() { if(currentPage > 1) { currentPage--; renderCurrentPage(); } }
function nextPage() { const total = Math.ceil(filteredMods.length/modsPerPage); if(currentPage < total) { currentPage++; renderCurrentPage(); } }
prevBtn.addEventListener("click", prevPage);
nextBtn.addEventListener("click", nextPage);
searchInput.addEventListener("input", applyFilters);
categoryFilter.addEventListener("change", applyFilters);
versionFilter.addEventListener("change", applyFilters);
document.querySelectorAll('.close-btn').forEach(btn => btn.addEventListener("click", closeAllModals));
window.addEventListener("click", (e) => { if(e.target.classList.contains("modal")) closeAllModals(); });

// Start
loadModsFromGitHub();
