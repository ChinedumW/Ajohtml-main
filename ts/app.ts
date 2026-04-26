// ===========================
// Type Definitions
// ===========================

interface User {
    name: string;
    email: string;
    avatar: string | null;
}

interface Loan {
    amount: number;
    paid: number;
    purpose?: string;
}

interface Transaction {
    id: number;
    type: 'savings' | 'payment' | 'transfer' | 'topup';
    amount: number;
    date: string;
    description: string;
    status: 'pending' | 'successful' | 'failed';
    method?: 'Bank Transfer' | 'Card';
    receipt?: string | null;
    adminRequestId?: number;
}

interface Notification {
    id: number;
    type: 'warning' | 'success' | 'error' | 'pending';
    title: string;
    message: string;
    time: string;
    read: boolean;
    adminRequestId?: number;
    status?: 'Pending' | 'Approved' | 'Rejected' | 'Successful' | 'Failed';
}

interface AdminRequest {
    id: number;
    userName: string;
    userEmail: string;
    type: 'Top-up' | 'Loan Repayment' | 'Savings';
    amount: number;
    method: 'Bank Transfer' | 'Card';
    status: 'Pending' | 'Approved' | 'Rejected';
    receipt?: string | null;
    date: string;
    processedAt?: string;
    transactionId?: number;
    notificationId?: number;
}

interface AppStateData {
    user: User;
    wallet: number;
    savings: number;
    loan: Loan;
    transactions: Transaction[];
    notifications: Notification[];
    adminRequests: AdminRequest[];
}

interface PendingAction {
    type: string;
    amount: number;
}

// ===========================
// Authentication Check
// ===========================
const isLoggedIn = localStorage.getItem('treasureFortuneLoggedIn');
if (!isLoggedIn) {
    window.location.href = 'login.html';
}

// Check if user has paid registration - redirect if not
const userData = JSON.parse(localStorage.getItem('treasureFortuneCurrentUser') || 'null');
if (userData && userData.hasPaidRegistration === false) {
    window.location.href = 'pay.html';
}

// ===========================
// Payment Status Check
// ===========================
const currentUser = JSON.parse(localStorage.getItem('treasureFortuneCurrentUser'));
if (currentUser && !currentUser.hasPaidRegistration) {
    document.addEventListener('DOMContentLoaded', function() {
        const paymentWarning = document.getElementById('paymentWarning');
        if (paymentWarning) {
            paymentWarning.style.display = 'flex';
        }
    });
}

// ===========================
// App State Management
// ===========================
class AppState {
    user: User;
    wallet: number;
    savings: number;
    loan: Loan;
    transactions: Transaction[];
    notifications: Notification[];
    adminRequests: AdminRequest[];
    notificationBadge: HTMLElement;

    constructor() {
        this.user = { name: '', email: '', avatar: null };
        this.wallet = 0;
        this.savings = 0;
        this.loan = { amount: 0, paid: 0 };
        this.transactions = [];
        this.notifications = [];
        this.adminRequests = [];
        this.notificationBadge = document.getElementById('notificationBadge') as HTMLElement;
        this.loadState();
    }

    loadState(): void {
        const savedState = localStorage.getItem('treasureFortuneState');
        if (savedState) {
            const state: AppStateData = JSON.parse(savedState);
            this.user = state.user || { name: 'User', email: '', avatar: null };
            this.wallet = state.wallet || 0;
            this.savings = state.savings || 0;
            this.loan = state.loan || { amount: 0, paid: 0 };
            this.transactions = state.transactions || [];
            this.notifications = state.notifications || [];
            this.adminRequests = state.adminRequests || [];
        } else {
            // Initialize with default data
            this.user = { name: 'Fatima Ahmed', email: 'fatima@example.com', avatar: null };
            this.wallet = 50000;
            this.savings = 1250000;
            this.loan = { amount: 500000, paid: 125000 };
            this.transactions = [
                { id: 1, type: 'savings', amount: 50000, date: '2026-04-10', description: 'Savings Deposit', status: 'successful' },
                { id: 2, type: 'payment', amount: -83333, date: '2026-04-05', description: 'Loan Payment', status: 'successful' },
                { id: 3, type: 'savings', amount: 100000, date: '2026-04-01', description: 'Savings Deposit', status: 'successful' }
            ];
            this.notifications = [
                { id: 1, type: 'warning', title: 'Payment Due Soon', message: 'Your next loan payment is due in 5 days', time: '2 hours ago', read: false },
                { id: 2, type: 'success', title: 'Savings Added', message: 'You successfully added ₦50,000 to your savings', time: '1 day ago', read: false }
            ];
            this.adminRequests = [];
            this.saveState();
        }
        console.log('[v0] State loaded:', this.wallet);
    }

    saveState(): void {
        const state: AppStateData = {
            user: this.user,
            wallet: this.wallet,
            savings: this.savings,
            loan: this.loan,
            transactions: this.transactions,
            notifications: this.notifications,
            adminRequests: this.adminRequests
        };
        localStorage.setItem('treasureFortuneState', JSON.stringify(state));
        console.log('[v0] State saved:', this.wallet);
    }

    // Admin request methods
    addAdminRequest(request: AdminRequest): void {
        this.adminRequests.push(request);
        this.saveState();
    }

    getAdminRequests(): AdminRequest[] {
        return this.adminRequests;
    }

    updateAdminRequest(requestId: number, status: 'Pending' | 'Approved' | 'Rejected', updateBalances: boolean = false): void {
        const request = this.adminRequests.find(r => r.id === requestId);
        if (request) {
            request.status = status;
            request.processedAt = new Date().toISOString();
            
            // Update transaction status to match admin request status
            if (request.transactionId) {
                const transaction = this.transactions.find(t => t.id === request.transactionId);
                if (transaction) {
                    if (status === 'Approved') {
                        transaction.status = 'successful';
                    } else if (status === 'Rejected') {
                        transaction.status = 'failed';
                    } else {
                        transaction.status = 'pending';
                    }
                }
            }
            
            // Update notification status
            if (request.notificationId) {
                const notification = this.notifications.find(n => n.id === request.notificationId);
                if (notification) {
                    notification.status = status;
                    if (status === 'Approved') {
                        notification.type = 'success';
                        notification.title = 'Request Approved';
                        notification.message = `Your ${request.type.toLowerCase()} request of ₦${request.amount.toLocaleString()} has been approved`;
                    } else if (status === 'Rejected') {
                        notification.type = 'error';
                        notification.title = 'Request Rejected';
                        notification.message = `Your ${request.type.toLowerCase()} request has been rejected`;
                    }
                }
            }
            
            // Only update balances if status is Approved
            if (updateBalances && status === 'Approved') {
                if (request.type === 'Top-up') {
                    this.wallet += request.amount;
                } else if (request.type === 'Loan Repayment') {
                    this.loan.paid += request.amount;
                } else if (request.type === 'Savings') {
                    this.wallet -= request.amount;
                    this.savings += request.amount;
                }
            }
            
            this.saveState();
        }
    }

    addSavings(amount: number): void {
        console.log('[v0] Adding savings:', amount);
        this.savings += amount;
        this.addTransaction('savings', amount, 'Savings Deposit');
        this.addNotification('success', 'Savings Added', `You successfully added ₦${amount.toLocaleString()} to your savings`);
        this.saveState();
        console.log('[v0] New savings balance:', this.savings);
    }

