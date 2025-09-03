// Global variables
let albums = JSON.parse(localStorage.getItem('pennyAlbums')) || [];
let currentAlbum = null;
let currentImageData = null;
let currentAnalysis = null;
let isSharedView = false; // Track if we're viewing a shared album

// Collection name
let collectionName = localStorage.getItem('collectionName') || 'Your Albums';

// Dark mode state
let isDarkMode = localStorage.getItem('darkMode') === 'true';

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
const addPennyModal = document.getElementById('addPennyModal');
const pennyViewModal = document.getElementById('pennyViewModal');
const editModal = document.getElementById('editModal');
const emptyAlbumsState = document.getElementById('emptyAlbumsState');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    initializeSearch();
    checkForSharedAlbum();
    renderAlbums();
    showEmptyAlbumsStateIfNeeded();
    initializeDarkMode();
    initializeSortEventListeners();
    updateCollectionNameDisplay();
    
    // Apply default sort
    const currentSort = getCurrentSortSettings();
    sortAlbums(currentSort.field, currentSort.direction);
    updateSortIndicator(currentSort.field, currentSort.direction);
    
    // Set up menu event listeners (only once)
    console.log('=== Setting up menu event listeners ===');
    const menuToggle = document.getElementById('menuToggle');
    console.log('Found menuToggle element:', menuToggle);
    
    if (menuToggle) {
        console.log('Setting up click outside listener for menu...');
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            // Don't close if clicking on the menu toggle button itself
            if (event.target === menuToggle || menuToggle.contains(event.target)) {
                return;
            }
            
            const menuContainer = menuToggle.closest('.menu-dropdown');
            if (menuContainer && !menuContainer.contains(event.target)) {
                console.log('Click outside menu detected, closing menu...');
                menuContainer.classList.remove('active');
                menuToggle.classList.remove('active');
            }
        });
        console.log('Menu click outside listener set up successfully');
    } else {
        console.error('menuToggle element not found!');
    }
    console.log('=== Menu event listeners setup completed ===');
    
    // Set up user guide navigation event listeners
    document.querySelectorAll('.guide-nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const sectionId = this.getAttribute('data-section');
            showGuideSection(sectionId);
        });
    });
});

// Dark mode functions
function initializeDarkMode() {
    if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateDarkModeToggleIcon();
    }
}

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    localStorage.setItem('darkMode', isDarkMode);
    
    if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    
    updateDarkModeToggleIcon();
}

function updateDarkModeToggleIcon() {
    const toggleBtn = document.getElementById('darkModeToggle');
    if (toggleBtn) {
        const icon = toggleBtn.querySelector('i');
        if (icon) {
            icon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
}

// Menu and Search Functions
function toggleMenu() {
    console.log('=== toggleMenu function called ===');
    
    const menuDropdown = document.getElementById('menuDropdown');
    const menuToggle = document.getElementById('menuToggle');
    
    console.log('menuDropdown element:', menuDropdown);
    console.log('menuToggle element:', menuToggle);
    
    if (!menuDropdown || !menuToggle) {
        console.error('Menu elements not found!');
        return;
    }
    
    console.log('Current menuDropdown classes:', menuDropdown.classList.toString());
    console.log('Current menuToggle classes:', menuToggle.classList.toString());
    
    // Get the parent container
    const menuContainer = menuToggle.closest('.menu-dropdown');
    if (!menuContainer) {
        return;
    }
    
    if (menuContainer.classList.contains('active')) {
        console.log('Closing menu...');
        menuContainer.classList.remove('active');
        menuToggle.classList.remove('active');
    } else {
        console.log('Opening menu...');
        // Close any other open dropdowns first
        document.querySelectorAll('.menu-dropdown.active').forEach(dropdown => {
            dropdown.classList.remove('active');
        });
        menuContainer.classList.add('active');
        menuToggle.classList.add('active');
    }
    
            console.log('After toggle - menuDropdown classes:', menuDropdown.classList.toString());
        console.log('After toggle - menuToggle classes:', menuToggle.classList.toString());
        
        // Check if the menu is actually visible
        const computedStyle = window.getComputedStyle(menuDropdown);
        console.log('Menu display style:', computedStyle.display);
        console.log('Menu visibility style:', computedStyle.visibility);
        console.log('Menu opacity style:', computedStyle.opacity);
        console.log('Menu z-index style:', computedStyle.zIndex);
        
        console.log('=== toggleMenu function completed ===');
}

// Menu event listener will be set up in initializeEventListeners

// Search functionality
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    
    if (searchInput) {
        searchInput.addEventListener('input', performSearch);
        searchInput.addEventListener('keyup', function(event) {
            if (event.key === 'Escape') {
                clearSearch();
            }
        });
    }
    
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearSearch);
    }
}

function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim().toLowerCase();
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const searchResultsSection = document.getElementById('searchResultsSection');
    
    if (searchTerm.length === 0) {
        clearSearch();
        return;
    }
    
    // Show clear button
    clearSearchBtn.style.display = 'block';
    
            // Perform search across albums with match details
        const searchResults = albums.map(album => {
            // Handle both old single category and new multiple categories
            const albumCategories = album.categories || (album.category ? [album.category] : []);
            const categoryMatch = albumCategories.some(cat => cat.toLowerCase().includes(searchTerm));
            
            const matches = {
                name: album.name.toLowerCase().includes(searchTerm),
                description: album.description && album.description.toLowerCase().includes(searchTerm),
                categories: categoryMatch,
                location: album.location && album.location.toLowerCase().includes(searchTerm),
                pennies: album.pennies.filter(penny => 
                    penny.description && penny.description.toLowerCase().includes(searchTerm)
                )
            };
            
            const hasMatches = matches.name || matches.description || matches.categories || matches.location || matches.pennies.length > 0;
            
            return hasMatches ? { ...album, searchMatches: matches, searchTerm } : null;
        }).filter(Boolean);
    
    // Update search results display
    updateSearchResults(searchResults, searchTerm);
    
    // Filter albums grid
    renderFilteredAlbums(searchResults);
}

function updateSearchResults(results, query) {
    const searchResultsSection = document.getElementById('searchResultsSection');
    const searchResultsCount = document.getElementById('searchResultsCount');
    const searchResultsQuery = document.getElementById('searchResultsQuery');
    
    if (results.length > 0) {
        searchResultsCount.textContent = `${results.length} result${results.length === 1 ? '' : 's'}`;
        searchResultsQuery.textContent = `for "${query}"`;
        searchResultsSection.style.display = 'block';
    } else {
        searchResultsCount.textContent = 'No results found';
        searchResultsQuery.textContent = `for "${query}"`;
        searchResultsSection.style.display = 'block';
    }
}

function renderFilteredAlbums(filteredAlbums) {
    const albumsGrid = document.getElementById('albumsGrid');
    
    if (filteredAlbums.length === 0) {
        albumsGrid.innerHTML = `
            <div class="empty-search-state">
                <i class="fas fa-search"></i>
                <h3>No albums found</h3>
                <p>Try adjusting your search terms or browse all albums.</p>
        `;
    } else {
        // Apply current sort to filtered results
        const currentSort = getCurrentSortSettings();
        const sortedResults = [...filteredAlbums];
        sortAlbumsArray(sortedResults, currentSort.field, currentSort.direction);
        renderAlbumsWithSearchHighlights(sortedResults);
    }
}

