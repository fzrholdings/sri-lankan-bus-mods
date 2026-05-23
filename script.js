// ========== CONFIGURATION ==========
let allMods = [];
let filteredMods = [];
let currentPage = 1;
const modsPerPage = 24;
let gitHubToken = null;
let isAdmin = false;

const REPO_OWNER = "fzrholdings";
const REPO_NAME = "sri-lankan-bus-mods";
const FILE_PATH = "mods.json";
const RAW_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${FILE_PATH}`;
const API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

// DOM elements
const modsContainer = document.getElementById("modsContainer");
const searchInput = document.getElementById("searchInput");
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
const detailsModal = document.getElementById("detailsModal");
const detailsContent = document.getElementById("detailsContent");

// Helper: escape HTML
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
        allMods = data.map(mod => ({
            ...mod,
            gameVersion: mod.gameVersion || mod.version || "1.50",
            category: mod.category || "Bus Mod"
        }));
        applyFilters();
    } catch (err) {
        modsContainer.innerHTML = `<div class="error">Failed to load mods: ${err.message}</div>`;
        console.error(err);
    }
}

// Filter (search only)
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    filteredMods = allMods.filter(mod => {
        return searchTerm === "" ||
            (mod.name && mod.name.toLowerCase().includes(searchTerm)) ||
            (mod.author && mod.author.toLowerCase().includes(searchTerm)) ||
            (mod.description && mod.description.toLowerCase().includes(searchTerm));
    });
    currentPage = 1;
    renderCurrentPage();
}

// Render mods
function renderCurrentPage() {
    if (!filteredMods.length) {
        modsContainer.innerHTML = '<div class="no-mods">No mods found. Try a different search.</div>';
        updatePaginationInfo();
        return;
    }

    const start = (currentPage - 1) * modsPerPage;
    const pageMods = filteredMods.slice(start, start + modsPerPage);
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
            <div class="mod-desc">${escapeHtml(mod.description ? mod.description.substring(0, 100) : '')}${mod.description && mod.description.length > 100 ? '…' : ''}</div>
            <button class="download-btn" data-url="${escapeHtml(mod.downloadUrl)}">Download</button>
            ${isAdmin ? `<div class="admin-icons">
                <span class="edit-mod" data-id="${mod.id}">Edit</span>
                <span class="delete-mod" data-id="${mod.id}">Del</span>
            </div>` : ''}
        `;
        modsContainer.appendChild(card);
    });

    // Download button: new tab
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const url = btn.getAttribute('data-url');
            if (url && url !== '#') {
                window.open(url, '_blank');
            } else {
                alert("Download link not available");
            }
        });
    });

    // Card click -> details modal
    document.querySelectorAll('.mod-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.download-btn') || e.target.closest('.admin-icons')) return;
            const name = card.querySelector('h3')?.innerText;
            const mod = allMods.find(m => m.name === name);
            if (mod) openDetailsModal(mod);
        });
    });

    // Admin edit/delete
    if (isAdmin) {
        document.querySelectorAll('.edit-mod').forEach(span => {
            span.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = span.getAttribute('data-id');
                const mod = allMods.find(m => m.id == id);
                if (mod) openEditModal(mod);
            });
        });
        document.querySelectorAll('.delete-mod').forEach(span => {
            span.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = span.getAttribute('data-id');
                if (confirm("Delete this mod permanently?")) {
                    await deleteModById(id);
                }
            });
        });
    }

    updatePaginationInfo();
}

// Details modal
function openDetailsModal(mod) {
    const imgUrl = mod.imageUrl && mod.imageUrl.trim() ? mod.imageUrl : "https://via.placeholder.com/600x300?text=No+Image";
    detailsContent.innerHTML = `
        <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(mod.name)}" onerror="this.src='https://via.placeholder.com/600x300?text=No+Image'">
        <h2>${escapeHtml(mod.name)}</h2>
        <div class="details-meta">
            <span class="badge game-badge">${escapeHtml(mod.category)}</span>
            <span class="badge version-badge">Version: ${escapeHtml(mod.gameVersion)}</span>
        </div>
        <p class="details-author"><strong>Author:</strong> ${escapeHtml(mod.author)}</p>
        <div class="details-description">
            <strong>Description:</strong>
            <p>${escapeHtml(mod.description || "No description available.")}</p>
        </div>
        <button class="download-details-btn" data-url="${escapeHtml(mod.downloadUrl)}">Download Mod</button>
    `;
    detailsModal.style.display = "flex";

    const detailsDownloadBtn = detailsContent.querySelector(".download-details-btn");
    if (detailsDownloadBtn) {
        detailsDownloadBtn.addEventListener("click", (e) => {
            const url = detailsDownloadBtn.getAttribute("data-url");
            if (url && url !== "#") {
                window.open(url, "_blank");
            } else {
                alert("Download link not available");
            }
        });
    }
}