    makePayment(amount: number): void {
        console.log('[v0] Making payment:', amount);
        if (amount > this.loan.amount - this.loan.paid) {
            amount = this.loan.amount - this.loan.paid;
        }
        this.loan.paid += amount;
        this.addTransaction('payment', -amount, 'Loan Payment');
        
        // Check if loan is fully repaid
        if (this.loan.paid >= this.loan.amount) {
            this.handleLoanCompletion();
        } else {
            this.addNotification('success', 'Payment Successful', `You paid ₦${amount.toLocaleString()} towards your loan`);
        }
        
        this.saveState();
        console.log('[v0] New loan paid amount:', this.loan.paid);
    }
    
    handleLoanCompletion(): void {
        this.loan = { amount: 0, paid: 0 };
        this.saveState();
    }

    addTransaction(type: 'savings' | 'payment' | 'transfer' | 'topup', amount: number, description: string, status: 'pending' | 'successful' | 'failed' = 'successful'): void {
        const transaction: Transaction = {
            id: Date.now(),
            type,
            amount,
            date: new Date().toISOString().split('T')[0],
            description,
            status
        };
        this.transactions.unshift(transaction);
        this.saveState();
    }

    addNotification(type: 'warning' | 'success' | 'error' | 'pending', title: string, message: string): void {
        const notification: Notification = {
            id: Date.now(),
            type,
            title,
            message,
            time: 'Just now',
            read: false
        };
        this.notifications.unshift(notification);
        this.saveState();
    }
    
    markAllNotificationsRead(): void {
        this.notifications.forEach(n => n.read = true);
        this.saveState();
        this.updateNotificationBadge();
    }
    
    updateNotificationBadge(): void {
        if (!this.notificationBadge) return;
        const unreadCount = this.notifications.filter(n => !n.read).length;
        this.notificationBadge.textContent = unreadCount.toString();
        this.notificationBadge.style.display = unreadCount === 0 ? 'none' : 'block';
    }

    updateUser(name: string, email: string): void {
        this.user.name = name;
        this.user.email = email;
        this.saveState();
    }

    clearNotifications(): void {
        this.notifications = [];
        this.saveState();
    }

    sendMoney(recipient: string, amount: number): boolean {
        console.log('[v0] Sending money:', amount, 'to', recipient);
        if (amount > this.savings) {
            console.error('[v0] Insufficient savings balance');
            return false;
        }
        this.savings -= amount;
        this.addTransaction('transfer', -amount, `Transfer to ${recipient}`);
        this.addNotification('success', 'Transfer Successful', `You sent ₦${amount.toLocaleString()} to ${recipient}`);
        this.saveState();
        console.log('[v0] New savings balance after transfer:', this.savings);
        return true;
    }

    getLoanRemaining(): number {
        return this.loan.amount - this.loan.paid;
    }

    getLoanProgress(): number {
        if (this.loan.amount === 0) return 0;
        return Math.round((this.loan.paid / this.loan.amount) * 100);
    }
}

// ===========================
// UI Controller
// ===========================
class UIController {
    appState: AppState;
    currentPage: string;
    paymentMethod: 'bank' | 'card';
    uploadedReceiptFile: string | null;
    paymentType: 'payment' | 'topup' | 'savings' | null;
    pendingPaymentAmount: number | null;
    simplePaymentMethod: 'wallet' | 'bank' | 'card';
    pendingAction: PendingAction | null;
    transferRecipient: string;

    // DOM Elements
    navItems: NodeListOf<Element>;
    pages: NodeListOf<Element>;
    menuToggle: HTMLElement;
    sidebar: HTMLElement;
    mainContent: HTMLElement;
    userProfile: HTMLElement;
    profileDropdown: HTMLElement;
    displayUserName: HTMLElement;
    userName: HTMLElement;
    userAvatar: HTMLImageElement;
    themeToggle: HTMLElement;
    notificationIcon: HTMLElement;
    notificationBadge: HTMLElement;
    modal: HTMLElement;
    modalTitle: HTMLElement;
    modalLabel: HTMLElement;
    modalInput: HTMLInputElement;
    modalSubmit: HTMLElement;
    modalCancel: HTMLElement;
    modalClose: HTMLElement;
    totalSavings: HTMLElement;
    activeLoan: HTMLElement;
    remainingLoan: HTMLElement;
    nextPayment: HTMLElement;
    progressFill: HTMLElement;
    progressPercent: HTMLElement;
    progressPaid: HTMLElement;
    progressRemaining: HTMLElement;
    recentTransactionsList: HTMLElement;
    loanAmount: HTMLElement;
    loanRemaining: HTMLElement;
    loanPaid: HTMLElement;
    loanProgress: HTMLElement;
    noLoanState: HTMLElement;
    activeLoanState: HTMLElement;
    walletBalance: HTMLElement;
    savingsBalance: HTMLElement;
    savingsWalletBalance: HTMLElement;
    savingsInput: HTMLInputElement;
    addSavingsSubmit: HTMLElement;
    allTransactionsList: HTMLElement;
    notificationsList: HTMLElement;
    settingsName: HTMLInputElement;
    settingsEmail: HTMLInputElement;
    saveSettingsBtn: HTMLElement;
    profileAvatar: HTMLImageElement;
    avatarUpload: HTMLInputElement;
    editProfileBtn: HTMLElement;
    editProfileForm: HTMLElement;
    cancelEditBtn: HTMLElement;
    saveProfileBtn: HTMLElement;
    profileName: HTMLElement;
    profileEmail: HTMLElement;
    profileWallet: HTMLElement;
    profileSavings: HTMLElement;
    profileLoans: HTMLElement;
    profileTransactions: HTMLElement;
    borrowLoanModal: HTMLElement;
    modalType: string;

