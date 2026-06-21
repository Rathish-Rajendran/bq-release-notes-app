// Global Application State
let allUpdates = [];
let filteredUpdates = [];
let currentFilter = 'all';
let currentSearchQuery = '';
let selectedUpdateForTweet = null;

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const notesContainer = document.getElementById('notes-container');
const skeletonLoader = document.getElementById('skeleton-loader');
const emptyState = document.getElementById('empty-state');
const resultsCount = document.getElementById('results-count');
const lastUpdatedTime = document.getElementById('last-updated-time');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const filterPills = document.querySelectorAll('.filter-pill');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const modalOverlay = document.getElementById('modal-overlay');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
const submitTweetBtn = document.getElementById('submit-tweet-btn');
const tweetTextarea = document.getElementById('tweet-textarea');
const charNum = document.getElementById('char-num');
const charWarning = document.getElementById('char-warning');
const tweetDateBadge = document.getElementById('tweet-date-badge');
const tweetTypeBadge = document.getElementById('tweet-type-badge');
const tweetDescPreview = document.getElementById('tweet-desc-preview');
const hashtagBtns = document.querySelectorAll('.hashtag-btn');

// Toast Notification Container
const toastContainer = document.getElementById('toast-container');

// Core API Fetch Functions
async function fetchReleaseNotes(force = false) {
    showLoading(true);
    try {
        const url = `/api/release-notes${force ? '?force=true' : ''}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Server returned HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'error') {
            throw new Error(result.message);
        }
        
        if (result.status === 'warning') {
            showToast(result.message, 'warning');
        }
        
        allUpdates = result.data;
        updateLastRefreshedTime();
        updateCategoryCounts();
        applyFiltersAndSearch();
        
        if (force) {
            showToast('Release notes successfully refreshed!', 'success');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        showToast(`Failed to load release notes: ${error.message}`, 'error');
        if (allUpdates.length === 0) {
            showEmptyState(true);
        }
    } finally {
        showLoading(false);
    }
}

// Helpers
function showLoading(isLoading) {
    if (isLoading) {
        refreshBtn.classList.add('loading');
        refreshBtn.disabled = true;
        skeletonLoader.style.display = 'grid';
        notesContainer.style.display = 'none';
        emptyState.style.display = 'none';
    } else {
        refreshBtn.classList.remove('loading');
        refreshBtn.disabled = false;
        skeletonLoader.style.display = 'none';
    }
}

function updateLastRefreshedTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    lastUpdatedTime.textContent = `Last updated: ${timeStr}`;
}

function showEmptyState(show) {
    if (show) {
        notesContainer.style.display = 'none';
        emptyState.style.display = 'flex';
    } else {
        notesContainer.style.display = 'grid';
        emptyState.style.display = 'none';
    }
}

// Toast System
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Choose icon based on type
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else if (type === 'warning') {
        iconSvg = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    } else {
        iconSvg = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }
    
    toast.innerHTML = `
        <div class="toast-icon">${iconSvg}</div>
        <div class="toast-body">${message}</div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Remove after 3s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Category Counter Updates
function updateCategoryCounts() {
    const counts = {
        all: allUpdates.length,
        Feature: 0,
        Announcement: 0,
        Changed: 0,
        Deprecated: 0,
        Fix: 0
    };
    
    allUpdates.forEach(update => {
        // Handle variations (GCP updates types can match these core ones)
        const type = update.type;
        if (counts.hasOwnProperty(type)) {
            counts[type]++;
        } else if (type === 'Fixes' || type === 'Security Fix') {
            counts['Fix']++;
        } else if (type === 'Changes') {
            counts['Changed']++;
        } else {
            // General or uncategorized
        }
    });
    
    // Update badge values in the UI
    document.querySelector('.count-all').textContent = counts.all;
    document.querySelector('.count-feature').textContent = counts.Feature;
    document.querySelector('.count-announcement').textContent = counts.Announcement;
    document.querySelector('.count-changed').textContent = counts.Changed;
    document.querySelector('.count-deprecated').textContent = counts.Deprecated;
    document.querySelector('.count-fix').textContent = counts.Fix;
}

// Filtering & Searching Logic
function applyFiltersAndSearch() {
    filteredUpdates = allUpdates.filter(update => {
        // 1. Filter by category
        let categoryMatch = false;
        if (currentFilter === 'all') {
            categoryMatch = true;
        } else {
            // Handle variations in categories
            if (currentFilter === 'Fix') {
                categoryMatch = (update.type === 'Fix' || update.type === 'Fixes');
            } else if (currentFilter === 'Changed') {
                categoryMatch = (update.type === 'Changed' || update.type === 'Changes');
            } else {
                categoryMatch = update.type === currentFilter;
            }
        }
        
        // 2. Filter by search query
        let searchMatch = true;
        if (currentSearchQuery) {
            const query = currentSearchQuery.toLowerCase();
            const date = update.date.toLowerCase();
            const type = update.type.toLowerCase();
            // Search inside raw content html plain text
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = update.content_html;
            const contentText = tempDiv.textContent.toLowerCase();
            
            searchMatch = date.includes(query) || type.includes(query) || contentText.includes(query);
        }
        
        return categoryMatch && searchMatch;
    });
    
    resultsCount.textContent = `Showing ${filteredUpdates.length} update${filteredUpdates.length === 1 ? '' : 's'}`;
    renderUpdatesGrid();
}

// Render the updates in the Grid container
function renderUpdatesGrid() {
    notesContainer.innerHTML = '';
    
    if (filteredUpdates.length === 0) {
        showEmptyState(true);
        return;
    }
    
    showEmptyState(false);
    
    filteredUpdates.forEach(update => {
        const card = document.createElement('article');
        card.className = 'note-card';
        card.dataset.id = update.id;
        
        const typeClass = `type-${update.type.toLowerCase().replace(' ', '-')}`;
        
        card.innerHTML = `
            <header class="note-header">
                <div class="note-date">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <span>${update.date}</span>
                </div>
                <span class="badge type-badge ${typeClass}">${update.type}</span>
            </header>
            
            <div class="note-body">
                ${update.content_html}
            </div>
            
            <div class="note-actions">
                <button class="btn-action btn-copy-link" title="Copy Direct Link" data-link="${update.link}">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                </button>
                <a href="${update.link}" target="_blank" rel="noopener noreferrer" class="btn-action" title="View Source Google Release Notes">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </a>
                <button class="btn-tweet-now" data-id="${update.id}">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                    </svg>
                    <span>Tweet</span>
                </button>
            </div>
        `;
        
        notesContainer.appendChild(card);
    });
    
    // Add Event Listeners for action buttons dynamically
    notesContainer.querySelectorAll('.btn-copy-link').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const link = btn.getAttribute('data-link');
            navigator.clipboard.writeText(link).then(() => {
                showToast('Link copied to clipboard!', 'success');
            }).catch(err => {
                showToast('Failed to copy link', 'error');
            });
        });
    });
    
    notesContainer.querySelectorAll('.btn-tweet-now').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const updateId = btn.getAttribute('data-id');
            const update = allUpdates.find(u => u.id === updateId);
            if (update) {
                openTweetModal(update);
            }
        });
    });
}

