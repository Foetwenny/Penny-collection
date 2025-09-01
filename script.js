// Global variables
let albums = JSON.parse(localStorage.getItem('pennyAlbums')) || [];
let currentAlbum = null;
let currentImageData = null;
let currentAnalysis = null;
let isSharedView = false; // Track if we're viewing a shared album

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
    checkForSharedAlbum();
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

    // Use event delegation for modal buttons
    document.addEventListener('click', function(event) {
        if (event.target && event.target.id === 'saveBtn') {
            saveToAlbum();
        }
        if (event.target && event.target.id === 'editBtn') {
            openEditModal();
        }
    });
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

    // Check if API key is configured
    if (!isGoogleAIConfigured()) {
        showNotification('Google AI API key not configured.', 'error');
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
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${window.GOOGLE_AI_CONFIG.apiKey}`, {
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
}

function closeCreateAlbumModal() {
    createAlbumModal.style.display = 'none';
    document.getElementById('createAlbumForm').reset();
}

function createAlbum() {
    const name = document.getElementById('albumName').value.trim();
    const description = document.getElementById('albumDescription').value.trim();
    const tripDate = document.getElementById('albumTripDate').value;
    const location = document.getElementById('albumLocation').value.trim();
    const imageUrl = (document.getElementById('albumImageUrl')?.value || '').trim();
    
    if (!name) {
        showNotification('Please enter an album name', 'error');
        return;
    }
    
    const newAlbum = {
        id: Date.now().toString(),
        name: name,
        description: description,
        tripDate: tripDate,
        location: location,
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
                ${album.location ? `<div class="album-location"><i class="fas fa-map-marker-alt"></i> ${album.location}</div>` : ''}
                <div class="album-actions">
                    <button class="album-action-btn share-btn" onclick="event.stopPropagation(); openShareModal('${album.id}')" title="Share Album">
                        <i class="fas fa-share-alt"></i>
                    </button>
                    <button class="album-action-btn delete-btn" onclick="event.stopPropagation(); deleteAlbum('${album.id}')" title="Delete Album">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function openAlbumView(albumId) {
    currentAlbum = albums.find(album => album.id === albumId);
    if (!currentAlbum) return;
    
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
            <img src="${penny.imageData}" alt="${penny.name}" class="penny-image" onclick="openPennyView('${penny.id}')">
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
    
    // Store current album and populate form
    document.getElementById('editAlbumName').value = currentAlbum.name || '';
    document.getElementById('editAlbumDescription').value = currentAlbum.description || '';
    document.getElementById('editAlbumTripDate').value = currentAlbum.tripDate || '';
    document.getElementById('editAlbumLocation').value = currentAlbum.location || '';
    document.getElementById('editAlbumImageUrl').value = currentAlbum.imageUrl || '';
    
    editAlbumModal.dataset.albumId = currentAlbum.id;
    editAlbumModal.style.display = 'block';
}

function editAlbum(albumId) {
    const album = albums.find(a => a.id === albumId);
    if (!album) return;
    
    // Store current album and populate form
    currentAlbum = album;
    document.getElementById('editAlbumName').value = album.name || '';
    document.getElementById('editAlbumDescription').value = album.description || '';
    document.getElementById('editAlbumTripDate').value = album.tripDate || '';
    document.getElementById('editAlbumLocation').value = album.location || '';
    document.getElementById('editAlbumImageUrl').value = album.imageUrl || '';
    
    editAlbumModal.dataset.albumId = album.id;
    editAlbumModal.style.display = 'block';
}

function closeEditAlbumModal() {
    editAlbumModal.style.display = 'none';
    editAlbumModal.dataset.albumId = '';
}

function openAddPennyModal() {
    addPennyModal.style.display = 'block';
    resetUpload();
}

function closeAddPennyModal() {
    addPennyModal.style.display = 'none';
    resetUpload();
}

function openPennyView(pennyId) {
    const penny = currentAlbum.pennies.find(p => p.id === pennyId);
    if (!penny) return;
    
    document.getElementById('pennyViewTitle').textContent = penny.name;
    document.getElementById('pennyViewImage').src = penny.imageData;
    document.getElementById('pennyViewName').textContent = penny.name;
    document.getElementById('pennyViewLocation').textContent = penny.location;
    document.getElementById('pennyViewDate').textContent = penny.dateCollected ? new Date(penny.dateCollected).toLocaleDateString() : 'No date';
    document.getElementById('pennyViewDescription').textContent = penny.description;
    
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
    const tripDate = document.getElementById('editAlbumTripDate').value;
    const location = document.getElementById('editAlbumLocation').value.trim();
    const imageUrl = (document.getElementById('editAlbumImageUrl').value || '').trim();
    
    Object.assign(album, { name, description, tripDate, location, imageUrl });
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
    }
}

// Export/Backup function to prevent data loss
function exportAlbums() {
    const dataStr = JSON.stringify(albums, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `penny-collection-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showNotification('Album backup exported successfully!', 'success');
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
                    const importedAlbums = JSON.parse(e.target.result);
                    albums = importedAlbums;
                    saveAlbumsToStorage();
                    renderAlbums();
                    showNotification('Albums imported successfully!', 'success');
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
});

