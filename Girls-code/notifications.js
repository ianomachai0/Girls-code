
import firebase from './firebase.js';

let currentUser = null;
let currentTab = 'all';
let notifications = [];
let unreadCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    initializeNotifications();
    setupEventListeners();
});

function initializeNotifications() {
    firebase.onAuthStateChange(async (user) => {
        if (user) {
            currentUser = user;
            await loadNotifications();
            startNotificationListener();
        } else {
            window.location.href = 'gallery.html';
        }
    });
}

function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentTab = btn.dataset.tab;
            updateActiveTab();
            filterNotifications();
        });
    });

    // Action buttons
    document.getElementById('mark-all-read')?.addEventListener('click', markAllAsRead);
    document.getElementById('clear-all')?.addEventListener('click', clearAllNotifications);
}

async function loadNotifications() {
    try {
        NetworkApp.showLoading();
        
        // Get user notifications from Firestore
        const notificationsRef = firebase.collection(firebase.db, 'notifications', currentUser.uid, 'items');
        const notificationsSnap = await firebase.getDocs(firebase.query(
            notificationsRef,
            firebase.orderBy('createdAt', 'desc'),
            firebase.limit(50)
        ));
        
        notifications = notificationsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Add some default notifications if none exist
        if (notifications.length === 0) {
            await createWelcomeNotifications();
            await loadNotifications();
            return;
        }

        unreadCount = notifications.filter(n => !n.read).length;
        updateNotificationIcons();
        displayNotifications();
        
    } catch (error) {
        console.error('Error loading notifications:', error);
        NetworkApp.showNotification('Erro ao carregar notificações.', 'error');
    } finally {
        NetworkApp.hideLoading();
    }
}

async function createWelcomeNotifications() {
    const welcomeNotifications = [
        {
            type: 'system',
            title: 'Bem-vinda à United Girls Society!',
            message: 'Parabéns por se juntar à nossa comunidade. Explore as oportunidades e conecte-se com outras mulheres na tecnologia.',
            read: false,
            createdAt: new Date(),
            icon: 'fas fa-heart'
        },
        {
            type: 'community',
            title: 'Explore nossa plataforma de aprendizado',
            message: 'Descubra nossa nova seção "Aprender" onde você pode fazer quizzes e ganhar XP em diversas linguagens de programação.',
            read: false,
            createdAt: new Date(),
            icon: 'fas fa-graduation-cap'
        },
        {
            type: 'system',
            title: 'Complete seu perfil',
            message: 'Adicione suas habilidades e biografia ao seu perfil para se conectar melhor com a comunidade.',
            read: false,
            createdAt: new Date(),
            icon: 'fas fa-user-edit'
        }
    ];

    const notificationsRef = firebase.collection(firebase.db, 'notifications', currentUser.uid, 'items');
    
    for (const notification of welcomeNotifications) {
        await firebase.addDoc(notificationsRef, notification);
    }
}

function displayNotifications() {
    const container = document.getElementById('notifications-list');
    const noNotifications = document.getElementById('no-notifications');
    
    const filteredNotifications = filterNotificationsByTab();
    
    if (filteredNotifications.length === 0) {
        container.classList.add('hidden');
        noNotifications.classList.remove('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    noNotifications.classList.add('hidden');
    
    container.innerHTML = filteredNotifications.map(notification => `
        <div class="notification-item ${notification.read ? '' : 'unread'}" data-id="${notification.id}">
            <div class="notification-header">
                <div class="notification-type">
                    <div class="notification-icon ${notification.type}">
                        <i class="${notification.icon || getNotificationIcon(notification.type)}"></i>
                    </div>
                    <div>
                        <h4>${notification.title}</h4>
                        <span class="notification-time">${NetworkApp.formatDate(notification.createdAt)}</span>
                    </div>
                </div>
                ${!notification.read ? '<div class="notification-badge"></div>' : ''}
            </div>
            <div class="notification-content">
                <p>${notification.message}</p>
                ${notification.actionUrl ? `
                    <div class="notification-actions-item">
                        <button class="notification-btn" onclick="handleNotificationAction('${notification.id}', '${notification.actionUrl}')">
                            Ver mais
                        </button>
                    </div>
                ` : ''}
            </div>
            <div class="notification-actions-item">
                ${!notification.read ? `
                    <button class="notification-btn" onclick="markAsRead('${notification.id}')">
                        <i class="fas fa-check"></i> Marcar como lida
                    </button>
                ` : ''}
                <button class="notification-btn" onclick="deleteNotification('${notification.id}')">
                    <i class="fas fa-trash"></i> Remover
                </button>
            </div>
        </div>
    `).join('');
}

function filterNotificationsByTab() {
    switch (currentTab) {
        case 'unread':
            return notifications.filter(n => !n.read);
        case 'system':
            return notifications.filter(n => n.type === 'system');
        case 'community':
            return notifications.filter(n => n.type === 'community' || n.type === 'achievement');
        default:
            return notifications;
    }
}

function updateActiveTab() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === currentTab);
    });
}

