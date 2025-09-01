// Global variables
let albums = JSON.parse(localStorage.getItem('pennyAlbums')) || [];
let currentAlbum = null;
let currentImageData = null;
let currentAnalysis = null;

// DOM elements
const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const uploadPreview = document.getElementById('uploadPreview');
const previewImage = document.getElementById('previewImage');
const analyzeBtn = document.getElementById('analyzeBtn');
const analysisSection = document.getElementById('analysisSection');
const albumsGrid = document.getElementById('albumsGrid');
const createAlbumBtn = document.getElementById('createAlbumBtn');
const createAlbumModal = document.getElementById('createAlbumModal');
const albumViewModal = document.getElementById('albumViewModal');
const editAlbumModal = document.getElementById('editAlbumModal');
const editModal = document.getElementById('editModal');
const emptyAlbumsState = document.getElementById('emptyAlbumsState');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    renderAlbums();
    showEmptyAlbumsStateIfNeeded();
});

// Event listeners setup
function initializeEventListeners() {
    // File upload events
    imageInput.addEventListener('change', handleFileSelect);
    uploadArea.addEventListener('click', () => imageInput.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('drop', handleDrop);
    uploadArea.addEventListener('dragenter', handleDragEnter);
    uploadArea.addEventListener('dragleave', handleDragLeave);

    // Analysis events
    analyzeBtn.addEventListener('click', analyzeImage);

    // Album events
    createAlbumBtn.addEventListener('click', openCreateAlbumModal);

    // Save and edit events
    document.getElementById('saveBtn').addEventListener('click', saveToAlbum);
    document.getElementById('editBtn').addEventListener('click', openEditModal);
}

// File upload handling
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        processImageFile(file);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        processImageFile(files[0]);
    }
}

function handleDragEnter(event) {
    event.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
}

function processImageFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        currentImageData = e.target.result;
        previewImage.src = currentImageData;
        uploadPreview.style.display = 'block';
        uploadArea.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function resetUpload() {
    currentImageData = null;
    currentAnalysis = null;
    uploadPreview.style.display = 'none';
    uploadArea.style.display = 'block';
    analysisSection.style.display = 'none';
    imageInput.value = '';
}

// AI Analysis simulation
async function analyzeImage() {
    if (!currentImageData) return;

    // Show loading state
    analyzeBtn.innerHTML = '<div class="loading"></div> Analyzing...';
    analyzeBtn.disabled = true;

    // Simulate AI analysis delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate AI analysis results
    const analysisResults = simulateAIAnalysis();
    currentAnalysis = analysisResults;

    // Display results
    document.getElementById('locationResult').textContent = analysisResults.location;
    document.getElementById('descriptionResult').textContent = analysisResults.description;
    document.getElementById('dateResult').textContent = analysisResults.date;

    // Show analysis section
    analysisSection.style.display = 'block';

    // Reset button state
    analyzeBtn.innerHTML = '<i class="fas fa-magic"></i> Analyze with AI';
    analyzeBtn.disabled = false;

    // Scroll to analysis results
    analysisSection.scrollIntoView({ behavior: 'smooth' });
}

function simulateAIAnalysis() {
    // Simulate different types of elongated pennies
    const pennyTypes = [
        {
            location: "Disneyland, Anaheim, CA",
            description: "This appears to be a classic Disneyland pressed penny featuring Mickey Mouse. The design shows Mickey in his iconic pose, likely from the 1980s-1990s era. These pennies were popular souvenirs from the penny press machines located throughout the park.",
            date: "1985-1995 (estimated)"
        },
        {
            location: "Yellowstone National Park, WY",
            description: "This elongated penny features a bison design, representing the iconic wildlife of Yellowstone National Park. The pressed penny likely comes from one of the visitor centers or gift shops within the park, showcasing the park's natural heritage.",
            date: "1990-2010 (estimated)"
        },
        {
            location: "Times Square, New York, NY",
            description: "This pressed penny displays the famous Times Square skyline with the iconic billboards and neon lights. It's a popular tourist souvenir from the heart of Manhattan, capturing the essence of the city that never sleeps.",
            date: "2000-2020 (estimated)"
        },
        {
            location: "San Francisco Cable Car, CA",
            description: "This elongated penny features a San Francisco cable car design, representing the historic transportation system that's been operating since 1873. The penny likely comes from a souvenir shop near the cable car routes or Fisherman's Wharf.",
            date: "1995-2015 (estimated)"
        },
        {
            location: "Mount Rushmore, Keystone, SD",
            description: "This pressed penny showcases the famous Mount Rushmore National Memorial with the four presidential faces carved into the granite. It's a classic souvenir from one of America's most iconic landmarks.",
            date: "1980-2000 (estimated)"
        }
    ];

    // Randomly select a penny type for simulation
    return pennyTypes[Math.floor(Math.random() * pennyTypes.length)];
}