// ========== GITHUB COMMIT (fixed with proper error handling) ==========
async function commitToGitHub(newContentArray) {
    if (!gitHubToken) throw new Error("Not authenticated");

    // 1. Get current file SHA
    const res = await fetch(API_URL, {
        headers: { Authorization: `token ${gitHubToken}`, Accept: "application/vnd.github.v3+json" }
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to fetch file info: ${res.status} ${errText}`);
    }
    const fileData = await res.json();
    const sha = fileData.sha;

    // 2. Prepare base64 content (correct way for browser)
    const jsonString = JSON.stringify(newContentArray, null, 2);
    const base64Content = btoa(unescape(encodeURIComponent(jsonString)));

    // 3. Commit
    const putRes = await fetch(API_URL, {
        method: "PUT",
        headers: { Authorization: `token ${gitHubToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            message: "Update mods.json via web admin",
            content: base64Content,
            sha: sha,
            branch: "main"
        })
    });

    if (!putRes.ok) {
        const errorBody = await putRes.text();
        throw new Error(`GitHub commit failed (${putRes.status}): ${errorBody}`);
    }

    const result = await putRes.json();
    console.log("Commit successful:", result);
    return true;
}

// Save mod (add or edit)
async function saveMod(modData, isEdit = false) {
    let newMods = [...allMods];
    if (isEdit) {
        const index = newMods.findIndex(m => m.id === modData.id);
        if (index !== -1) newMods[index] = modData;
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
    } catch (err) {
        console.error("Save error:", err);
        alert("Error saving: " + err.message);
        return false;
    }
}

// Delete mod
async function deleteModById(id) {
    const newMods = allMods.filter(m => m.id != id);
    try {
        await commitToGitHub(newMods);
        await loadModsFromGitHub();
        alert("Mod deleted permanently from GitHub.");
    } catch (err) {
        console.error("Delete error:", err);
        alert("Delete failed: " + err.message + "\nCheck console for details.");
    }
}

// Admin modal handlers
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
    adminModal.style.display = "flex";
}

function resetAdminForm() {
    adminForm.reset();
    document.getElementById("editModId").value = "";
    adminModalTitle.innerText = "Add New Mod";
}

function closeAllModals() {
    document.querySelectorAll(".modal").forEach(m => m.style.display = "none");
}

// Admin login: double click title
mainTitle.addEventListener("dblclick", async () => {
    const token = prompt("Enter GitHub Personal Access Token (repo scope):");
    if (!token) return;
    try {
        const test = await fetch(API_URL, { headers: { Authorization: `token ${token}` } });
        if (test.ok) {
            gitHubToken = token;
            isAdmin = true;
            adminPanelDiv.style.display = "block";
            alert("Admin mode enabled! You can now Edit/Delete mods.");
            renderCurrentPage();  // refresh to show edit/del icons
        } else {
            alert("Invalid token or no permission to repo.");
        }
    } catch (e) {
        alert("Connection error: " + e.message);
    }
});

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
    if (!modData.name || !modData.gameVersion || !modData.author || !modData.downloadUrl) {
        alert("Please fill required fields: Name, Version, Author, Download URL");
        return;
    }
    await saveMod(modData, !!id);
});

cancelAdminBtn.addEventListener("click", closeAllModals);

// Pagination
function updatePaginationInfo() {
    const totalPages = Math.ceil(filteredMods.length / modsPerPage);
    pageInfoSpan.innerText = `Page ${currentPage} of ${totalPages || 1}`;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderCurrentPage();
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredMods.length / modsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderCurrentPage();
    }
}

// Event listeners
searchInput.addEventListener("input", applyFilters);
prevBtn.addEventListener("click", prevPage);
nextBtn.addEventListener("click", nextPage);

document.querySelectorAll(".close-btn").forEach(btn => {
    btn.addEventListener("click", closeAllModals);
});

window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) closeAllModals();
});

// Start
loadModsFromGitHub();