function renderAlbums() {
    if (albums.length === 0) {
        albumsGrid.style.display = 'none';
        emptyAlbumsState.style.display = 'block';
        // Hide sort indicator when no albums
        const sortIndicator = document.getElementById('sortIndicator');
        if (sortIndicator) {
            sortIndicator.style.display = 'none';
        }
        return;
    }
    
    albumsGrid.style.display = 'grid';
    emptyAlbumsState.style.display = 'none';
    
    // Show sort indicator when albums exist
    const sortIndicator = document.getElementById('sortIndicator');
    if (sortIndicator) {
        sortIndicator.style.display = 'flex';
    }
    
    albumsGrid.innerHTML = albums.map(album => {
        const hasCover = album.imageUrl && album.imageUrl.length > 0;
        const coverStyle = hasCover ? ` style="--album-cover-url: url('${album.imageUrl.replace(/"/g, '\\"')}')"` : '';
        return `
        <div class="album-card${hasCover ? ' has-cover' : ''}" data-album-id="${album.id}"${coverStyle} onclick="openAlbumView('${album.id}')">
            ${hasCover ? '<div class=\"album-cover\"></div>' : ''}
            <div class="album-content">
                <div class="album-header">
                    <h3 class="album-title">${album.name}</h3>
                </div>
                <p class="album-description">${album.description || 'No description'}</p>
                <div class="album-stats">
                    <span class="album-date">${album.tripDate ? `Trip: ${new Date(album.tripDate).toLocaleDateString()}` : 'No trip date set'}</span>
                    <span class="penny-count">
                        <i class="fas fa-coins"></i> ${album.pennies.length} ${album.pennies.length === 1 ? 'penny' : 'pennies'}
                    </span>
                </div>
                ${album.location ? `<div class="album-location">
                    <i class="fas fa-map-marker-alt"></i> 
                    ${(album.locationUrl && album.locationUrl.trim()) ? `<a href="${album.locationUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" title="Open location in new window">${album.location}</a>` : album.location}
                </div>` : ''}
            </div>
        </div>`;
    }).join('');
}

function renderAlbumsWithSearchHighlights(filteredAlbums) {
    if (filteredAlbums.length === 0) {
        albumsGrid.style.display = 'none';
        emptyAlbumsState.style.display = 'block';
        // Hide sort indicator when no albums
        const sortIndicator = document.getElementById('sortIndicator');
        if (sortIndicator) {
            sortIndicator.style.display = 'none';
        }
        return;
    }
    
    albumsGrid.style.display = 'grid';
    emptyAlbumsState.style.display = 'none';
    
    // Show sort indicator when albums exist
    const sortIndicator = document.getElementById('sortIndicator');
    if (sortIndicator) {
        sortIndicator.style.display = 'flex';
    }
    
    albumsGrid.innerHTML = filteredAlbums.map(album => {
        const hasCover = album.imageUrl && album.imageUrl.length > 0;
        const coverStyle = hasCover ? ` style="--album-cover-url: url('${album.imageUrl.replace(/"/g, '\\"')}')"` : '';
        const searchTerm = album.searchTerm || '';
        const matches = album.searchMatches || {};
        
        // Highlight matching text
        const highlightedName = highlightSearchTerm(album.name, searchTerm);
        const highlightedDescription = album.description ? highlightSearchTerm(album.description, searchTerm) : 'No description';
        
        // Handle both old single category and new multiple categories for highlighting
        const albumCategories = album.categories || (album.category ? [album.category] : []);
        const highlightedCategories = albumCategories.length > 0 ? 
            albumCategories.map(cat => highlightSearchTerm(cat, searchTerm)).join(', ') : '';
        
        const highlightedLocation = album.location ? highlightSearchTerm(album.location, searchTerm) : '';
        
        // Create match indicators
        const matchIndicators = [];
        if (matches.name) matchIndicators.push('<span class="match-indicator name-match"><i class="fas fa-tag"></i> Name</span>');
        if (matches.description) matchIndicators.push('<span class="match-indicator desc-match"><i class="fas fa-align-left"></i> Description</span>');
        if (matches.categories) matchIndicators.push('<span class="match-indicator cat-match"><i class="fas fa-folder"></i> Categories</span>');
        if (matches.location) matchIndicators.push('<span class="match-indicator loc-match"><i class="fas fa-map-marker-alt"></i> Location</span>');
        if (matches.pennies && matches.pennies.length > 0) {
                            matchIndicators.push(`<span class="match-indicator penny-match"><i class="fas fa-coins"></i> ${matches.pennies.length} Match${matches.pennies.length === 1 ? '' : 'es'}</span>`);
        }
        
        return `
        <div class="album-card search-result${hasCover ? ' has-cover' : ''}" data-album-id="${album.id}"${coverStyle} onclick="openAlbumView('${album.id}')">
            ${hasCover ? '<div class=\"album-cover\"></div>' : ''}
            <div class="album-content">
                <div class="album-header">
                    <h3 class="album-title">${highlightedName}</h3>
                    ${matchIndicators.length > 0 ? `<div class="search-match-indicators">${matchIndicators.join('')}</div>` : ''}
                </div>
                <p class="album-description">${highlightedDescription}</p>
                <div class="album-stats">
                    <span class="album-date">${album.tripDate ? `Trip: ${new Date(album.tripDate).toLocaleDateString()}` : 'No trip date set'}</span>
                    <span class="penny-count">
                        <i class="fas fa-coins"></i> ${album.pennies.length} ${album.pennies.length === 1 ? 'penny' : 'pennies'}
                    </span>
                </div>
                ${highlightedLocation ? `<div class="album-location">
                    <i class="fas fa-map-marker-alt"></i> 
                    ${(album.locationUrl && album.locationUrl.trim()) ? `<a href="${album.locationUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" title="Open location in new window">${highlightedLocation}</a>` : highlightedLocation}
                </div>` : ''}
            </div>
        </div>`;
    }).join('');
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const searchResultsSection = document.getElementById('searchResultsSection');
    
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    searchResultsSection.style.display = 'none';
    
    // Show all albums with current sort
    const currentSort = getCurrentSortSettings();
    sortAlbums(currentSort.field, currentSort.direction);
}

function populateCategoryCheckboxes(containerSelector, selectedCategories) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    
    // Clear all checkboxes first
    const checkboxes = container.querySelectorAll('.category-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    
    // Check the ones that match selected categories
    if (selectedCategories && selectedCategories.length > 0) {
        checkboxes.forEach(cb => {
            if (selectedCategories.includes(cb.value)) {
                cb.checked = true;
            }
        });
    }
}

function showAllAlbums() {
    clearSearch();
}

function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm || !text) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
}

// Menu action functions (placeholder implementations)
function openAdvancedSearch() {
    showNotification('Advanced search feature coming soon!', 'info');
}

function openSortOptions() {
    const modal = document.getElementById('sortOptionsModal');
    if (modal) {
        modal.style.display = 'block';
        loadCurrentSortSettings();
    }
}

function closeSortOptionsModal() {
    const modal = document.getElementById('sortOptionsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function loadCurrentSortSettings() {
    const currentSort = getCurrentSortSettings();
    
    // Set the radio button
    const radio = document.querySelector(`input[name="sortBy"][value="${currentSort.field}"]`);
    if (radio) {
        radio.checked = true;
    }
    
    // Set the direction buttons
    document.querySelectorAll('.direction-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.sort === currentSort.field && btn.dataset.direction === currentSort.direction) {
            btn.classList.add('active');
        }
    });
}

function getCurrentSortSettings() {
    const saved = localStorage.getItem('albumSortSettings');
    if (saved) {
        return JSON.parse(saved);
    }
    // Default sort: date created, newest first
    return { field: 'dateCreated', direction: 'desc' };
}

function saveSortSettings(field, direction) {
    const settings = { field, direction };
    localStorage.setItem('albumSortSettings', JSON.stringify(settings));
}

function applySort() {
    const selectedField = document.querySelector('input[name="sortBy"]:checked')?.value;
    const selectedDirection = document.querySelector('.direction-btn.active')?.dataset.direction;
    
    if (!selectedField || !selectedDirection) {
        showNotification('Please select both a sort field and direction', 'warning');
        return;
    }
    
    saveSortSettings(selectedField, selectedDirection);
    sortAlbums(selectedField, selectedDirection);
    closeSortOptionsModal();
    showNotification('Albums sorted successfully!', 'success');
}

function sortAlbums(field, direction) {
    const albumsCopy = [...albums]; // Create a copy to sort
    
    sortAlbumsArray(albumsCopy, field, direction);
    
    // Update the albums data and re-render
    albums = albumsCopy;
    renderAlbums();
    updateSortIndicator(field, direction);
}