    constructor(appState: AppState) {
        this.appState = appState;
        this.currentPage = 'dashboard';
        this.paymentMethod = 'bank';
        this.uploadedReceiptFile = null;
        this.paymentType = null;
        this.pendingPaymentAmount = null;
        this.simplePaymentMethod = 'wallet';
        this.pendingAction = null;
        this.transferRecipient = '';
        this.modalType = '';

        this.navItems = document.querySelectorAll('.nav-item');
        this.pages = document.querySelectorAll('.page');
        this.menuToggle = document.getElementById('menuToggle') as HTMLElement;
        this.sidebar = document.getElementById('sidebar') as HTMLElement;
        this.mainContent = document.getElementById('mainContent') as HTMLElement;
        this.userProfile = document.getElementById('userProfile') as HTMLElement;
        this.profileDropdown = document.getElementById('profileDropdown') as HTMLElement;
        this.displayUserName = document.getElementById('displayUserName') as HTMLElement;
        this.userName = document.getElementById('userName') as HTMLElement;
        this.userAvatar = document.getElementById('userAvatar') as HTMLImageElement;
        this.themeToggle = document.getElementById('themeToggle') as HTMLElement;
        this.notificationIcon = document.getElementById('notificationIcon') as HTMLElement;
        this.notificationBadge = document.getElementById('notificationBadge') as HTMLElement;
        this.modal = document.getElementById('actionModal') as HTMLElement;
        this.modalTitle = document.getElementById('modalTitle') as HTMLElement;
        this.modalLabel = document.getElementById('modalLabel') as HTMLElement;
        this.modalInput = document.getElementById('modalInput') as HTMLInputElement;
        this.modalSubmit = document.getElementById('modalSubmit') as HTMLElement;
        this.modalCancel = document.getElementById('modalCancel') as HTMLElement;
        this.modalClose = document.getElementById('modalClose') as HTMLElement;
        this.totalSavings = document.getElementById('totalSavings') as HTMLElement;
        this.activeLoan = document.getElementById('activeLoan') as HTMLElement;
        this.remainingLoan = document.getElementById('remainingLoan') as HTMLElement;
        this.nextPayment = document.getElementById('nextPayment') as HTMLElement;
        this.progressFill = document.getElementById('progressFill') as HTMLElement;
        this.progressPercent = document.getElementById('progressPercent') as HTMLElement;
        this.progressPaid = document.getElementById('progressPaid') as HTMLElement;
        this.progressRemaining = document.getElementById('progressRemaining') as HTMLElement;
        this.recentTransactionsList = document.getElementById('recentTransactionsList') as HTMLElement;
        this.loanAmount = document.getElementById('loanAmount') as HTMLElement;
        this.loanRemaining = document.getElementById('loanRemaining') as HTMLElement;
        this.loanPaid = document.getElementById('loanPaid') as HTMLElement;
        this.loanProgress = document.getElementById('loanProgress') as HTMLElement;
        this.noLoanState = document.getElementById('noLoanState') as HTMLElement;
        this.activeLoanState = document.getElementById('activeLoanState') as HTMLElement;
        this.walletBalance = document.getElementById('walletBalance') as HTMLElement;
        this.savingsBalance = document.getElementById('savingsBalance') as HTMLElement;
        this.savingsWalletBalance = document.getElementById('savingsWalletBalance') as HTMLElement;
        this.savingsInput = document.getElementById('savingsInput') as HTMLInputElement;
        this.addSavingsSubmit = document.getElementById('addSavingsSubmit') as HTMLElement;
        this.allTransactionsList = document.getElementById('allTransactionsList') as HTMLElement;
        this.notificationsList = document.getElementById('notificationsList') as HTMLElement;
        this.settingsName = document.getElementById('settingsName') as HTMLInputElement;
        this.settingsEmail = document.getElementById('settingsEmail') as HTMLInputElement;
        this.saveSettingsBtn = document.getElementById('saveSettingsBtn') as HTMLElement;
        this.profileAvatar = document.getElementById('profileAvatar') as HTMLImageElement;
        this.avatarUpload = document.getElementById('avatarUpload') as HTMLInputElement;
        this.editProfileBtn = document.getElementById('editProfileBtn') as HTMLElement;
        this.editProfileForm = document.getElementById('editProfileForm') as HTMLElement;
        this.cancelEditBtn = document.getElementById('cancelEditBtn') as HTMLElement;
        this.saveProfileBtn = document.getElementById('saveProfileBtn') as HTMLElement;
        this.profileName = document.getElementById('profileName') as HTMLElement;
        this.profileEmail = document.getElementById('profileEmail') as HTMLElement;
        this.profileWallet = document.getElementById('profileWallet') as HTMLElement;
        this.profileSavings = document.getElementById('profileSavings') as HTMLElement;
        this.profileLoans = document.getElementById('profileLoans') as HTMLElement;
        this.profileTransactions = document.getElementById('profileTransactions') as HTMLElement;
        this.borrowLoanModal = document.getElementById('borrowLoanModal') as HTMLElement;

        this.initializeElements();
        this.attachEventListeners();
        this.updateUI();
    }

    initializeElements(): void {
        // Elements already initialized in constructor
    }

