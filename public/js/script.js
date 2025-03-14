// Configuration
const API_URL = 'https://vector-agent.onrender.com'; // Update with your actual Vector Agent API URL

// DOM Elements
const vectorStoreSelect = document.getElementById('vector-store-select');
const uploadBtn = document.getElementById('upload-btn');
const createStoreBtn = document.getElementById('create-store-btn');
const sendBtn = document.getElementById('send-btn');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

// Modal elements
const uploadModal = document.getElementById('upload-modal');
const createStoreModal = document.getElementById('create-store-modal');
const fileUrlInput = document.getElementById('file-url');
const fileInput = document.getElementById('file-input');
const fileSelectBtn = document.getElementById('file-select-btn');
const fileName = document.getElementById('file-name');
const uploadConfirmBtn = document.getElementById('upload-confirm-btn');
const storeNameInput = document.getElementById('store-name');
const expirationDaysInput = document.getElementById('expiration-days');
const createStoreConfirmBtn = document.getElementById('create-store-confirm-btn');
const closeBtns = document.querySelectorAll('.close-btn');

// State
let currentVectorStoreId = '';
let messages = [];
let isProcessing = false;
let processingInterval = null;

// Initialize
document.addEventListener('DOMContentLoaded', init);

function init() {
    // Set up event listeners
    vectorStoreSelect.addEventListener('change', handleVectorStoreChange);
    uploadBtn.addEventListener('click', showUploadModal);
    createStoreBtn.addEventListener('click', showCreateStoreModal);
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', handleChatInputKeydown);
    
    // Modal event listeners
    fileSelectBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelection);
    uploadConfirmBtn.addEventListener('click', handleFileUpload);
    createStoreConfirmBtn.addEventListener('click', handleCreateStore);
    closeBtns.forEach(btn => btn.addEventListener('click', closeModals));
    
    // Load vector stores
    loadVectorStores();
}

// Handle chat keydown
function handleChatInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (chatInput.value.trim() && currentVectorStoreId) {
            sendMessage();
        }
    }
}

// Load vector stores from API
async function loadVectorStores() {
    try {
        // In a real implementation, you would have an endpoint to list vector stores
        // For now, we'll simulate it with a hardcoded list or local storage
        const stores = JSON.parse(localStorage.getItem('vectorStores')) || [];
        
        // Clear existing options (except the default)
        while (vectorStoreSelect.options.length > 1) {
            vectorStoreSelect.remove(1);
        }
        
        // Add options for each store
        stores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.id;
            option.textContent = store.name;
            vectorStoreSelect.appendChild(option);
        });
        
        // If there's a previously selected store, select it
        const lastSelectedStore = localStorage.getItem('lastSelectedStore');
        if (lastSelectedStore) {
            vectorStoreSelect.value = lastSelectedStore;
            handleVectorStoreChange();
        }
    } catch (error) {
        console.error('Error loading vector stores:', error);
        addSystemMessage('Failed to load vector stores. Please try again.');
    }
}

// Handle vector store selection change
function handleVectorStoreChange() {
    const selectedStoreId = vectorStoreSelect.value;
    if (selectedStoreId) {
        currentVectorStoreId = selectedStoreId;
        localStorage.setItem('lastSelectedStore', selectedStoreId);
        sendBtn.disabled = false;
        uploadBtn.disabled = false;
        
        // Check processing status of the store
        checkProcessingStatus(selectedStoreId);
        
        // Clear chat messages
        messages = [];
        chatMessages.innerHTML = '';
        addSystemMessage('Vector store selected. You can now ask questions about the documents in this store.');
    } else {
        currentVectorStoreId = '';
        sendBtn.disabled = true;
        uploadBtn.disabled = true;
        clearInterval(processingInterval);
    }
}

