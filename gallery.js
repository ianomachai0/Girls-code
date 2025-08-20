// Gallery page functionality
import firebase from './firebase.js';

let currentUser = null;
let galleryItems = [];

// Initialize gallery page
document.addEventListener('DOMContentLoaded', async () => {
    await loadGalleryItems();
    setupGalleryEvents();
    
    // Show publish button only for logged-in users
    firebase.onAuthStateChange((user) => {
        currentUser = user;
        const publishBtn = document.getElementById('publish-btn');
        if (user && publishBtn) {
            publishBtn.style.display = 'block';
        }
    });
});

async function loadGalleryItems() {
    const loading = document.getElementById('gallery-loading');
    const grid = document.getElementById('gallery-grid');
    const empty = document.getElementById('gallery-empty');
    
    try {
        galleryItems = await firebase.getGalleryItems();
        
        loading.classList.add('hidden');
        
        if (galleryItems.length === 0) {
            empty.classList.remove('hidden');
        } else {
            grid.classList.remove('hidden');
            renderGalleryItems(galleryItems);
        }
    } catch (error) {
        console.error('Error loading gallery items:', error);
        loading.innerHTML = '<p>Erro ao carregar galeria.</p>';
    }
}

function renderGalleryItems(items) {
    const grid = document.getElementById('gallery-grid');
    
    grid.innerHTML = items.map(item => `
        <div class="gallery-item" data-id="${item.id}">
            <div class="gallery-media">
                ${item.type === 'image' ? 
                    `<img src="${item.url}" alt="${item.title}" loading="lazy">` :
                    `<video src="${item.url}" poster="${item.thumbnail || ''}" preload="metadata"></video>`
                }
                <div class="media-overlay">
                    <button class="btn btn-primary btn-sm" onclick="openMediaModal('${item.id}')">
                        <i class="fas fa-eye"></i>
                        Ver
                    </button>
                    ${currentUser && currentUser.uid === item.userId ? `
                        <button class="btn btn-outline btn-sm" onclick="deleteGalleryItem('${item.id}')">
                            <i class="fas fa-trash"></i>
                            Excluir
                        </button>
                    ` : ''}
                </div>
                <div class="category-badge">${getCategoryLabel(item.category)}</div>
            </div>
            
            <div class="gallery-info">
                <h3 class="gallery-title">${item.title}</h3>
                ${item.description ? `<p class="gallery-description">${NetworkApp.truncateText(item.description, 100)}</p>` : ''}
                
                <div class="gallery-meta">
                    <div class="gallery-author" onclick="openUserProfile('${item.userId}')">
                        ${item.userPhoto ? 
                            `<img src="${item.userPhoto}" alt="${item.userName}">` :
                            `<div class="author-avatar-small">${(item.userName || 'U').charAt(0).toUpperCase()}</div>`
                        }
                        <span>${item.userName || 'Usuário'}</span>
                    </div>
                    <span class="gallery-date">${NetworkApp.formatDate(item.createdAt)}</span>
                </div>
                
                ${item.tags && item.tags.length > 0 ? `
                    <div class="gallery-tags">
                        ${item.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
                        ${item.tags.length > 3 ? `<span class="tag">+${item.tags.length - 3}</span>` : ''}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function setupGalleryEvents() {
    const publishBtn = document.getElementById('publish-btn');
    const faqBtn = document.getElementById('faq-btn');
    const publishModal = document.getElementById('publish-modal');
    const faqModal = document.getElementById('faq-modal');
    const publishForm = document.getElementById('publish-form');
    const fileInput = document.getElementById('content-file');
    const removeFileBtn = document.getElementById('remove-file');
    
    if (publishBtn) {
        publishBtn.addEventListener('click', () => {
            if (currentUser) {
                NetworkApp.openModal(publishModal);
            } else {
                NetworkApp.showNotification('Você precisa estar logada para publicar conteúdo.', 'error');
            }
        });
    }
    
    if (faqBtn) {
        faqBtn.addEventListener('click', () => {
            NetworkApp.openModal(faqModal);
        });
    }
    
    if (publishForm) {
        publishForm.addEventListener('submit', handlePublishSubmit);
    }
    
    if (fileInput) {
        fileInput.addEventListener('change', handleFilePreview);
    }
    
    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', removeFilePreview);
    }
}

function handleFilePreview(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const uploadArea = document.querySelector('.file-upload-area');
    const preview = document.getElementById('file-preview');
    const previewImage = document.getElementById('preview-image');
    const previewVideo = document.getElementById('preview-video');
    const fileName = document.getElementById('file-name');
    
    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
        NetworkApp.showNotification('Arquivo muito grande. Limite máximo: 50MB.', 'error');
        e.target.value = '';
        return;
    }
    
    const fileType = file.type.split('/')[0];
    
    if (fileType === 'image') {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            previewImage.classList.remove('hidden');
            previewVideo.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    } else if (fileType === 'video') {
        const url = URL.createObjectURL(file);
        previewVideo.src = url;
        previewVideo.classList.remove('hidden');
        previewImage.classList.add('hidden');
    }
    
    fileName.textContent = file.name;
    uploadArea.style.display = 'none';
    preview.classList.remove('hidden');
}

function removeFilePreview() {
    const fileInput = document.getElementById('content-file');
    const uploadArea = document.querySelector('.file-upload-area');
    const preview = document.getElementById('file-preview');
    const previewImage = document.getElementById('preview-image');
    const previewVideo = document.getElementById('preview-video');
    
    fileInput.value = '';
    previewImage.src = '';
    previewVideo.src = '';
    previewImage.classList.add('hidden');
    previewVideo.classList.add('hidden');
    preview.classList.add('hidden');
    uploadArea.style.display = 'block';
}

async function handlePublishSubmit(e) {
    e.preventDefault();
    
    if (!currentUser) {
        NetworkApp.showNotification('Você precisa estar logada para publicar.', 'error');
        return;
    }
    
    try {
        NetworkApp.showLoading();
        
        const formData = new FormData(e.target);
        const file = formData.get('file');
        
        if (!file || file.size === 0) {
            NetworkApp.showNotification('Selecione um arquivo para publicar.', 'error');
            NetworkApp.hideLoading();
            return;
        }
        
        // Upload file to Firebase Storage
        const fileType = file.type.split('/')[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `gallery/${currentUser.uid}/${fileName}`;
        
        const fileUrl = await firebase.uploadFile(file, filePath);
        
        // Create gallery item data
        const galleryData = {
            title: formData.get('title'),
            description: formData.get('description'),
            category: formData.get('category'),
            tags: formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag),
            url: fileUrl,
            type: fileType,
            fileName: fileName,
            filePath: filePath,
            userName: currentUser.displayName || currentUser.email.split('@')[0],
            userPhoto: currentUser.photoURL,
            userId: currentUser.uid
        };
        
        // Add to Firestore
        await firebase.addGalleryItem(galleryData);
        
        NetworkApp.closeModal(document.getElementById('publish-modal'));
        NetworkApp.showNotification('Publicação criada com sucesso!', 'success');
        
        // Reload gallery
        document.getElementById('gallery-grid').innerHTML = '';
        document.getElementById('gallery-loading').classList.remove('hidden');
        await loadGalleryItems();
        
        // Reset form
        e.target.reset();
        removeFilePreview();
        
    } catch (error) {
        console.error('Error publishing content:', error);
        NetworkApp.showNotification('Erro ao publicar conteúdo. Tente novamente.', 'error');
    } finally {
        NetworkApp.hideLoading();
    }
}

window.openMediaModal = function(itemId) {
    const item = galleryItems.find(item => item.id === itemId);
    if (!item) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal media-modal';
    modal.innerHTML = `
        <div class="modal-content media-modal-content">
            <button class="modal-close">&times;</button>
            <div class="media-viewer">
                ${item.type === 'image' ? 
                    `<img src="${item.url}" alt="${item.title}" class="media-full">` :
                    `<video src="${item.url}" controls class="media-full" autoplay></video>`
                }
            </div>
            <div class="media-info">
                <h2>${item.title}</h2>
                ${item.description ? `<p>${item.description}</p>` : ''}
                <div class="media-meta">
                    <div class="media-author" onclick="openUserProfile('${item.userId}')">
                        ${item.userPhoto ? 
                            `<img src="${item.userPhoto}" alt="${item.userName}" class="author-avatar">` :
                            `<div class="author-avatar-placeholder">${(item.userName || 'U').charAt(0).toUpperCase()}</div>`
                        }
                        <div>
                            <strong>${item.userName || 'Usuário'}</strong>
                            <small>${NetworkApp.formatDate(item.createdAt)}</small>
                        </div>
                    </div>
                    <span class="media-category">${getCategoryLabel(item.category)}</span>
                </div>
                ${item.tags && item.tags.length > 0 ? `
                    <div class="media-tags">
                        ${item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    NetworkApp.openModal(modal);
    
    // Remove modal after closing
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('modal-close')) {
            document.body.removeChild(modal);
        }
    });
    
    // Add styles for media modal
    if (!document.getElementById('media-modal-styles')) {
        const styles = document.createElement('style');
        styles.id = 'media-modal-styles';
        styles.textContent = `
            .media-modal-content {
                max-width: 90vw;
                max-height: 90vh;
                display: flex;
                gap: var(--spacing-lg);
            }
            
            .media-viewer {
                flex: 2;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--surface);
                border-radius: var(--radius-md);
                overflow: hidden;
            }
            
            .media-full {
                max-width: 100%;
                max-height: 70vh;
                object-fit: contain;
            }
            
            .media-info {
                flex: 1;
                min-width: 300px;
            }
            
            .media-info h2 {
                font-size: 1.5rem;
                font-weight: 600;
                margin-bottom: var(--spacing-md);
                color: var(--text-primary);
            }
            
            .media-info p {
                color: var(--text-secondary);
                line-height: 1.6;
                margin-bottom: var(--spacing-lg);
            }
            
            .media-meta {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: var(--spacing-md) 0;
                border-top: 1px solid var(--border);
                border-bottom: 1px solid var(--border);
                margin-bottom: var(--spacing-md);
            }
            
            .media-author {
                display: flex;
                align-items: center;
                gap: var(--spacing-sm);
                cursor: pointer;
                transition: color var(--transition-fast);
            }
            
            .media-author:hover {
                color: var(--primary);
            }
            
            .author-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                object-fit: cover;
            }
            
            .author-avatar-placeholder {
                width: 40px;
                height: 40px;
                background: var(--primary);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 600;
            }
            
            .media-author small {
                display: block;
                color: var(--text-muted);
            }
            
            .media-category {
                background: var(--primary);
                color: white;
                padding: 4px var(--spacing-sm);
                border-radius: var(--radius-sm);
                font-size: 0.8rem;
                font-weight: 500;
            }
            
            .media-tags {
                display: flex;
                flex-wrap: wrap;
                gap: var(--spacing-xs);
            }
            
            @media (max-width: 768px) {
                .media-modal-content {
                    flex-direction: column;
                    max-width: 95vw;
                }
                
                .media-info {
                    min-width: auto;
                }
                
                .media-full {
                    max-height: 40vh;
                }
            }
        `;
        document.head.appendChild(styles);
    }
};

