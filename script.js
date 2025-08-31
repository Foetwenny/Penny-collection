// Global variables
let currentCollection = JSON.parse(localStorage.getItem('pennyCollection')) || [];
let currentImageData = null;
let currentAnalysis = null;

// DOM elements
const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const uploadPreview = document.getElementById('uploadPreview');
const previewImage = document.getElementById('previewImage');
const analyzeBtn = document.getElementById('analyzeBtn');
const analysisSection = document.getElementById('analysisSection');
const collectionGrid = document.getElementById('collectionGrid');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const editModal = document.getElementById('editModal');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    renderCollection();
    showEmptyStateIfNeeded();
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

    // Collection events
    searchInput.addEventListener('input', filterCollection);
    sortSelect.addEventListener('change', sortCollection);

    // Save and edit events
    document.getElementById('saveBtn').addEventListener('click', saveToCollection);
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
    const formData = {
        name: document.getElementById('editName').value,
        location: document.getElementById('editLocation').value,
        description: document.getElementById('editDescription').value,
        dateCollected: document.getElementById('editDate').value,
        notes: document.getElementById('editNotes').value
    };

    // Update current analysis
    currentAnalysis = {
        ...currentAnalysis,
        ...formData
    };

    closeModal();
    
    // Update the display
    document.getElementById('locationResult').textContent = currentAnalysis.location;
    document.getElementById('descriptionResult').textContent = currentAnalysis.description;
    document.getElementById('dateResult').textContent = currentAnalysis.date;
}

// Collection rendering
function renderCollection() {
    if (currentCollection.length === 0) {
        collectionGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-coins"></i>
                <h3>No pennies in your collection yet</h3>
                <p>Upload your first elongated penny to get started!</p>
            </div>
        `;
        return;
    }

    collectionGrid.innerHTML = currentCollection.map(penny => `
        <div class="collection-item" data-id="${penny.id}">
            <img src="${penny.image}" alt="${penny.name}">
            <h3>${penny.name}</h3>
            <div class="location">${penny.location}</div>
            <div class="description">${penny.description}</div>
            <div class="date">Collected: ${penny.dateCollected}</div>
            ${penny.notes ? `<div class="notes">Notes: ${penny.notes}</div>` : ''}
            <div class="actions">
                <button class="edit" onclick="editCollectionItem(${penny.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="delete" onclick="deleteCollectionItem(${penny.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

function editCollectionItem(id) {
    const penny = currentCollection.find(p => p.id === id);
    if (!penny) return;

    // Populate modal with penny data
    document.getElementById('editName').value = penny.name;
    document.getElementById('editLocation').value = penny.location;
    document.getElementById('editDescription').value = penny.description;
    document.getElementById('editDate').value = penny.dateCollected;
    document.getElementById('editNotes').value = penny.notes || '';

    // Store the penny ID for updating
    editModal.dataset.pennyId = id;
    editModal.style.display = 'block';
}

function deleteCollectionItem(id) {
    if (confirm('Are you sure you want to delete this penny from your collection?')) {
        currentCollection = currentCollection.filter(p => p.id !== id);
        saveCollectionToStorage();
        renderCollection();
        showNotification('Penny removed from collection', 'info');
    }
}

// Collection filtering and sorting
function filterCollection() {
    const searchTerm = searchInput.value.toLowerCase();
    const items = document.querySelectorAll('.collection-item');
    
    items.forEach(item => {
        const name = item.querySelector('h3').textContent.toLowerCase();
        const location = item.querySelector('.location').textContent.toLowerCase();
        const description = item.querySelector('.description').textContent.toLowerCase();
        
        const matches = name.includes(searchTerm) || 
                       location.includes(searchTerm) || 
                       description.includes(searchTerm);
        
        item.style.display = matches ? 'block' : 'none';
    });
}

function sortCollection() {
    const sortBy = sortSelect.value;
    
    currentCollection.sort((a, b) => {
        switch (sortBy) {
            case 'date':
                return new Date(b.dateCollected) - new Date(a.dateCollected);
            case 'location':
                return a.location.localeCompare(b.location);
            case 'name':
                return a.name.localeCompare(b.name);
            default:
                return 0;
        }
    });
    
    renderCollection();
}

// Storage management
function saveCollectionToStorage() {
    localStorage.setItem('pennyCollection', JSON.stringify(currentCollection));
}

function showEmptyStateIfNeeded() {
    if (currentCollection.length === 0) {
        renderCollection();
    }
}

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
    }
});