    attachEventListeners(): void {
        // Navigation
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = (item as HTMLElement).getAttribute('data-page');
                if (page) this.navigateTo(page);
            });
        });
        
        // View all links
        document.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = (link as HTMLElement).getAttribute('data-page');
                if (page) this.navigateTo(page);
            });
        });
        
        // Menu toggle
        this.menuToggle.addEventListener('click', () => {
            this.sidebar.classList.toggle('active');
            this.sidebar.classList.toggle('collapsed');
            this.mainContent.classList.toggle('expanded');
        });
        
        // User profile dropdown
        this.userProfile.addEventListener('click', () => {
            this.profileDropdown.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.userProfile.contains(e.target as Node)) {
                this.profileDropdown.classList.remove('active');
            }
        });
        
        // Theme toggle
        this.themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const icon = this.themeToggle.querySelector('i') as HTMLElement;
            if (document.body.classList.contains('dark-mode')) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        });
        
        // Notification icon
        this.notificationIcon.addEventListener('click', () => {
            this.navigateTo('notifications');
        });
        
        // Quick action buttons
        document.getElementById('makePaymentBtn')?.addEventListener('click', () => {
            this.openBankTransferModal('payment');
        });
        
        document.getElementById('addSavingsBtn')?.addEventListener('click', () => {
            this.openBankTransferModal('savings');
        });

        document.getElementById('makeRepaymentBtn')?.addEventListener('click', () => {
            this.openSimplePaymentModal();
        });
        
        // Simple Payment Modal handlers
        document.getElementById('closeSimplePayment')?.addEventListener('click', () => this.closeSimplePaymentModal());
        document.getElementById('cancelSimplePayment')?.addEventListener('click', () => this.closeSimplePaymentModal());
        document.getElementById('confirmSimplePayment')?.addEventListener('click', () => this.handleSimplePayment());
        
        // Quick amount buttons
        document.querySelectorAll('.quick-amount-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const amount = (e.target as HTMLElement).getAttribute('data-amount');
                const input = document.getElementById('simplePaymentAmount') as HTMLInputElement;
                if (input) input.value = amount || '';
            });
        });
        
        document.getElementById('borrowLoanBtn')?.addEventListener('click', () => {
            this.openBorrowLoanModal();
        });
        
        // Savings form
        this.addSavingsSubmit?.addEventListener('click', () => {
            this.openBankTransferModal('savings');
        });
        
        // Top Up Wallet
        document.getElementById('topUpBtn')?.addEventListener('click', () => {
            this.openBankTransferModal('topup');
        });
        document.getElementById('closeTopUpModal')?.addEventListener('click', () => this.closeTopUpModal());
        document.getElementById('cancelTopUp')?.addEventListener('click', () => this.closeTopUpModal());
        document.getElementById('confirmTopUp')?.addEventListener('click', () => this.handleTopUp());
        
        // Confirmation Modal
        document.getElementById('closeConfirmModal')?.addEventListener('click', () => this.closeConfirmModal());
        document.getElementById('cancelConfirm')?.addEventListener('click', () => this.closeConfirmModal());
        document.getElementById('confirmAction')?.addEventListener('click', () => this.executeConfirmedAction());
        
        // Settings form
        this.saveSettingsBtn?.addEventListener('click', () => {
            this.handleSaveSettings();
        });
        
        // Profile page
        this.avatarUpload?.addEventListener('change', (e) => {
            this.handleAvatarUpload(e);
        });
        
        this.editProfileBtn?.addEventListener('click', () => {
            this.showEditProfileForm();
        });
        
        this.cancelEditBtn?.addEventListener('click', () => {
            this.hideEditProfileForm();
        });
        
        this.saveProfileBtn?.addEventListener('click', () => {
            this.handleSaveProfile();
        });
        
        // Modal
        this.modalSubmit.addEventListener('click', () => {
            this.handleModalSubmit();
        });
        
        this.modalCancel.addEventListener('click', () => {
            this.closeModal();
        });
        
        this.modalClose.addEventListener('click', () => {
            this.closeModal();
        });
        
        // Close modal on outside click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
        
        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });
        
        document.getElementById('sidebarLogout')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });
        
        // Payment Modal Events
        document.getElementById('paymentModalClose')?.addEventListener('click', () => this.closePaymentModal());
        document.getElementById('paymentCancel')?.addEventListener('click', () => this.closePaymentModal());
        document.getElementById('confirmPaymentBtn')?.addEventListener('click', () => this.handlePaymentConfirmation());
        document.getElementById('copyAccountBtn')?.addEventListener('click', () => this.copyAccountNumber());
        document.getElementById('receiptUpload')?.addEventListener('change', (e) => this.handleReceiptUpload(e));
        
        // Payment method tabs
        document.querySelectorAll('.payment-method-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const method = (tab as HTMLElement).getAttribute('data-method');
                if (method) this.showPaymentMethod(method as 'bank' | 'card');
            });
        });
        
        // Card number formatting
        document.getElementById('cardNumber')?.addEventListener('input', (e) => {
            let value = (e.target as HTMLInputElement).value.replace(/\s/g, '').replace(/\D/g, '');
            let formatted = '';
            for (let i = 0; i < value.length && i < 16; i++) {
                if (i > 0 && i % 4 === 0) formatted += ' ';
                formatted += value[i];
            }
            (e.target as HTMLInputElement).value = formatted;
        });
        
        // Expiry date formatting
        document.getElementById('cardExpiry')?.addEventListener('input', (e) => {
            let value = (e.target as HTMLInputElement).value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            (e.target as HTMLInputElement).value = value;
        });
        
        document.getElementById('paymentModal')?.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).id === 'paymentModal') this.closePaymentModal();
        });
        
        // Legacy bank transfer modal listener
        document.getElementById('bankTransferModal')?.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).id === 'bankTransferModal') this.closePaymentModal();
        });
        
        // Borrow Loan Modal Events
        document.getElementById('borrowLoanModalClose')?.addEventListener('click', () => this.closeBorrowLoanModal());
        document.getElementById('borrowLoanCancel')?.addEventListener('click', () => this.closeBorrowLoanModal());
        document.getElementById('submitLoanBtn')?.addEventListener('click', () => this.handleBorrowLoan());
        this.borrowLoanModal?.addEventListener('click', (e) => {
            if (e.target === this.borrowLoanModal) this.closeBorrowLoanModal();
        });
    }

    navigateTo(page: string): void {
        this.currentPage = page;
        
        // Update active nav item
        this.navItems.forEach(item => {
            item.classList.remove('active');
            if ((item as HTMLElement).getAttribute('data-page') === page) {
                item.classList.add('active');
            }
        });
        
        // Show active page
        this.pages.forEach(p => {
            p.classList.remove('active');
            if ((p as HTMLElement).id === `${page}Page`) {
                p.classList.add('active');
            }
        });
        
        // Update page-specific content
        this.updatePageContent(page);
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            this.sidebar.classList.remove('active');
        }
    }

    updatePageContent(page: string): void {
        switch(page) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'loans':
                this.updateLoansPage();
                break;
            case 'savings':
                this.updateSavingsPage();
                break;
            case 'transactions':
                this.updateTransactionsPage();
                break;
            case 'notifications':
                this.updateNotificationsPage();
                break;
            case 'settings':
                this.updateSettingsPage();
                break;
            case 'profile':
                this.updateProfilePage();
                break;
        }
    }

    updateUI(): void {
        // Update user info
        this.displayUserName.textContent = this.appState.user.name;
        this.userName.textContent = this.appState.user.name.split(' ')[0];
        
        // Update avatar
        if (this.appState.user.avatar) {
            this.userAvatar.src = this.appState.user.avatar;
        } else {
            this.userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.appState.user.name)}&background=7c3aed&color=fff`;
        }
        
        // Update notification badge
        this.updateNotificationBadge();
        
        // Update current page
        this.updatePageContent(this.currentPage);
    }

    updateNotificationBadge(): void {
        const unreadCount = (this.appState.notifications || []).filter(n => !n.read).length;
        
        if (this.notificationBadge) {
            this.notificationBadge.textContent = unreadCount.toString();
            if (unreadCount === 0) {
                this.notificationBadge.style.display = 'none';
            } else {
                this.notificationBadge.style.display = 'inline-block';
            }
        }
    }

    updateDashboard(): void {
        this.walletBalance.textContent = `₦${this.appState.wallet.toLocaleString()}`;
        this.totalSavings.textContent = `₦${this.appState.savings.toLocaleString()}`;
        this.activeLoan.textContent = `₦${this.appState.loan.amount.toLocaleString()}`;
        this.remainingLoan.textContent = `₦${this.appState.getLoanRemaining().toLocaleString()}`;
        
        // Calculate next payment date
        const nextDate = new Date();
        nextDate.setDate(18);
        if (nextDate < new Date()) {
            nextDate.setMonth(nextDate.getMonth() + 1);
        }
        this.nextPayment.textContent = nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        // Update progress
        const progress = this.appState.getLoanProgress();
        this.progressFill.style.width = `${progress}%`;
        this.progressPercent.textContent = `${progress}% Complete`;
        this.progressPaid.textContent = `₦${this.appState.loan.paid.toLocaleString()} paid`;
        this.progressRemaining.textContent = `₦${this.appState.getLoanRemaining().toLocaleString()} remaining`;
        
        // Update recent transactions
        this.renderTransactions(this.recentTransactionsList, this.appState.transactions.slice(0, 3));
    }

    updateLoansPage(): void {
        const hasLoan = this.appState.loan.amount > 0;
        
        if (hasLoan) {
            this.noLoanState.style.transition = 'opacity 0.3s ease';
            this.noLoanState.style.opacity = '0';
            
            setTimeout(() => {
                this.noLoanState.style.display = 'none';
                this.noLoanState.style.opacity = '1';
                
                this.activeLoanState.style.display = 'block';
                this.activeLoanState.style.opacity = '0';
                
                void this.activeLoanState.offsetWidth;
                
                this.activeLoanState.style.transition = 'opacity 0.4s ease';
                this.activeLoanState.style.opacity = '1';
                
                this.loanAmount.textContent = `₦${this.appState.loan.amount.toLocaleString()}`;
                this.loanRemaining.textContent = `₦${this.appState.getLoanRemaining().toLocaleString()}`;
                this.loanPaid.textContent = `₦${this.appState.loan.paid.toLocaleString()}`;
                this.loanProgress.textContent = `${this.appState.getLoanProgress()}%`;
            }, 300);
        } else {
            this.activeLoanState.style.transition = 'opacity 0.3s ease';
            this.activeLoanState.style.opacity = '0';
            
            setTimeout(() => {
                this.activeLoanState.style.display = 'none';
                this.activeLoanState.style.opacity = '1';
                
                this.noLoanState.style.display = 'block';
                this.noLoanState.style.opacity = '0';
                
                void this.noLoanState.offsetWidth;
                
                this.noLoanState.style.transition = 'opacity 0.4s ease';
                this.noLoanState.style.opacity = '1';
            }, 300);
        }
    }

    updateSavingsPage(): void {
        this.savingsBalance.textContent = `₦${this.appState.savings.toLocaleString()}`;
        if (this.savingsWalletBalance) {
            this.savingsWalletBalance.textContent = `₦${this.appState.wallet.toLocaleString()}`;
        }
    }

    updateTransactionsPage(): void {
        this.renderTransactions(this.allTransactionsList, this.appState.transactions);
    }

    updateNotificationsPage(): void {
        if (this.appState.notifications.length === 0) {
            this.notificationsList.innerHTML = '<div class="empty-state-small">No notifications</div>';
            return;
        }
        
        this.notificationsList.innerHTML = this.appState.notifications.map(notif => `
            <div class="notification-item ${notif.type}">
                <div class="notification-icon-wrapper">
                    <i class="fas fa-${notif.type === 'warning' ? 'exclamation-triangle' : notif.type === 'error' ? 'times-circle' : notif.type === 'pending' ? 'hourglass' : 'check-circle'}"></i>
                </div>
                <div class="notification-content">
                    <h4>${notif.title}</h4>
                    <p>${notif.message}</p>
                    <div class="notification-time">${notif.time}</div>
                </div>
            </div>
        `).join('');
    }

    updateSettingsPage(): void {
        this.settingsName.value = this.appState.user.name;
        this.settingsEmail.value = this.appState.user.email;
    }

    updateProfilePage(): void {
        if (this.appState.user.avatar) {
            this.profileAvatar.src = this.appState.user.avatar;
        } else {
            this.profileAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.appState.user.name)}&background=5b21b6&color=fff&size=200`;
        }
        
        if (this.profileName) this.profileName.textContent = this.appState.user.name;
        if (this.profileEmail) this.profileEmail.textContent = this.appState.user.email || 'No email set';
        
        if (this.profileWallet) this.profileWallet.textContent = `₦${this.appState.wallet.toLocaleString()}`;
        if (this.profileSavings) this.profileSavings.textContent = `₦${this.appState.savings.toLocaleString()}`;
        if (this.profileLoans) this.profileLoans.textContent = `₦${this.appState.getLoanRemaining().toLocaleString()}`;
        if (this.profileTransactions) this.profileTransactions.textContent = this.appState.transactions.length.toString();
        
        const editNameInput = document.getElementById('editName') as HTMLInputElement;
        const editEmailInput = document.getElementById('editEmail') as HTMLInputElement;
        if (editNameInput) editNameInput.value = this.appState.user.name;
        if (editEmailInput) editEmailInput.value = this.appState.user.email || '';
    }

    renderTransactions(container: HTMLElement, transactions: Transaction[]): void {
        if (transactions.length === 0) {
            container.innerHTML = '<div class="empty-state-small">No transactions yet</div>';
            return;
        }
        
        container.innerHTML = transactions.map(trans => {
            const isPositive = trans.amount > 0;
            let icon = 'arrow-up';
            let iconClass = 'payment';
            
            if (trans.type === 'savings' || trans.type === 'topup') {
                icon = 'arrow-down';
                iconClass = trans.type === 'topup' ? 'wallet' : 'savings';
            }
            
            const statusBadge = trans.status === 'pending'
                ? '<span class="transaction-status pending">Pending</span>'
                : trans.status === 'failed'
                ? '<span class="transaction-status failed">Failed</span>'
                : '<span class="transaction-status completed">Successful</span>';
            
            return `
                <div class="transaction-item">
                    <div class="transaction-info">
                        <div class="transaction-icon ${iconClass}">
                            <i class="fas fa-${icon}"></i>
                        </div>
                        <div class="transaction-details">
                            <h4>${trans.description}</h4>
                            <p>${new Date(trans.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                    </div>
                    <div class="transaction-amount">
                        <span class="amount ${isPositive ? 'positive' : 'negative'}">
                            ${isPositive ? '+' : ''}₦${Math.abs(trans.amount).toLocaleString()}
                        </span>
                        ${statusBadge}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Modal Methods
    openModal(type: string): void {
        this.modalType = type;
        if (type === 'payment') {
            this.modalTitle.textContent = 'Make Loan Payment';
            this.modalLabel.textContent = 'Enter payment amount';
            this.modalInput.placeholder = 'Enter amount';
            this.modalInput.max = this.appState.getLoanRemaining().toString();
            this.modalInput.type = 'number';
        } else if (type === 'transfer') {
            this.modalTitle.textContent = 'Send Money';
            this.modalLabel.textContent = 'Recipient Account Name';
            this.modalInput.placeholder = 'Enter recipient name';
            this.modalInput.type = 'text';
            this.modalInput.removeAttribute('max');
        } else {
            this.modalTitle.textContent = 'Add Savings';
            this.modalLabel.textContent = 'Enter savings amount';
            this.modalInput.placeholder = 'Enter amount';
            this.modalInput.type = 'number';
            this.modalInput.removeAttribute('max');
        }
        this.modalInput.value = '';
        this.modal.classList.add('active');
    }

    closeModal(): void {
        this.modal.classList.remove('active');
        this.modalInput.value = '';
    }

    handleModalSubmit(): void {
        const amount = parseInt(this.modalInput.value);
        
        if (!amount || amount < 100) {
            alert('Please enter a valid amount (minimum ₦100)');
            return;
        }
        
        if (this.modalType === 'payment') {
            if (amount > this.appState.getLoanRemaining()) {
                alert('Payment amount cannot exceed remaining loan balance');
                return;
            }
            this.appState.makePayment(amount);
            this.updateUI();
            this.closeModal();
            this.showSuccessMessage('Payment successful!');
        } else if (this.modalType === 'transfer') {
            const recipient = prompt('Enter recipient account name:');
            if (!recipient || recipient.trim() === '') {
                alert('Please enter recipient name');
                return;
            }
            
            if (amount > this.appState.savings) {
                alert('Insufficient balance');
                return;
            }
            
            const success = this.appState.sendMoney(recipient.trim(), amount);
            if (!success) {
                alert('Transfer failed. Please try again.');
                return;
            }
            this.updateUI();
            this.closeModal();
            this.showSuccessMessage(`Sent ₦${amount.toLocaleString()} to ${recipient}!`);
        } else {
            this.appState.addSavings(amount);
            this.updateUI();
            this.closeModal();
            this.showSuccessMessage('Savings added successfully!');
        }
    }

    // Avatar Upload Handler
    handleAvatarUpload(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            this.showToast('warning', 'Invalid File', 'Please select an image file');
            return;
        }
        
        if (file.size > 2 * 1024 * 1024) {
            this.showToast('warning', 'File Too Large', 'Image must be less than 2MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const avatarData = e.target?.result as string;
            this.appState.user.avatar = avatarData;
            this.appState.saveState();
            this.updateProfilePage();
            this.updateUI();
            this.showToast('success', 'Photo Updated', 'Your profile photo has been updated');
        };
        reader.onerror = () => {
            this.showToast('error', 'Error', 'Failed to read the image file');
        };
        reader.readAsDataURL(file);
    }
    
    showEditProfileForm(): void {
        const editNameInput = document.getElementById('editName') as HTMLInputElement;
        const editEmailInput = document.getElementById('editEmail') as HTMLInputElement;
        editNameInput.value = this.appState.user.name;
        editEmailInput.value = this.appState.user.email || '';
        
        this.editProfileForm.style.display = 'block';
        (document.querySelector('.profile-info') as HTMLElement).style.display = 'none';
        this.editProfileBtn.style.display = 'none';
    }
    
    hideEditProfileForm(): void {
        this.editProfileForm.style.display = 'none';
        (document.querySelector('.profile-info') as HTMLElement).style.display = 'block';
        this.editProfileBtn.style.display = 'inline-block';
    }
    
    handleSaveProfile(): void {
        const editNameInput = document.getElementById('editName') as HTMLInputElement;
        const editEmailInput = document.getElementById('editEmail') as HTMLInputElement;
        const name = editNameInput.value.trim();
        const email = editEmailInput.value.trim();
        
        if (!name) {
            this.showToast('warning', 'Name Required', 'Please enter your name');
            return;
        }
        
        this.appState.user.name = name;
        this.appState.user.email = email;
        this.appState.saveState();
        
        this.updateProfilePage();
        this.updateUI();
        this.hideEditProfileForm();
        this.showToast('success', 'Profile Updated', 'Your profile has been updated successfully');
    }

    handleLogout(): void {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('treasureFortuneLoggedIn');
            localStorage.removeItem('treasureFortuneCurrentUser');
            localStorage.removeItem('treasureFortuneState');
            window.location.href = 'index.html';
        }
    }

    // Payment Modal Methods
    openPaymentModal(type: 'payment' | 'topup' | 'savings'): void {
        this.paymentType = type;
        this.paymentMethod = 'bank';
        this.uploadedReceiptFile = null;
        
        const modal = document.getElementById('paymentModal') as HTMLElement;
        const title = document.getElementById('paymentModalTitle') as HTMLElement;
        const amountLabel = document.getElementById('amountFormLabel') as HTMLElement;
        const amountInput = document.getElementById('paymentAmountInput') as HTMLInputElement;
        const confirmBtn = document.getElementById('confirmPaymentBtn') as HTMLElement;
        
        this.resetPaymentForm();
        this.showPaymentMethod('bank');
        
        if (type === 'payment') {
            title.textContent = 'Loan Repayment';
            amountLabel.textContent = 'Enter Payment Amount';
            amountInput.placeholder = `Remaining: ₦${this.appState.getLoanRemaining().toLocaleString()}`;
            confirmBtn.textContent = 'I Have Made Payment';
        } else if (type === 'topup') {
            title.textContent = 'Top Up Wallet';
            amountLabel.textContent = 'Enter Amount';
            amountInput.placeholder = 'Enter amount to top up';
            confirmBtn.textContent = 'I Have Made Payment';
        } else {
            title.textContent = 'Add Savings';
            amountLabel.textContent = 'Enter Amount You Want to Save';
            amountInput.placeholder = 'Enter amount';
            confirmBtn.textContent = 'I Have Made Payment';
        }
        
        modal.classList.add('active');
    }

    resetPaymentForm(): void {
        (document.getElementById('paymentAmountInput') as HTMLInputElement).value = '';
        (document.getElementById('receiptUpload') as HTMLInputElement).value = '';
        (document.getElementById('uploadedReceipt') as HTMLElement).style.display = 'none';
        (document.getElementById('paymentError') as HTMLElement).style.display = 'none';
        this.uploadedReceiptFile = null;
        
        (document.getElementById('cardNumber') as HTMLInputElement).value = '';
        (document.getElementById('cardExpiry') as HTMLInputElement).value = '';
        (document.getElementById('cardCvv') as HTMLInputElement).value = '';
        (document.getElementById('cardHolderName') as HTMLInputElement).value = '';
    }

    showPaymentMethod(method: 'bank' | 'card'): void {
        this.paymentMethod = method;
        const bankSection = document.getElementById('bankTransferSection') as HTMLElement;
        const cardSection = document.getElementById('cardPaymentSection') as HTMLElement;
        const confirmBtn = document.getElementById('confirmPaymentBtn') as HTMLElement;
        const tabs = document.querySelectorAll('.payment-method-tab');
        
        tabs.forEach(tab => {
            tab.classList.toggle('active', (tab as HTMLElement).getAttribute('data-method') === method);
        });
        
        if (method === 'bank') {
            bankSection.style.display = 'block';
            cardSection.style.display = 'none';
            confirmBtn.textContent = 'I Have Made Payment';
        } else {
            bankSection.style.display = 'none';
            cardSection.style.display = 'block';
            confirmBtn.textContent = 'Pay Now';
        }
    }

    handleReceiptUpload(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
            const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
            if (!validTypes.includes(file.type)) {
                this.showPaymentError('Please upload a valid image file (JPG or PNG)');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                this.uploadedReceiptFile = e.target?.result as string;
                (document.getElementById('uploadedReceipt') as HTMLElement).style.display = 'flex';
                (document.getElementById('receiptFileName') as HTMLElement).textContent = file.name;
                this.hidePaymentError();
            };
            reader.readAsDataURL(file);
        }
    }

    showPaymentError(message: string): void {
        const errorDiv = document.getElementById('paymentError') as HTMLElement;
        (document.getElementById('paymentErrorText') as HTMLElement).textContent = message;
        errorDiv.style.display = 'flex';
    }

    hidePaymentError(): void {
        (document.getElementById('paymentError') as HTMLElement).style.display = 'none';
    }

    closePaymentModal(): void {
        const modal = document.getElementById('paymentModal') as HTMLElement;
        modal.classList.remove('active');
        this.resetPaymentForm();
    }

    copyAccountNumber(): void {
        const accountNumber = '1234567890';
        navigator.clipboard.writeText(accountNumber).then(() => {
            this.showToast('success', 'Copied!', 'Account number copied!');
        });
    }

    validatePayment(): boolean {
        const amount = parseInt((document.getElementById('paymentAmountInput') as HTMLInputElement).value);
        
        if (!amount || amount < 100) {
            this.showPaymentError('Please enter a valid amount (minimum ₦100)');
            return false;
        }
        
        if (this.paymentMethod === 'bank') {
            if (!this.uploadedReceiptFile) {
                this.showPaymentError('Please upload your payment receipt before confirming');
                return false;
            }
            
            if (this.uploadedReceiptFile && this.uploadedReceiptFile.length < 100) {
                this.showPaymentError('Please wait for receipt to upload or try again');
                return false;
            }
        } else {
            const cardNumber = (document.getElementById('cardNumber') as HTMLInputElement).value.replace(/\s/g, '');
            const cardExpiry = (document.getElementById('cardExpiry') as HTMLInputElement).value;
            const cardCvv = (document.getElementById('cardCvv') as HTMLInputElement).value;
            const cardHolder = (document.getElementById('cardHolderName') as HTMLInputElement).value;
            
            if (!cardNumber || cardNumber.length < 13) {
                this.showPaymentError('Please enter a valid card number');
                return false;
            }
            if (!cardExpiry || cardExpiry.length < 5) {
                this.showPaymentError('Please enter a valid expiry date (MM/YY)');
                return false;
            }
            if (!cardCvv || cardCvv.length < 3) {
                this.showPaymentError('Please enter a valid CVV');
                return false;
            }
            if (!cardHolder.trim()) {
                this.showPaymentError('Please enter the cardholder name');
                return false;
            }
        }
        
        if (this.paymentType === 'payment') {
            const remainingLoan = this.appState.getLoanRemaining();
            if (amount > remainingLoan) {
                this.showPaymentError(`You cannot pay more than your remaining loan balance (₦${remainingLoan.toLocaleString()})`);
                return false;
            }
            if (this.paymentMethod === 'bank' && this.appState.wallet < amount) {
                this.showPaymentError('Your wallet balance is low. Please top up or use card payment.');
                return false;
            }
        }
        
        if (this.paymentType === 'savings' && this.paymentMethod === 'bank') {
            if (this.appState.wallet < amount) {
                this.showPaymentError('Your wallet balance is low. Please top up or use card payment.');
                return false;
            }
        }
        
        this.hidePaymentError();
        return true;
    }

    handlePaymentConfirmation(): void {
        if (!this.validatePayment()) {
            return;
        }
        
        const amount = this.pendingPaymentAmount || Math.floor(parseFloat((document.getElementById('paymentAmountInput') as HTMLInputElement).value));
        this.pendingPaymentAmount = null;
        
        this.closePaymentModal();
        
        if (this.paymentMethod === 'card') {
            this.processCardPayment(amount);
        } else {
            this.processBankTransfer(amount);
        }
    }

    processCardPayment(amount: number): void {
        const overlay = document.getElementById('processingOverlay') as HTMLElement;
        const text = document.getElementById('processingText') as HTMLElement;
        
        overlay.classList.add('active');
        text.innerHTML = 'Processing card payment<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>';
        
        setTimeout(() => {
            overlay.classList.remove('active');
            
            if (this.paymentType === 'payment') {
                this.appState.loan.paid += amount;
                const transaction: Transaction = {
                    id: Date.now(),
                    type: 'payment',
                    amount: -amount,
                    date: new Date().toISOString().split('T')[0],
                    description: 'Loan Payment (Card)',
                    method: 'Card',
                    status: 'successful'
                };
                this.appState.transactions.unshift(transaction);
                this.appState.addNotification('success', 'Payment Successful', `₦${amount.toLocaleString()} paid via card`);
                
                if (this.appState.loan.paid >= this.appState.loan.amount) {
                    const successOverlay = document.getElementById('loanSuccessOverlay') as HTMLElement;
                    successOverlay.classList.add('active');
                    
                    setTimeout(() => {
                        successOverlay.classList.remove('active');
                        this.appState.loan = { amount: 0, paid: 0 };
                        this.appState.saveState();
                        this.updateUI();
                    }, 4000);
                }
            } else if (this.paymentType === 'topup') {
                this.appState.wallet += amount;
                const transaction: Transaction = {
                    id: Date.now(),
                    type: 'topup',
                    amount: amount,
                    date: new Date().toISOString().split('T')[0],
                    description: 'Wallet Top Up (Card)',
                    method: 'Card',
                    status: 'successful'
                };
                this.appState.transactions.unshift(transaction);
                this.appState.addNotification('success', 'Top Up Successful', `₦${amount.toLocaleString()} added to your wallet`);
            } else if (this.paymentType === 'savings') {
                this.appState.savings += amount;
                const transaction: Transaction = {
                    id: Date.now(),
                    type: 'savings',
                    amount: amount,
                    date: new Date().toISOString().split('T')[0],
                    description: 'Savings Deposit (Card)',
                    method: 'Card',
                    status: 'successful'
                };
                this.appState.transactions.unshift(transaction);
                this.appState.addNotification('success', 'Savings Successful', `₦${amount.toLocaleString()} added to your savings`);
            }

            this.appState.saveState();
            this.updateUI();
            this.showToast('success', 'Payment Successful', 'Your transaction has been completed.');
        }, 3000);
    }

    processBankTransfer(amount: number): void {
        const overlay = document.getElementById('processingOverlay') as HTMLElement;
        const text = document.getElementById('processingText') as HTMLElement;
        
        overlay.classList.add('active');
        
        setTimeout(() => {
            const dots = '<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>';
            text.innerHTML = 'Submitting your request' + dots;
        }, 2000);
        
        setTimeout(() => {
            overlay.classList.remove('active');
            
            const userName = this.appState.user?.name || 'User';
            const userEmail = this.appState.user?.email || '';
            const requestId = Date.now();
            const typeLabel = this.paymentType === 'payment' ? 'Loan Repayment' : (this.paymentType === 'topup' ? 'Top-up' : 'Savings');
            const wholeAmount = Math.floor(amount);
            
            // Create transaction with PENDING status
            const transactionId = Date.now();
            const transaction: Transaction = {
                id: transactionId,
                type: this.paymentType || 'payment',
                amount: this.paymentType === 'payment' ? -wholeAmount : wholeAmount,
                date: new Date().toISOString().split('T')[0],
                description: typeLabel,
                method: 'Bank Transfer',
                status: 'pending',
                receipt: this.uploadedReceiptFile || undefined
            };
            
            // Create notification with PENDING status
            const notificationId = Date.now() + 1;
            const notification: Notification = {
                id: notificationId,
                type: 'pending',
                title: 'Request Submitted',
                message: `Your ${typeLabel.toLowerCase()} request of ₦${wholeAmount.toLocaleString()} is pending admin approval`,
                time: 'Just now',
                read: false,
                status: 'Pending'
            };
            
            // Create admin request
            const adminRequest: AdminRequest = {
                id: requestId,
                userName: userName,
                userEmail: userEmail,
                type: typeLabel as 'Top-up' | 'Loan Repayment' | 'Savings',
                amount: wholeAmount,
                method: 'Bank Transfer',
                status: 'Pending',
                receipt: this.uploadedReceiptFile || undefined,
                date: new Date().toISOString(),
                transactionId: transaction.id,
                notificationId: notification.id
            };
            
            this.appState.transactions.unshift(transaction);
            this.appState.notifications.unshift(notification);
            this.appState.addAdminRequest(adminRequest);
            this.appState.saveState();
            this.updateUI();
            
            this.showToast('info', 'Request Submitted', 'Your request is pending admin approval');
        }, 4000);
    }

    // Legacy methods
    openBankTransferModal(type: 'payment' | 'topup' | 'savings'): void {
        this.openPaymentModal(type);
    }

    closeBankTransferModal(): void {
        this.closePaymentModal();
    }

    // Simple Payment Modal Methods
    openSimplePaymentModal(): void {
        this.simplePaymentMethod = 'wallet';
        this.updateSimplePaymentUI();
        const loanBalance = this.appState.getLoanRemaining();
        const loanPaid = this.appState.loan?.paid || 0;
        (document.getElementById('modalLoanBalance') as HTMLElement).textContent = `₦${loanBalance.toLocaleString()}`;
        (document.getElementById('modalLoanPaid') as HTMLElement).textContent = `₦${loanPaid.toLocaleString()}`;
        (document.getElementById('simplePaymentModal') as HTMLElement).classList.add('active');
    }
    
    closeSimplePaymentModal(): void {
        (document.getElementById('simplePaymentModal') as HTMLElement).classList.remove('active');
        this.simplePaymentMethod = 'wallet';
    }
    
    selectPaymentMethod(method: 'wallet' | 'bank' | 'card'): void {
        this.simplePaymentMethod = method;
        this.updateSimplePaymentUI();
    }
    
    updateSimplePaymentUI(): void {
        const tabs = document.querySelectorAll('#simplePaymentModal .payment-method-tab');
        tabs.forEach(tab => {
            tab.classList.toggle('active', (tab as HTMLElement).getAttribute('data-method') === this.simplePaymentMethod);
        });
        
        (document.getElementById('walletPaymentInfo') as HTMLElement).style.display = this.simplePaymentMethod === 'wallet' ? 'block' : 'none';
        (document.getElementById('bankPaymentInfo') as HTMLElement).style.display = this.simplePaymentMethod === 'bank' ? 'block' : 'none';
        (document.getElementById('cardPaymentInfo') as HTMLElement).style.display = this.simplePaymentMethod === 'card' ? 'block' : 'none';
        
        const confirmBtn = document.getElementById('confirmSimplePayment') as HTMLElement;
        if (this.simplePaymentMethod === 'wallet') {
            confirmBtn.textContent = 'Pay Now';
        } else if (this.simplePaymentMethod === 'bank') {
            confirmBtn.textContent = 'Submit Proof';
        } else {
            confirmBtn.textContent = 'Pay Now';
        }
    }
    
    handleSimplePayment(): void {
        const amount = parseInt((document.getElementById('simplePaymentAmount') as HTMLInputElement).value);
        
        if (!amount || amount < 100) {
            alert('Please enter a valid amount (minimum ₦100)');
            return;
        }
        
        if (this.simplePaymentMethod === 'wallet') {
            this.processLoanPaymentFromWallet(amount);
        } else if (this.simplePaymentMethod === 'bank') {
            this.processLoanPaymentFromBank(amount);
        } else {
            this.processLoanPaymentFromCard(amount);
        }
    }
    
    processLoanPaymentFromWallet(amount: number): void {
        if (this.appState.wallet < amount) {
            alert('Insufficient wallet balance. Please top up or use bank transfer.');
            return;
        }
        
        const overlay = document.getElementById('processingOverlay') as HTMLElement;
        const text = document.getElementById('processingText') as HTMLElement;
        text.innerHTML = 'Processing your payment<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>';
        overlay.classList.add('active');
        
        setTimeout(() => {
            overlay.classList.remove('active');
            
            this.appState.wallet -= amount;
            const remaining = this.appState.getLoanRemaining() - amount;
            this.appState.makePayment(amount);
            
            if (remaining <= 0) {
                const successOverlay = document.getElementById('loanSuccessOverlay') as HTMLElement;
                successOverlay.classList.add('active');
            }
            
            this.appState.saveState();
            this.closeSimplePaymentModal();
            this.showToast('success', 'Payment Successful', `₦${amount.toLocaleString()} paid towards your loan`);
            this.updateUI();
        }, 2000);
    }
    
    processLoanPaymentFromBank(amount: number): void {
        this.pendingPaymentAmount = amount;
        this.closeSimplePaymentModal();
        this.openPaymentModal('payment');
        (document.getElementById('paymentAmountInput') as HTMLInputElement).value = amount.toString();
        this.showPaymentMethod('bank');
    }
    
    processLoanPaymentFromCard(amount: number): void {
        const overlay = document.getElementById('processingOverlay') as HTMLElement;
        const text = document.getElementById('processingText') as HTMLElement;
        text.innerHTML = 'Processing your payment<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>';
        overlay.classList.add('active');
        
        setTimeout(() => {
            overlay.classList.remove('active');
            const remaining = this.appState.getLoanRemaining() - amount;
            this.appState.makePayment(amount);
            
            if (remaining <= 0) {
                const successOverlay = document.getElementById('loanSuccessOverlay') as HTMLElement;
                successOverlay.classList.add('active');
            }
            
            this.appState.saveState();
            this.closeSimplePaymentModal();
            this.showToast('success', 'Payment Successful', `₦${amount.toLocaleString()} paid via card`);
            this.updateUI();
        }, 2000);
    }

    // Top Up Methods
    openTopUpModal(): void {
        this.openPaymentModal('topup');
    }
    
    closeTopUpModal(): void {
        (document.getElementById('topUpModal') as HTMLElement).classList.remove('active');
    }
    
    handleTopUp(): void {
        this.openPaymentModal('topup');
    }
    
    // Confirmation Modal Methods
    openConfirmModal(title: string, message: string, amount: string): void {
        const modal = document.getElementById('confirmModal') as HTMLElement;
        (document.getElementById('confirmTitle') as HTMLElement).textContent = title;
        (document.getElementById('confirmMessage') as HTMLElement).textContent = message;
        (document.getElementById('confirmAmount') as HTMLElement).textContent = amount;
        modal.classList.add('active');
    }
    
    closeConfirmModal(): void {
        const modal = document.getElementById('confirmModal') as HTMLElement;
        modal.classList.remove('active');
        this.pendingAction = null;
    }
    
    executeConfirmedAction(): void {
        if (!this.pendingAction) return;
        
        const { type, amount } = this.pendingAction;
        
        if (type === 'loanPayment') {
            this.processLoanPayment(amount);
        } else if (type === 'topUp') {
            this.processTopUp(amount);
        } else if (type === 'savings') {
            this.processSavings(amount);
        }
        
        this.closeConfirmModal();
    }
    
    processLoanPayment(amount: number): void {
        const overlay = document.getElementById('processingOverlay') as HTMLElement;
        const text = document.getElementById('processingText') as HTMLElement;
        text.innerHTML = 'Processing your payment<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>';
        overlay.classList.add('active');
        
        setTimeout(() => {
            overlay.classList.remove('active');
            
            this.appState.wallet -= amount;
            const remaining = this.appState.getLoanRemaining() - amount;
            this.appState.makePayment(amount);
            
            if (remaining <= 0) {
                const successOverlay = document.getElementById('loanSuccessOverlay') as HTMLElement;
                successOverlay.classList.add('active');
                
                setTimeout(() => {
                    successOverlay.classList.remove('active');
                    this.appState.saveState();
                    this.updateUI();
                    this.showToast('success', 'Loan Completed', 'You can now borrow a new loan!');
                }, 2500);
            } else {
                this.updateUI();
                this.showToast('success', 'Payment Successful', `You paid ₦${amount.toLocaleString()} towards your loan`);
            }
        }, 3000);
    }
    
    processTopUp(amount: number): void {
        const overlay = document.getElementById('processingOverlay') as HTMLElement;
        const text = document.getElementById('processingText') as HTMLElement;
        text.innerHTML = 'Processing top up<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>';
        overlay.classList.add('active');
        
        setTimeout(() => {
            overlay.classList.remove('active');
            
            this.appState.wallet += amount;
            this.appState.addTransaction('topup', amount, 'Wallet Top Up');
            this.appState.saveState();
            this.updateUI();
            this.showToast('success', 'Top Up Successful', `₦${amount.toLocaleString()} added to your wallet`);
        }, 3000);
    }
    
    processSavings(amount: number): void {
        const overlay = document.getElementById('processingOverlay') as HTMLElement;
        const text = document.getElementById('processingText') as HTMLElement;
        text.innerHTML = 'Processing savings<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>';
        overlay.classList.add('active');
        
        setTimeout(() => {
            overlay.classList.remove('active');
            
            this.appState.wallet -= amount;
            this.appState.addSavings(amount);
            this.updateUI();
        }, 3000);
    }

    // Borrow Loan Methods
    openBorrowLoanModal(): void {
        this.borrowLoanModal.classList.add('active');
        (document.getElementById('loanAmountInput') as HTMLInputElement).value = '';
        (document.getElementById('loanPurposeInput') as HTMLInputElement).value = '';
    }

    closeBorrowLoanModal(): void {
        this.borrowLoanModal.classList.remove('active');
    }

    handleBorrowLoan(): void {
        const amount = parseInt((document.getElementById('loanAmountInput') as HTMLInputElement).value);
        const purpose = ((document.getElementById('loanPurposeInput') as HTMLInputElement).value || '').trim();

        if (!amount || amount < 1000) {
            alert('Please enter a valid loan amount (minimum ₦1,000)');
            return;
        }

        this.appState.loan = {
            amount: amount,
            paid: 0,
            purpose: purpose
        };

        this.appState.addNotification('success', 'Loan Approved', `Your loan of ₦${amount.toLocaleString()} has been approved!`);
        this.appState.saveState();

        this.closeBorrowLoanModal();
        this.updateUI();
        this.showSuccessMessage(`Loan of ₦${amount.toLocaleString()} approved!`);
    }

    handleSaveSettings(): void {
        const name = this.settingsName.value.trim();
        const email = this.settingsEmail.value.trim();
        
        if (!name) {
            alert('Please enter your name');
            return;
        }
        
        if (!email) {
            alert('Please enter your email');
            return;
        }
        
        this.appState.updateUser(name, email);
        this.updateUI();
        this.showSuccessMessage('Settings saved successfully!');
    }

    showSuccessMessage(message: string): void {
        this.showToast('success', 'Success', message);
    }

    showToast(type: 'success' | 'info' | 'warning' | 'error', title: string, message: string, duration: number = 5000): void {
        const container = document.getElementById('toastContainer') as HTMLElement;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons: Record<string, string> = {
            success: 'fa-check',
            info: 'fa-info',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle'
        };
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${icons[type]}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">&times;</button>
        `;
        
        container.appendChild(toast);
        
        const closeBtn = toast.querySelector('.toast-close') as HTMLElement;
        closeBtn.addEventListener('click', () => {
            toast.style.animation = 'toastSlideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        });
        
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'toastSlideOut 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    }
}

// ===========================
// Initialize App
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    const appState = new AppState();
    const uiController = new UIController(appState);
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
});
