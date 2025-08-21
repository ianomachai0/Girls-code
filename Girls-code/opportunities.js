// Opportunities page functionality
import firebase from './firebase.js';

// Global state
let currentUser = null;
let isAdmin = false;
let opportunities = [];

// DOM Elements
const opportunitiesContainer = document.getElementById('opportunities-container');
const opportunitiesLoading = document.getElementById('opportunities-loading');
const opportunitiesList = document.getElementById('opportunities-list');
const opportunitiesEmpty = document.getElementById('opportunities-empty');
const addOpportunityBtn = document.getElementById('add-opportunity-btn');
const addOpportunityModal = document.getElementById('add-opportunity-modal');
const opportunityForm = document.getElementById('opportunity-form');
const adminActions = document.getElementById('admin-actions');

// Initialize opportunities page
document.addEventListener('DOMContentLoaded', () => {
    initializeOpportunitiesPage();
    setupEventListeners();
});

// Initialize the opportunities page
async function initializeOpportunitiesPage() {
    // Setup auth state observer
    firebase.onAuthStateChange(async (user) => {
        if (user) {
            currentUser = user;
            isAdmin = await firebase.isAdmin(user.uid);
            showAdminControls(isAdmin);
        } else {
            currentUser = null;
            isAdmin = false;
            showAdminControls(false);
        }
    });
    
    // Load opportunities
    await loadOpportunities();
}

// Setup event listeners
function setupEventListeners() {
    // Add opportunity button
    if (addOpportunityBtn) {
        addOpportunityBtn.addEventListener('click', () => {
            openModal(addOpportunityModal);
        });
    }
    
    // Opportunity form submission
    if (opportunityForm) {
        opportunityForm.addEventListener('submit', handleOpportunitySubmit);
    }
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            closeModal(modal);
        });
    });
}

// Load opportunities from Firebase
async function loadOpportunities() {
    try {
        showLoadingState();
        
        const opportunitiesData = await firebase.getOpportunities();
        opportunities = opportunitiesData;
        
        if (opportunities.length === 0) {
            showEmptyState();
        } else {
            displayOpportunities(opportunities);
        }
    } catch (error) {
        console.error('Error loading opportunities:', error);
        showEmptyState();
    }
}

// Display loading state
function showLoadingState() {
    opportunitiesLoading.classList.remove('hidden');
    opportunitiesList.classList.add('hidden');
    opportunitiesEmpty.classList.add('hidden');
}

// Display empty state
function showEmptyState() {
    opportunitiesLoading.classList.add('hidden');
    opportunitiesList.classList.add('hidden');
    opportunitiesEmpty.classList.remove('hidden');
}

// Display opportunities
function displayOpportunities(opportunitiesData) {
    opportunitiesLoading.classList.add('hidden');
    opportunitiesEmpty.classList.add('hidden');
    opportunitiesList.classList.remove('hidden');
    
    opportunitiesList.innerHTML = '';
    
    opportunitiesData.forEach(opportunity => {
        const opportunityCard = createOpportunityCard(opportunity);
        opportunitiesList.appendChild(opportunityCard);
    });
}

