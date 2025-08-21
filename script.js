// Main application script
import firebase from './firebase.js';

// Global state
let currentUser = null;
let isAdmin = false;

// DOM Elements
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userProfile = document.getElementById('user-profile');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const themeToggle = document.getElementById('theme-toggle');
const profileModal = document.getElementById('profile-modal');
const profileForm = document.getElementById('profile-form');
const loadingOverlay = document.getElementById('loading-overlay');

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    loadPageContent();
});

// App initialization
async function initializeApp() {
    showLoading();
    
    // Setup auth state observer
    firebase.onAuthStateChange(async (user) => {
        if (user) {
            currentUser = user;
            await handleUserLogin(user);
        } else {
            currentUser = null;
            handleUserLogout();
        }
        hideLoading();
    });
    
    // Initialize theme
    initializeTheme();
    
    // Load initial stats
    await loadStats();
}

// Event listeners setup
function setupEventListeners() {
    // Auth buttons
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Theme toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Profile modal
    if (profileModal) {
        setupProfileModal();
    }
    
    // Partner logos
    setupPartnerLogos();
    
    // Mobile menu toggle
    setupMobileMenu();
    
    // Close modals on outside click
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });
    
    // Handle escape key for modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal:not(.hidden)');
            if (openModal) {
                closeModal(openModal);
            }
        }
    });
}

// Authentication functions
async function handleLogin() {
    try {
        showLoading();
        await firebase.loginWithGoogle();
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Erro ao fazer login. Tente novamente.';
        
        if (error.code === 'auth/unauthorized-domain') {
            errorMessage = 'Domínio não autorizado. Configure o Firebase para permitir este domínio.';
        } else if (error.code === 'auth/popup-blocked') {
            errorMessage = 'Pop-up bloqueado. Permita pop-ups para este site.';
        }
        
        showNotification(errorMessage, 'error');
        hideLoading();
    }
}

async function handleLogout() {
    try {
        showLoading();
        await firebase.logoutUser();
        showNotification('Logout realizado com sucesso!', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Erro ao fazer logout.', 'error');
    } finally {
        hideLoading();
    }
}

async function handleUserLogin(user) {
    try {
        // Create/update user profile
        await firebase.createUserProfile(user);
        
        // Check admin status
        isAdmin = await firebase.isAdmin(user.uid);
        
        // Update UI
        updateAuthUI(user);
        
        // Show admin panel if admin
        if (isAdmin) {
            showAdminFeatures();
        }
        
        showNotification(`Bem-vinda, ${user.displayName}!`, 'success');
    } catch (error) {
        console.error('Error handling user login:', error);
        showNotification('Erro ao processar login.', 'error');
    }
}

function handleUserLogout() {
    currentUser = null;
    isAdmin = false;
    updateAuthUI(null);
    hideAdminFeatures();
}

function updateAuthUI(user) {
    if (user) {
        if (loginBtn) loginBtn.classList.add('hidden');
        if (userProfile) {
            userProfile.classList.remove('hidden');
            if (userAvatar) {
                if (user.photoURL) {
                    userAvatar.src = user.photoURL;
                    userAvatar.style.display = 'block';
                } else {
                    // Create a placeholder avatar with user's initial
                    const initial = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
                    userAvatar.style.display = 'none';
                    
                    // Check if placeholder already exists
                    let placeholder = userProfile.querySelector('.avatar-placeholder');
                    if (!placeholder) {
                        placeholder = document.createElement('div');
                        placeholder.className = 'avatar-placeholder';
                        userAvatar.parentNode.insertBefore(placeholder, userAvatar);
                    }
                    
                    placeholder.textContent = initial;
                    placeholder.style.display = 'flex';
                }
            }
            if (userName) userName.textContent = user.displayName || user.email;
        }
    } else {
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (userProfile) userProfile.classList.add('hidden');
    }
}

// Theme management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

function setTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        if (themeToggle) {
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    } else {
        document.documentElement.classList.remove('dark');
        if (themeToggle) {
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
    }
    localStorage.setItem('theme', theme);
}

// Profile modal management
function setupProfileModal() {
    // Profile modal trigger (clicking on user profile)
    if (userProfile) {
        userProfile.addEventListener('click', () => {
            if (currentUser) {
                openProfileModal();
            }
        });
    }
    
    // Profile form submission
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSubmit);
    }
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            closeModal(modal);
        });
    });
    
    // Photo upload functionality
    setupPhotoUpload();
}