window.deleteGalleryItem = async function(itemId) {
    if (!currentUser) {
        NetworkApp.showNotification('Você precisa estar logada.', 'error');
        return;
    }
    
    const item = galleryItems.find(item => item.id === itemId);
    if (!item || item.userId !== currentUser.uid) {
        NetworkApp.showNotification('Você só pode excluir suas próprias publicações.', 'error');
        return;
    }
    
    if (!confirm('Tem certeza que deseja excluir esta publicação?')) {
        return;
    }
    
    try {
        NetworkApp.showLoading();
        
        // Delete file from storage
        if (item.filePath) {
            await firebase.deleteFile(item.filePath);
        }
        
        // Delete from Firestore
        await firebase.deleteGalleryItem(itemId);
        
        NetworkApp.showNotification('Publicação excluída com sucesso!', 'success');
        
        // Reload gallery
        document.getElementById('gallery-grid').innerHTML = '';
        document.getElementById('gallery-loading').classList.remove('hidden');
        await loadGalleryItems();
        
    } catch (error) {
        console.error('Error deleting gallery item:', error);
        NetworkApp.showNotification('Erro ao excluir publicação.', 'error');
    } finally {
        NetworkApp.hideLoading();
    }
};

window.openUserProfile = async function(userId) {
    try {
        NetworkApp.showLoading();
        
        const user = await firebase.getUserProfile(userId);
        if (!user) {
            NetworkApp.showNotification('Perfil não encontrado.', 'error');
            return;
        }
        
        // Get user's publications
        const userPublications = galleryItems.filter(item => item.userId === userId);
        
        const userModalContent = `
            <div class="user-profile-modal">
                <div class="profile-header">
                    ${user.photoURL ? 
                        `<img src="${user.photoURL}" alt="${user.displayName}" class="profile-avatar">` :
                        `<div class="profile-avatar-placeholder">${(user.displayName || 'U').charAt(0).toUpperCase()}</div>`
                    }
                    <div class="profile-info">
                        <h2>${user.displayName || user.username || 'Usuário'}</h2>
                        <p>@${user.username || user.email?.split('@')[0] || 'usuario'}</p>
                        ${user.location ? `<p><i class="fas fa-map-marker-alt"></i> ${user.location}</p>` : ''}
                    </div>
                </div>
                
                ${user.bio ? `<div class="profile-bio"><p>${user.bio}</p></div>` : ''}
                
                ${user.skills && user.skills.length > 0 ? `
                    <div class="profile-skills">
                        <h3>Habilidades</h3>
                        <div class="skills-list">
                            ${user.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="profile-publications">
                    <h3>Publicações (${userPublications.length})</h3>
                    ${userPublications.length > 0 ? `
                        <div class="publications-grid">
                            ${userPublications.slice(0, 6).map(item => `
                                <div class="publication-thumbnail" onclick="openMediaModal('${item.id}')">
                                    ${item.type === 'image' ? 
                                        `<img src="${item.url}" alt="${item.title}">` :
                                        `<video src="${item.url}" poster="${item.thumbnail || ''}"></video>`
                                    }
                                    <div class="thumbnail-overlay">
                                        <span>${item.title}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        ${userPublications.length > 6 ? `<p>E mais ${userPublications.length - 6} publicações...</p>` : ''}
                    ` : '<p>Nenhuma publicação ainda.</p>'}
                </div>
            </div>
        `;
        
        const userModal = document.getElementById('user-modal');
        const userModalContentDiv = document.getElementById('user-modal-content');
        userModalContentDiv.innerHTML = userModalContent;
        
        NetworkApp.openModal(userModal);
        
    } catch (error) {
        console.error('Error loading user profile:', error);
        NetworkApp.showNotification('Erro ao carregar perfil.', 'error');
    } finally {
        NetworkApp.hideLoading();
    }
};

function getCategoryLabel(category) {
    const labels = {
        'projetos': 'Projetos',
        'eventos': 'Eventos',
        'conquistas': 'Conquistas',
        'aprendizado': 'Aprendizado',
        'networking': 'Networking',
        'inspiracao': 'Inspiração'
    };
    return labels[category] || category || 'Geral';
}

// Add additional styles for user profile modal
const profileModalStyles = document.createElement('style');
profileModalStyles.textContent = `
    .user-profile-modal {
        max-width: 600px;
    }
    
    .profile-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-lg);
        margin-bottom: var(--spacing-xl);
        padding-bottom: var(--spacing-lg);
        border-bottom: 1px solid var(--border);
    }
    
    .profile-avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        object-fit: cover;
    }
    
    .profile-avatar-placeholder {
        width: 80px;
        height: 80px;
        background: var(--primary);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 2rem;
        font-weight: 600;
    }
    
    .profile-info h2 {
        font-size: 1.5rem;
        font-weight: 600;
        margin-bottom: var(--spacing-xs);
    }
    
    .profile-info p {
        color: var(--text-secondary);
        margin-bottom: var(--spacing-xs);
    }
    
    .profile-bio {
        margin-bottom: var(--spacing-lg);
        padding: var(--spacing-md);
        background: var(--surface);
        border-radius: var(--radius-md);
    }
    
    .profile-skills {
        margin-bottom: var(--spacing-lg);
    }
    
    .profile-skills h3,
    .profile-publications h3 {
        font-size: 1.2rem;
        font-weight: 600;
        margin-bottom: var(--spacing-md);
    }
    
    .skills-list {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-xs);
    }
    
    .publications-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-md);
    }
    
    .publication-thumbnail {
        aspect-ratio: 1;
        border-radius: var(--radius-sm);
        overflow: hidden;
        position: relative;
        cursor: pointer;
        transition: transform var(--transition-fast);
    }
    
    .publication-thumbnail:hover {
        transform: scale(1.05);
    }
    
    .publication-thumbnail img,
    .publication-thumbnail video {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .thumbnail-overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
        color: white;
        padding: var(--spacing-xs);
        font-size: 0.8rem;
        transform: translateY(100%);
        transition: transform var(--transition-fast);
    }
    
    .publication-thumbnail:hover .thumbnail-overlay {
        transform: translateY(0);
    }
    
    @media (max-width: 768px) {
        .profile-header {
            flex-direction: column;
            text-align: center;
        }
        
        .publications-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }
`;
document.head.appendChild(profileModalStyles);

// Export functions for use in other modules
export {
    loadGalleryItems,
    renderGalleryItems,
    getCategoryLabel
};