function sortAlbumsArray(albumsArray, field, direction) {
    albumsArray.sort((a, b) => {
        let aValue, bValue;
        
        switch (field) {
            case 'dateCreated':
                aValue = new Date(a.dateCreated || a.createdAt || 0);
                bValue = new Date(b.dateCreated || b.createdAt || 0);
                break;
            case 'tripDate':
                aValue = new Date(a.tripDate || 0);
                bValue = new Date(b.tripDate || 0);
                break;
            case 'albumName':
                aValue = (a.name || '').toLowerCase();
                bValue = (b.name || '').toLowerCase();
                break;
            case 'location':
                aValue = (a.location || '').toLowerCase();
                bValue = (b.location || '').toLowerCase();
                break;
            case 'pennyCount':
                aValue = a.pennies ? a.pennies.length : 0;
                bValue = b.pennies ? b.pennies.length : 0;
                break;
            case 'lastModified':
                aValue = new Date(a.lastModified || a.updatedAt || a.dateCreated || 0);
                bValue = new Date(b.lastModified || b.updatedAt || b.dateCreated || 0);
                break;
            default:
                return 0;
        }
        
        if (direction === 'asc') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });
}

function updateSortIndicator(field, direction) {
    const indicator = document.getElementById('sortIndicatorText');
    if (!indicator) return;
    
    let fieldText, directionText;
    
    switch (field) {
        case 'dateCreated':
            fieldText = 'Date Created';
            directionText = direction === 'desc' ? 'Newest First' : 'Oldest First';
            break;
        case 'tripDate':
            fieldText = 'Trip Date';
            directionText = direction === 'desc' ? 'Most Recent Trip' : 'Oldest Trip';
            break;
        case 'albumName':
            fieldText = 'Album Name';
            directionText = direction === 'asc' ? 'A to Z' : 'Z to A';
            break;
        case 'location':
            fieldText = 'Location';
            directionText = direction === 'asc' ? 'A to Z' : 'Z to A';
            break;
        case 'pennyCount':
            fieldText = 'Penny Count';
            directionText = direction === 'desc' ? 'Most Pennies' : 'Least Pennies';
            break;
        case 'lastModified':
            fieldText = 'Last Modified';
            directionText = direction === 'desc' ? 'Recently Updated' : 'Oldest Update';
            break;
        default:
            fieldText = 'Unknown';
            directionText = '';
    }
    
    indicator.textContent = `Sorted by ${fieldText} (${directionText})`;
}

// Add event listeners for sort direction buttons
function initializeSortEventListeners() {
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('direction-btn')) {
            // Remove active class from all direction buttons in the same sort option
            const sortOption = event.target.closest('.sort-option');
            sortOption.querySelectorAll('.direction-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to clicked button
            event.target.classList.add('active');
        }
    });
}

function openFilterSettings() {
    showNotification('Filter settings feature coming soon!', 'info');
}

// openAIConfig function is now defined in ai-config.js

function openDisplayPreferences() {
    showNotification('Display preferences feature coming soon!', 'info');
}

function openCollectionDefaults() {
    showNotification('Collection defaults feature coming soon!', 'info');
}

function openUserGuide() {
    showNotification('User guide feature coming soon!', 'info');
}

function openAbout() {
    showNotification('About feature coming soon!', 'info');
}

function openVersionInfo() {
    showNotification('Version info feature coming soon!', 'info');
}

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
    
    // Manual entry events
    const manualEntryBtn = document.getElementById('manualEntryBtn');
    if (manualEntryBtn) {
        manualEntryBtn.addEventListener('click', showManualEntryForm);
    }

    // Album events
    createAlbumBtn.addEventListener('click', openCreateAlbumModal);

    // Use event delegation for modal buttons
    document.addEventListener('click', function(event) {
        if (event.target && event.target.id === 'saveBtn') {
            saveToAlbum();
        }
        if (event.target && event.target.id === 'editBtn') {
            openEditModal();
        }
    });

    // Menu event listeners will be set up separately
}

// URL Sharing Functions
function checkForSharedAlbum() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedAlbumId = urlParams.get('share');
    
    if (sharedAlbumId) {
        // Find the shared album in localStorage or create a temporary one
        const sharedAlbum = albums.find(album => album.id === sharedAlbumId);
        if (sharedAlbum) {
            isSharedView = true;
            openAlbumView(sharedAlbumId);
        } else {
            // If album not found, show error message
            showNotification('Shared album not found or has been deleted', 'error');
        }
    }
}

function generateShareUrl(albumId) {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?share=${albumId}`;
}

function copyShareUrl(albumId) {
    const shareUrl = generateShareUrl(albumId);
    navigator.clipboard.writeText(shareUrl).then(() => {
        showNotification('Share link copied to clipboard!', 'success');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Share link copied to clipboard!', 'success');
    });
}

function openShareModal(albumId) {
    const album = albums.find(a => a.id === albumId);
    if (!album) return;
    
    const shareUrl = generateShareUrl(albumId);
    
    // Create share modal content
    const shareModal = document.createElement('div');
    shareModal.className = 'modal';
    shareModal.id = 'shareModal';
    shareModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Share Album: ${album.name}</h3>
                <button class="close-btn" onclick="closeShareModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <p>Share this link with others to let them view your album:</p>
                <div class="share-url-container">
                    <input type="text" id="shareUrlInput" value="${shareUrl}" readonly>
                    <button class="copy-btn" onclick="copyShareUrlFromModal()">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                </div>
                <div class="share-options">
                    <button class="share-btn" onclick="shareViaEmail('${album.name}', '${shareUrl}')">
                        <i class="fas fa-envelope"></i> Share via Email
                    </button>
                    <button class="share-btn" onclick="shareViaWhatsApp('${album.name}', '${shareUrl}')">
                        <i class="fab fa-whatsapp"></i> Share via WhatsApp
                    </button>
                </div>
            </div>
            <div class="modal-footer">
                <button class="cancel-btn" onclick="closeShareModal()">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(shareModal);
    shareModal.style.display = 'block';
    
    // Auto-select the URL for easy copying
    document.getElementById('shareUrlInput').select();
}

function closeShareModal() {
    const shareModal = document.getElementById('shareModal');
    if (shareModal) {
        shareModal.style.display = 'none';
        document.body.removeChild(shareModal);
    }
}

function copyShareUrlFromModal() {
    const shareUrlInput = document.getElementById('shareUrlInput');
    shareUrlInput.select();
    document.execCommand('copy');
    showNotification('Share link copied to clipboard!', 'success');
}

function shareViaEmail(albumName, shareUrl) {
    const subject = encodeURIComponent(`Check out my penny collection: ${albumName}`);
    const body = encodeURIComponent(`I wanted to share my penny collection album with you!\n\nAlbum: ${albumName}\n\nView it here: ${shareUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
}

function shareViaWhatsApp(albumName, shareUrl) {
    const text = encodeURIComponent(`Check out my penny collection: ${albumName}\n\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`);
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
        // Compress the image before storing
        compressImage(e.target.result, 800, 600, 0.7).then(compressedData => {
            currentImageData = compressedData;
            previewImage.src = compressedData;
            uploadPreview.style.display = 'block';
            uploadArea.style.display = 'none';
        });
    };
    reader.readAsDataURL(file);
}

// Image compression function
function compressImage(base64, maxWidth, maxHeight, quality) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Calculate new dimensions
            let { width, height } = img;
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedBase64);
        };
        img.src = base64;
    });
}