function getNotificationIcon(type) {
    const icons = {
        system: 'fas fa-cog',
        community: 'fas fa-users',
        achievement: 'fas fa-trophy',
        opportunity: 'fas fa-briefcase',
        message: 'fas fa-envelope'
    };
    return icons[type] || 'fas fa-bell';
}

function updateNotificationIcons() {
    const navIcon = document.getElementById('nav-notification-icon');
    const bottomNavIcon = document.getElementById('bottom-nav-notification-icon');
    
    if (unreadCount > 0) {
        if (navIcon) {
            navIcon.classList.add('notification-icon-active');
        }
        if (bottomNavIcon) {
            bottomNavIcon.classList.add('notification-icon-active');
        }
    } else {
        if (navIcon) {
            navIcon.classList.remove('notification-icon-active');
        }
        if (bottomNavIcon) {
            bottomNavIcon.classList.remove('notification-icon-active');
        }
    }
}

async function markAsRead(notificationId) {
    try {
        const notificationRef = firebase.doc(firebase.db, 'notifications', currentUser.uid, 'items', notificationId);
        await firebase.updateDoc(notificationRef, { read: true });
        
        const notification = notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            unreadCount--;
            updateNotificationIcons();
            displayNotifications();
        }
        
        NetworkApp.showNotification('Notificação marcada como lida.', 'success');
    } catch (error) {
        console.error('Error marking notification as read:', error);
        NetworkApp.showNotification('Erro ao marcar notificação.', 'error');
    }
}

async function markAllAsRead() {
    try {
        NetworkApp.showLoading();
        
        const batch = firebase.writeBatch(firebase.db);
        const unreadNotifications = notifications.filter(n => !n.read);
        
        unreadNotifications.forEach(notification => {
            const notificationRef = firebase.doc(firebase.db, 'notifications', currentUser.uid, 'items', notification.id);
            batch.update(notificationRef, { read: true });
            notification.read = true;
        });
        
        await batch.commit();
        
        unreadCount = 0;
        updateNotificationIcons();
        displayNotifications();
        
        NetworkApp.showNotification('Todas as notificações foram marcadas como lidas.', 'success');
        
    } catch (error) {
        console.error('Error marking all as read:', error);
        NetworkApp.showNotification('Erro ao marcar todas como lidas.', 'error');
    } finally {
        NetworkApp.hideLoading();
    }
}

async function deleteNotification(notificationId) {
    if (!confirm('Tem certeza que deseja remover esta notificação?')) return;
    
    try {
        const notificationRef = firebase.doc(firebase.db, 'notifications', currentUser.uid, 'items', notificationId);
        await firebase.deleteDoc(notificationRef);
        
        notifications = notifications.filter(n => n.id !== notificationId);
        unreadCount = notifications.filter(n => !n.read).length;
        updateNotificationIcons();
        displayNotifications();
        
        NetworkApp.showNotification('Notificação removida.', 'success');
        
    } catch (error) {
        console.error('Error deleting notification:', error);
        NetworkApp.showNotification('Erro ao remover notificação.', 'error');
    }
}

async function clearAllNotifications() {
    if (!confirm('Tem certeza que deseja remover todas as notificações? Esta ação não pode ser desfeita.')) return;
    
    try {
        NetworkApp.showLoading();
        
        const batch = firebase.writeBatch(firebase.db);
        notifications.forEach(notification => {
            const notificationRef = firebase.doc(firebase.db, 'notifications', currentUser.uid, 'items', notification.id);
            batch.delete(notificationRef);
        });
        
        await batch.commit();
        
        notifications = [];
        unreadCount = 0;
        updateNotificationIcons();
        displayNotifications();
        
        NetworkApp.showNotification('Todas as notificações foram removidas.', 'success');
        
    } catch (error) {
        console.error('Error clearing all notifications:', error);
        NetworkApp.showNotification('Erro ao limpar notificações.', 'error');
    } finally {
        NetworkApp.hideLoading();
    }
}

function startNotificationListener() {
    const notificationsRef = firebase.collection(firebase.db, 'notifications', currentUser.uid, 'items');
    
    firebase.onSnapshot(notificationsRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const newNotification = { id: change.doc.id, ...change.doc.data() };
                
                // Check if it's a truly new notification (not from initial load)
                if (!notifications.some(n => n.id === newNotification.id)) {
                    notifications.unshift(newNotification);
                    
                    if (!newNotification.read) {
                        unreadCount++;
                        updateNotificationIcons();
                        
                        // Show toast for new notification
                        NetworkApp.showNotification(`Nova notificação: ${newNotification.title}`, 'info');
                    }
                    
                    displayNotifications();
                }
            }
        });
    });
}

function handleNotificationAction(notificationId, actionUrl) {
    markAsRead(notificationId);
    window.location.href = actionUrl;
}

// Global functions for button clicks
window.markAsRead = markAsRead;
window.deleteNotification = deleteNotification;
window.handleNotificationAction = handleNotificationAction;

// Export for use in other modules
export { updateNotificationIcons };