// Check processing status of vector store
async function checkProcessingStatus(vectorStoreId) {
    try {
        clearInterval(processingInterval);
        
        // Function to check status
        const checkStatus = async () => {
            const response = await fetch(`${API_URL}/api/vector-store/check-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ vectorStoreId })
            });
            
            if (!response.ok) {
                throw new Error('Failed to check status');
            }
            
            const data = await response.json();
            
            // Update UI based on status
            if (data.status === 'processing') {
                addSystemMessage(`Processing files (${data.processingCount} remaining)...`);
                return false; // Not done processing
            } else if (data.status === 'ready') {
                addSystemMessage(`Ready to chat with ${data.fileCount} documents.`);
                clearInterval(processingInterval);
                return true; // Done processing
            } else if (data.status === 'empty') {
                addSystemMessage('No documents in this vector store. Upload some files to get started.');
                clearInterval(processingInterval);
                return true; // Done, but empty
            }
        };
        
        // Check immediately
        const isDone = await checkStatus();
        
        // If not done, set up interval to check again
        if (!isDone) {
            processingInterval = setInterval(async () => {
                const isDone = await checkStatus();
                if (isDone) {
                    clearInterval(processingInterval);
                }
            }, 5000); // Check every 5 seconds
        }
    } catch (error) {
        console.error('Error checking processing status:', error);
        addSystemMessage('Failed to check processing status.');
        clearInterval(processingInterval);
    }
}

// Send message to API
async function sendMessage() {
    const messageText = chatInput.value.trim();
    if (!messageText || !currentVectorStoreId || isProcessing) return;
    
    // Add user message to chat
    addUserMessage(messageText);
    
    // Clear input
    chatInput.value = '';
    
    // Set processing state
    isProcessing = true;
    sendBtn.disabled = true;
    
    try {
        // Show typing indicator
        const typingIndicator = addTypingIndicator();
        
        // Send to API
        const response = await fetch(`${API_URL}/api/search/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                vectorStoreId: currentVectorStoreId,
                messages: [
                    {
                        role: 'user',
                        content: messageText
                    }
                ],
                maxResults: 5,
                webSearch: {
                    enabled: true,
                    maxResults: 3
                }
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to get response');
        }
        
        const data = await response.json();
        
        // Remove typing indicator
        if (typingIndicator) {
            chatMessages.removeChild(typingIndicator);
        }
        
        // Add assistant response to chat
        addAssistantMessage(data.response);
        
    } catch (error) {
        console.error('Error sending message:', error);
        addSystemMessage('Failed to get a response. Please try again.');
    } finally {
        isProcessing = false;
        sendBtn.disabled = false;
    }
}

// Add user message to chat
function addUserMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message user';
    messageElement.innerHTML = `
        <div class="message-content">
            <p>${formatMessage(message)}</p>
        </div>
    `;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Add to messages array
    messages.push({ role: 'user', content: message });
}

// Add assistant message to chat
function addAssistantMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message assistant';
    messageElement.innerHTML = `
        <div class="message-content">
            <p>${formatMessage(message)}</p>
        </div>
    `;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Add to messages array
    messages.push({ role: 'assistant', content: message });
}

// Add system message to chat
function addSystemMessage(message) {
    // Check if the last message is a system message with the same content
    const lastMessage = chatMessages.lastElementChild;
    if (lastMessage && lastMessage.classList.contains('system') && 
        lastMessage.querySelector('.message-content p').textContent === message) {
        return; // Avoid duplicate system messages
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = 'message system';
    messageElement.innerHTML = `
        <div class="message-content">
            <p>${message}</p>
        </div>
    `;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Add typing indicator
function addTypingIndicator() {
    const indicatorElement = document.createElement('div');
    indicatorElement.className = 'message assistant typing';
    indicatorElement.innerHTML = `
        <div class="message-content">
            <p>Thinking<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></p>
        </div>
    `;
    chatMessages.appendChild(indicatorElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Animate dots
    const dots = indicatorElement.querySelectorAll('.dot');
    let dotIndex = 0;
    
    const animateDots = () => {
        dots.forEach((dot, index) => {
            if (index === dotIndex % 3) {
                dot.style.opacity = '1';
            } else {
                dot.style.opacity = '0.2';
            }
        });
        dotIndex++;
    };
    
    const interval = setInterval(animateDots, 300);
    indicatorElement.interval = interval;
    
    return indicatorElement;
}

// Show upload modal
function showUploadModal() {
    uploadModal.style.display = 'block';
    fileUrlInput.value = '';
    fileInput.value = '';
    fileName.textContent = 'No file selected';
}

// Show create store modal
function showCreateStoreModal() {
    createStoreModal.style.display = 'block';
    storeNameInput.value = '';
    expirationDaysInput.value = '30';
}

// Close all modals
function closeModals() {
    uploadModal.style.display = 'none';
    createStoreModal.style.display = 'none';
}

// Handle file selection
function handleFileSelection() {
    if (fileInput.files.length > 0) {
        fileName.textContent = fileInput.files[0].name;
    } else {
        fileName.textContent = 'No file selected';
    }
}

// Handle file upload
async function handleFileUpload() {
    const fileUrl = fileUrlInput.value.trim();
    const file = fileInput.files[0];
    
    if (!fileUrl && !file) {
        alert('Please enter a URL or select a file');
        return;
    }
    
    try {
        uploadConfirmBtn.disabled = true;
        uploadConfirmBtn.innerHTML = 'Uploading... <div class="loading"></div>';
        
        let response;
        
        if (fileUrl) {
            // Upload from URL
            response = await fetch(`${API_URL}/api/file/upload-file`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fileUrl })
            });
        } else {
            // Upload local file
            const formData = new FormData();
            formData.append('file', file);
            
            console.log('Uploading file:', file.name, file.type, file.size);
            
            response = await fetch(`${API_URL}/api/file/upload-file`, {
                method: 'POST',
                body: formData,
                // Important: Do NOT set Content-Type header, let the browser set it with boundary
            });
        }
        
        if (!response.ok) {
            throw new Error('Failed to upload file');
        }
        
        const fileData = await response.json();
        
        // Add file to vector store
        await addFileToVectorStore(fileData.id);
        
        closeModals();
        addSystemMessage(`File uploaded successfully. Processing started...`);
        
        // Check processing status
        checkProcessingStatus(currentVectorStoreId);
        
    } catch (error) {
        console.error('Error uploading file:', error);
        alert('Failed to upload file. Please try again.');
    } finally {
        uploadConfirmBtn.disabled = false;
        uploadConfirmBtn.innerHTML = 'Upload';
    }
}