function resetUpload() {
    currentImageData = null;
    currentAnalysis = null;
    uploadPreview.style.display = 'none';
    uploadArea.style.display = 'block';
    
    // Reset analysis section in the modal
    const modalAnalysisSection = addPennyModal.querySelector('#analysisSection');
    if (modalAnalysisSection) modalAnalysisSection.style.display = 'none';
    
    // Reset manual entry form
    const manualEntryForm = document.getElementById('manualEntryForm');
    if (manualEntryForm) manualEntryForm.style.display = 'none';
    
    // Hide save button
    const saveManualPennyBtn = document.getElementById('saveManualPennyBtn');
    if (saveManualPennyBtn) saveManualPennyBtn.style.display = 'none';
    
    // Reset the location input field
    const locationInput = addPennyModal.querySelector('#locationResult');
    if (locationInput) {
        locationInput.value = '';
        console.log('Reset location input field');
    }
    
    // Also reset the global analysis section (for backward compatibility)
    if (analysisSection) analysisSection.style.display = 'none';
    
    imageInput.value = '';
}

// Check if Google AI is configured
function isGoogleAIConfigured() {
    return window.GOOGLE_AI_CONFIG && window.GOOGLE_AI_CONFIG.apiKey;
}

// Real AI Analysis with Gemini API
async function analyzeImage() {
    if (!currentImageData) return;

    // Get user's AI configuration from localStorage, fall back to default
    let apiKey = '';
    let projectId = '';
    
    const userConfig = localStorage.getItem('userAIConfig');
    if (userConfig) {
        try {
            const config = JSON.parse(userConfig);
            apiKey = config.apiKey;
            projectId = config.projectId;
        } catch (e) {
            console.error('Error parsing user AI config:', e);
        }
    }
    
    // No fallback to default - users must configure their own key

    // Check if API key is configured
    if (!apiKey) {
        showNotification('Google AI API key not configured. Please go to Menu → AI Configuration to set up your API key.', 'error');
        return;
    }

    // Show loading state
    analyzeBtn.innerHTML = '<div class="loading"></div> Analyzing...';
    analyzeBtn.disabled = true;

    try {
        // Convert base64 image to blob for API
        const base64Data = currentImageData.split(',')[1];
        
        // Create the prompt for penny analysis - using the simple, natural approach
        const prompt = `Give me an interesting paragraph-size description of this elongated penny. Start with the specific location or landmark featured on it, then provide a rich, detailed description of what you see, including any text, imagery, historical context, and significance. Write in a natural, engaging style like you're telling a story about this unique souvenir.`;

        // Call Gemini API directly
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: "image/jpeg",
                                data: base64Data
                            }
                        }
                    ]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`API call failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        const text = result.candidates[0].content.parts[0].text;
        
        // Debug: Log the AI response
        console.log('AI Response:', text);
        
        // Display results in the add penny modal
        const modalAnalysisSection = addPennyModal.querySelector('#analysisSection');
        const modalLocationResult = addPennyModal.querySelector('#locationResult');
        const modalDescriptionResult = addPennyModal.querySelector('#descriptionResult');
        const modalDateResult = addPennyModal.querySelector('#dateResult');
        
        console.log('Modal elements found:');
        console.log('Analysis section:', modalAnalysisSection);
        console.log('Location input:', modalLocationResult);
        console.log('Description field:', modalDescriptionResult);
        console.log('Date field:', modalDateResult);

        // Improved location extraction
        let location = 'Unknown Location';
        
        // Look for common location indicators in the first few lines
        const lines = text.split('\n').slice(0, 3); // Check first 3 lines
        console.log('First 3 lines:', lines);
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            console.log('Processing line:', trimmedLine);
            
            // Look for lines that contain location-like information
            if (trimmedLine.includes('at ') || trimmedLine.includes('from ') || 
                trimmedLine.includes('in ') || trimmedLine.includes('of ')) {
                
                console.log('Found location indicator in line:', trimmedLine);
                
                // Extract the location part
                let locationText = trimmedLine;
                
                // Remove common prefixes
                locationText = locationText.replace(/^(This elongated penny features?|This appears to be|This pressed penny|This elongated penny|This penny|This is)/i, '').trim();
                locationText = locationText.replace(/^(at|from|in|of)\s+/i, '').trim();
                
                // Take the first part before a comma or period
                locationText = locationText.split(/[,\.]/)[0].trim();
                
                console.log('Extracted location:', locationText);
                
                if (locationText.length > 5 && locationText.length < 100) {
                    location = locationText;
                    console.log('Final location set to:', location);
                    break;
                }
            }
        }
        
        // If we still don't have a good location, try to extract from the first sentence
        if (location === 'Unknown Location') {
            console.log('Trying fallback location extraction...');
            const firstSentence = text.split(/[.!?]/)[0];
            console.log('First sentence:', firstSentence);
            
            if (firstSentence.includes('at ') || firstSentence.includes('from ')) {
                const match = firstSentence.match(/(?:at|from)\s+([^,\.]+)/i);
                if (match && match[1]) {
                    location = match[1].trim();
                    console.log('Fallback location extracted:', location);
                }
            }
        }
        
        // Additional location extraction patterns
        if (location === 'Unknown Location') {
            console.log('Trying additional location patterns...');
            
            // Look for common location patterns
            const locationPatterns = [
                /(?:features?|shows?|displays?|represents?)\s+([^,\.]+)/i,
                /(?:from|at|in)\s+([^,\.]+)/i,
                /(?:commemorates?|celebrates?)\s+([^,\.]+)/i
            ];
            
            for (const pattern of locationPatterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    const potentialLocation = match[1].trim();
                    if (potentialLocation.length > 5 && potentialLocation.length < 100) {
                        location = potentialLocation;
                        console.log('Location found with pattern:', location);
                        break;
                    }
                }
            }
        }
        
        console.log('Final location result:', location);

        // Create a comprehensive description from the AI response
        let comprehensiveDescription = '';
        
        // For the new natural prompt, we want to preserve most of the response
        // Just remove the first sentence if it's clearly just a location
        const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 10);
        
        if (sentences.length > 1) {
            // Check if first sentence is just a location (short and location-like)
            const firstSentence = sentences[0].trim();
            if (firstSentence.length < 50 && (firstSentence.includes('at ') || firstSentence.includes('in ') || firstSentence.includes('of '))) {
                // Skip the first sentence if it's just a short location
                const descriptionSentences = sentences.slice(1);
                comprehensiveDescription = descriptionSentences.join('. ').trim() + '.';
            } else {
                // Keep everything if the first sentence is substantial
                comprehensiveDescription = sentences.join('. ').trim() + '.';
            }
        } else if (sentences.length === 1) {
            // If only one sentence, use it all
            comprehensiveDescription = sentences[0].trim() + '.';
        }
        
        // If we still don't have a good description, create a simple one
        if (!comprehensiveDescription || comprehensiveDescription.length < 10) {
            comprehensiveDescription = `Elongated penny featuring ${location}`;
        }
        
        // Keep the full description - no character limits
        // The description field will handle overflow properly

                // Update currentAnalysis with user input fields
        currentAnalysis = {
            location: '', // Will be filled by user
            description: comprehensiveDescription, // Use the comprehensive description
            date: 'Date from AI analysis',
            fullResponse: text // Keep the full response for reference
        };
        
        // Debug: Verify the description is properly set
        console.log('=== CURRENT ANALYSIS OBJECT CREATED ===');
        console.log('Description length:', currentAnalysis.description ? currentAnalysis.description.length : 'undefined');
        console.log('Description preview:', currentAnalysis.description ? currentAnalysis.description.substring(0, 100) + '...' : 'undefined');
        console.log('=====================================');
        
        // Debug: Log what's being saved
        console.log('=== FINAL ANALYSIS RESULTS ===');
        console.log('Location: (user will input)');
        console.log('Description:', comprehensiveDescription);
        console.log('Full currentAnalysis object:', currentAnalysis);
        console.log('================================');
        
        // Now display the extracted values in the modal
        if (modalLocationResult) modalLocationResult.value = 'Enter location here';
        if (modalDescriptionResult) {
            modalDescriptionResult.textContent = comprehensiveDescription;
            console.log('Setting description in modal:', comprehensiveDescription);
            console.log('Description length:', comprehensiveDescription.length);
        }
        if (modalDateResult) modalDateResult.textContent = 'Date from AI analysis';

        // Show analysis section in the modal
        if (modalAnalysisSection) modalAnalysisSection.style.display = 'block';

        // Show success notification
        showNotification('AI analysis completed successfully!', 'success');

    } catch (error) {
        console.error('AI analysis failed:', error);
        
        // Show specific error messages for common issues
        let errorMessage = 'AI analysis failed. Please try again.';
        if (error.message.includes('API_KEY_INVALID')) {
            errorMessage = 'Invalid API key. Please check your Google AI configuration.';
        } else if (error.message.includes('QUOTA_EXCEEDED')) {
            errorMessage = 'API quota exceeded. Please try again later.';
        } else if (error.message.includes('INVALID_ARGUMENT')) {
            errorMessage = 'Invalid image format. Please try a different image.';
        } else if (error.message.includes('API call failed: 400')) {
            errorMessage = 'Invalid request. Please check your image format.';
        } else if (error.message.includes('API call failed: 403')) {
            errorMessage = 'Access denied. Please check your API key.';
        }
        
        showNotification(errorMessage, 'error');
        
        // Fallback to manual input
        showNotification('You can still add the penny manually.', 'info');
    } finally {
        // Reset button state
        analyzeBtn.innerHTML = '<i class="fas fa-magic"></i> Analyze with AI';
        analyzeBtn.disabled = false;
    }
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
        closeAlbumView();
        closeEditAlbumModal();
        closeAddPennyModal();
        closePennyViewModal();
        closeShareModal();
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
    
    // Clear form and category checkboxes
    document.getElementById('createAlbumForm').reset();
    populateCategoryCheckboxes('#albumCategoryCheckboxes', []);
}

function closeCreateAlbumModal() {
    createAlbumModal.style.display = 'none';
    document.getElementById('createAlbumForm').reset();
    
    // Clear category checkboxes
    populateCategoryCheckboxes('#albumCategoryCheckboxes', []);
}

function createAlbum() {
    const name = document.getElementById('albumName').value.trim();
    const description = document.getElementById('albumDescription').value.trim();
    const categoryCheckboxes = document.querySelectorAll('#albumCategoryCheckboxes .category-checkbox:checked');
    const tripDate = document.getElementById('albumTripDate').value;
    const location = document.getElementById('albumLocation').value.trim();
    const locationUrl = (document.getElementById('albumLocationUrl')?.value || '').trim();
    const imageUrl = (document.getElementById('albumImageUrl')?.value || '').trim();
    
    if (!name) {
        showNotification('Please enter an album name', 'error');
        return;
    }
    
    if (categoryCheckboxes.length === 0) {
        showNotification('Please select at least one category', 'error');
        return;
    }
    
    const categories = Array.from(categoryCheckboxes).map(cb => cb.value);
    
    const newAlbum = {
        id: Date.now().toString(),
        name: name,
        description: description,
        categories: categories,
        tripDate: tripDate,
        location: location,
        locationUrl: locationUrl,
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

function openAlbumView(albumId) {
    currentAlbum = albums.find(album => album.id === albumId);
    if (!currentAlbum) return;
    
    // Check if we're opening from search results and preserve search context
    const searchInput = document.getElementById('searchInput');
    const currentSearchTerm = searchInput ? searchInput.value.trim() : '';
    
    // Store search context for this album view
    // Check if we have an active search term and if this album would match it
    if (currentSearchTerm) {
        // Check if this album would match the current search term
        const albumCategories = currentAlbum.categories || (currentAlbum.category ? [currentAlbum.category] : []);
        const categoryMatch = albumCategories.some(cat => cat.toLowerCase().includes(currentSearchTerm.toLowerCase()));
        
        const hasMatches = 
            currentAlbum.name.toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
            (currentAlbum.description && currentAlbum.description.toLowerCase().includes(currentSearchTerm.toLowerCase())) ||
            categoryMatch ||
            (currentAlbum.location && currentAlbum.location.toLowerCase().includes(currentSearchTerm.toLowerCase())) ||
            currentAlbum.pennies.some(penny => 
                penny.description && penny.description.toLowerCase().includes(currentSearchTerm.toLowerCase())
            );
        
        if (hasMatches) {
            // We're opening from search results, preserve the search term
            currentAlbum.currentSearchContext = currentSearchTerm;
        } else {
            // Clear any previous search context
            currentAlbum.currentSearchContext = null;
        }
    } else {
        // Clear any previous search context
        currentAlbum.currentSearchContext = null;
    }
    
    document.getElementById('albumViewTitle').textContent = currentAlbum.name;
    
    // Update album info
    const hasCover = currentAlbum.imageUrl && currentAlbum.imageUrl.length > 0;
    const coverStyle = hasCover ? ` style="--album-cover-url: url('${currentAlbum.imageUrl.replace(/"/g, '\\"')}')"` : '';
    
    document.getElementById('albumInfo').innerHTML = `
        <div class="album-info-hero${hasCover ? ' has-cover' : ''}"${coverStyle}>
            <div class="album-info-overlay">
                <div class="album-info-text">
                    <h2 class="album-hero-title">${currentAlbum.name}</h2>
                    <div class="album-hero-details">
                        ${currentAlbum.location ? `<span class="album-hero-location"><i class="fas fa-map-marker-alt"></i> ${currentAlbum.location}</span>` : ''}
                        ${currentAlbum.tripDate ? `<span class="album-hero-date"><i class="fas fa-calendar"></i> ${new Date(currentAlbum.tripDate).toLocaleDateString()}</span>` : ''}
                    </div>
                </div>
            </div>
        </div>
        <div class="album-info-content">
            <p><strong>Description:</strong> ${currentAlbum.description || 'No description'}</p>
            <p><strong>Pennies:</strong> ${currentAlbum.pennies.length}</p>
        </div>
    `;
    
    // Update header buttons based on view mode
    const addPennyBtn = document.querySelector('.add-penny-btn');
    const editAlbumBtn = document.querySelector('.edit-album-btn');
    const shareAlbumBtn = document.querySelector('.share-album-btn');
    
    if (isSharedView) {
        // Hide edit/add buttons in shared view
        if (addPennyBtn) addPennyBtn.style.display = 'none';
        if (editAlbumBtn) editAlbumBtn.style.display = 'none';
        
        // Add share button if it doesn't exist
        if (!shareAlbumBtn) {
            const albumViewTitle = document.querySelector('.album-view-title');
            const shareBtn = document.createElement('button');
            shareBtn.className = 'share-album-btn';
            shareBtn.innerHTML = '<i class="fas fa-share-alt"></i> Share Album';
            shareBtn.onclick = () => openShareModal(albumId);
            albumViewTitle.appendChild(shareBtn);
        }
    } else {
        // Show edit/add buttons in normal view
        if (addPennyBtn) addPennyBtn.style.display = 'flex';
        if (editAlbumBtn) editAlbumBtn.style.display = 'flex';
        
        // Remove share button if it exists
        if (shareAlbumBtn) shareAlbumBtn.remove();
    }
    
    renderAlbumPennies();
    document.getElementById('albumViewScreen').style.display = 'block';
}

