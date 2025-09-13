// DOM Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const verificationForm = document.getElementById('verification-form');
const dashboard = document.getElementById('dashboard');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const showRegister = document.getElementById('show-register');
const showLogin = document.getElementById('show-login');
const authButtons = document.getElementById('auth-buttons');
const userMenu = document.getElementById('user-menu');
const userEmail = document.getElementById('user-email');
const dashboardEmail = document.getElementById('dashboard-email');
const verificationEmail = document.getElementById('verification-email');
const resendCodeBtn = document.getElementById('resend-code');
const dashboardLogout = document.getElementById('dashboard-logout');

let currentUserEmail = '';

// Check authentication status on page load
document.addEventListener('DOMContentLoaded', checkAuthStatus);

// Event Listeners
if (loginForm) {
    document.getElementById('login-form-element').addEventListener('submit', handleLogin);
    document.getElementById('register-form-element').addEventListener('submit', handleRegister);
    document.getElementById('verification-form-element').addEventListener('submit', handleVerification);
    
    // Social login buttons
    document.querySelectorAll('[id$="-login"], [id$="-register"]').forEach(btn => {
        btn.addEventListener('click', handleSocialLogin);
    });
    
    // Navigation
    showRegister?.addEventListener('click', (e) => {
        e.preventDefault();
        showForm('register');
    });
    
    showLogin?.addEventListener('click', (e) => {
        e.preventDefault();
        showForm('login');
    });
    
    loginBtn?.addEventListener('click', () => showForm('login'));
    registerBtn?.addEventListener('click', () => showForm('register'));
    logoutBtn?.addEventListener('click', handleLogout);
    dashboardLogout?.addEventListener('click', handleLogout);
    resendCodeBtn?.addEventListener('click', handleResendCode);
}

// Show specific form and hide others
function showForm(formType) {
    if (formType === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        verificationForm.classList.add('hidden');
        dashboard.classList.add('hidden');
    } else if (formType === 'register') {
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        verificationForm.classList.add('hidden');
        dashboard.classList.add('hidden');
    } else if (formType === 'verification') {
        verificationForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        registerForm.classList.add('hidden');
        dashboard.classList.add('hidden');
    } else if (formType === 'dashboard') {
        dashboard.classList.remove('hidden');
        loginForm.classList.add('hidden');
        registerForm.classList.add('hidden');
        verificationForm.classList.add('hidden');
    }
}

// Check authentication status
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        
        if (data.authenticated) {
            // User is logged in
            authButtons.classList.add('hidden');
            userMenu.classList.remove('hidden');
            userEmail.textContent = data.user.email;
            dashboardEmail.textContent = data.user.email;
            showForm('dashboard');
        } else {
            // User is not logged in
            authButtons.classList.remove('hidden');
            userMenu.classList.add('hidden');
            showForm('login');
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        showError('login', 'An error occurred while checking authentication status');
    }
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    // Clear previous errors
    clearErrors('login');
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
            credentials: 'same-origin'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Check if user needs to verify email
            if (data.requiresVerification) {
                currentUserEmail = email;
                verificationEmail.textContent = email;
                showForm('verification');
            } else {
                // Login successful
                checkAuthStatus();
            }
        } else {
            // Login failed
            showError('login', data.error || 'Login failed. Please try again.');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('login', 'An error occurred during login');
    }
}

// Handle registration form submission
async function handleRegister(e) {
    e.preventDefault();
    
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Clear previous errors
    clearErrors('register');
    
    // Client-side validation
    if (password !== confirmPassword) {
        showError('confirm-password', 'Passwords do not match');
        return;
    }
    
    if (password.length < 8) {
        showError('register-password', 'Password must be at least 8 characters');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
            credentials: 'same-origin'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Registration successful, show verification form
            currentUserEmail = email;
            verificationEmail.textContent = email;
            showForm('verification');
        } else {
            // Registration failed
            if (data.errors) {
                // Handle validation errors
                data.errors.forEach(error => {
                    if (error.param === 'email') {
                        showError('register-email', error.msg);
                    } else if (error.param === 'password') {
                        showError('register-password', error.msg);
                    }
                });
            } else {
                showError('register', data.error || 'Registration failed. Please try again.');
            }
        }
    } catch (error) {
        console.error('Registration error:', error);
        showError('register', 'An error occurred during registration');
    }
}

// Handle verification form submission
async function handleVerification(e) {
    e.preventDefault();
    
    const code = document.getElementById('verification-code').value.trim();
    
    // Clear previous errors and success messages
    clearErrors('verification');
    document.getElementById('verification-success').textContent = '';
    
    try {
        const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                email: currentUserEmail,
                code: code 
            }),
            credentials: 'same-origin'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Verification successful
            document.getElementById('verification-success').textContent = 'Email verified successfully! Redirecting...';
            
            // Redirect to dashboard after a short delay
            setTimeout(() => {
                checkAuthStatus();
            }, 1500);
        } else {
            // Verification failed
            showError('verification', data.error || 'Verification failed. Please try again.');
        }
    } catch (error) {
        console.error('Verification error:', error);
        showError('verification', 'An error occurred during verification');
    }
}

// Handle social login
async function handleSocialLogin(e) {
    e.preventDefault();
    const provider = e.target.id.split('-')[0]; // Extract provider from button id
    
    // Redirect to the appropriate OAuth endpoint
    window.location.href = `/api/auth/${provider}`;
}

// Handle logout
async function handleLogout(e) {
    if (e) e.preventDefault();
    
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'GET',
            credentials: 'same-origin'
        });
        
        if (response.ok) {
            // Clear any stored user data
            currentUserEmail = '';
            
            // Update UI
            authButtons.classList.remove('hidden');
            userMenu.classList.add('hidden');
            showForm('login');
        } else {
            console.error('Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Handle resend verification code
async function handleResendCode(e) {
    if (e) e.preventDefault();
    
    if (!currentUserEmail) {
        showError('verification', 'No email address available to resend code');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/resend-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: currentUserEmail }),
            credentials: 'same-origin'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('verification-success').textContent = 'Verification code has been resent to your email.';
        } else {
            showError('verification', data.error || 'Failed to resend verification code');
        }
    } catch (error) {
        console.error('Resend code error:', error);
        showError('verification', 'An error occurred while resending the code');
    }
}

// Helper function to show error messages
function showError(formType, message) {
    if (formType === 'login' || formType === 'register' || formType === 'verification') {
        const errorElement = document.getElementById(`${formType}-error`);
        if (errorElement) {
            errorElement.textContent = message;
        }
    } else if (formType === 'login-email' || formType === 'login-password' || 
               formType === 'register-email' || formType === 'register-password' || 
               formType === 'confirm-password' || formType === 'verification-code') {
        const errorElement = document.getElementById(`${formType}-error`);
        if (errorElement) {
            errorElement.textContent = message;
        }
    }
}

// Helper function to clear error messages
function clearErrors(formType) {
    if (formType === 'login') {
        document.getElementById('login-email-error').textContent = '';
        document.getElementById('login-password-error').textContent = '';
    } else if (formType === 'register') {
        document.getElementById('register-email-error').textContent = '';
        document.getElementById('register-password-error').textContent = '';
        document.getElementById('confirm-password-error').textContent = '';
    } else if (formType === 'verification') {
        document.getElementById('verification-error').textContent = '';
    } else if (formType === 'all') {
        // Clear all error messages
        const errorElements = document.querySelectorAll('.error-message, .success-message');
        errorElements.forEach(element => {
            element.textContent = '';
        });
    }
}