// Collection management
function saveToCollection() {
    if (!currentImageData || !currentAnalysis) return;

    const penny = {
        id: Date.now(),
        image: currentImageData,
        name: `Elongated Penny - ${currentAnalysis.location}`,
        location: currentAnalysis.location,
        description: currentAnalysis.description,
        date: currentAnalysis.date,
        dateCollected: new Date().toISOString().split('T')[0],
        notes: '',
        createdAt: new Date().toISOString()
    };

    currentCollection.push(penny);
    saveCollectionToStorage();
    renderCollection();
    resetUpload();
    
    // Show success message
    showNotification('Penny added to collection successfully!', 'success');
}

function openEditModal() {
    if (!currentAnalysis) return;

    // Populate modal with current analysis data
    document.getElementById('editName').value = `Elongated Penny - ${currentAnalysis.location}`;
    document.getElementById('editLocation').value = currentAnalysis.location;
    document.getElementById('editDescription').value = currentAnalysis.description;
    document.getElementById('editDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('editNotes').value = '';

    editModal.style.display = 'block';
}

function closeModal() {
    editModal.style.display = 'none';
}

function saveEdit() {
    const pennyId = editModal.dataset.pennyId;
    
    if (pennyId) {
        // Editing existing penny
        const penny = currentCollection.find(p => p.id === parseInt(pennyId));
        if (penny) {
            penny.name = document.getElementById('editName').value;
            penny.location = document.getElementById('editLocation').value;
            penny.description = document.getElementById('editDescription').value;
            penny.dateCollected = document.getElementById('editDate').value;
            penny.notes = document.getElementById('editNotes').value;
            
            saveCollectionToStorage();
            renderCollection();
        }
    } else {
        // Editing current analysis before saving
        currentAnalysis = {
            ...currentAnalysis,
            name: document.getElementById('editName').value,
            location: document.getElementById('editLocation').value,
            description: document.getElementById('editDescription').value,
            dateCollected: document.getElementById('editDate').value,
            notes: document.getElementById('editNotes').value
        };

        // Update the display
        document.getElementById('locationResult').textContent = currentAnalysis.location;
        document.getElementById('descriptionResult').textContent = currentAnalysis.description;
        document.getElementById('dateResult').textContent = currentAnalysis.date;
    }

    closeModal();
    showNotification('Changes saved successfully!', 'success');
}

// Album rendering and management functions are now in the album management section below

// Utility functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#51cf66' : type === 'error' ? '#ff6b6b' : '#667eea'};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 1001;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    if (event.target === editModal) {
        closeModal();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
        closeCreateAlbumModal();
        closeAlbumViewModal();
        closeEditAlbumModal();
    }
});

// Modal functions
function closeModal() {
    editModal.style.display = 'none';
    window.currentEditingPenny = null;
}

// Album Management Functions
function openCreateAlbumModal() {
    createAlbumModal.style.display = 'block';
    document.getElementById('albumName').focus();
}

function closeCreateAlbumModal() {
    createAlbumModal.style.display = 'none';
    document.getElementById('createAlbumForm').reset();
}