function closeAlbumView() {
    document.getElementById('albumViewScreen').style.display = 'none';
    currentAlbum = null;
    isSharedView = false;
    resetUpload();
    
    // Clear the URL parameters when closing shared view
    if (window.location.search.includes('share=')) {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
}

function deleteCurrentAlbum() {
    if (!currentAlbum) return;
    
    // Show confirmation dialog
    if (confirm(`Are you sure you want to delete "${currentAlbum.name}"? This action cannot be undone.`)) {
        // Delete the album
        deleteAlbum(currentAlbum.id);
        
        // Close the album view
        closeAlbumView();
        
        // Refresh the albums display
        renderAlbums();
        
        // Show success notification
        showNotification('Album deleted successfully!', 'success');
    }
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
    
    // Check if we have search context and reorder pennies accordingly
    if (currentAlbum.currentSearchContext) {
        renderAlbumPenniesWithSearchHighlights();
    } else {
        // Render pennies in normal order
        renderAlbumPenniesNormal();
    }
}

function renderAlbumPenniesWithSearchHighlights() {
    const penniesGrid = document.getElementById('penniesGrid');
    const searchTerm = currentAlbum.currentSearchContext;
    
    // Separate matching and non-matching pennies
    const matchingPennies = [];
    const nonMatchingPennies = [];
    
    currentAlbum.pennies.forEach(penny => {
        const isMatch = penny.description && penny.description.toLowerCase().includes(searchTerm.toLowerCase());
        if (isMatch) {
            matchingPennies.push(penny);
        } else {
            nonMatchingPennies.push(penny);
        }
    });
    
    // Combine arrays: matching pennies first, then non-matching
    const reorderedPennies = [...matchingPennies, ...nonMatchingPennies];
    
    if (reorderedPennies.length === 0) {
        penniesGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-coins"></i>
                <h4>No Pennies Found</h4>
                <p>No pennies matching your search terms in this album.</p>
            </div>
        `;
        return;
    }
    
    penniesGrid.innerHTML = reorderedPennies.map(penny => {
        const isMatch = penny.description && penny.description.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Highlight matching text
        const highlightedName = highlightSearchTerm(penny.name, searchTerm);
        const highlightedLocation = highlightSearchTerm(penny.location, searchTerm);
        
        // Add search highlight class if this penny matches
        const searchClass = isMatch ? ' search-match' : '';
        
        return `
        <div class="penny-item${searchClass}" data-penny-id="${penny.id}" data-search-term="${searchTerm}">
            <img src="${penny.imageData}" alt="${penny.name}" class="penny-image" onclick="openPennyViewFromElement(this.parentElement)">
            <div class="penny-info">
                <h4>${highlightedName}</h4>
                <p class="location">${highlightedLocation}</p>
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
        </div>`;
    }).join('');
}

function renderAlbumPenniesNormal() {
    const penniesGrid = document.getElementById('penniesGrid');
    
    penniesGrid.innerHTML = currentAlbum.pennies.map(penny => `
        <div class="penny-item" data-penny-id="${penny.id}" data-search-term="${currentAlbum.currentSearchContext || ''}">
            <img src="${penny.imageData}" alt="${penny.name}" class="penny-image" onclick="openPennyViewFromElement(this.parentElement)">
            <div class="penny-info">
                <h4>${penny.name}</h4>
                <p class="location">${penny.location}</p>
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

function editCurrentAlbum() {
    if (!currentAlbum) return;
    
    // Clear form first
    document.getElementById('editAlbumForm').reset();
    
    // Store current album and populate form
    document.getElementById('editAlbumName').value = currentAlbum.name || '';
    document.getElementById('editAlbumDescription').value = currentAlbum.description || '';
    
    // Handle categories - support both old single category and new multiple categories
    const categories = currentAlbum.categories || (currentAlbum.category ? [currentAlbum.category] : []);
    populateCategoryCheckboxes('#editAlbumCategoryCheckboxes', categories);
    
    document.getElementById('editAlbumTripDate').value = currentAlbum.tripDate || '';
    document.getElementById('editAlbumLocation').value = currentAlbum.location || '';
    document.getElementById('editAlbumLocationUrl').value = currentAlbum.locationUrl || '';
    document.getElementById('editAlbumImageUrl').value = currentAlbum.imageUrl || '';
    
    editAlbumModal.dataset.albumId = currentAlbum.id;
    editAlbumModal.style.display = 'block';
}

function editAlbum(albumId) {
    const album = albums.find(a => a.id === albumId);
    if (!album) return;
    
    // Clear form first
    document.getElementById('editAlbumForm').reset();
    
    // Store current album and populate form
    currentAlbum = album;
    document.getElementById('editAlbumName').value = album.name || '';
    document.getElementById('editAlbumDescription').value = album.description || '';
    
    // Handle categories - support both old single category and new multiple categories
    const categories = album.categories || (album.category ? [album.category] : []);
    populateCategoryCheckboxes('#editAlbumCategoryCheckboxes', categories);
    
    document.getElementById('editAlbumTripDate').value = album.tripDate || '';
    document.getElementById('editAlbumLocation').value = album.location || '';
    document.getElementById('editAlbumLocationUrl').value = album.locationUrl || '';
    document.getElementById('editAlbumImageUrl').value = album.imageUrl || '';
    
    editAlbumModal.dataset.albumId = album.id;
    editAlbumModal.style.display = 'block';
}

function closeEditAlbumModal() {
    editAlbumModal.style.display = 'none';
    editAlbumModal.dataset.albumId = '';
    
    // Clear category checkboxes
    populateCategoryCheckboxes('#editAlbumCategoryCheckboxes', []);
}

function openAddPennyModal() {
    addPennyModal.style.display = 'block';
    resetUpload();
}

function closeAddPennyModal() {
    addPennyModal.style.display = 'none';
    resetUpload();
    
    // Clear manual entry form fields
    const pennyName = document.getElementById('pennyName');
    const pennyLocation = document.getElementById('pennyLocation');
    const pennyDescription = document.getElementById('pennyDescription');
    const pennyDate = document.getElementById('pennyDate');
    const pennyNotes = document.getElementById('pennyNotes');
    
    if (pennyName) pennyName.value = '';
    if (pennyLocation) pennyLocation.value = '';
    if (pennyDescription) pennyDescription.value = '';
    if (pennyDate) pennyDate.value = '';
    if (pennyNotes) pennyNotes.value = '';
}

function showManualEntryForm() {
    // Hide the preview actions and show the manual entry form
    document.getElementById('uploadPreview').style.display = 'none';
    document.getElementById('manualEntryForm').style.display = 'block';
    document.getElementById('saveManualPennyBtn').style.display = 'inline-flex';
}

function saveManualPenny() {
    // Validate required fields
    const name = document.getElementById('pennyName').value.trim();
    const location = document.getElementById('pennyLocation').value.trim();
    const description = document.getElementById('pennyDescription').value.trim();
    
    if (!name || !location || !description) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    if (!currentAlbum || !currentImageData) {
        showNotification('Missing album or image data', 'error');
        return;
    }
    
    // Create penny object from manual entry
    const penny = {
        id: Date.now().toString(),
        name: name,
        location: location,
        description: description,
        dateCollected: document.getElementById('pennyDate').value || new Date().toISOString().split('T')[0],
        notes: document.getElementById('pennyNotes').value.trim() || '',
        imageData: currentImageData,
        addedAt: new Date().toISOString()
    };
    
    // Add penny to album
    currentAlbum.pennies.push(penny);
    currentAlbum.updatedAt = new Date().toISOString();
    
    // Save and update
    saveAlbumsToStorage();
    renderAlbums();
    renderAlbumPennies();
    
    // Reset and close
    resetUpload();
    closeAddPennyModal();
    
    showNotification('Penny added to album successfully!', 'success');
}

function openPennyViewFromElement(pennyElement) {
    const pennyId = pennyElement.dataset.pennyId;
    const searchTerm = pennyElement.dataset.searchTerm || '';
    openPennyView(pennyId, searchTerm);
}

function openPennyView(pennyId, searchTerm = '') {
    const penny = currentAlbum.pennies.find(p => p.id === pennyId);
    if (!penny) return;
    
    // Apply search highlighting if there's a search term
    const highlightedName = searchTerm ? highlightSearchTerm(penny.name, searchTerm) : penny.name;
    const highlightedLocation = searchTerm ? highlightSearchTerm(penny.location, searchTerm) : penny.location;
    const highlightedDescription = searchTerm ? highlightSearchTerm(penny.description, searchTerm) : penny.description;
    const highlightedNotes = searchTerm && penny.notes ? highlightSearchTerm(penny.notes, searchTerm) : (penny.notes || '');
    
    document.getElementById('pennyViewTitle').textContent = penny.name;
    document.getElementById('pennyViewImage').src = penny.imageData;
    document.getElementById('pennyViewName').innerHTML = highlightedName;
    document.getElementById('pennyViewLocation').innerHTML = highlightedLocation;
    document.getElementById('pennyViewDate').textContent = penny.dateCollected ? new Date(penny.dateCollected).toLocaleDateString() : 'No date';
    document.getElementById('pennyViewDescription').innerHTML = highlightedDescription;
    
    // Add notes field if it exists and has content
    const notesElement = document.getElementById('pennyViewNotes');
    const notesLabel = notesElement ? notesElement.previousElementSibling : null;
    
    if (notesElement && notesLabel) {
        if (highlightedNotes) {
            notesElement.innerHTML = highlightedNotes;
            notesElement.style.display = 'block';
            notesLabel.style.display = 'block';
        } else {
            notesElement.style.display = 'none';
            notesLabel.style.display = 'none';
        }
    }
    
    document.getElementById('pennyViewModal').style.display = 'block';
}

function closePennyViewModal() {
    document.getElementById('pennyViewModal').style.display = 'none';
}

function saveAlbumEdit() {
    const albumId = editAlbumModal.dataset.albumId;
    const album = albums.find(a => a.id === albumId);
    if (!album) return;
    
    const name = document.getElementById('editAlbumName').value.trim();
    const description = document.getElementById('editAlbumDescription').value.trim();
    const categoryCheckboxes = document.querySelectorAll('#editAlbumCategoryCheckboxes .category-checkbox:checked');
    const tripDate = document.getElementById('editAlbumTripDate').value;
    const location = document.getElementById('editAlbumLocation').value.trim();
    const locationUrl = (document.getElementById('editAlbumLocationUrl').value || '').trim();
    const imageUrl = (document.getElementById('editAlbumImageUrl').value || '').trim();
    
    if (!name) {
        showNotification('Please enter an album name', 'error');
        return;
    }
    
    if (categoryCheckboxes.length === 0) {
        showNotification('Please select at least one category', 'error');
        return;
    }
    
    const categories = Array.from(categoryCheckboxes).map(cb => cb.value);
    
    Object.assign(album, { name, description, categories, tripDate, location, locationUrl, imageUrl });
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
    const index = albums.findIndex(a => a.id === albumId);
    if (index > -1) {
        albums.splice(index, 1);
        saveAlbumsToStorage();
        renderAlbums();
        showNotification('Album deleted successfully!', 'success');
    }
}

function saveToAlbum() {
    console.log('saveToAlbum function called');
    console.log('currentAlbum:', currentAlbum);
    console.log('currentImageData:', currentImageData ? 'exists' : 'missing');
    console.log('currentAnalysis:', currentAnalysis);
    
    if (!currentAlbum || !currentImageData || !currentAnalysis) {
        console.log('Missing required data, showing error');
        showNotification('Please complete the analysis first', 'error');
        return;
    }
    
    console.log('Creating penny object...');
    
    // Get location from user input field in the add penny modal
    const userLocation = addPennyModal.querySelector('#locationResult').value;
    const finalLocation = userLocation === 'Enter location here' || userLocation.trim() === '' ? 'Unknown Location' : userLocation.trim();
    
    console.log('User location input:', userLocation);
    console.log('Final location:', finalLocation);
    console.log('Description being saved:', currentAnalysis.description);
    console.log('Description length:', currentAnalysis.description ? currentAnalysis.description.length : 'undefined');
    
    const penny = {
        id: Date.now().toString(),
        name: finalLocation,
        location: finalLocation,
        description: currentAnalysis.description || 'No description',
        dateCollected: currentAnalysis.date || new Date().toISOString().split('T')[0],
        notes: '',
        imageData: currentImageData,
        analysis: currentAnalysis,
        addedAt: new Date().toISOString()
    };
    
    console.log('Adding penny to album...');
    currentAlbum.pennies.push(penny);
    currentAlbum.updatedAt = new Date().toISOString();
    
    console.log('Saving to storage...');
    saveAlbumsToStorage();
    console.log('Rendering albums...');
    renderAlbums(); // Update the main album cards
    renderAlbumPennies(); // Update the pennies display in the album view
    console.log('Resetting upload...');
    resetUpload();
    console.log('Closing modal...');
    closeAddPennyModal();
    
    console.log('Showing success notification...');
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
        renderAlbums(); // Update the main album cards
        renderAlbumPennies(); // Update the pennies display in the album view
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
    try {
        // Check storage size before saving
        const dataToSave = JSON.stringify(albums);
        const dataSize = new Blob([dataToSave]).size;
        const maxSize = 4.5 * 1024 * 1024; // 4.5MB limit (leaving buffer)
        
        if (dataSize > maxSize) {
            // Data is too large, compress images further
            console.warn('Data size too large, compressing images...');
            const compressedAlbums = albums.map(album => ({
                ...album,
                pennies: album.pennies.map(penny => ({
                    ...penny,
                    imageData: penny.imageData ? compressImageForStorage(penny.imageData) : null
                }))
            }));
            
            const compressedData = JSON.stringify(compressedAlbums);
            localStorage.setItem('pennyAlbums', compressedData);
            showNotification('Images were compressed to save storage space.', 'info');
        } else {
            localStorage.setItem('pennyAlbums', dataToSave);
        }
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            console.error('localStorage quota exceeded. Attempting to save essential data...');
            
            try {
                // Save only essential album data without images
                const essentialAlbums = albums.map(album => ({
                    id: album.id,
                    name: album.name,
                    description: album.description,
                    category: album.category,
                    tripDate: album.tripDate,
                    location: album.location,
                    imageUrl: album.imageUrl,
                    createdAt: album.createdAt,
                    updatedAt: album.updatedAt,
                    pennies: album.pennies.map(penny => ({
                        id: penny.id,
                        name: penny.name,
                        location: penny.location,
                        description: penny.description,
                        dateCollected: penny.dateCollected,
                        notes: penny.notes,
                        addedAt: penny.addedAt,
                        imageData: null // Remove images to save space
                    }))
                }));
                
                localStorage.setItem('pennyAlbums', JSON.stringify(essentialAlbums));
                showNotification('Storage space was full. Images were removed to save your data.', 'warning');
            } catch (retryError) {
                console.error('Failed to save even essential data:', retryError);
                showNotification('Unable to save data due to storage limitations. Please clear some browser data.', 'error');
            }
        } else {
            console.error('Error saving to localStorage:', error);
            showNotification('Error saving data to storage.', 'error');
        }
    }
}

// Additional compression for storage
function compressImageForStorage(base64Data) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // More aggressive compression for storage
            const maxSize = 400;
            let { width, height } = img;
            
            if (width > height) {
                if (width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            // Lower quality for storage
            const compressed = canvas.toDataURL('image/jpeg', 0.5);
            resolve(compressed);
        };
        img.src = base64Data;
    });
}