// Tweet Modal Operations
function openTweetModal(update) {
    selectedUpdateForTweet = update;
    
    // Setup modal badges and previews
    tweetDateBadge.textContent = update.date;
    tweetTypeBadge.textContent = update.type;
    tweetTypeBadge.className = `badge type-badge type-${update.type.toLowerCase().replace(' ', '-')}`;
    tweetDescPreview.textContent = update.text;
    
    // Prepopulate Tweet draft
    // Structure: 📢 BigQuery Update ([Type]): [Excerpt] [Link] #BigQuery #GCP
    const prefix = `📢 #BigQuery Update [${update.type}]: `;
    const suffix = ` ${update.link}`;
    
    // Max content size is 280 - prefix - suffix
    const availableLength = 280 - prefix.length - suffix.length - 12; // leaving margin for potential default hashtags
    let textExcerpt = update.text;
    
    if (textExcerpt.length > availableLength) {
        textExcerpt = textExcerpt.slice(0, availableLength - 3) + '...';
    }
    
    tweetTextarea.value = `${prefix}"${textExcerpt}"${suffix} #GCP`;
    
    updateCharCount();
    
    // Open Modal
    tweetModal.classList.add('active');
    tweetModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // Lock background scroll
}

function closeTweetModal() {
    tweetModal.classList.remove('active');
    tweetModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    selectedUpdateForTweet = null;
}

