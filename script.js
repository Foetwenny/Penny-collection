// Global variables
let albums = []; // Will be loaded from IndexedDB
let db = null; // IndexedDB database instance
let currentAlbum = null;
let currentImageData = null;
let currentAnalysis = null;
let isSharedView = false; // Track if we're viewing a shared album

// IndexedDB Configuration
const DB_NAME = 'PennyCollectionDB';
const DB_VERSION = 1;
const STORE_NAME = 'albums';

// Initialize IndexedDB
function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
            console.error('IndexedDB failed to open:', request.error);
            reject(request.error);
        };
        
        request.onsuccess = () => {
            db = request.result;
            console.log('IndexedDB opened successfully');
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            
            // Create object store for albums
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('name', 'name', { unique: false });
                store.createIndex('createdAt', 'createdAt', { unique: false });
                console.log('IndexedDB object store created');
            }
        };
    });
}

// Save albums to IndexedDB
async function saveAlbumsToIndexedDB() {
    if (!db) {
        console.error('IndexedDB not initialized');
        return;
    }
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        // Clear existing data
        store.clear();
        
        // Add all albums
        albums.forEach(album => {
            store.add(album);
        });
        
        transaction.oncomplete = () => {
            console.log('Albums saved to IndexedDB');
            resolve();
        };
        
        transaction.onerror = () => {
            console.error('Failed to save albums to IndexedDB:', transaction.error);
            reject(transaction.error);
        };
    });
}

// Load albums from IndexedDB
async function loadAlbumsFromIndexedDB() {
    if (!db) {
        console.error('IndexedDB not initialized');
        return [];
    }
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
            albums = request.result || [];
            console.log(`Loaded ${albums.length} albums from IndexedDB`);
            resolve(albums);
        };
        
        request.onerror = () => {
            console.error('Failed to load albums from IndexedDB:', request.error);
            reject(request.error);
        };
    });
}

// Migrate data from localStorage to IndexedDB
async function migrateFromLocalStorage() {
    try {
        // Check if we have data in localStorage
        const localData = localStorage.getItem('pennyAlbums') || localStorage.getItem('pennyCollection');
        
        if (localData) {
            const parsedData = JSON.parse(localData);
            if (Array.isArray(parsedData) && parsedData.length > 0) {
                console.log(`Migrating ${parsedData.length} albums from localStorage to IndexedDB`);
                
                // Set albums array
                albums = parsedData;
                
                // Save to IndexedDB
                await saveAlbumsToIndexedDB();
                
                // Clear localStorage (optional - we can keep it as backup)
                // localStorage.removeItem('pennyAlbums');
                // localStorage.removeItem('pennyCollection');
                
                console.log('Migration completed successfully');
                return true;
            }
        }
        
        console.log('No localStorage data to migrate');
        return false;
    } catch (error) {
        console.error('Migration failed:', error);
        return false;
    }
}

// Helper function to format dates for date input fields (prevents timezone issues)
function formatDateForInput(dateValue) {
    if (!dateValue) return '';
    
    // If it's already a date string (YYYY-MM-DD), use it directly
    if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateValue;
    }
    
    // If it's a full datetime string or Date object, extract just the date part in local time
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return ''; // Invalid date
    
    return date.getFullYear() + '-' + 
           String(date.getMonth() + 1).padStart(2, '0') + '-' + 
           String(date.getDate()).padStart(2, '0');
}

// Helper function to safely display dates (prevents timezone issues)
function formatDateForDisplay(dateValue) {
    if (!dateValue) return 'No date';
    
    // If it's already a date string (YYYY-MM-DD), parse it as local date
    if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateValue.split('-');
        const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return localDate.toLocaleDateString();
    }
    
    // For other formats, use the existing logic
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return date.toLocaleDateString();
}

// Collection name
let collectionName = localStorage.getItem('collectionName') || 'Your Albums';

// Dark mode state
let isDarkMode = localStorage.getItem('darkMode') === 'true';

// Album image upload state
let currentAlbumImageData = null;
let currentEditAlbumImageData = null;

// Edit penny image upload state
let currentEditPennyImageData = null;

// Audio system
let audioSystem = {
    enabled: localStorage.getItem('soundEnabled') !== 'false', // Default to enabled now that we have real sound files
    volume: parseFloat(localStorage.getItem('soundVolume')) || 0.3, // Default 30% volume
    sounds: {
        pageTurn: null,
        coinClink: null,
        menuClick: null,
        successChime: null,
        modalSwish: null
    },
    audioContext: null
};

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
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Initialize IndexedDB first
        await initIndexedDB();
        
        // Try to migrate from localStorage if needed
        const migrated = await migrateFromLocalStorage();
        
        // Load albums from IndexedDB
        await loadAlbumsFromIndexedDB();
        
        // Initialize the rest of the app
        initializeEventListeners();
        initializeSearch();
        checkForSharedAlbum();
        renderAlbums();
        showEmptyAlbumsStateIfNeeded();
        initializeDarkMode();
        initializeTheme();
        initializeSortEventListeners();
        updateCollectionNameDisplay();
        applyCollectionNameFont();
        applyCollectionNameSize();
        applyCollectionNameColor();
        applyCollectionNameBackground();
        applyCollectionNameOutline();
        applyCollectionNameIcon();
        
        if (migrated) {
            showNotification('Collection migrated to new storage system successfully!', 'success');
        }
        
    } catch (error) {
        console.error('Failed to initialize IndexedDB:', error);
        showNotification('Failed to initialize storage. Please refresh the page.', 'error');
    }
    updateLastBackupDisplay();
    initializeAlbumImageUpload();
    initializeEditAlbumImageUpload();
    initializeEditPennyImageUpload();
    initializeAudioSystem();
    initializeBoldFormatting();
    updateCollectionSummary();
    
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
            
            // Don't close if clicking on any modal
            const editModal = document.getElementById('editModal');
            const addPennyModal = document.getElementById('addPennyModal');
            const createAlbumModal = document.getElementById('createAlbumModal');
            const editAlbumModal = document.getElementById('editAlbumModal');
            const pennyViewModal = document.getElementById('pennyViewModal');
            const shareModal = document.getElementById('shareModal');
            const aboutModal = document.getElementById('aboutModal');
            const versionInfoModal = document.getElementById('versionInfoModal');
            const displayPreferencesModal = document.getElementById('displayPreferencesModal');
            const userGuideModal = document.getElementById('userGuideModal');
            
            if (editModal && editModal.contains(event.target)) return;
            if (addPennyModal && addPennyModal.contains(event.target)) return;
            if (createAlbumModal && createAlbumModal.contains(event.target)) return;
            if (editAlbumModal && editAlbumModal.contains(event.target)) return;
            if (albumViewModal && albumViewModal.contains(event.target)) return;
            if (pennyViewModal && pennyViewModal.contains(event.target)) return;
            if (shareModal && shareModal.contains(event.target)) return;
            if (aboutModal && aboutModal.contains(event.target)) return;
            if (versionInfoModal && versionInfoModal.contains(event.target)) return;
            if (displayPreferencesModal && displayPreferencesModal.contains(event.target)) return;
            if (userGuideModal && userGuideModal.contains(event.target)) return;
            
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

function initializeTheme() {
    const savedTheme = localStorage.getItem('selectedTheme') || 'default';
    
    // Debug: Log what theme is being loaded
    console.log('Loading theme:', savedTheme);
    
    // Apply the saved theme
    if (savedTheme !== 'default') {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
        // Make sure default theme is applied (remove any existing theme)
        document.documentElement.removeAttribute('data-theme');
    }
    
    // Update dark mode state to match theme
    isDarkMode = (savedTheme === 'dark');
    updateDarkModeToggleIcon();
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

function changeTheme(themeName) {
    // Remove existing theme attribute
    document.documentElement.removeAttribute('data-theme');
    
    // Apply new theme (except for default)
    if (themeName !== 'default') {
        document.documentElement.setAttribute('data-theme', themeName);
    }
    
    // Save theme preference
    localStorage.setItem('selectedTheme', themeName);
    
    // Update theme selection in UI
    updateThemeSelection(themeName);
    
    // Update dark mode toggle to match theme
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.checked = (themeName === 'dark');
        isDarkMode = (themeName === 'dark');
    }
    
    // Play sound feedback
    playSound('buttonClick');
    
    // Show notification
    const themeNames = {
        'default': 'Default',
        'dark': 'Dark',
        'ocean': 'Ocean',
        'neon': 'Neon',
        'forest': 'Forest',
        'sunset': 'Sunset'
    };
    showNotification(`${themeNames[themeName]} theme applied`, 'success');
}