function showEmptyAlbumsStateIfNeeded() {
    if (albums.length === 0) {
        renderAlbums();
        // Hide sort indicator when no albums
        const sortIndicator = document.getElementById('sortIndicator');
        if (sortIndicator) {
            sortIndicator.style.display = 'none';
        }
    } else {
        // Show sort indicator when albums exist
        const sortIndicator = document.getElementById('sortIndicator');
        if (sortIndicator) {
            sortIndicator.style.display = 'flex';
        }
    }
}

// Export/Backup function to prevent data loss
function exportAlbums() {
    // Prompt user for custom filename
    const defaultName = `penny-collection-backup-${new Date().toISOString().split('T')[0]}`;
    const customName = prompt('Enter a name for your backup file:', defaultName);
    
    // If user cancels, don't export
    if (customName === null) {
        return;
    }
    
    // Clean the filename (remove invalid characters)
    const cleanName = customName.replace(/[<>:"/\\|?*]/g, '_').trim();
    
    // If user entered empty string, use default
    const finalName = cleanName || defaultName;
    
    // Include collection name in export data
    const exportData = {
        collectionName: collectionName,
        albums: albums,
        exportDate: new Date().toISOString(),
        version: "1.0"
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${finalName}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showNotification(`Backup exported as "${finalName}.json"!`, 'success');
}

// Import function to restore data
function importAlbums() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedData = JSON.parse(e.target.result);
                    
                    // Handle both old format (just albums array) and new format (with collection name)
                    if (Array.isArray(importedData)) {
                        // Old format - just albums
                        albums = importedData;
                        showNotification('Albums imported successfully!', 'success');
                    } else if (importedData.albums && Array.isArray(importedData.albums)) {
                        // New format - with collection name and metadata
                        albums = importedData.albums;
                        
                        // Import collection name if it exists
                        if (importedData.collectionName) {
                            setCollectionName(importedData.collectionName);
                            showNotification(`Collection "${importedData.collectionName}" imported successfully!`, 'success');
                        } else {
                            showNotification('Albums imported successfully!', 'success');
                        }
                    } else {
                        throw new Error('Invalid format');
                    }
                    
                    saveAlbumsToStorage();
                    renderAlbums();
                } catch (error) {
                    showNotification('Invalid backup file. Please try again.', 'error');
                }
            };
            reader.readAsText(file);
        }
    };
    
    input.click();
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
    if (event.target === addPennyModal) {
        closeAddPennyModal();
    }
    if (event.target === pennyViewModal) {
        closePennyViewModal();
    }
    if (event.target.id === 'shareModal') {
        closeShareModal();
    }
    if (event.target.id === 'userGuideModal') {
        closeUserGuideModal();
    }
    if (event.target.id === 'sortOptionsModal') {
        closeSortOptionsModal();
    }
    if (event.target.id === 'collectionSettingsModal') {
        closeCollectionSettingsModal();
    }
});