// Create opportunity card
function createOpportunityCard(opportunity) {
    const card = document.createElement('div');
    card.className = 'opportunity-card';
    
    // Format deadline
    let deadlineText = '';
    let deadlineClass = '';
    if (opportunity.deadline) {
        const deadline = new Date(opportunity.deadline);
        const now = new Date();
        const timeDiff = deadline - now;
        const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        
        if (daysDiff < 0) {
            deadlineText = 'Expirado';
            deadlineClass = 'deadline-urgent';
        } else if (daysDiff <= 7) {
            deadlineText = `${daysDiff} dia${daysDiff !== 1 ? 's' : ''} restante${daysDiff !== 1 ? 's' : ''}`;
            deadlineClass = 'deadline-urgent';
        } else if (daysDiff <= 30) {
            deadlineText = `${daysDiff} dias restantes`;
            deadlineClass = 'deadline-warning';
        } else {
            deadlineText = deadline.toLocaleDateString('pt-BR');
        }
    }
    
    // Parse skills
    const skills = opportunity.skills ? opportunity.skills.split(',').map(s => s.trim()) : [];
    
    card.innerHTML = `
        <div class="opportunity-header">
            <div>
                <h3 class="opportunity-title">${opportunity.title}</h3>
                <p class="opportunity-company">${opportunity.company}</p>
            </div>
            <div class="opportunity-badges">
                <span class="opportunity-badge badge-type">${formatType(opportunity.type)}</span>
                <span class="opportunity-badge badge-level">${formatLevel(opportunity.level)}</span>
            </div>
        </div>
        
        <p class="opportunity-description">${opportunity.description}</p>
        
        <div class="opportunity-meta">
            ${opportunity.location ? `
                <div class="meta-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${opportunity.location}</span>
                </div>
            ` : ''}
            ${deadlineText ? `
                <div class="meta-item ${deadlineClass}">
                    <i class="fas fa-clock"></i>
                    <span>${deadlineText}</span>
                </div>
            ` : ''}
        </div>
        
        ${skills.length > 0 ? `
            <div class="opportunity-skills">
                <strong>Habilidades requeridas:</strong>
                <div class="skills-list">
                    ${skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                </div>
            </div>
        ` : ''}
        
        <div class="opportunity-actions">
            ${opportunity.link ? `
                <a href="${opportunity.link}" target="_blank" class="btn btn-primary">
                    <i class="fas fa-external-link-alt"></i>
                    Candidatar-se
                </a>
            ` : ''}
            ${isAdmin ? `
                <button class="btn btn-outline btn-sm" onclick="deleteOpportunity('${opportunity.id}')">
                    <i class="fas fa-trash"></i>
                    Excluir
                </button>
            ` : ''}
        </div>
    `;
    
    return card;
}

// Format opportunity type
function formatType(type) {
    const types = {
        'emprego': 'Emprego',
        'estagio': 'Estágio',
        'bolsa': 'Bolsa',
        'curso': 'Curso',
        'evento': 'Evento',
        'mentoria': 'Mentoria'
    };
    return types[type] || type;
}

// Format opportunity level
function formatLevel(level) {
    const levels = {
        'iniciante': 'Iniciante',
        'intermediario': 'Intermediário',
        'avancado': 'Avançado',
        'senior': 'Sênior'
    };
    return levels[level] || level;
}

// Handle opportunity form submission
async function handleOpportunitySubmit(e) {
    e.preventDefault();
    
    if (!currentUser || !isAdmin) {
        showNotification('Apenas administradores podem adicionar oportunidades.', 'error');
        return;
    }
    
    try {
        const formData = new FormData(opportunityForm);
        const opportunityData = {
            title: formData.get('title'),
            company: formData.get('company'),
            description: formData.get('description'),
            type: formData.get('type'),
            level: formData.get('level'),
            location: formData.get('location'),
            link: formData.get('link'),
            deadline: formData.get('deadline'),
            skills: formData.get('skills'),
            authorId: currentUser.uid,
            createdAt: new Date().toISOString()
        };
        
        await firebase.addOpportunity(opportunityData);
        
        showNotification('Oportunidade adicionada com sucesso!', 'success');
        closeModal(addOpportunityModal);
        opportunityForm.reset();
        
        // Reload opportunities
        await loadOpportunities();
        
    } catch (error) {
        console.error('Error adding opportunity:', error);
        showNotification('Erro ao adicionar oportunidade. Tente novamente.', 'error');
    }
}

// Delete opportunity (admin only)
window.deleteOpportunity = async function(opportunityId) {
    if (!currentUser || !isAdmin) {
        showNotification('Apenas administradores podem excluir oportunidades.', 'error');
        return;
    }
    
    if (!confirm('Tem certeza que deseja excluir esta oportunidade?')) {
        return;
    }
    
    try {
        await firebase.deleteOpportunity(opportunityId);
        showNotification('Oportunidade excluída com sucesso!', 'success');
        
        // Reload opportunities
        await loadOpportunities();
        
    } catch (error) {
        console.error('Error deleting opportunity:', error);
        showNotification('Erro ao excluir oportunidade. Tente novamente.', 'error');
    }
};

// Show/hide admin controls
function showAdminControls(show) {
    if (adminActions) {
        adminActions.style.display = show ? 'block' : 'none';
    }
}

// Modal functions
function openModal(modal) {
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modal) {
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// Notification function
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
    
    // Close button functionality
    notification.querySelector('.notification-close').addEventListener('click', () => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
}

// Export for use in other modules
export default {
    loadOpportunities,
    deleteOpportunity: window.deleteOpportunity
};