// Add file to vector store
async function addFileToVectorStore(fileId) {
    try {
        const response = await fetch(`${API_URL}/api/file/add-file`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                vectorStoreId: currentVectorStoreId,
                fileId,
                chunkingStrategy: {
                    max_chunk_size_tokens: 1000,
                    chunk_overlap_tokens: 200
                }
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to add file to vector store');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error adding file to vector store:', error);
        throw error;
    }
}

// Handle create store
async function handleCreateStore() {
    const storeName = storeNameInput.value.trim();
    const expirationDays = parseInt(expirationDaysInput.value);
    
    if (!storeName) {
        alert('Please enter a store name');
        return;
    }
    
    if (isNaN(expirationDays) || expirationDays < 1) {
        alert('Please enter a valid number of days');
        return;
    }
    
    try {
        createStoreConfirmBtn.disabled = true;
        createStoreConfirmBtn.innerHTML = 'Creating... <div class="loading"></div>';
        
        const response = await fetch(`${API_URL}/api/vector-store/create-store`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: storeName,
                expiresAfter: {
                    anchor: 'last_active_at',
                    days: expirationDays
                }
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create vector store');
        }
        
        const data = await response.json();
        
        // Add to local storage
        const stores = JSON.parse(localStorage.getItem('vectorStores')) || [];
        stores.push({ id: data.id, name: storeName });
        localStorage.setItem('vectorStores', JSON.stringify(stores));
        
        // Reload vector stores and select the new one
        await loadVectorStores();
        vectorStoreSelect.value = data.id;
        handleVectorStoreChange();
        
        closeModals();
        addSystemMessage(`Vector store "${storeName}" created successfully.`);
        
    } catch (error) {
        console.error('Error creating vector store:', error);
        alert('Failed to create vector store. Please try again.');
    } finally {
        createStoreConfirmBtn.disabled = false;
        createStoreConfirmBtn.innerHTML = 'Create';
    }
}

// Format message for display (handle line breaks, links, etc.)
function formatMessage(message) {
    if (!message) return '';
    
    // Convert line breaks to <br>
    let formatted = message.replace(/\n/g, '<br>');
    
    // Convert URLs to links
    formatted = formatted.replace(
        /(https?:\/\/[^\s]+)/g, 
        '<a href="$1" target="_blank">$1</a>'
    );
    
    return formatted;
}

// When clicking anywhere outside the modals, close them
window.onclick = function(event) {
    if (event.target === uploadModal) {
        uploadModal.style.display = 'none';
    }
    if (event.target === createStoreModal) {
        createStoreModal.style.display = 'none';
    }
};