function createAlbum() {
    const name = document.getElementById('albumName').value.trim();
    const description = document.getElementById('albumDescription').value.trim();
    const category = document.getElementById('albumCategory').value;
    const imageUrl = (document.getElementById('albumImageUrl')?.value || '').trim();
    
    if (!name) {
        showNotification('Please enter an album name', 'error');
        return;
    }
    
    const newAlbum = {
        id: Date.now().toString(),
        name: name,
        description: description,
        category: category,
        imageUrl: imageUrl,
        pennies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    albums.push(newAlbum);
    saveAlbumsToStorage();
    renderAlbums();
    closeCreateAlbumModal();
    showNotification('Album created successfully!', 'success');
}

function renderAlbums() {
    if (albums.length === 0) {
        albumsGrid.style.display = 'none';
        emptyAlbumsState.style.display = 'block';
        return;
    }
    
    albumsGrid.style.display = 'grid';
    emptyAlbumsState.style.display = 'none';
    
    albumsGrid.innerHTML = albums.map(album => {
        const hasCover = album.imageUrl && album.imageUrl.length > 0;
        const coverStyle = hasCover ? ` style="--album-cover-url: url('${album.imageUrl.replace(/"/g, '\\"')}')"` : '';
        return `
        <div class="album-card${hasCover ? ' has-cover' : ''}" data-album-id="${album.id}"${coverStyle}>
            ${hasCover ? '<div class=\"album-cover\"></div>' : ''}
            <div class="album-content">
                <div class="album-header">
                    <h3 class="album-title">${album.name}</h3>
                    <span class="album-category">${getCategoryDisplayName(album.category)}</span>
                </div>
                <p class="album-description">${album.description || 'No description'}</p>
                <div class="album-stats">
                    <span class="penny-count">
                        <i class="fas fa-coins"></i> ${album.pennies.length} ${album.pennies.length === 1 ? 'penny' : 'pennies'}
                    </span>
                    <span class="album-date">Created ${new Date(album.createdAt).toLocaleDateString()}</span>
                </div>
                <div class="album-actions">
                    <button class="album-action-btn view-btn" onclick="openAlbumView('${album.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="album-action-btn edit-btn" onclick="editAlbum('${album.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="album-action-btn delete-btn" onclick="deleteAlbum('${album.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function getCategoryDisplayName(category) {
    const categories = {
        'theme-park': 'Theme Parks',
        'national-park': 'National Parks',
        'city-landmark': 'City Landmarks',
        'museum': 'Museums',
        'zoo-aquarium': 'Zoos & Aquariums',
        'other': 'Other'
    };
    return categories[category] || category;
}

function openAlbumView(albumId) {
    currentAlbum = albums.find(album => album.id === albumId);
    if (!currentAlbum) return;
    
    document.getElementById('albumViewTitle').textContent = currentAlbum.name;
    
    // Update album info
    document.getElementById('albumInfo').innerHTML = `
        <div class="album-info-content">
            <p><strong>Category:</strong> ${getCategoryDisplayName(currentAlbum.category)}</p>
            <p><strong>Description:</strong> ${currentAlbum.description || 'No description'}</p>
            <p><strong>Created:</strong> ${new Date(currentAlbum.createdAt).toLocaleDateString()}</p>
            <p><strong>Pennies:</strong> ${currentAlbum.pennies.length}</p>
        </div>
    `;
    
    renderAlbumPennies();
    albumViewModal.style.display = 'block';
}

function closeAlbumViewModal() {
    albumViewModal.style.display = 'none';
    currentAlbum = null;
    resetUpload();
}

function renderAlbumPennies() {
    const penniesGrid = document.getElementById('penniesGrid');
    
    if (currentAlbum.pennies.length === 0) {
        penniesGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-coins"></i>
                <h4>No Pennies Yet</h4>
                <p>Add your first penny to this album!</p>
            </div>
        `;
        return;
    }
    
    penniesGrid.innerHTML = currentAlbum.pennies.map(penny => `
        <div class="penny-item" data-penny-id="${penny.id}">
            <img src="${penny.imageData}" alt="${penny.name}" class="penny-image">
            <div class="penny-info">
                <h4>${penny.name}</h4>
                <p class="location">${penny.location}</p>
                <p class="description">${penny.description}</p>
                <p class="date">${penny.dateCollected ? new Date(penny.dateCollected).toLocaleDateString() : 'No date'}</p>
            </div>
            <div class="penny-actions">
                <button class="penny-action-btn edit-btn" onclick="editPennyInAlbum('${penny.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="penny-action-btn delete-btn" onclick="deletePennyFromAlbum('${penny.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function editAlbum(albumId) {
    const album = albums.find(a => a.id === albumId);
    if (!album) return;
    
    // Store current album and populate form
    currentAlbum = album;
    document.getElementById('editAlbumName').value = album.name || '';
    document.getElementById('editAlbumDescription').value = album.description || '';
    document.getElementById('editAlbumCategory').value = album.category || 'other';
    document.getElementById('editAlbumImageUrl').value = album.imageUrl || '';
    
    editAlbumModal.dataset.albumId = album.id;
    editAlbumModal.style.display = 'block';
}

function closeEditAlbumModal() {
    editAlbumModal.style.display = 'none';
    editAlbumModal.dataset.albumId = '';
}

function saveAlbumEdit() {
    const albumId = editAlbumModal.dataset.albumId;
    const album = albums.find(a => a.id === albumId);
    if (!album) return;
    
    const name = document.getElementById('editAlbumName').value.trim();
    const description = document.getElementById('editAlbumDescription').value.trim();
    const category = document.getElementById('editAlbumCategory').value;
    const imageUrl = (document.getElementById('editAlbumImageUrl').value || '').trim();
    
    Object.assign(album, { name, description, category, imageUrl });
    album.updatedAt = new Date().toISOString();
    saveAlbumsToStorage();
    renderAlbums();
    closeEditAlbumModal();
    showNotification('Album updated successfully!', 'success');
}

function updateAlbum(albumId, updates) {
    const album = albums.find(a => a.id === albumId);
    if (!album) return;
    
    Object.assign(album, updates);
    album.updatedAt = new Date().toISOString();
    saveAlbumsToStorage();
    renderAlbums();
}

function deleteAlbum(albumId) {
    if (!confirm('Are you sure you want to delete this album? This action cannot be undone.')) {
        return;
    }
    
    const index = albums.findIndex(a => a.id === albumId);
    if (index > -1) {
        albums.splice(index, 1);
        saveAlbumsToStorage();
        renderAlbums();
        showNotification('Album deleted successfully!', 'success');
    }
}

function saveToAlbum() {
    if (!currentAlbum || !currentImageData || !currentAnalysis) {
        showNotification('Please complete the analysis first', 'error');
        return;
    }
    
    const penny = {
        id: Date.now().toString(),
        name: currentAnalysis.location || 'Unknown Location',
        location: currentAnalysis.location || 'Unknown',
        description: currentAnalysis.description || 'No description',
        dateCollected: currentAnalysis.date || new Date().toISOString().split('T')[0],
        notes: '',
        imageData: currentImageData,
        analysis: currentAnalysis,
        addedAt: new Date().toISOString()
    };
    
    currentAlbum.pennies.push(penny);
    currentAlbum.updatedAt = new Date().toISOString();
    
    saveAlbumsToStorage();
    renderAlbumPennies();
    resetUpload();
    
    showNotification('Penny added to album successfully!', 'success');
}

function editPennyInAlbum(pennyId) {
    const penny = currentAlbum.pennies.find(p => p.id === pennyId);
    if (!penny) return;
    
    // Populate edit form
    document.getElementById('editName').value = penny.name;
    document.getElementById('editLocation').value = penny.location;
    document.getElementById('editDescription').value = penny.description;
    document.getElementById('editDate').value = penny.dateCollected || '';
    document.getElementById('editNotes').value = penny.notes || '';
    
    // Store current penny for editing
    window.currentEditingPenny = penny;
    
    editModal.style.display = 'block';
}

function deletePennyFromAlbum(pennyId) {
    if (!confirm('Are you sure you want to delete this penny?')) {
        return;
    }
    
    const index = currentAlbum.pennies.findIndex(p => p.id === pennyId);
    if (index > -1) {
        currentAlbum.pennies.splice(index, 1);
        currentAlbum.updatedAt = new Date().toISOString();
        saveAlbumsToStorage();
        renderAlbumPennies();
        showNotification('Penny deleted successfully!', 'success');
    }
}

function saveEdit() {
    if (!window.currentEditingPenny || !currentAlbum) return;
    
    const penny = window.currentEditingPenny;
    penny.name = document.getElementById('editName').value;
    penny.location = document.getElementById('editLocation').value;
    penny.description = document.getElementById('editDescription').value;
    penny.dateCollected = document.getElementById('editDate').value;
    penny.notes = document.getElementById('editNotes').value;
    penny.updatedAt = new Date().toISOString();
    
    currentAlbum.updatedAt = new Date().toISOString();
    saveAlbumsToStorage();
    renderAlbumPennies();
    closeModal();
    
    showNotification('Penny updated successfully!', 'success');
}

function saveAlbumsToStorage() {
    localStorage.setItem('pennyAlbums', JSON.stringify(albums));
}

function showEmptyAlbumsStateIfNeeded() {
    if (albums.length === 0) {
        renderAlbums();
    }
}

// Close modals when clicking outside
window.addEventListener('click', function(event) {
    if (event.target === editModal) {
        closeModal();
    }
    if (event.target === createAlbumModal) {
        closeCreateAlbumModal();
    }
    if (event.target === albumViewModal) {
        closeAlbumViewModal();
    }
    if (event.target === editAlbumModal) {
        closeEditAlbumModal();
    }
});