// Menu item functions
function openAdvancedSearch() {
    showNotification('Advanced Search - Coming Soon!', 'info');
}

function openFilterSettings() {
    showNotification('Filter Settings - Coming Soon!', 'info');
}

// openAIConfig function is now defined in ai-config.js

function openDisplayPreferences() {
    showNotification('Display Preferences - Coming Soon!', 'info');
}

function openCollectionDefaults() {
    showNotification('Collection Defaults - Coming Soon!', 'info');
}

function openUserGuide() {
    const modal = document.getElementById('userGuideModal');
    if (modal) {
        modal.style.display = 'block';
        // Reset to first section
        showGuideSection('getting-started');
    }
}

function closeUserGuideModal() {
    const modal = document.getElementById('userGuideModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showGuideSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.guide-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    const navButtons = document.querySelectorAll('.guide-nav-btn');
    navButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected section
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.classList.add('active');
    }
    
    // Activate corresponding nav button
    const activeButton = document.querySelector(`[data-section="${sectionId}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

function openUserGuideInNewTab() {
    // Create a new window with the user guide content
    const guideWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
    
    if (guideWindow) {
        const guideContent = document.querySelector('.guide-content').innerHTML;
        const guideNav = document.querySelector('.guide-navigation').innerHTML;
        
        guideWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>User Guide - Traveler's Penny Log</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
                    .guide-nav { margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #ddd; }
                    .guide-nav button { margin: 5px; padding: 8px 16px; border: 1px solid #ccc; background: #f8f9fa; cursor: pointer; border-radius: 20px; }
                    .guide-nav button.active { background: #8b4513; color: white; border-color: #8b4513; }
                    .guide-section { display: none; }
                    .guide-section.active { display: block; }
                    h4 { color: #2d2d2d; }
                    h5 { color: #555; }
                    strong { color: #2d2d2d; }
                    .guide-tip { background: #f8f9fa; border-left: 4px solid #8b4513; padding: 12px 16px; margin: 15px 0; }
                </style>
            </head>
            <body>
                <h1>User Guide - Traveler's Penny Log</h1>
                <div class="guide-nav">
                    ${guideNav}
                </div>
                <div class="guide-content">
                    ${guideContent}
                </div>
                <script>
                    // Add navigation functionality to the new window
                    document.querySelectorAll('.guide-nav button').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const sectionId = this.getAttribute('data-section');
                            showSection(sectionId);
                        });
                    });
                    
                    function showSection(sectionId) {
                        // Hide all sections
                        document.querySelectorAll('.guide-section').forEach(section => {
                            section.classList.remove('active');
                        });
                        
                        // Remove active class from all nav buttons
                        document.querySelectorAll('.guide-nav button').forEach(btn => {
                            btn.classList.remove('active');
                        });
                        
                        // Show selected section
                        const selectedSection = document.getElementById(sectionId);
                        if (selectedSection) {
                            selectedSection.classList.add('active');
                        }
                        
                        // Activate corresponding nav button
                        const activeButton = document.querySelector(\`[data-section="\${sectionId}"]\`);
                        if (activeButton) {
                            activeButton.classList.add('active');
                        }
                    }
                </script>
            </body>
            </html>
        `);
        
        guideWindow.document.close();
    }
}