function setupPhotoUpload() {
    const uploadBtn = document.getElementById('upload-photo-btn');
    const photoInput = document.getElementById('profile-photo-input');
    const removeBtn = document.getElementById('remove-photo-btn');
    const currentPhoto = document.getElementById('current-profile-photo');
    const noPhotoPlaceholder = document.getElementById('no-photo-placeholder');
    
    if (uploadBtn && photoInput) {
        uploadBtn.addEventListener('click', () => {
            photoInput.click();
        });
        
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handlePhotoUpload(file);
            }
        });
    }
    
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            handlePhotoRemoval();
        });
    }
}

async function handlePhotoUpload(file) {
    if (!currentUser) return;
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('A imagem deve ter no máximo 5MB.', 'error');
        return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showNotification('Por favor, selecione um arquivo de imagem válido.', 'error');
        return;
    }
    
    try {
        showLoading();
        
        // Upload to Firebase Storage
        const photoURL = await firebase.uploadProfilePhoto(currentUser.uid, file);
        
        // Update UI
        const currentPhoto = document.getElementById('current-profile-photo');
        const noPhotoPlaceholder = document.getElementById('no-photo-placeholder');
        const removeBtn = document.getElementById('remove-photo-btn');
        
        currentPhoto.src = photoURL;
        currentPhoto.style.display = 'block';
        noPhotoPlaceholder.style.display = 'none';
        removeBtn.classList.remove('hidden');
        
        // Update user avatar in header
        if (userAvatar) {
            userAvatar.src = photoURL;
            userAvatar.style.display = 'block';
            // Hide placeholder if exists
            const placeholder = userProfile.querySelector('.avatar-placeholder');
            if (placeholder) {
                placeholder.style.display = 'none';
            }
        }
        
        showNotification('Foto de perfil atualizada com sucesso!', 'success');
        
    } catch (error) {
        console.error('Error uploading photo:', error);
        showNotification('Erro ao fazer upload da foto. Tente novamente.', 'error');
    } finally {
        hideLoading();
    }
}

async function handlePhotoRemoval() {
    if (!currentUser) return;
    
    try {
        showLoading();
        
        // Remove from Firebase Storage and update profile
        await firebase.removeProfilePhoto(currentUser.uid);
        
        // Update UI
        const currentPhoto = document.getElementById('current-profile-photo');
        const noPhotoPlaceholder = document.getElementById('no-photo-placeholder');
        const removeBtn = document.getElementById('remove-photo-btn');
        
        currentPhoto.style.display = 'none';
        currentPhoto.src = '';
        noPhotoPlaceholder.style.display = 'flex';
        removeBtn.classList.add('hidden');
        
        // Update user avatar in header
        if (userAvatar) {
            userAvatar.style.display = 'none';
            // Show placeholder
            const placeholder = userProfile.querySelector('.avatar-placeholder');
            if (placeholder) {
                placeholder.style.display = 'flex';
            }
        }
        
        showNotification('Foto de perfil removida com sucesso!', 'success');
        
    } catch (error) {
        console.error('Error removing photo:', error);
        showNotification('Erro ao remover foto. Tente novamente.', 'error');
    } finally {
        hideLoading();
    }
}

async function openProfileModal() {
    if (!currentUser) return;
    
    try {
        showLoading();
        const userProfileData = await firebase.getUserProfile(currentUser.uid);
        
        // Populate form with current data
        if (userProfileData) {
            document.getElementById('profile-name').value = userProfileData.displayName || '';
            document.getElementById('profile-username').value = userProfileData.username || '';
            document.getElementById('profile-bio').value = userProfileData.bio || '';
            document.getElementById('profile-skills').value = Array.isArray(userProfileData.skills) ? userProfileData.skills.join(', ') : '';
            document.getElementById('profile-location').value = userProfileData.location || '';
            
            // Handle profile photo
            const currentPhoto = document.getElementById('current-profile-photo');
            const noPhotoPlaceholder = document.getElementById('no-photo-placeholder');
            const removePhotoBtn = document.getElementById('remove-photo-btn');
            
            if (userProfileData.photoURL || currentUser.photoURL) {
                currentPhoto.src = userProfileData.photoURL || currentUser.photoURL;
                currentPhoto.style.display = 'block';
                noPhotoPlaceholder.style.display = 'none';
                removePhotoBtn.classList.remove('hidden');
            } else {
                currentPhoto.style.display = 'none';
                noPhotoPlaceholder.style.display = 'flex';
                removePhotoBtn.classList.add('hidden');
            }
        }
        
        profileModal.classList.remove('hidden');
        hideLoading();
    } catch (error) {
        console.error('Error opening profile modal:', error);
        showNotification('Erro ao carregar perfil.', 'error');
        hideLoading();
    }
}