function updateThemeSelection(selectedTheme) {
    // Remove selected class from all theme options
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Add selected class to current theme
    const selectedOption = document.querySelector(`[data-theme="${selectedTheme}"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
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
        // Play menu click sound
        playSound('menuClick');
        
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
                pennies: album.pennies.filter(penny => {
                    if (!penny.description) return false;
                    // Strip HTML tags for searching
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = penny.description;
                    const plainText = tempDiv.textContent || tempDiv.innerText || '';
                    return plainText.toLowerCase().includes(searchTerm.toLowerCase());
                })
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
        
        // Play search sound when results are found
        playSound('menuClick');
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
        // Add cache-busting for non-base64 URLs
        const imageUrlWithCacheBust = hasCover ? 
            (album.imageUrl.startsWith('data:') ? 
                album.imageUrl : 
                `${album.imageUrl}${album.imageUpdated ? '?t=' + album.imageUpdated : ''}`) : 
            '';
        const coverStyle = hasCover ? ` style="--album-cover-url: url('${imageUrlWithCacheBust.replace(/"/g, '\\"')}')"` : '';
        return `
        <div class="album-card${hasCover ? ' has-cover' : ''}" data-album-id="${album.id}"${coverStyle} onclick="openAlbumView('${album.id}')">
            ${hasCover ? '<div class=\"album-cover\"></div>' : ''}
            <div class="album-content">
                <div class="album-header">
                    <h3 class="album-title">${album.name}</h3>
                </div>
                <p class="album-description">${album.description || 'No description'}</p>
                <div class="album-stats">
                    <span class="album-date">${album.tripDate ? `Trip: ${formatDateForDisplay(album.tripDate)}` : 'No trip date set'}</span>
                    <span class="penny-count">
                        <i class="fas fa-coins"></i> ${album.pennies.length} ${album.pennies.length === 1 ? 'penny' : 'pennies'}
                    </span>
                </div>
                ${album.location ? `<div class="album-location">
                    <i class="fas fa-map-marker-alt"></i> 
                    ${(album.locationUrl && album.locationUrl.trim()) ? `<a href="${album.locationUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" title="Open location in new window">${album.location}</a>` : album.location}
                </div>` : ''}
                <div class="album-actions">
                    <button class="album-action-btn share-btn" onclick="event.stopPropagation(); shareAlbum('${album.id}')" title="Share Album">
                        <i class="fas fa-share"></i>
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
    
    // Update collection summary
    updateCollectionSummary();
}

function updateCollectionSummary() {
    const albumCountElement = document.getElementById('albumCount');
    const pennyCountElement = document.getElementById('pennyCount');
    updateLastBackupDisplay();
    
    if (albumCountElement && pennyCountElement) {
        // Count total albums
        const totalAlbums = albums.length;
        
        // Count total pennies across all albums
        const totalPennies = albums.reduce((total, album) => {
            return total + (album.pennies ? album.pennies.length : 0);
        }, 0);
        
        // Update the display
        albumCountElement.textContent = totalAlbums;
        pennyCountElement.textContent = totalPennies;
        
        // Show/hide the summary based on whether there are albums
        const collectionSummary = document.getElementById('collectionSummary');
        if (collectionSummary) {
            collectionSummary.style.display = totalAlbums > 0 ? 'block' : 'none';
        }
    }
}

// Update last backup display
function updateLastBackupDisplay() {
    const lastBackupIndicator = document.getElementById('lastBackupIndicator');
    const lastBackupText = document.getElementById('lastBackupText');
    
    if (!lastBackupIndicator || !lastBackupText) return;
    
    const lastBackupTime = localStorage.getItem('lastBackupTime');
    
    if (!lastBackupTime) {
        lastBackupText.textContent = 'Never saved';
        lastBackupIndicator.className = 'last-backup-indicator';
        return;
    }
    
    const backupDate = new Date(lastBackupTime);
    const now = new Date();
    const diffMs = now - backupDate;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    let timeText;
    let indicatorClass = 'last-backup-indicator';
    
    if (diffMs < 60000) { // Less than 1 minute
        timeText = 'Just now';
        indicatorClass += ' recent';
    } else if (diffMs < 3600000) { // Less than 1 hour
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        timeText = `${diffMinutes}m ago`;
        indicatorClass += ' recent';
    } else if (diffHours < 24) { // Less than 1 day
        timeText = `${diffHours}h ago`;
        indicatorClass += diffHours > 6 ? ' old' : ' recent';
    } else if (diffDays < 7) { // Less than 1 week
        timeText = `${diffDays}d ago`;
        indicatorClass += ' old';
    } else {
        timeText = backupDate.toLocaleDateString();
        indicatorClass += ' old';
    }
    
    lastBackupText.textContent = `Last saved: ${timeText}`;
    lastBackupIndicator.className = indicatorClass;
}

// Track last backup time
function trackLastBackupTime() {
    localStorage.setItem('lastBackupTime', new Date().toISOString());
    updateLastBackupDisplay();
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
        // Add cache-busting for non-base64 URLs
        const imageUrlWithCacheBust = hasCover ? 
            (album.imageUrl.startsWith('data:') ? 
                album.imageUrl : 
                `${album.imageUrl}${album.imageUpdated ? '?t=' + album.imageUpdated : ''}`) : 
            '';
        const coverStyle = hasCover ? ` style="--album-cover-url: url('${imageUrlWithCacheBust.replace(/"/g, '\\"')}')"` : '';
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
        if (matches.categories) matchIndicators.push('<span class="match-indicator cat-match"><i class="fas fa-folder"></i> Category</span>');
        if (matches.location) matchIndicators.push('<span class="match-indicator loc-match"><i class="fas fa-map-marker-alt"></i> Location</span>');
        if (matches.pennies && matches.pennies.length > 0) {
                            matchIndicators.push(`<span class="match-indicator penny-match"><i class="fas fa-coins"></i> ${matches.pennies.length} ${matches.pennies.length === 1 ? 'penny' : 'pennies'}</span>`);
        }
        
        return `
        <div class="album-card search-result${hasCover ? ' has-cover' : ''}" data-album-id="${album.id}"${coverStyle} onclick="openAlbumView('${album.id}')">
            ${hasCover ? '<div class=\"album-cover\"></div>' : ''}
            <div class="album-content">
                <div class="album-header">
                    <h3 class="album-title">${highlightedName}</h3>
                </div>
                ${matchIndicators.length > 0 ? `<div class="search-match-indicators">${matchIndicators.join('')}</div>` : ''}
                <p class="album-description">${highlightedDescription}</p>
                <div class="album-stats">
                    <span class="album-date">${album.tripDate ? `Trip: ${formatDateForDisplay(album.tripDate)}` : 'No trip date set'}</span>
                    <span class="penny-count">
                        <i class="fas fa-coins"></i> ${album.pennies.length} ${album.pennies.length === 1 ? 'penny' : 'pennies'}
                    </span>
                </div>
                ${highlightedLocation ? `<div class="album-location">
                    <i class="fas fa-map-marker-alt"></i> 
                    ${(album.locationUrl && album.locationUrl.trim()) ? `<a href="${album.locationUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" title="Open location in new window">${highlightedLocation}</a>` : highlightedLocation}
                </div>` : ''}
                <div class="album-actions">
                    <button class="album-action-btn share-btn" onclick="event.stopPropagation(); shareAlbum('${album.id}')" title="Share Album">
                        <i class="fas fa-share"></i>
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
    
    // Update collection summary
    updateCollectionSummary();
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
    
    // First, check if there's a match in the plain text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    if (!plainText.toLowerCase().includes(searchTerm.toLowerCase())) {
        return text; // No match found
    }
    
    // If the text is plain text (no HTML), do simple highlighting
    if (text === plainText) {
        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return plainText.replace(regex, '<mark class="search-highlight">$1</mark>');
    }
    
    // For HTML content, we need to highlight while preserving HTML structure
    // Create a temporary container to work with the HTML
    const container = document.createElement('div');
    container.innerHTML = text;
    
    // Function to recursively highlight text nodes
    function highlightTextNodes(node, searchTerm) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            if (text.toLowerCase().includes(searchTerm.toLowerCase())) {
                const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                const highlightedHTML = text.replace(regex, '<mark class="search-highlight">$1</mark>');
                
                // Create a temporary div to parse the highlighted HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = highlightedHTML;
                
                // Replace the text node with the highlighted content
                const parent = node.parentNode;
                while (tempDiv.firstChild) {
                    parent.insertBefore(tempDiv.firstChild, node);
                }
                parent.removeChild(node);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Recursively process child nodes
            const children = Array.from(node.childNodes);
            children.forEach(child => highlightTextNodes(child, searchTerm));
        }
    }
    
    // Apply highlighting to all text nodes
    highlightTextNodes(container, searchTerm);
    
    return container.innerHTML;
}

// Menu action functions (placeholder implementations)

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
            
            // Get the sort field and direction from the clicked button
            const sortField = event.target.dataset.sort;
            const sortDirection = event.target.dataset.direction;
            
            // Select the corresponding radio button
            const radio = document.querySelector(`input[name="sortBy"][value="${sortField}"]`);
            if (radio) {
                radio.checked = true;
            }
            
            // Apply the sort immediately
            saveSortSettings(sortField, sortDirection);
            sortAlbums(sortField, sortDirection);
            closeSortOptionsModal();
            showNotification('Albums sorted successfully!', 'success');
        }
    });
}


// openAIConfig function is now defined in ai-config.js




function openAbout() {
    const aboutModal = document.getElementById('aboutModal');
    if (aboutModal) {
        aboutModal.style.display = 'block';
    }
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
    
    // Show the manual entry button again
    const manualEntryBtn = document.getElementById('manualEntryBtn');
    if (manualEntryBtn) manualEntryBtn.style.display = 'inline-block';
    
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

// Bold Formatting Functions
function initializeBoldFormatting() {
    // Add Ctrl+B support to description contenteditable divs
    const descriptionFields = ['pennyDescription', 'editDescription'];
    
    descriptionFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('keydown', handleBoldShortcut);
        }
    });
}

function handleBoldShortcut(event) {
    // Check for Ctrl+B
    if (event.ctrlKey && event.key === 'b') {
        event.preventDefault();
        toggleBoldFormatting(event.target);
    }
}

function toggleBoldFormatting(editor) {
    const selection = window.getSelection();
    
    if (selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    if (range.collapsed) {
        // No selection - toggle bold mode for next typing
        // Check if we're already in a bold element
        const parentElement = range.commonAncestorContainer.parentElement;
        if (parentElement && parentElement.tagName === 'STRONG') {
            // We're in bold mode, exit it
            const textNode = document.createTextNode(parentElement.textContent);
            parentElement.parentNode.replaceChild(textNode, parentElement);
            range.setStart(textNode, textNode.textContent.length);
            range.setEnd(textNode, textNode.textContent.length);
        } else {
            // Enter bold mode - create a bold element
            const boldElement = document.createElement('strong');
            range.insertNode(boldElement);
            range.setStart(boldElement, 0);
            range.setEnd(boldElement, 0);
        }
    } else {
        // Text is selected - toggle bold for selection
        const selectedText = range.toString();
        const parentElement = range.commonAncestorContainer.parentElement;
        
        // Check if selection is already in a bold element
        if (parentElement && parentElement.tagName === 'STRONG') {
            // Remove bold formatting
            const textNode = document.createTextNode(selectedText);
            parentElement.parentNode.replaceChild(textNode, parentElement);
            range.setStart(textNode, 0);
            range.setEnd(textNode, textNode.textContent.length);
        } else {
            // Add bold formatting
            const boldElement = document.createElement('strong');
            range.surroundContents(boldElement);
            range.setStart(boldElement, 0);
            range.setEnd(boldElement, boldElement.textContent.length);
        }
    }
    
    // Update selection
    selection.removeAllRanges();
    selection.addRange(range);
}

// Helper function to get HTML content from rich text editor
function getRichTextContent(editorId) {
    const editor = document.getElementById(editorId);
    if (editor) {
        return editor.innerHTML;
    }
    return '';
}

// Helper function to set HTML content in rich text editor
function setRichTextContent(editorId, content) {
    const editor = document.getElementById(editorId);
    if (editor) {
        editor.innerHTML = content || '';
    }
}

// Helper function to clear rich text editor
function clearRichTextContent(editorId) {
    const editor = document.getElementById(editorId);
    if (editor) {
        editor.innerHTML = '';
    }
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
        const modalDescriptionResult = addPennyModal.querySelector('#descriptionResult');
        
        console.log('Modal elements found:');
        console.log('Analysis section:', modalAnalysisSection);
        console.log('Description field:', modalDescriptionResult);

        // Use the AI response directly as the description
        const description = text.trim();
        
        // Update currentAnalysis with only the description
        currentAnalysis = {
            description: description,
            fullResponse: text // Keep the full response for reference
        };
        
        // Debug: Verify the description is properly set
        console.log('=== CURRENT ANALYSIS OBJECT CREATED ===');
        console.log('Description length:', currentAnalysis.description ? currentAnalysis.description.length : 'undefined');
        console.log('Description preview:', currentAnalysis.description ? currentAnalysis.description.substring(0, 100) + '...' : 'undefined');
        console.log('=====================================');
        
        // Debug: Log what's being saved
        console.log('=== FINAL ANALYSIS RESULTS ===');
        console.log('Description:', description);
        console.log('Full currentAnalysis object:', currentAnalysis);
        console.log('================================');
        
        // Now display the description in the modal
        if (modalDescriptionResult) {
            modalDescriptionResult.innerHTML = description;
            console.log('Setting description in modal:', description);
            console.log('Description length:', description.length);
        }

        // Show analysis section in the modal
        if (modalAnalysisSection) modalAnalysisSection.style.display = 'block';

        // Hide the manual entry button since AI analysis is complete
        const manualEntryBtn = document.getElementById('manualEntryBtn');
        if (manualEntryBtn) manualEntryBtn.style.display = 'none';

        // Show success notification
        showNotification('AI analysis completed successfully!', 'success');
        
        // Play success chime when AI analysis completes
        playSound('successChime');

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
    
    // Play success sound
    playSound('successChime');
    
    // Show success message
    showNotification('Penny added to collection successfully!', 'success');
}

function openEditModal() {
    if (!currentAnalysis) return;

    // Populate modal with current analysis data
    document.getElementById('editName').value = `Elongated Penny - ${currentAnalysis.location}`;
    document.getElementById('editLocation').value = currentAnalysis.location;
    setRichTextContent('editDescription', currentAnalysis.description);
    document.getElementById('editDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('editNotes').value = '';

    editModal.style.display = 'block';
}

function closeModal() {
    editModal.style.display = 'none';
    
    // Reset edit penny image upload state
    currentEditPennyImageData = null;
    resetEditPennyImageUpload();
    
    // Clear editing state
    window.currentEditingPenny = null;
}

function saveEdit() {
    console.log('saveEdit called');
    console.log('currentEditingPenny:', window.currentEditingPenny);
    console.log('currentAlbum:', currentAlbum);
    console.log('currentEditPennyImageData:', currentEditPennyImageData ? 'exists' : 'null');
    
    // Check if we're editing a penny in an album
    if (window.currentEditingPenny && currentAlbum) {
        const penny = window.currentEditingPenny;
        console.log('Updating penny:', penny);
        
        // Update penny data
        penny.name = document.getElementById('editName').value;
        penny.location = document.getElementById('editLocation').value;
        penny.description = getRichTextContent('editDescription');
        penny.dateCollected = document.getElementById('editDate').value;
        penny.notes = document.getElementById('editNotes').value;
        
        // Update image if a new one was uploaded
        if (currentEditPennyImageData) {
            console.log('Updating penny image data');
            penny.imageData = currentEditPennyImageData;
            // Add a timestamp to force browser to reload the image
            penny.imageUpdated = Date.now();
            console.log('Penny image updated with timestamp:', penny.imageUpdated);
        }
        
        // Update album timestamp
        currentAlbum.updatedAt = new Date().toISOString();
        
        // Save and update
        saveAlbumsToStorage(); // Don't await - let it save in background
        renderAlbums();
        
        // Small delay to ensure DOM updates properly
        setTimeout(() => {
            console.log('Re-rendering album pennies');
            renderAlbumPennies();
        }, 100);
        
        // Play success sound
        playSound('successChime');
        
        // Clear editing state
        window.currentEditingPenny = null;
        currentEditPennyImageData = null;
        
        closeModal();
        showNotification('Penny updated successfully!', 'success');
        return;
    }
    
    // Legacy code for old collection system (keeping for compatibility)
    const pennyId = editModal.dataset.pennyId;
    
    if (pennyId) {
        // Editing existing penny
        const penny = currentCollection.find(p => p.id === parseInt(pennyId));
        if (penny) {
            penny.name = document.getElementById('editName').value;
            penny.location = document.getElementById('editLocation').value;
            penny.description = getRichTextContent('editDescription');
            penny.dateCollected = document.getElementById('editDate').value;
            penny.notes = document.getElementById('editNotes').value;
            
            // Update image if a new one was uploaded
            if (currentEditPennyImageData) {
                penny.image = currentEditPennyImageData;
            }
            
            saveCollectionToStorage();
            renderCollection();
            
            // Play success sound
            playSound('successChime');
        }
    } else {
        // Editing current analysis before saving
        currentAnalysis = {
            ...currentAnalysis,
            name: document.getElementById('editName').value,
            location: document.getElementById('editLocation').value,
            description: getRichTextContent('editDescription'),
            dateCollected: document.getElementById('editDate').value,
            notes: document.getElementById('editNotes').value
        };

        // Update the display
        document.getElementById('locationResult').textContent = currentAnalysis.location;
        document.getElementById('descriptionResult').innerHTML = currentAnalysis.description;
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

// Close modal when clicking outside (editModal excluded to prevent accidental closure)
// Note: editModal click-outside functionality removed to prevent accidental closure

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        // Note: closeModal() excluded to prevent accidental closure of edit penny modal
        closeCreateAlbumModal();
        closeAlbumView();
        closeEditAlbumModal();
        closeAddPennyModal();
        closePennyViewModal();
        closeShareModal();
        closeAboutModal();
        closeVersionInfoModal();
        closeDisplayPreferencesModal();
    }
});

// Modal functions (closeModal is defined earlier)

// Album Management Functions
function openCreateAlbumModal() {
    createAlbumModal.style.display = 'block';
    document.getElementById('albumName').focus();
    
    // Play modal swish sound when opening create album modal
    playSound('modalSwish');
    
    // Clear form and category checkboxes
    document.getElementById('createAlbumForm').reset();
    populateCategoryCheckboxes('#albumCategoryCheckboxes', []);
}

function closeCreateAlbumModal() {
    createAlbumModal.style.display = 'none';
    document.getElementById('createAlbumForm').reset();
    
    // Clear category checkboxes
    populateCategoryCheckboxes('#albumCategoryCheckboxes', []);
    
    // Reset album image upload
    resetAlbumImageUpload();
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
    
    // Use local image if available, otherwise use URL
    const finalImageUrl = currentAlbumImageData || imageUrl;
    
    const newAlbum = {
        id: Date.now().toString(),
        name: name,
        description: description,
        categories: categories,
        tripDate: tripDate,
        location: location,
        locationUrl: locationUrl,
        imageUrl: finalImageUrl,
        pennies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    albums.push(newAlbum);
    saveAlbumsToStorage();
    renderAlbums();
    
    // Play success sound
    playSound('successChime');
    
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
            currentAlbum.pennies.some(penny => {
                if (!penny.description) return false;
                // Strip HTML tags for searching
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = penny.description;
                const plainText = tempDiv.textContent || tempDiv.innerText || '';
                return plainText.toLowerCase().includes(currentSearchTerm.toLowerCase());
            });
        
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
    // Add cache-busting for non-base64 URLs
    const imageUrlWithCacheBust = hasCover ? 
        (currentAlbum.imageUrl.startsWith('data:') ? 
            currentAlbum.imageUrl : 
            `${currentAlbum.imageUrl}${currentAlbum.imageUpdated ? '?t=' + currentAlbum.imageUpdated : '?t=' + Date.now()}`) : 
        '';
    const coverStyle = hasCover ? ` style="--album-cover-url: url('${imageUrlWithCacheBust.replace(/"/g, '\\"')}')"` : '';
    
    document.getElementById('albumInfo').innerHTML = `
        <div class="album-info-hero${hasCover ? ' has-cover' : ''}"${coverStyle}>
            <div class="album-info-overlay">
                <div class="album-info-text">
                    <h2 class="album-hero-title">${currentAlbum.name}</h2>
                    <div class="album-hero-details">
                        ${currentAlbum.location ? `<span class="album-hero-location"><i class="fas fa-map-marker-alt"></i> ${currentAlbum.location}</span>` : ''}
                        ${currentAlbum.tripDate ? `<span class="album-hero-date"><i class="fas fa-calendar"></i> ${formatDateForDisplay(currentAlbum.tripDate)}</span>` : ''}
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
    
    // Play page turn sound when opening album
    playSound('pageTurn');
}

function closeAlbumView() {
    document.getElementById('albumViewScreen').style.display = 'none';
    currentAlbum = null;
    isSharedView = false;
    resetUpload();
    
    // Play page turn sound for closing album
    playSound('pageTurn');
    
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
        
        // Play delete sound
        playSound('deleteSound');
        
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
    
    // Clear the grid first to force re-render
    penniesGrid.innerHTML = '';
    
    // Separate matching and non-matching pennies
    const matchingPennies = [];
    const nonMatchingPennies = [];
    
    currentAlbum.pennies.forEach(penny => {
        let isMatch = false;
        if (penny.description) {
            // Strip HTML tags for searching
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = penny.description;
            const plainText = tempDiv.textContent || tempDiv.innerText || '';
            isMatch = plainText.toLowerCase().includes(searchTerm.toLowerCase());
        }
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
        let isMatch = false;
        if (penny.description) {
            // Strip HTML tags for searching
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = penny.description;
            const plainText = tempDiv.textContent || tempDiv.innerText || '';
            isMatch = plainText.toLowerCase().includes(searchTerm.toLowerCase());
        }
        
        // Highlight matching text
        const highlightedName = highlightSearchTerm(penny.name, searchTerm);
        const highlightedLocation = highlightSearchTerm(penny.location, searchTerm);
        
        // Add search highlight class if this penny matches
        const searchClass = isMatch ? ' search-match' : '';
        
        // Don't add cache-busting to base64 data URLs
        const imageSrc = penny.imageData.startsWith('data:') ? penny.imageData : `${penny.imageData}${penny.imageUpdated ? '?t=' + penny.imageUpdated : ''}`;
        console.log('Rendering penny card (search):', penny.name, 'Image src:', imageSrc.substring(0, 50) + '...');
        return `
        <div class="penny-item${searchClass}" data-penny-id="${penny.id}" data-search-term="${searchTerm}">
            <img src="${imageSrc}" alt="${penny.name}" class="penny-image" onclick="openPennyViewFromElement(this.parentElement)" onerror="console.log('Image failed to load for penny (search):', '${penny.name}')">
            <div class="penny-info">
                <h4>${highlightedName}</h4>
                <p class="location">${highlightedLocation}</p>
                <p class="date">${formatDateForDisplay(penny.dateCollected)}</p>
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
    
    // Clear the grid first to force re-render
    penniesGrid.innerHTML = '';
    
    penniesGrid.innerHTML = currentAlbum.pennies.map(penny => {
        // Don't add cache-busting to base64 data URLs
        const imageSrc = penny.imageData.startsWith('data:') ? penny.imageData : `${penny.imageData}${penny.imageUpdated ? '?t=' + penny.imageUpdated : ''}`;
        console.log('Rendering penny card:', penny.name, 'Image src:', imageSrc.substring(0, 50) + '...');
        return `
        <div class="penny-item" data-penny-id="${penny.id}" data-search-term="${currentAlbum.currentSearchContext || ''}">
            <img src="${imageSrc}" alt="${penny.name}" class="penny-image" onclick="openPennyViewFromElement(this.parentElement)" onerror="console.log('Image failed to load for penny:', '${penny.name}')">
            <div class="penny-info">
                <h4>${penny.name}</h4>
                <p class="location">${penny.location}</p>
                <p class="date">${formatDateForDisplay(penny.dateCollected)}</p>
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
    
    document.getElementById('editAlbumTripDate').value = formatDateForInput(currentAlbum.tripDate);
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
    
    // Reset edit album image upload state
    currentEditAlbumImageData = null;
    resetEditAlbumImageUpload();
    
    // Store current album and populate form
    currentAlbum = album;
    document.getElementById('editAlbumName').value = album.name || '';
    document.getElementById('editAlbumDescription').value = album.description || '';
    
    // Handle categories - support both old single category and new multiple categories
    const categories = album.categories || (album.category ? [album.category] : []);
    populateCategoryCheckboxes('#editAlbumCategoryCheckboxes', categories);
    
    document.getElementById('editAlbumTripDate').value = formatDateForInput(album.tripDate);
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
    
    // Reset edit album image upload
    resetEditAlbumImageUpload();
}

function openAddPennyModal() {
    addPennyModal.style.display = 'block';
    resetUpload();
    
    // Play modal swish sound when opening add penny modal
    playSound('modalSwish');
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
    clearRichTextContent('pennyDescription');
    if (pennyDate) pennyDate.value = '';
    if (pennyNotes) pennyNotes.value = '';
}

function showManualEntryForm() {
    // Hide the preview actions and show the manual entry form
    document.getElementById('uploadPreview').style.display = 'none';
    document.getElementById('manualEntryForm').style.display = 'block';
    document.getElementById('saveManualPennyBtn').style.display = 'inline-flex';
    
    // Hide AI analysis section if it was shown
    const modalAnalysisSection = addPennyModal.querySelector('#analysisSection');
    if (modalAnalysisSection) modalAnalysisSection.style.display = 'none';
}

function saveManualPenny() {
    // Validate required fields
    const name = document.getElementById('pennyName').value.trim();
    const location = document.getElementById('pennyLocation').value.trim();
    const description = getRichTextContent('pennyDescription').trim();
    
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
    
    // Play coin clink sound when clicking a penny
    playSound('coinClink');
    
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
    document.getElementById('pennyViewDate').textContent = formatDateForDisplay(penny.dateCollected);
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
    
    // Use local image if available, otherwise use URL
    const finalImageUrl = currentEditAlbumImageData || imageUrl;
    
    // Add imageUpdated timestamp if we're using a new image
    const updates = { name, description, categories, tripDate, location, locationUrl, imageUrl: finalImageUrl };
    if (currentEditAlbumImageData) {
        updates.imageUpdated = Date.now();
    }
    
    Object.assign(album, updates);
    album.updatedAt = new Date().toISOString();
    saveAlbumsToStorage();
    renderAlbums();
    
    // If the album view modal is currently open for this album, refresh it
    if (albumViewModal && albumViewModal.style.display === 'block' && currentAlbum && currentAlbum.id === album.id) {
        openAlbumView(album.id);
    }
    
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
    
    // Since we removed location and date fields, use default values
    const finalLocation = 'Unknown Location';
    const finalDate = new Date().toISOString().split('T')[0];
    
    console.log('Final location:', finalLocation);
    console.log('Final date:', finalDate);
    console.log('Description being saved:', currentAnalysis.description);
    console.log('Description length:', currentAnalysis.description ? currentAnalysis.description.length : 'undefined');
    
    const penny = {
        id: Date.now().toString(),
        name: finalLocation,
        location: finalLocation,
        description: currentAnalysis.description || 'No description',
        dateCollected: finalDate,
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
    
    // Play success sound
    playSound('successChime');
    
    console.log('Closing modal...');
    closeAddPennyModal();
    
    console.log('Showing success notification...');
    showNotification('Penny added to album successfully!', 'success');
}

function editPennyInAlbum(pennyId) {
    console.log('editPennyInAlbum called with ID:', pennyId);
    const penny = currentAlbum.pennies.find(p => p.id === pennyId);
    if (!penny) {
        console.log('Penny not found with ID:', pennyId);
        return;
    }
    
    console.log('Found penny:', penny);
    
    // Populate edit form
    document.getElementById('editName').value = penny.name;
    document.getElementById('editLocation').value = penny.location;
    setRichTextContent('editDescription', penny.description);
    
    // Fix date handling to prevent timezone issues
    document.getElementById('editDate').value = formatDateForInput(penny.dateCollected);
    document.getElementById('editNotes').value = penny.notes || '';
    
    // Show current image
    const currentImagePreview = document.getElementById('editPennyCurrentImagePreview');
    if (currentImagePreview && penny.imageData) {
        currentImagePreview.src = penny.imageData;
        console.log('Set current image preview');
    }
    
    // Reset image upload state
    currentEditPennyImageData = null;
    resetEditPennyImageUpload();
    
    // Store current penny for editing
    window.currentEditingPenny = penny;
    
    console.log('About to show edit modal');
    editModal.style.display = 'block';
    console.log('Edit modal display set to block');
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
        
        // Play delete sound
        playSound('deleteSound');
        
        showNotification('Penny deleted successfully!', 'success');
    }
}


// Save albums to IndexedDB (replaces localStorage)
async function saveAlbumsToStorage() {
    try {
        await saveAlbumsToIndexedDB();
    } catch (error) {
        console.error('Error saving to IndexedDB:', error);
        showNotification('Error saving data to storage.', 'error');
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

// Save Collection As function to prevent data loss
function saveCollectionAs() {
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
    
    // Include collection name and styling options in export data
    const exportData = {
        collectionName: collectionName,
        collectionNameFont: collectionNameFont,
        collectionNameSize: collectionNameSize,
        collectionNameColor: collectionNameColor,
        collectionNameBackground: collectionNameBackground,
        collectionNameOutline: collectionNameOutline,
        collectionNameIcon: collectionNameIcon,
        albums: albums,
        exportDate: new Date().toISOString(),
        version: "1.1"
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${finalName}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    trackLastBackupTime();
    showNotification(`Collection saved as "${finalName}.json"!`, 'success');
}

// Load Collection function to restore data with fail-safes
function loadCollection() {
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
                    
                    // Validate the imported data structure
                    if (!validateImportData(importedData)) {
                        showNotification('Invalid backup file format. Please check the file and try again.', 'error');
                        return;
                    }
                    
                    // Show warning dialog before proceeding
                    const currentAlbumCount = albums.length;
                    const importedAlbumCount = Array.isArray(importedData) ? importedData.length : importedData.albums.length;
                    
                    const warningMessage = `⚠️ IMPORT WARNING ⚠️

This will REPLACE all your current data:
• Current albums: ${currentAlbumCount}
• Albums to import: ${importedAlbumCount}

A backup of your current data will be created automatically.

Do you want to continue?`;
                    
                    if (!confirm(warningMessage)) {
                        showNotification('Load collection cancelled.', 'info');
                        return;
                    }
                    
                    // Create automatic backup before importing
                    createAutomaticBackup();
                    trackLastBackupTime();
                    
                    // Handle both old format (just albums array) and new format (with collection name)
                    if (Array.isArray(importedData)) {
                        // Old format - just albums
                        albums = importedData;
                        showNotification(`Collection loaded successfully! ${importedAlbumCount} albums loaded.`, 'success');
                    } else if (importedData.albums && Array.isArray(importedData.albums)) {
                        // New format - with collection name and metadata
                        albums = importedData.albums;
                        
                        // Import collection name if it exists
                        if (importedData.collectionName) {
                            setCollectionName(importedData.collectionName);
                        }
                        
                        // Import collection name styling options if they exist (version 1.1+)
                        if (importedData.version === "1.1" || importedData.collectionNameFont) {
                            if (importedData.collectionNameFont) {
                                setCollectionNameFont(importedData.collectionNameFont);
                            }
                            if (importedData.collectionNameSize) {
                                setCollectionNameSize(importedData.collectionNameSize);
                            }
                            if (importedData.collectionNameColor) {
                                setCollectionNameColor(importedData.collectionNameColor);
                            }
                            if (importedData.collectionNameBackground) {
                                setCollectionNameBackground(importedData.collectionNameBackground);
                            }
                            if (importedData.collectionNameOutline) {
                                setCollectionNameOutline(importedData.collectionNameOutline);
                            }
                            if (importedData.collectionNameIcon) {
                                setCollectionNameIcon(importedData.collectionNameIcon);
                            }
                        }
                        
                        if (importedData.collectionName) {
                            showNotification(`Collection "${importedData.collectionName}" loaded successfully! ${importedAlbumCount} albums loaded.`, 'success');
                        } else {
                            showNotification(`Collection loaded successfully! ${importedAlbumCount} albums loaded.`, 'success');
                        }
                    }
                    
                    saveAlbumsToStorage();
                    renderAlbums();
                    
                } catch (error) {
                    console.error('Load collection error:', error);
                    showNotification('Failed to load collection. The file may be corrupted or in an invalid format.', 'error');
                }
            };
            reader.readAsText(file);
        }
    };
    
    input.click();
}

// Share single album function
function shareAlbum(albumId) {
    const album = albums.find(a => a.id === albumId);
    if (!album) {
        showNotification('Album not found.', 'error');
        return;
    }
    
    // Create album data for sharing
    const albumData = {
        albumName: album.name,
        description: album.description,
        tripDate: album.tripDate,
        location: album.location,
        locationUrl: album.locationUrl,
        imageUrl: album.imageUrl,
        pennies: album.pennies,
        createdDate: album.createdAt,
        sharedDate: new Date().toISOString(),
        version: "1.0",
        type: "single_album"
    };
    
    // Create and download the file
    const albumStr = JSON.stringify(albumData, null, 2);
    const albumBlob = new Blob([albumStr], {type: 'application/json'});
    const albumUrl = URL.createObjectURL(albumBlob);
    
    const link = document.createElement('a');
    link.href = albumUrl;
    link.download = `${album.name}.json`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(albumUrl);
    showNotification(`Album "${album.name}" shared successfully!`, 'success');
}

// Create new collection function
function createNewCollection() {
    const warningMessage = `⚠️ NEW COLLECTION WARNING ⚠️

This will clear your current collection:
• Current albums: ${albums.length}
• Collection: "${collectionName}"

Your current data will be lost unless you save it first.

Do you want to continue?`;
    
    if (!confirm(warningMessage)) {
        showNotification('New collection cancelled.', 'info');
        return;
    }
    
    // Clear current data
    albums = [];
    collectionName = 'My Collection';
    
    // Update collection name in UI
    setCollectionName(collectionName);
    
    // Save to storage and refresh
    saveAlbumsToStorage();
    renderAlbums();
    updateCollectionSummary();
    showEmptyAlbumsStateIfNeeded();
    
    showNotification('New collection created!', 'success');
}

// Validate imported data structure
function validateImportData(data) {
    try {
        // Check if it's a valid array (old format)
        if (Array.isArray(data)) {
            // Validate that it contains album objects
            return data.every(album => 
                album && 
                typeof album === 'object' && 
                album.id && 
                album.name &&
                Array.isArray(album.pennies)
            );
        }
        
        // Check if it's a valid object with albums property (new format)
        if (data && typeof data === 'object' && Array.isArray(data.albums)) {
            // Validate that albums contains valid album objects
            return data.albums.every(album => 
                album && 
                typeof album === 'object' && 
                album.id && 
                album.name &&
                Array.isArray(album.pennies)
            );
        }
        
        return false;
    } catch (error) {
        return false;
    }
}

// Create automatic backup before import
function createAutomaticBackup() {
    try {
        const backupData = {
            collectionName: collectionName,
            collectionNameFont: collectionNameFont,
            collectionNameSize: collectionNameSize,
            collectionNameColor: collectionNameColor,
            collectionNameBackground: collectionNameBackground,
            collectionNameOutline: collectionNameOutline,
            collectionNameIcon: collectionNameIcon,
            albums: albums,
            backupDate: new Date().toISOString(),
            version: "1.1",
            backupType: "automatic_pre_import"
        };
        
        const backupStr = JSON.stringify(backupData, null, 2);
        const backupBlob = new Blob([backupStr], {type: 'application/json'});
        const backupUrl = URL.createObjectURL(backupBlob);
        
        const backupLink = document.createElement('a');
        backupLink.href = backupUrl;
        backupLink.download = `auto-backup-before-import-${new Date().toISOString().split('T')[0]}.json`;
        backupLink.style.display = 'none';
        
        document.body.appendChild(backupLink);
        backupLink.click();
        document.body.removeChild(backupLink);
        
        URL.revokeObjectURL(backupUrl);
        
        console.log('Automatic backup created before import');
    } catch (error) {
        console.error('Failed to create automatic backup:', error);
        showNotification('Warning: Could not create automatic backup before import.', 'warning');
    }
}

// Close modals when clicking outside
window.addEventListener('click', function(event) {
    // Don't close if clicking inside any modal
    if (editModal && editModal.contains(event.target)) return;
    if (createAlbumModal && createAlbumModal.contains(event.target)) return;
    if (albumViewModal && albumViewModal.contains(event.target)) return;
    if (editAlbumModal && editAlbumModal.contains(event.target)) return;
    if (addPennyModal && addPennyModal.contains(event.target)) return;
    if (pennyViewModal && pennyViewModal.contains(event.target)) return;
    const shareModal = document.getElementById('shareModal');
    if (shareModal && shareModal.contains(event.target)) return;
    const aboutModal = document.getElementById('aboutModal');
    if (aboutModal && aboutModal.contains(event.target)) return;
    const versionInfoModal = document.getElementById('versionInfoModal');
    if (versionInfoModal && versionInfoModal.contains(event.target)) return;
    const displayPreferencesModal = document.getElementById('displayPreferencesModal');
    if (displayPreferencesModal && displayPreferencesModal.contains(event.target)) return;
    const userGuideModal = document.getElementById('userGuideModal');
    if (userGuideModal && userGuideModal.contains(event.target)) return;
    const sortOptionsModal = document.getElementById('sortOptionsModal');
    if (sortOptionsModal && sortOptionsModal.contains(event.target)) return;
    const collectionSettingsModal = document.getElementById('collectionSettingsModal');
    if (collectionSettingsModal && collectionSettingsModal.contains(event.target)) return;
    
    // Close modals when clicking on the modal backdrop (the modal itself, not its content)
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
    if (event.target.id === 'aboutModal') {
        closeAboutModal();
    }
    if (event.target.id === 'versionInfoModal') {
        closeVersionInfoModal();
    }
    if (event.target.id === 'displayPreferencesModal') {
        closeDisplayPreferencesModal();
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
    const displayPreferencesModal = document.getElementById('displayPreferencesModal');
    if (displayPreferencesModal) {
        displayPreferencesModal.style.display = 'block';
        
        // Load current settings
        loadDisplayPreferences();
        
        // Play modal swish sound
        playSound('modalSwish');
    }
}

function closeDisplayPreferencesModal() {
    const displayPreferencesModal = document.getElementById('displayPreferencesModal');
    if (displayPreferencesModal) {
        displayPreferencesModal.style.display = 'none';
    }
}

function loadDisplayPreferences() {
    // Load sound settings
    const soundToggle = document.getElementById('soundEnabledToggle');
    const volumeSlider = document.getElementById('soundVolumeSlider');
    const volumeDisplay = document.getElementById('volumeDisplay');
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    // Load theme settings
    const currentTheme = localStorage.getItem('selectedTheme') || 'default';
    updateThemeSelection(currentTheme);
    
    if (soundToggle) {
        soundToggle.checked = audioSystem.enabled;
    }
    
    if (volumeSlider && volumeDisplay) {
        volumeSlider.value = Math.round(audioSystem.volume * 100);
        volumeDisplay.textContent = Math.round(audioSystem.volume * 100) + '%';
    }
    
    if (darkModeToggle) {
        darkModeToggle.checked = isDarkMode;
    }
}

function toggleSoundSetting() {
    const soundToggle = document.getElementById('soundEnabledToggle');
    if (soundToggle) {
        audioSystem.enabled = soundToggle.checked;
        updateAudioSettings();
        
        // Play a test sound if enabling
        if (audioSystem.enabled) {
            playSound('menuClick');
        }
    }
}

function updateSoundVolume(value) {
    const volumeDisplay = document.getElementById('volumeDisplay');
    if (volumeDisplay) {
        volumeDisplay.textContent = value + '%';
    }
    
    setSoundVolume(value / 100);
    
    // Play a test sound to show volume change
    if (audioSystem.enabled) {
        playSound('menuClick');
    }
}

function testSounds() {
    if (!audioSystem.enabled) {
        showNotification('Enable sounds first to test them!', 'warning');
        return;
    }
    
    // Play each sound with a slight delay
    const sounds = ['menuClick', 'coinClink', 'pageTurn', 'successChime', 'modalSwish'];
    sounds.forEach((sound, index) => {
        setTimeout(() => {
            playSound(sound);
        }, index * 500);
    });
    
    showNotification('Playing sound test sequence...', 'info');
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

function closeAboutModal() {
    const aboutModal = document.getElementById('aboutModal');
    if (aboutModal) {
        aboutModal.style.display = 'none';
    }
}

function openVersionInfo() {
    const versionInfoModal = document.getElementById('versionInfoModal');
    if (versionInfoModal) {
        versionInfoModal.style.display = 'block';
    }
}

function closeVersionInfoModal() {
    const versionInfoModal = document.getElementById('versionInfoModal');
    if (versionInfoModal) {
        versionInfoModal.style.display = 'none';
    }
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

// Collection name styling functions
let collectionNameFont = localStorage.getItem('collectionNameFont') || 'Inter';
let collectionNameSize = localStorage.getItem('collectionNameSize') || '1.5rem';
let collectionNameColor = localStorage.getItem('collectionNameColor') || '#2c3e50';
let collectionNameBackground = localStorage.getItem('collectionNameBackground') || 'default';
let collectionNameOutline = localStorage.getItem('collectionNameOutline') || 'none';
let collectionNameIcon = localStorage.getItem('collectionNameIcon') || 'none';

function setCollectionNameFont(fontName) {
    collectionNameFont = fontName;
    localStorage.setItem('collectionNameFont', collectionNameFont);
    applyCollectionNameFont();
}

function setCollectionNameSize(size) {
    collectionNameSize = size;
    localStorage.setItem('collectionNameSize', collectionNameSize);
    applyCollectionNameSize();
}

function setCollectionNameColor(color) {
    collectionNameColor = color;
    localStorage.setItem('collectionNameColor', collectionNameColor);
    applyCollectionNameColor();
}

function setCollectionNameBackground(background) {
    collectionNameBackground = background;
    localStorage.setItem('collectionNameBackground', collectionNameBackground);
    applyCollectionNameBackground();
}

function setCollectionNameOutline(outline) {
    collectionNameOutline = outline;
    localStorage.setItem('collectionNameOutline', collectionNameOutline);
    applyCollectionNameOutline();
}

function setCollectionNameIcon(icon) {
    collectionNameIcon = icon;
    localStorage.setItem('collectionNameIcon', collectionNameIcon);
    applyCollectionNameIcon();
}

function applyCollectionNameFont() {
    const collectionNameElement = document.getElementById('collectionNameDisplay');
    if (collectionNameElement) {
        collectionNameElement.style.fontFamily = `'${collectionNameFont}', sans-serif`;
    }
}

function applyCollectionNameSize() {
    const collectionNameElement = document.getElementById('collectionNameDisplay');
    const h2Element = collectionNameElement.parentElement;
    if (collectionNameElement && h2Element) {
        h2Element.style.fontSize = collectionNameSize;
    }
}

function applyCollectionNameColor() {
    const collectionNameElement = document.getElementById('collectionNameDisplay');
    if (collectionNameElement) {
        collectionNameElement.style.color = collectionNameColor;
    }
}

function applyCollectionNameBackground() {
    const container = document.querySelector('.collection-name-container');
    if (container) {
        // Remove all background classes
        container.classList.remove('bg-default', 'bg-sunset', 'bg-ocean', 'bg-forest', 'bg-purple', 'bg-fire', 'bg-ice', 'bg-gold', 'bg-silver');
        // Add the selected background class
        container.classList.add(`bg-${collectionNameBackground}`);
    }
}

function applyCollectionNameOutline() {
    const collectionNameElement = document.getElementById('collectionNameDisplay');
    if (collectionNameElement) {
        // Remove all outline classes
        collectionNameElement.classList.remove('outline-none', 'outline-white', 'outline-black');
        // Add the selected outline class
        collectionNameElement.classList.add(`outline-${collectionNameOutline}`);
    }
}

function applyCollectionNameIcon() {
    const collectionNameElement = document.getElementById('collectionNameDisplay');
    const h2Element = collectionNameElement.parentElement;
    
    if (collectionNameElement && h2Element) {
        // Remove existing FontAwesome icon (the default book icon)
        const existingFAIcon = h2Element.querySelector('.fas');
        if (existingFAIcon) {
            existingFAIcon.remove();
        }
        
        // Remove existing custom icon if any
        const existingIcon = h2Element.querySelector('.collection-icon');
        if (existingIcon) {
            existingIcon.remove();
        }
        
        // Add new icon if not 'none'
        if (collectionNameIcon !== 'none') {
            const iconElement = document.createElement('span');
            iconElement.className = 'collection-icon';
            iconElement.textContent = getIconEmoji(collectionNameIcon);
            h2Element.insertBefore(iconElement, collectionNameElement);
        }
    }
}

function getIconEmoji(iconName) {
    const icons = {
        'book': '📖',
        'coins': '🪙',
        'globe': '🌍',
        'heart': '❤️',
        'star': '⭐',
        'trophy': '🏆',
        'airplane': '✈️',
        'gem': '💎'
    };
    return icons[iconName] || '';
}

function changeCollectionNameFont(fontName) {
    // Apply font immediately for preview
    const collectionNameElement = document.getElementById('collectionNameDisplay');
    if (collectionNameElement) {
        collectionNameElement.style.fontFamily = `'${fontName}', sans-serif`;
    }
}

function changeCollectionNameSize(size) {
    // Apply size immediately for preview
    const collectionNameElement = document.getElementById('collectionNameDisplay');
    if (collectionNameElement) {
        collectionNameElement.style.fontSize = size;
    }
}

function changeCollectionNameColor(color) {
    // Apply color immediately for preview
    const collectionNameElement = document.getElementById('collectionNameDisplay');
    if (collectionNameElement) {
        collectionNameElement.style.color = color;
    }
    
    // Save the color choice immediately
    collectionNameColor = color;
    localStorage.setItem('collectionNameColor', collectionNameColor);
    
    // Update selected state in color options
    document.querySelectorAll('.color-option').forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.color === color) {
            option.classList.add('selected');
        }
    });
}

function changeCollectionNameBackground(background) {
    // Apply background immediately for preview
    const container = document.querySelector('.collection-name-container');
    if (container) {
        // Remove all background classes
        container.classList.remove('bg-default', 'bg-sunset', 'bg-ocean', 'bg-forest', 'bg-purple', 'bg-fire', 'bg-ice', 'bg-gold', 'bg-silver');
        // Add the selected background class
        container.classList.add(`bg-${background}`);
    }
    
    // Save the background choice immediately
    collectionNameBackground = background;
    localStorage.setItem('collectionNameBackground', collectionNameBackground);
    
    // Update selected state in background options
    document.querySelectorAll('.background-option').forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.background === background) {
            option.classList.add('selected');
        }
    });
}

function changeCollectionNameOutline(outline) {
    // Apply outline immediately for preview
    const collectionNameElement = document.getElementById('collectionNameDisplay');
    if (collectionNameElement) {
        // Remove all outline classes
        collectionNameElement.classList.remove('outline-none', 'outline-white', 'outline-black');
        // Add the selected outline class
        collectionNameElement.classList.add(`outline-${outline}`);
    }
    
    // Save the outline choice immediately
    collectionNameOutline = outline;
    localStorage.setItem('collectionNameOutline', collectionNameOutline);
    
    // Update selected state in outline options
    document.querySelectorAll('.outline-option').forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.outline === outline) {
            option.classList.add('selected');
        }
    });
}

function changeCollectionNameIcon(icon) {
    // Apply icon immediately for preview
    const collectionNameElement = document.getElementById('collectionNameDisplay');
    const h2Element = collectionNameElement.parentElement;
    
    if (collectionNameElement && h2Element) {
        // Remove existing FontAwesome icon (the default book icon)
        const existingFAIcon = h2Element.querySelector('.fas');
        if (existingFAIcon) {
            existingFAIcon.remove();
        }
        
        // Remove existing custom icon if any
        const existingIcon = h2Element.querySelector('.collection-icon');
        if (existingIcon) {
            existingIcon.remove();
        }
        
        // Add new icon if not 'none'
        if (icon !== 'none') {
            const iconElement = document.createElement('span');
            iconElement.className = 'collection-icon';
            iconElement.textContent = getIconEmoji(icon);
            h2Element.insertBefore(iconElement, collectionNameElement);
        }
    }
    
    // Save the icon choice immediately
    collectionNameIcon = icon;
    localStorage.setItem('collectionNameIcon', collectionNameIcon);
    
    // Update selected state in icon options
    document.querySelectorAll('.icon-option').forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.icon === icon) {
            option.classList.add('selected');
        }
    });
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
                    <label for="collectionNameFont">Font Style:</label>
                    <select id="collectionNameFont" class="font-selector" onchange="changeCollectionNameFont(this.value)">
                        <option value="Inter" style="font-family: 'Inter', sans-serif;">Inter</option>
                        <option value="Playfair Display" style="font-family: 'Playfair Display', serif;">Playfair Display</option>
                        <option value="Dancing Script" style="font-family: 'Dancing Script', cursive;">Dancing Script</option>
                        <option value="Great Vibes" style="font-family: 'Great Vibes', cursive;">Great Vibes</option>
                        <option value="Merriweather" style="font-family: 'Merriweather', serif;">Merriweather</option>
                        <option value="Roboto" style="font-family: 'Roboto', sans-serif;">Roboto</option>
                        <option value="Bebas Neue" style="font-family: 'Bebas Neue', sans-serif;">Bebas Neue</option>
                        <option value="Oswald" style="font-family: 'Oswald', sans-serif;">Oswald</option>
                        <option value="Lobster" style="font-family: 'Lobster', cursive;">Lobster</option>
                        <option value="Pacifico" style="font-family: 'Pacifico', cursive;">Pacifico</option>
                        <option value="Righteous" style="font-family: 'Righteous', cursive;">Righteous</option>
                        <option value="Fredoka One" style="font-family: 'Fredoka One', cursive;">Fredoka One</option>
                        <option value="Comfortaa" style="font-family: 'Comfortaa', sans-serif;">Comfortaa</option>
                        <option value="Quicksand" style="font-family: 'Quicksand', sans-serif;">Quicksand</option>
                        <option value="Montserrat" style="font-family: 'Montserrat', sans-serif;">Montserrat</option>
                        <option value="Source Code Pro" style="font-family: 'Source Code Pro', monospace;">Source Code Pro</option>
                    </select>
                    <small>Choose the font style for your collection name display.</small>
                </div>
                <div class="form-group">
                    <label for="collectionNameSize">Font Size:</label>
                    <select id="collectionNameSize" class="size-selector" onchange="changeCollectionNameSize(this.value)">
                        <option value="1.2rem">Small</option>
                        <option value="1.5rem">Medium</option>
                        <option value="1.8rem">Large</option>
                        <option value="2.2rem">Extra Large</option>
                        <option value="2.8rem">Huge</option>
                    </select>
                    <small>Choose the size of your collection name.</small>
                </div>
                <div class="form-group">
                    <label for="collectionNameColor">Text Color:</label>
                    <div class="color-options">
                        <div class="color-option" data-color="#000000" style="background-color: #000000;" onclick="changeCollectionNameColor('#000000')" title="Black"></div>
                        <div class="color-option" data-color="#ffffff" style="background-color: #ffffff; border: 1px solid #ccc;" onclick="changeCollectionNameColor('#ffffff')" title="White"></div>
                        <div class="color-option" data-color="#2c3e50" style="background-color: #2c3e50;" onclick="changeCollectionNameColor('#2c3e50')" title="Dark Blue"></div>
                        <div class="color-option" data-color="#8b4513" style="background-color: #8b4513;" onclick="changeCollectionNameColor('#8b4513')" title="Brown"></div>
                        <div class="color-option" data-color="#d4af37" style="background-color: #d4af37;" onclick="changeCollectionNameColor('#d4af37')" title="Gold"></div>
                        <div class="color-option" data-color="#c0392b" style="background-color: #c0392b;" onclick="changeCollectionNameColor('#c0392b')" title="Red"></div>
                        <div class="color-option" data-color="#27ae60" style="background-color: #27ae60;" onclick="changeCollectionNameColor('#27ae60')" title="Green"></div>
                        <div class="color-option" data-color="#8e44ad" style="background-color: #8e44ad;" onclick="changeCollectionNameColor('#8e44ad')" title="Purple"></div>
                        <div class="color-option" data-color="#e67e22" style="background-color: #e67e22;" onclick="changeCollectionNameColor('#e67e22')" title="Orange"></div>
                        <div class="color-option" data-color="#34495e" style="background-color: #34495e;" onclick="changeCollectionNameColor('#34495e')" title="Dark Gray"></div>
                    </div>
                    <small>Choose the color for your collection name text.</small>
                </div>
                <div class="form-group">
                    <label for="collectionNameBackground">Background Style:</label>
                    <div class="background-options">
                        <div class="background-option" data-background="default" onclick="changeCollectionNameBackground('default')" title="Default">
                            <div class="bg-preview default-bg"></div>
                            <span>Default</span>
                        </div>
                        <div class="background-option" data-background="sunset" onclick="changeCollectionNameBackground('sunset')" title="Sunset">
                            <div class="bg-preview sunset-bg"></div>
                            <span>Sunset</span>
                        </div>
                        <div class="background-option" data-background="ocean" onclick="changeCollectionNameBackground('ocean')" title="Ocean">
                            <div class="bg-preview ocean-bg"></div>
                            <span>Ocean</span>
                        </div>
                        <div class="background-option" data-background="forest" onclick="changeCollectionNameBackground('forest')" title="Forest">
                            <div class="bg-preview forest-bg"></div>
                            <span>Forest</span>
                        </div>
                        <div class="background-option" data-background="purple" onclick="changeCollectionNameBackground('purple')" title="Purple">
                            <div class="bg-preview purple-bg"></div>
                            <span>Purple</span>
                        </div>
                        <div class="background-option" data-background="fire" onclick="changeCollectionNameBackground('fire')" title="Fire">
                            <div class="bg-preview fire-bg"></div>
                            <span>Fire</span>
                        </div>
                        <div class="background-option" data-background="ice" onclick="changeCollectionNameBackground('ice')" title="Ice">
                            <div class="bg-preview ice-bg"></div>
                            <span>Ice</span>
                        </div>
                        <div class="background-option" data-background="gold" onclick="changeCollectionNameBackground('gold')" title="Gold">
                            <div class="bg-preview gold-bg"></div>
                            <span>Gold</span>
                        </div>
                        <div class="background-option" data-background="silver" onclick="changeCollectionNameBackground('silver')" title="Silver">
                            <div class="bg-preview silver-bg"></div>
                            <span>Silver</span>
                        </div>
                    </div>
                    <small>Choose a background style for your collection name container.</small>
                </div>
                <div class="form-group">
                    <label for="collectionNameOutline">Text Outline:</label>
                    <div class="outline-options">
                        <div class="outline-option" data-outline="none" onclick="changeCollectionNameOutline('none')" title="No Outline">
                            <div class="outline-preview outline-none">Aa</div>
                            <span>None</span>
                        </div>
                        <div class="outline-option" data-outline="white" onclick="changeCollectionNameOutline('white')" title="White Outline">
                            <div class="outline-preview outline-white">Aa</div>
                            <span>White</span>
                        </div>
                        <div class="outline-option" data-outline="black" onclick="changeCollectionNameOutline('black')" title="Black Outline">
                            <div class="outline-preview outline-black">Aa</div>
                            <span>Black</span>
                        </div>
                    </div>
                    <small>Add an outline to make text more readable on colorful backgrounds.</small>
                </div>
                <div class="form-group">
                    <label for="collectionNameIcon">Icon:</label>
                    <div class="icon-options">
                        <div class="icon-option" data-icon="none" onclick="changeCollectionNameIcon('none')" title="No Icon">
                            <div class="icon-preview">—</div>
                            <span>None</span>
                        </div>
                        <div class="icon-option" data-icon="book" onclick="changeCollectionNameIcon('book')" title="Book">
                            <div class="icon-preview">📖</div>
                            <span>Book</span>
                        </div>
                        <div class="icon-option" data-icon="coins" onclick="changeCollectionNameIcon('coins')" title="Coins">
                            <div class="icon-preview">🪙</div>
                            <span>Coins</span>
                        </div>
                        <div class="icon-option" data-icon="globe" onclick="changeCollectionNameIcon('globe')" title="Globe">
                            <div class="icon-preview">🌍</div>
                            <span>Globe</span>
                        </div>
                        <div class="icon-option" data-icon="heart" onclick="changeCollectionNameIcon('heart')" title="Heart">
                            <div class="icon-preview">❤️</div>
                            <span>Heart</span>
                        </div>
                        <div class="icon-option" data-icon="star" onclick="changeCollectionNameIcon('star')" title="Star">
                            <div class="icon-preview">⭐</div>
                            <span>Star</span>
                        </div>
                        <div class="icon-option" data-icon="trophy" onclick="changeCollectionNameIcon('trophy')" title="Trophy">
                            <div class="icon-preview">🏆</div>
                            <span>Trophy</span>
                        </div>
                        <div class="icon-option" data-icon="airplane" onclick="changeCollectionNameIcon('airplane')" title="Airplane">
                            <div class="icon-preview">✈️</div>
                            <span>Airplane</span>
                        </div>
                        <div class="icon-option" data-icon="gem" onclick="changeCollectionNameIcon('gem')" title="Gem">
                            <div class="icon-preview">💎</div>
                            <span>Gem</span>
                        </div>
                    </div>
                    <small>Choose an icon to display before your collection name.</small>
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
    
    // Set the current values in the dropdowns and color options
    setTimeout(() => {
        const fontSelect = document.getElementById('collectionNameFont');
        const sizeSelect = document.getElementById('collectionNameSize');
        
        if (fontSelect) {
            fontSelect.value = collectionNameFont;
        }
        if (sizeSelect) {
            sizeSelect.value = collectionNameSize;
        }
        
        // Set selected color option
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.color === collectionNameColor) {
                option.classList.add('selected');
            }
        });
        
        // Set selected background option
        document.querySelectorAll('.background-option').forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.background === collectionNameBackground) {
                option.classList.add('selected');
            }
        });
        
        // Set selected outline option
        document.querySelectorAll('.outline-option').forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.outline === collectionNameOutline) {
                option.classList.add('selected');
            }
        });
        
        // Set selected icon option
        document.querySelectorAll('.icon-option').forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.icon === collectionNameIcon) {
                option.classList.add('selected');
            }
        });
    }, 100);
}

function closeCollectionSettingsModal() {
    const modal = document.getElementById('collectionSettingsModal');
    if (modal) {
        modal.remove();
    }
}


function saveCollectionSettings() {
    const nameInput = document.getElementById('collectionNameInput');
    const fontSelect = document.getElementById('collectionNameFont');
    const sizeSelect = document.getElementById('collectionNameSize');
    const newName = nameInput.value.trim();
    const selectedFont = fontSelect.value;
    const selectedSize = sizeSelect.value;
    
    if (newName.length === 0) {
        showNotification('Collection name cannot be empty', 'error');
        return;
    }
    
    setCollectionName(newName);
    setCollectionNameFont(selectedFont);
    setCollectionNameSize(selectedSize);
    closeCollectionSettingsModal();
    showNotification('Collection settings saved!', 'success');
}

// Audio System Functions
function initializeAudioSystem() {
    // Initialize audio context
    audioSystem.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Load real sound files
    loadSoundFiles();
    
    // Load saved settings
    updateAudioSettings();
}

function loadSoundFiles() {
    // Sound file paths - using the actual filenames you added
    const soundFiles = {
        pageTurn: 'sounds/167046__drminky__page-turn-2.wav',
        coinClink: 'sounds/368203__kermite607__coin-dropped.wav', 
        menuClick: 'sounds/702168__foxfire__click-tick-menu-navigation.wav',
        successChime: 'sounds/242501__gabrielaraujo__powerupsuccess.wav',
        modalSwish: 'sounds/269321__kwahmah_02__swoosh19.wav'
    };
    
    // Load each sound file
    Object.keys(soundFiles).forEach(soundName => {
        loadSoundFile(soundName, soundFiles[soundName]);
    });
}

function loadSoundFile(soundName, filePath) {
    console.log(`Attempting to load sound: ${soundName} from ${filePath}`);
    
    // Try using HTML5 Audio element first (works with file:// protocol)
    const audio = new Audio(filePath);
    
    audio.addEventListener('canplaythrough', () => {
        console.log(`✅ Successfully loaded sound: ${soundName}`);
        audioSystem.sounds[soundName] = {
            audio: audio,
            play: () => {
                if (!audioSystem.enabled) return;
                audio.currentTime = 0;
                audio.volume = audioSystem.volume;
                audio.play().catch(e => console.warn(`Could not play ${soundName}:`, e));
            }
        };
    });
    
    audio.addEventListener('error', (e) => {
        console.error(`❌ Failed to load sound file ${filePath}:`, e);
        // Try fetch as fallback
        tryFetchSound(soundName, filePath);
    });
    
    // Start loading
    audio.load();
}

function tryFetchSound(soundName, filePath) {
    fetch(filePath)
        .then(response => {
            console.log(`Response for ${soundName}:`, response.status, response.statusText);
            if (!response.ok) {
                console.error(`Sound file ${filePath} not found (${response.status}), using fallback`);
                audioSystem.sounds[soundName] = createFallbackSound(soundName);
                return;
            }
            return response.arrayBuffer();
        })
        .then(arrayBuffer => {
            if (arrayBuffer) {
                console.log(`Decoding audio data for ${soundName}, size: ${arrayBuffer.byteLength} bytes`);
                audioSystem.audioContext.decodeAudioData(arrayBuffer)
                    .then(audioBuffer => {
                        audioSystem.sounds[soundName] = {
                            buffer: audioBuffer,
                            play: () => playAudioBuffer(audioBuffer)
                        };
                        console.log(`✅ Successfully loaded sound via fetch: ${soundName}`);
                    })
                    .catch(error => {
                        console.error(`❌ Failed to decode audio for ${soundName}:`, error);
                        audioSystem.sounds[soundName] = createFallbackSound(soundName);
                    });
            }
        })
        .catch(error => {
            console.error(`❌ Failed to load sound file ${filePath}:`, error);
            audioSystem.sounds[soundName] = createFallbackSound(soundName);
        });
}

function playAudioBuffer(audioBuffer) {
    if (!audioSystem.enabled || !audioSystem.audioContext) return;
    
    const source = audioSystem.audioContext.createBufferSource();
    const gainNode = audioSystem.audioContext.createGain();
    
    source.buffer = audioBuffer;
    source.connect(gainNode);
    gainNode.connect(audioSystem.audioContext.destination);
    
    // Apply volume
    gainNode.gain.setValueAtTime(audioSystem.volume, audioSystem.audioContext.currentTime);
    
    source.start(audioSystem.audioContext.currentTime);
}

function createFallbackSound(soundName) {
    // Create a very subtle fallback sound if the file doesn't load
    return {
        play: () => {
            if (!audioSystem.enabled) return;
            console.log(`Playing fallback sound for ${soundName}`);
            // Very quiet, barely audible click as fallback
            const oscillator = audioSystem.audioContext.createOscillator();
            const gainNode = audioSystem.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioSystem.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(1000, audioSystem.audioContext.currentTime);
            oscillator.type = 'sine';
            
            // Much quieter fallback sound
            gainNode.gain.setValueAtTime(audioSystem.volume * 0.02, audioSystem.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioSystem.audioContext.currentTime + 0.05);
            
            oscillator.start(audioSystem.audioContext.currentTime);
            oscillator.stop(audioSystem.audioContext.currentTime + 0.05);
        }
    };
}


function playSound(soundName) {
    console.log(`Playing sound: ${soundName}, enabled: ${audioSystem.enabled}, sound exists: ${!!audioSystem.sounds[soundName]}`);
    if (audioSystem.sounds[soundName]) {
        audioSystem.sounds[soundName].play();
    } else {
        console.warn(`Sound ${soundName} not loaded yet`);
    }
}

function updateAudioSettings() {
    localStorage.setItem('soundEnabled', audioSystem.enabled);
    localStorage.setItem('soundVolume', audioSystem.volume);
}

function toggleSound() {
    audioSystem.enabled = !audioSystem.enabled;
    updateAudioSettings();
    return audioSystem.enabled;
}

function setSoundVolume(volume) {
    audioSystem.volume = Math.max(0, Math.min(1, volume));
    updateAudioSettings();
}

// Album Image Upload Functions
function initializeAlbumImageUpload() {
    const albumImageUploadArea = document.getElementById('albumImageUploadArea');
    const albumImageInput = document.getElementById('albumImageInput');
    const albumChooseImageBtn = document.getElementById('albumChooseImageBtn');
    
    if (!albumImageUploadArea || !albumImageInput || !albumChooseImageBtn) {
        console.log('Album image upload elements not found');
        return;
    }
    
    // File input change event
    albumImageInput.addEventListener('change', handleAlbumImageSelect);
    
    // Click to browse
    albumImageUploadArea.addEventListener('click', () => albumImageInput.click());
    albumChooseImageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        albumImageInput.click();
    });
    
    // Drag and drop events
    albumImageUploadArea.addEventListener('dragover', handleAlbumImageDragOver);
    albumImageUploadArea.addEventListener('drop', handleAlbumImageDrop);
    albumImageUploadArea.addEventListener('dragenter', handleAlbumImageDragEnter);
    albumImageUploadArea.addEventListener('dragleave', handleAlbumImageDragLeave);
}

function handleAlbumImageSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        processAlbumImageFile(file);
    }
}

function handleAlbumImageDragOver(event) {
    event.preventDefault();
    document.getElementById('albumImageUploadArea').classList.add('dragover');
}

function handleAlbumImageDrop(event) {
    event.preventDefault();
    document.getElementById('albumImageUploadArea').classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        processAlbumImageFile(files[0]);
    }
}

function handleAlbumImageDragEnter(event) {
    event.preventDefault();
    document.getElementById('albumImageUploadArea').classList.add('dragover');
}

function handleAlbumImageDragLeave(event) {
    event.preventDefault();
    document.getElementById('albumImageUploadArea').classList.remove('dragover');
}

function processAlbumImageFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        // Compress the image for album background
        compressImage(e.target.result, 1200, 800, 0.8).then(compressedData => {
            currentAlbumImageData = compressedData;
            
            // Show preview
            const albumPreviewImage = document.getElementById('albumPreviewImage');
            const albumUploadPreview = document.getElementById('albumUploadPreview');
            const albumImageUploadArea = document.getElementById('albumImageUploadArea');
            
            if (albumPreviewImage && albumUploadPreview && albumImageUploadArea) {
                albumPreviewImage.src = compressedData;
                albumUploadPreview.style.display = 'block';
                albumImageUploadArea.style.display = 'none';
                
                // Clear the URL field since local image takes precedence
                const albumImageUrl = document.getElementById('albumImageUrl');
                if (albumImageUrl) {
                    albumImageUrl.value = '';
                }
                
                showNotification('Image uploaded successfully!', 'success');
            }
        });
    };
    reader.readAsDataURL(file);
}

function resetAlbumImageUpload() {
    currentAlbumImageData = null;
    
    const albumUploadPreview = document.getElementById('albumUploadPreview');
    const albumImageUploadArea = document.getElementById('albumImageUploadArea');
    const albumImageInput = document.getElementById('albumImageInput');
    
    if (albumUploadPreview) albumUploadPreview.style.display = 'none';
    if (albumImageUploadArea) albumImageUploadArea.style.display = 'block';
    if (albumImageInput) albumImageInput.value = '';
}

// Edit Album Image Upload Functions
function initializeEditAlbumImageUpload() {
    const uploadArea = document.getElementById('editAlbumImageUploadArea');
    const fileInput = document.getElementById('editAlbumImageFileInput');
    
    if (!uploadArea || !fileInput) return;
    
    // Drag and drop events
    uploadArea.addEventListener('dragover', handleEditAlbumDragOver);
    uploadArea.addEventListener('dragleave', handleEditAlbumDragLeave);
    uploadArea.addEventListener('drop', handleEditAlbumDrop);
    uploadArea.addEventListener('click', () => fileInput.click());
    
    // File input change event
    fileInput.addEventListener('change', handleEditAlbumFileSelect);
}

function handleEditAlbumDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.target.closest('.album-image-upload-area').classList.add('dragover');
}

function handleEditAlbumDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.target.closest('.album-image-upload-area').classList.remove('dragover');
}

function handleEditAlbumDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const uploadArea = e.target.closest('.album-image-upload-area');
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processEditAlbumImageFile(files[0]);
    }
}

function handleEditAlbumFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processEditAlbumImageFile(file);
    }
}

function processEditAlbumImageFile(file) {
    if (!file.type.startsWith('image/')) {
        showNotification('Please select an image file', 'error');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showNotification('Image file must be smaller than 10MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        currentEditAlbumImageData = e.target.result;
        displayEditAlbumImagePreview(e.target.result);
        // Clear the URL field since we're using the uploaded image
        document.getElementById('editAlbumImageUrl').value = '';
        showNotification('Image uploaded successfully!', 'success');
    };
    reader.readAsDataURL(file);
}

function displayEditAlbumImagePreview(imageSrc) {
    const uploadContent = document.getElementById('editAlbumUploadContent');
    const uploadPreview = document.getElementById('editAlbumUploadPreview');
    const previewImage = document.getElementById('editAlbumPreviewImage');
    
    if (uploadContent) uploadContent.style.display = 'none';
    if (uploadPreview) uploadPreview.style.display = 'block';
    if (previewImage) previewImage.src = imageSrc;
}

function resetEditAlbumImageUpload() {
    currentEditAlbumImageData = null;
    const uploadArea = document.getElementById('editAlbumImageUploadArea');
    const uploadContent = document.getElementById('editAlbumUploadContent');
    const uploadPreview = document.getElementById('editAlbumUploadPreview');
    const fileInput = document.getElementById('editAlbumImageFileInput');
    
    if (uploadArea) uploadArea.classList.remove('dragover');
    if (uploadContent) uploadContent.style.display = 'block';
    if (uploadPreview) uploadPreview.style.display = 'none';
    if (fileInput) fileInput.value = '';
    
    // Don't clear the URL field here - let the user keep their original URL
    // The URL field will be used if no new image is uploaded
}

// Edit Penny Image Upload Functions
function initializeEditPennyImageUpload() {
    const uploadArea = document.getElementById('editPennyUploadArea');
    const fileInput = document.getElementById('editPennyImageInput');
    const chooseBtn = document.getElementById('editPennyChooseImageBtn');
    
    if (!uploadArea || !fileInput || !chooseBtn) return;
    
    // Click to browse
    chooseBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleEditPennyImageUpload(file);
        }
    });
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleEditPennyImageUpload(files[0]);
        }
    });
}

function handleEditPennyImageUpload(file) {
    if (!file.type.startsWith('image/')) {
        showNotification('Please select an image file', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const base64 = e.target.result;
        
        // Compress the image
        compressImage(base64, 800, 600, 0.8).then(compressedData => {
            currentEditPennyImageData = compressedData;
            
            // Show preview
            const preview = document.getElementById('editPennyUploadPreview');
            const previewImg = document.getElementById('editPennyPreviewImage');
            const uploadArea = document.getElementById('editPennyUploadArea');
            
            if (preview && previewImg && uploadArea) {
                previewImg.src = compressedData;
                preview.style.display = 'block';
                uploadArea.style.display = 'none';
            }
        });
    };
    reader.readAsDataURL(file);
}

function resetEditPennyImageUpload() {
    currentEditPennyImageData = null;
    const preview = document.getElementById('editPennyUploadPreview');
    const uploadArea = document.getElementById('editPennyUploadArea');
    const fileInput = document.getElementById('editPennyImageInput');
    
    if (preview) preview.style.display = 'none';
    if (uploadArea) uploadArea.style.display = 'block';
    if (fileInput) fileInput.value = '';
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