function updateCharCount() {
    const len = tweetTextarea.value.length;
    charNum.textContent = len;
    
    if (len >= 280) {
        charNum.style.color = 'var(--color-deprecated)';
        charWarning.style.display = 'inline';
        submitTweetBtn.classList.add('disabled');
        submitTweetBtn.style.pointerEvents = 'none';
        submitTweetBtn.style.opacity = '0.5';
    } else {
        charNum.style.color = len > 240 ? 'var(--color-changed)' : 'var(--text-secondary)';
        charWarning.style.display = 'none';
        submitTweetBtn.classList.remove('disabled');
        submitTweetBtn.style.pointerEvents = 'all';
        submitTweetBtn.style.opacity = '1';
    }
    
    // Update Web Intent link
    const text = tweetTextarea.value;
    submitTweetBtn.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

// Event Listeners Registration
function registerEventListeners() {
    // Refresh Button Click
    refreshBtn.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });
    
    // Filter Pills Clicks
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentFilter = pill.getAttribute('data-filter');
            applyFiltersAndSearch();
        });
    });
    
    // Search Live Input
    searchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value;
        if (currentSearchQuery.trim().length > 0) {
            clearSearchBtn.style.display = 'flex';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        applyFiltersAndSearch();
    });
    
    // Clear Search Click
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentSearchQuery = '';
        clearSearchBtn.style.display = 'none';
        applyFiltersAndSearch();
        searchInput.focus();
    });
    
    // Empty State Reset Click
    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentSearchQuery = '';
        clearSearchBtn.style.display = 'none';
        
        filterPills.forEach(p => p.classList.remove('active'));
        document.querySelector('[data-filter="all"]').classList.add('active');
        currentFilter = 'all';
        
        applyFiltersAndSearch();
    });
    
    // Tweet Modal Close triggers
    closeModalBtn.addEventListener('click', closeTweetModal);
    cancelTweetBtn.addEventListener('click', closeTweetModal);
    modalOverlay.addEventListener('click', closeTweetModal);
    
    // Esc key closes modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tweetModal.classList.contains('active')) {
            closeTweetModal();
        }
    });
    
    // Textarea typing character counter
    tweetTextarea.addEventListener('input', updateCharCount);
    
    // Add hashtags click helpers
    hashtagBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const hashtag = btn.getAttribute('data-tag');
            const currentValue = tweetTextarea.value;
            
            // Check if hashtag already in draft
            if (currentValue.includes(hashtag)) {
                showToast(`Hashtag ${hashtag} already added!`, 'info');
                return;
            }
            
            // Append hashtag nicely
            if (currentValue.length + hashtag.length + 1 <= 280) {
                tweetTextarea.value = currentValue.trim() + ' ' + hashtag;
                updateCharCount();
                showToast(`Added ${hashtag}`, 'success');
            } else {
                showToast('Not enough characters left to add this hashtag!', 'warning');
            }
        });
    });
    
    // Twitter submit button click to auto-close modal after slight delay
    submitTweetBtn.addEventListener('click', () => {
        setTimeout(() => {
            closeTweetModal();
            showToast('Opening Twitter to publish your tweet!', 'info');
        }, 800);
    });
}

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
    registerEventListeners();
    fetchReleaseNotes(false); // Fetch on load
});