async function handleProfileSubmit(e) {
    e.preventDefault();
    
    if (!currentUser) return;
    
    try {
        showLoading();
        
        const formData = new FormData(e.target);
        const profileData = {
            displayName: formData.get('name'),
            username: formData.get('username'),
            bio: formData.get('bio'),
            skills: formData.get('skills').split(',').map(s => s.trim()).filter(s => s),
            location: formData.get('location')
        };
        
        await firebase.updateUserProfile(currentUser.uid, profileData);
        
        closeModal(profileModal);
        showNotification('Perfil atualizado com sucesso!', 'success');
        
        // Update UI
        if (userName) userName.textContent = profileData.displayName || currentUser.email;
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Erro ao atualizar perfil.', 'error');
    } finally {
        hideLoading();
    }
}

// Partner logos interaction
function setupPartnerLogos() {
    const partnerLogos = document.querySelectorAll('.partner-logo');
    
    partnerLogos.forEach(logo => {
        logo.addEventListener('click', () => {
            const partner = logo.dataset.partner;
            const partnerLinks = {
                vodacom: 'https://www.vodacom.co.mz',
                machel: 'https://machelfidus.org',
                digi: 'https://digiproject.org',
                dafejy: 'https://dafejy.com'
            };
            
            if (partnerLinks[partner]) {
                window.open(partnerLinks[partner], '_blank');
            }
        });
    });
}

// Mobile menu
function setupMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('mobile-open');
        });
    }
}

// Modal management
function openModal(modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

// Loading overlay
function showLoading() {
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
    }
}

function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    // Add styles if not already present
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-radius: 8px;
                padding: 16px;
                box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
                display: flex;
                align-items: center;
                gap: 12px;
                z-index: 4000;
                min-width: 300px;
                animation: slideInRight 0.3s ease;
            }
            
            .notification-success {
                border-left: 4px solid #00AA44;
                color: #00AA44;
            }
            
            .notification-error {
                border-left: 4px solid #FF4444;
                color: #FF4444;
            }
            
            .notification-info {
                border-left: 4px solid #2196F3;
                color: #2196F3;
            }
            
            .notification-close {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: inherit;
                margin-left: auto;
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
    
    // Manual close
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Load page-specific content
async function loadPageContent() {
    const currentPage = getCurrentPageName();
    
    switch (currentPage) {
        case 'index':
            await loadHomePageContent();
            break;
        case 'about':
            await loadAboutPageContent();
            break;
        case 'opportunities':
            await loadOpportunitiesContent();
            break;
        case 'testimonies':
            await loadTestimoniesContent();
            break;
        case 'gallery':
            await loadGalleryContent();
            break;
        case 'gratitude':
            await loadGratitudeContent();
            break;
        case 'search':
            await loadSearchContent();
            break;
        case 'admin':
            await loadAdminContent();
            break;
    }
}

function getCurrentPageName() {
    const path = window.location.pathname;
    const fileName = path.split('/').pop() || 'index.html';
    return fileName.replace('.html', '') || 'index';
}

// Home page content
async function loadHomePageContent() {
    await loadStats();
}

// About page content
async function loadAboutPageContent() {
    // About page content is static HTML
}

// Opportunities page content
async function loadOpportunitiesContent() {
    // Handled by opportunities.js
}

// Testimonies page content
async function loadTestimoniesContent() {
    try {
        const testimonies = await firebase.getTestimonials();
        displayTestimonies(testimonies);
    } catch (error) {
        console.error('Error loading testimonies:', error);
    }
}

// Gallery page content
async function loadGalleryContent() {
    try {
        const galleryItems = await firebase.getGalleryItems();
        displayGalleryItems(galleryItems);
    } catch (error) {
        console.error('Error loading gallery:', error);
    }
}

// Gratitude page content
async function loadGratitudeContent() {
    try {
        const gratitudeMessages = await firebase.getGratitudeMessages();
        displayGratitudeMessages(gratitudeMessages);
    } catch (error) {
        console.error('Error loading gratitude messages:', error);
    }
}

// Search page content
async function loadSearchContent() {
    // Search functionality is handled by search page specific JS
}

// Admin page content
async function loadAdminContent() {
    if (!currentUser || !isAdmin) {
        window.location.href = 'gallery.html';
        return;
    }
    // Admin content is handled by admin page specific JS
}

// Helper functions for content display
function displayTestimonies(testimonies) {
    const container = document.getElementById('testimonies-list') || document.getElementById('testimonies-container');
    if (!container) return;
    
    container.innerHTML = '';
    testimonies.forEach(testimony => {
        const testimonyCard = createTestimonyCard(testimony);
        container.appendChild(testimonyCard);
    });
}

function displayGalleryItems(items) {
    const container = document.getElementById('gallery-list') || document.getElementById('gallery-container');
    if (!container) return;
    
    container.innerHTML = '';
    items.forEach(item => {
        const galleryCard = createGalleryCard(item);
        container.appendChild(galleryCard);
    });
}

function displayGratitudeMessages(messages) {
    const container = document.getElementById('gratitude-list') || document.getElementById('gratitude-container');
    if (!container) return;
    
    container.innerHTML = '';
    messages.forEach(message => {
        const messageCard = createGratitudeCard(message);
        container.appendChild(messageCard);
    });
}

function createTestimonyCard(testimony) {
    const card = document.createElement('div');
    card.className = 'testimony-card';
    card.innerHTML = `
        <div class="testimony-content">
            <p>"${testimony.message}"</p>
        </div>
        <div class="testimony-author">
            <img src="${testimony.userPhoto || '/assets/default-avatar.png'}" alt="${testimony.userName}">
            <div>
                <h4>${testimony.userName}</h4>
                <span>${testimony.position || 'Membro da Comunidade'}</span>
            </div>
        </div>
    `;
    return card;
}

function createGalleryCard(item) {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.innerHTML = `
        <img src="${item.imageUrl}" alt="${item.title}">
        <div class="gallery-info">
            <h4>${item.title}</h4>
            <p>${item.description}</p>
        </div>
    `;
    return card;
}

function createGratitudeCard(message) {
    const card = document.createElement('div');
    card.className = 'gratitude-card';
    card.innerHTML = `
        <div class="gratitude-content">
            <h4>${message.title}</h4>
            <p>${message.message}</p>
        </div>
        <div class="gratitude-author">
            <span>Por: ${message.userName}</span>
            <span>${formatDate(message.createdAt)}</span>
        </div>
    `;
    return card;
}

async function loadStats() {
    try {
        const stats = await firebase.getStats();
        
        const updateStatElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                animateCounter(element, value);
            }
        };
        
        updateStatElement('users-count', stats.users || 0);
        updateStatElement('testimonies-count', stats.testimonials || 0);
        updateStatElement('opportunities-count', stats.opportunities || 0);
        updateStatElement('publications-count', stats.gallery || 0);
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function animateCounter(element, target) {
    let current = 0;
    const increment = target / 50;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current);
    }, 20);
}

