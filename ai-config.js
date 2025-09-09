// AI Configuration Functions
function openAIConfig() {
    closeMenu(); // Close the menu when opening AI config
    // Create a simple modal for AI configuration
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'aiConfigModal';
    
    // Get existing configuration to populate fields
    const existingConfig = localStorage.getItem('userAIConfig');
    let apiKey = '';
    let projectId = '';
    let isConfigured = false;
    
    if (existingConfig) {
        try {
            const config = JSON.parse(existingConfig);
            apiKey = config.apiKey || '';
            projectId = config.projectId || '';
            isConfigured = config.apiKey && config.apiKey.startsWith('AI');
        } catch (e) {
            console.error('Error parsing existing AI config:', e);
        }
    }
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-robot"></i> AI Configuration</h3>
                <button class="close-btn" onclick="closeAIConfigModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <p>AI Configuration modal - testing basic functionality</p>
                <div class="form-group">
                    <label for="aiApiKey">Google AI API Key:</label>
                    <input type="password" id="aiApiKey" placeholder="AI..." maxlength="100" value="${apiKey}">
                </div>
                <div class="form-group">
                    <label for="aiProjectId">Project ID (Optional):</label>
                    <input type="text" id="aiProjectId" placeholder="your-project-123" maxlength="50" value="${projectId}">
                    <small>Project ID helps with billing and quota management. Leave empty if unsure.</small>
                </div>
                <div class="ai-config-status">
                    <h4>Current Status:</h4>
                    <div class="status-indicator ${isConfigured ? 'status-success' : 'status-error'}">
                        <i class="fas fa-${isConfigured ? 'check-circle' : 'exclamation-circle'}"></i>
                        <span>${isConfigured ? 'AI Analysis Available' : 'AI Analysis Not Configured'}</span>
                    </div>
                </div>
                <div class="ai-config-actions">
                    <button class="test-btn" onclick="testAIConnection()">
                        <i class="fas fa-plug"></i> Test Connection
                    </button>
                    <button class="reset-btn" onclick="resetAIConfig()">
                        <i class="fas fa-undo"></i> Reset to Default
                    </button>
                </div>
                <div class="ai-config-help">
                    <h4><i class="fas fa-question-circle"></i> Setup Instructions:</h4>
                    <ol>
                        <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a></li>
                        <li>Sign in with your Google account</li>
                        <li>Click "Create API Key"</li>
                        <li>Copy the generated key (starts with "AI")</li>
                        <li>Paste it in the field above</li>
                        <li>Click "Test Connection" to verify</li>
                    </ol>
                    <div class="ai-config-note">
                        <strong>Note:</strong> Google AI API usage may incur costs. Check Google's pricing for current rates.
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="cancel-btn" onclick="closeAIConfigModal()">Cancel</button>
                <button class="save-btn" onclick="saveAIConfig()">Save</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

function closeAIConfigModal() {
    const modal = document.getElementById('aiConfigModal');
    if (modal) {
        modal.remove();
    }
}

function saveAIConfig() {
    const apiKey = document.getElementById('aiApiKey').value.trim();
    const projectId = document.getElementById('aiProjectId').value.trim();
    
    if (!apiKey) {
        showNotification('Please enter an API key', 'error');
        return;
    }
    
    // Validate API key format (should start with 'AI')
    if (!apiKey.startsWith('AI')) {
        showNotification('API key should start with "AI"', 'error');
        return;
    }
    
    // Save to localStorage
    localStorage.setItem('userAIConfig', JSON.stringify({ apiKey, projectId }));
    showNotification('AI configuration saved successfully!', 'success');
    closeAIConfigModal();
}

function testAIConnection() {
    const apiKey = document.getElementById('aiApiKey').value.trim();
    
    if (!apiKey) {
        showNotification('Please enter an API key first', 'error');
        return;
    }
    
    if (!apiKey.startsWith('AI')) {
        showNotification('API key should start with "AI"', 'error');
        return;
    }
    
    // Simple test - just validate the key format for now
    showNotification('API key format looks valid!', 'success');
    
    // Update the status display to show the key is now configured
    updateStatusDisplay();
}

function resetAIConfig() {
    // Clear the input fields
    document.getElementById('aiApiKey').value = '';
    document.getElementById('aiProjectId').value = '';
    
    // Remove saved configuration from localStorage
    localStorage.removeItem('userAIConfig');
    
    // Update status to show not configured
    updateStatusDisplay();
    
    showNotification('Configuration reset to default', 'success');
}

// Helper function to check if AI is configured
function isGoogleAIConfigured() {
    const userConfig = localStorage.getItem('userAIConfig');
    if (userConfig) {
        try {
            const config = JSON.parse(userConfig);
            return config.apiKey && config.apiKey.startsWith('AI');
        } catch (e) {
            return false;
        }
    }
    return false;
}

// Function to update the status display in real-time
function updateStatusDisplay() {
    const statusIndicator = document.querySelector('.status-indicator');
    if (statusIndicator) {
        const hasApiKey = document.getElementById('aiApiKey').value.trim().startsWith('AI');
        
        if (hasApiKey) {
            statusIndicator.className = 'status-indicator status-success';
            statusIndicator.innerHTML = '<i class="fas fa-check-circle"></i><span>AI Analysis Available</span>';
        } else {
            statusIndicator.className = 'status-indicator status-error';
            statusIndicator.innerHTML = '<i class="fas fa-exclamation-circle"></i><span>AI Analysis Not Configured</span>';
        }
    }
}