function openAbout() {
    showNotification('About - Coming Soon!', 'info');
}

function openVersionInfo() {
    showNotification('Version Info - Coming Soon!', 'info');
}

// Collection name functions
function updateCollectionNameDisplay() {
    const collectionNameElement = document.getElementById('collectionNameDisplay');
    if (collectionNameElement) {
        collectionNameElement.textContent = collectionName;
    }
}

function setCollectionName(newName) {
    collectionName = newName.trim() || 'Your Albums';
    localStorage.setItem('collectionName', collectionName);
    updateCollectionNameDisplay();
}

function openCollectionSettings() {
    const currentName = collectionName;
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'collectionSettingsModal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Collection Settings</h3>
                <button class="close-btn" onclick="closeCollectionSettingsModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="collectionNameInput">Collection Name:</label>
                    <input type="text" id="collectionNameInput" value="${currentName}" placeholder="Your Albums" maxlength="50">
                    <small>This name will appear at the top of your album collection and will be included when you export/share your collection.</small>
                </div>
                <div class="form-group">
                    <h4>Quick Options:</h4>
                    <div class="quick-options">
                        <button class="quick-option-btn" onclick="setQuickName('My Collection')">My Collection</button>
                        <button class="quick-option-btn" onclick="setQuickName('Penny Adventures')">Penny Adventures</button>
                        <button class="quick-option-btn" onclick="setQuickName('Travel Memories')">Travel Memories</button>
                        <button class="quick-option-btn" onclick="setQuickName('Your Albums')">Your Albums</button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="cancel-btn" onclick="closeCollectionSettingsModal()">Cancel</button>
                <button class="save-btn" onclick="saveCollectionSettings()">Save</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    document.getElementById('collectionNameInput').focus();
}

function closeCollectionSettingsModal() {
    const modal = document.getElementById('collectionSettingsModal');
    if (modal) {
        modal.remove();
    }
}

function setQuickName(name) {
    document.getElementById('collectionNameInput').value = name;
}

function saveCollectionSettings() {
    const nameInput = document.getElementById('collectionNameInput');
    const newName = nameInput.value.trim();
    
    if (newName.length === 0) {
        showNotification('Collection name cannot be empty', 'error');
        return;
    }
    
    setCollectionName(newName);
    closeCollectionSettingsModal();
    showNotification('Collection settings saved!', 'success');
}

// Function to create a fresh file input element
function createFileInput() {
    console.log('createFileInput called'); // Debug log
    
    // Remove existing file input if it exists
    if (imageInput) {
        console.log('Removing existing imageInput'); // Debug log
        imageInput.remove();
    }
    
    // Create a new file input element
    const newImageInput = document.createElement('input');
    newImageInput.type = 'file';
    newImageInput.accept = 'image/*';
    newImageInput.style.display = 'none';
    newImageInput.id = 'imageInput';
    
    // Add event listener to the new input
    newImageInput.addEventListener('change', handleFileSelect);
    
    // Append to the same parent as the original
    const parent = document.querySelector('.upload-container') || document.body;
    parent.appendChild(newImageInput);
    
    // Update the global reference
    window.imageInput = newImageInput;
    
    console.log('New file input created:', newImageInput); // Debug log
    return newImageInput;
}

function handleDragOver(event) {
    event.preventDefault();
    uploadArea.classList.add('dragover');
}