// Admin features
function showAdminFeatures() {
    // Add admin link to navigation if not already present
    const navMenu = document.querySelector('.nav-menu');
    if (navMenu && !document.querySelector('.admin-link')) {
        const adminLi = document.createElement('li');
        adminLi.innerHTML = '<a href="admin.html" class="nav-link admin-link"><i class="fas fa-cog"></i> Admin</a>';
        navMenu.appendChild(adminLi);
    }
}

function hideAdminFeatures() {
    const adminLink = document.querySelector('.admin-link');
    if (adminLink) {
        adminLink.parentElement.remove();
    }
}

// Utility functions
function formatDate(timestamp) {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('pt-BR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export functions for use in other pages
window.NetworkApp = {
    firebase,
    currentUser,
    isAdmin,
    openModal,
    closeModal,
    showLoading,
    hideLoading,
    showNotification,
    formatDate,
    truncateText,
    debounce
};

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // Refresh data when page becomes visible
        loadPageContent();
    }
});

// Add smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Bottom navigation active state
function updateBottomNavigation() {
    const currentPage = getCurrentPageName();
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    
    bottomNavItems.forEach(item => {
        item.classList.remove('active');
        const href = item.getAttribute('href');
        
        if (!href) return;
        
        const pageName = href.replace('.html', '').replace('./index', 'index');
        
        if ((currentPage === 'index' && href === 'index.html') ||
            (currentPage !== 'index' && href.includes(currentPage))) {
            item.classList.add('active');
        }
        
        // Add click event listener if not already added
        if (!item.hasAttribute('data-nav-initialized')) {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = href;
            });
            item.setAttribute('data-nav-initialized', 'true');
        }
    });
}

// Update bottom navigation on page load
document.addEventListener('DOMContentLoaded', () => {
    updateBottomNavigation();
    
    // Load notification status if logged in
    if (currentUser) {
        updateNotificationIcons();
    }
});

// Function to update notification icons (will be overridden by notifications.js)
function updateNotificationIcons() {
    // Placeholder function - will be implemented by notifications module
}
