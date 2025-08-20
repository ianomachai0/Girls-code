
// Authentication page functionality
import firebase from './firebase.js';

// Initialize auth pages
document.addEventListener('DOMContentLoaded', () => {
    setupAuthPage();
});

function setupAuthPage() {
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage === 'login.html') {
        setupLoginPage();
    } else if (currentPage === 'signup.html') {
        setupSignupPage();
    }
    
    // Check if already logged in
    firebase.onAuthStateChange((user) => {
        if (user) {
            // Redirect to gallery if already logged in
            window.location.href = 'gallery.html';
        }
    });
}

function setupLoginPage() {
    const googleLoginBtn = document.getElementById('google-login-btn');
    const loginForm = document.getElementById('login-form');
    const forgotPasswordLink = document.getElementById('forgot-password');
    
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', handleGoogleLogin);
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleEmailLogin);
    }
    
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', handleForgotPassword);
    }
}

function setupSignupPage() {
    const googleSignupBtn = document.getElementById('google-signup-btn');
    const signupForm = document.getElementById('signup-form');
    
    if (googleSignupBtn) {
        googleSignupBtn.addEventListener('click', handleGoogleSignup);
    }
    
    if (signupForm) {
        signupForm.addEventListener('submit', handleEmailSignup);
    }
}

async function handleGoogleLogin() {
    try {
        showLoading();
        await firebase.loginWithGoogle();
        showNotification('Login realizado com sucesso!', 'success');
        window.location.href = 'gallery.html';
    } catch (error) {
        console.error('Google login error:', error);
        handleAuthError(error);
    } finally {
        hideLoading();
    }
}

async function handleGoogleSignup() {
    try {
        showLoading();
        await firebase.loginWithGoogle();
        showNotification('Conta criada com sucesso!', 'success');
        window.location.href = 'gallery.html';
    } catch (error) {
        console.error('Google signup error:', error);
        handleAuthError(error);
    } finally {
        hideLoading();
    }
}

async function handleEmailLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    
    try {
        showLoading();
        await firebase.loginWithEmail(email, password);
        showNotification('Login realizado com sucesso!', 'success');
        window.location.href = 'gallery.html';
    } catch (error) {
        console.error('Email login error:', error);
        handleAuthError(error);
    } finally {
        hideLoading();
    }
}

async function handleEmailSignup(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirm-password');
    
    // Validate passwords match
    if (password !== confirmPassword) {
        showNotification('As senhas não coincidem.', 'error');
        return;
    }
    
    try {
        showLoading();
        const user = await firebase.createUserWithEmail(email, password, name);
        showNotification('Conta criada com sucesso!', 'success');
        window.location.href = 'gallery.html';
    } catch (error) {
        console.error('Email signup error:', error);
        handleAuthError(error);
    } finally {
        hideLoading();
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    
    const email = prompt('Digite seu email para recuperar a senha:');
    if (!email) return;
    
    try {
        showLoading();
        await firebase.resetPassword(email);
        showNotification('Email de recuperação enviado!', 'success');
    } catch (error) {
        console.error('Reset password error:', error);
        handleAuthError(error);
    } finally {
        hideLoading();
    }
}

function handleAuthError(error) {
    let message = 'Erro de autenticação. Tente novamente.';
    
    switch (error.code) {
        case 'auth/user-not-found':
            message = 'Usuário não encontrado.';
            break;
        case 'auth/wrong-password':
            message = 'Senha incorreta.';
            break;
        case 'auth/email-already-in-use':
            message = 'Este email já está em uso.';
            break;
        case 'auth/weak-password':
            message = 'A senha deve ter pelo menos 6 caracteres.';
            break;
        case 'auth/invalid-email':
            message = 'Email inválido.';
            break;
        case 'auth/too-many-requests':
            message = 'Muitas tentativas. Tente novamente mais tarde.';
            break;
        case 'auth/unauthorized-domain':
            message = 'Domínio não autorizado. Configure o Firebase.';
            break;
        case 'auth/popup-blocked':
            message = 'Pop-up bloqueado. Permita pop-ups para este site.';
            break;
    }
    
    showNotification(message, 'error');
}

function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    // Add styles if not already present
    if (!document.querySelector('#auth-notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'auth-notification-styles';
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
