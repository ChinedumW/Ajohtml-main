// ===========================
// Enhanced Financial System v2.0
// Admin Approval Flow, Receipt Handling, Transaction Status Tracking
// ===========================

// ===========================
// Authentication Check
// ===========================
const isLoggedIn = localStorage.getItem('treasureFortuneLoggedIn');
if (!isLoggedIn) {
    window.location.href = 'login.html';
}

const userData = JSON.parse(localStorage.getItem('treasureFortuneCurrentUser') || 'null');
if (userData && userData.hasPaidRegistration === false) {
    window.location.href = 'pay.html';
}

// ===========================
// Enhanced App State Management v2.0
// ===========================
class AppStateV2 {
    constructor() {
        this.loadState();
    }

    loadState() {
        const savedState = localStorage.getItem('treasureFortuneStateV2');
        if (savedState) {
            const state = JSON.parse(savedState);
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
                { 
                    id: 'txn_1', 
                    type: 'savings_transfer', 
                    amount: 50000, 
                    date: '2026-04-10', 
                    description: 'Savings Transfer from Wallet',
                    status: 'successful',
                    method: 'wallet'
                },
                { 
                    id: 'txn_2', 
                    type: 'loan_repayment', 
                    amount: -83333, 
                    date: '2026-04-05', 
                    description: 'Loan Payment',
                    status: 'successful',
                    method: 'wallet'
                },
                { 
                    id: 'txn_3', 
                    type: 'savings_transfer', 
                    amount: 100000, 
                    date: '2026-04-01', 
                    description: 'Savings Transfer from Wallet',
                    status: 'successful',
                    method: 'wallet'
                }
            ];
            this.notifications = [
                { id: 'notif_1', type: 'warning', title: 'Payment Due Soon', message: 'Your next loan payment is due in 5 days', time: '2 hours ago', read: false },
                { id: 'notif_2', type: 'success', title: 'Savings Added', message: 'You successfully added ₦50,000 to your savings', time: '1 day ago', read: false }
            ];
            this.adminRequests = [];
            this.saveState();
        }
    }

    saveState() {
        const state = {
            user: this.user,
            wallet: this.wallet,
            savings: this.savings,
            loan: this.loan,
            transactions: this.transactions,
            notifications: this.notifications,
            adminRequests: this.adminRequests
        };
        localStorage.setItem('treasureFortuneStateV2', JSON.stringify(state));
    }

    // ===========================
    // RULE 1: Admin Request Management
    // ===========================
    createAdminRequest(type, amount, method, receiptImage = null) {
        const requestId = 'req_' + Date.now();
        
        // Create transaction with pending status
        const transactionId = 'txn_' + Date.now();
        const request = {
            id: requestId,
            transactionId: transactionId,
            type: type, // 'wallet_topup', 'loan_repayment_bank', 'savings_transfer_bank'
            amount: amount,
            method: method, // 'bank_transfer', 'card_payment'
            status: 'pending', // RULE: Status = pending on creation
            receiptImage: receiptImage, // RULE: Receipt required for bank transfers
            createdAt: new Date().toISOString(),
            reviewedAt: null,
            reviewedBy: null,
            reason: null
        };

        // Create linked transaction with pending status
        const transaction = {
            id: transactionId,
            adminRequestId: requestId, // Link to request
            type: type,
            amount: amount,
            method: method,
            status: 'pending', // RULE: Transaction status = pending
            date: new Date().toISOString().split('T')[0],
            description: this.getTransactionDescription(type, amount),
            receiptUrl: receiptImage ? true : false
        };

        // Create notification
        const notificationId = 'notif_' + Date.now();
        const notification = {
            id: notificationId,
            adminRequestId: requestId,
            transactionId: transactionId,
            type: 'pending',
            title: 'Request Pending',
            message: `Your ${type} request for ₦${amount.toLocaleString()} is pending admin review`,
            time: 'Just now',
            read: false
        };

        // RULE: Add all at same time with same ID references
        this.adminRequests.push(request);
        this.transactions.unshift(transaction);
        this.notifications.unshift(notification);
        
        this.saveState();
        
        return { requestId, transactionId };
    }

    // ===========================
    // RULE 2: Admin Approval/Rejection
    // ===========================
    approveAdminRequest(requestId, adminName = 'Admin') {
        const request = this.adminRequests.find(r => r.id === requestId);
        if (!request) return false;

        // Update request status
        request.status = 'approved'; // RULE: Status → approved
        request.reviewedAt = new Date().toISOString();
        request.reviewedBy = adminName;

        // Update transaction status
        const transaction = this.transactions.find(t => t.id === request.transactionId);
        if (transaction) {
            transaction.status = 'successful'; // RULE: Transaction = successful
        }

        // RULE: NOW update balances (ONLY on approval)
        if (request.type === 'wallet_topup' || request.type === 'wallet_topup_bank') {
            this.wallet += request.amount;
        } else if (request.type === 'loan_repayment_bank') {
            this.loan.paid += request.amount;
        } else if (request.type === 'savings_transfer_bank') {
            this.wallet -= request.amount;
            this.savings += request.amount;
        }

        // Update notification
        const notification = this.notifications.find(n => n.adminRequestId === requestId);
        if (notification) {
            notification.type = 'success';
            notification.title = 'Request Approved';
            notification.message = `Your ${request.type} request for ₦${request.amount.toLocaleString()} has been approved`;
        }

        this.saveState();
        return true;
    }

    rejectAdminRequest(requestId, reason = '', adminName = 'Admin') {
        const request = this.adminRequests.find(r => r.id === requestId);
        if (!request) return false;

        // Update request status
        request.status = 'rejected'; // RULE: Status → rejected
        request.reviewedAt = new Date().toISOString();
        request.reviewedBy = adminName;
        request.reason = reason;

        // Update transaction status
        const transaction = this.transactions.find(t => t.id === request.transactionId);
        if (transaction) {
            transaction.status = 'failed'; // RULE: Transaction = failed
        }

        // RULE: NO balance changes on rejection

        // Update notification
        const notification = this.notifications.find(n => n.adminRequestId === requestId);
        if (notification) {
            notification.type = 'failed';
            notification.title = 'Request Rejected';
            notification.message = `Your ${request.type} request for ₦${request.amount.toLocaleString()} was rejected. Reason: ${reason}`;
        }

        this.saveState();
        return true;
    }

    // ===========================
    // RULE 3: Wallet Top-up Flow
    // ===========================
    createWalletTopup(amount, method, receiptImage = null) {
        // RULE: Bank transfer requires receipt
        if (method === 'bank_transfer' && !receiptImage) {
            return { success: false, error: 'Receipt is required for bank transfers' };
        }

        // RULE: Card payment is instant (no approval needed)
        if (method === 'card_payment') {
            this.wallet += amount;
            const transactionId = 'txn_' + Date.now();
            const transaction = {
                id: transactionId,
                type: 'wallet_topup',
                amount: amount,
                method: 'card_payment',
                status: 'successful',
                date: new Date().toISOString().split('T')[0],
                description: `Wallet Top-up via Card`,
                receiptUrl: false
            };
            this.transactions.unshift(transaction);
            
            const notification = {
                id: 'notif_' + Date.now(),
                transactionId: transactionId,
                type: 'success',
                title: 'Wallet Top-up Successful',
                message: `You successfully added ₦${amount.toLocaleString()} to your wallet`,
                time: 'Just now',
                read: false
            };
            this.notifications.unshift(notification);
            this.saveState();
            return { success: true, message: 'Wallet topped up successfully' };
        }

        // RULE: Bank transfer requires admin approval
        if (method === 'bank_transfer') {
            const { requestId, transactionId } = this.createAdminRequest('wallet_topup_bank', amount, 'bank_transfer', receiptImage);
            return { 
                success: true, 
                message: 'Top-up request submitted for admin review',
                requestId,
                transactionId
            };
        }

        return { success: false, error: 'Invalid payment method' };
    }

    // ===========================
    // RULE 4: Savings Transfer (Wallet → Savings ONLY)
    // ===========================
    createSavingsTransfer(amount) {
        // RULE: Savings can ONLY be funded from wallet
        if (amount > this.wallet) {
            return { success: false, error: 'Insufficient wallet balance. Please top-up your wallet first.' };
        }

        // Savings from wallet is instant (no approval)
        this.wallet -= amount;
        this.savings += amount;

        const transactionId = 'txn_' + Date.now();
        const transaction = {
            id: transactionId,
            type: 'savings_transfer',
            amount: amount,
            method: 'wallet',
            status: 'successful',
            date: new Date().toISOString().split('T')[0],
            description: 'Savings Transfer from Wallet',
            receiptUrl: false
        };
        this.transactions.unshift(transaction);

        const notification = {
            id: 'notif_' + Date.now(),
            transactionId: transactionId,
            type: 'success',
            title: 'Savings Transferred',
            message: `You successfully transferred ₦${amount.toLocaleString()} to your savings`,
            time: 'Just now',
            read: false
        };
        this.notifications.unshift(notification);
        this.saveState();

        return { success: true, message: 'Savings transferred successfully' };
    }

    // ===========================
    // RULE 5: Loan Repayment Flow
    // ===========================
    createLoanRepayment(amount, method, receiptImage = null) {
        // Validate remaining loan
        const remaining = this.loan.amount - this.loan.paid;
        if (amount > remaining) {
            return { success: false, error: `Cannot pay more than remaining balance (₦${remaining.toLocaleString()})` };
        }

        // RULE: Wallet payment is instant
        if (method === 'wallet') {
            if (amount > this.wallet) {
                return { success: false, error: 'Insufficient wallet balance' };
            }

            this.wallet -= amount;
            this.loan.paid += amount;

            const transactionId = 'txn_' + Date.now();
            const transaction = {
                id: transactionId,
                type: 'loan_repayment',
                amount: -amount,
                method: 'wallet',
                status: 'successful',
                date: new Date().toISOString().split('T')[0],
                description: `Loan Repayment via Wallet`,
                receiptUrl: false
            };
            this.transactions.unshift(transaction);

            const notification = {
                id: 'notif_' + Date.now(),
                transactionId: transactionId,
                type: 'success',
                title: 'Payment Successful',
                message: `You paid ₦${amount.toLocaleString()} towards your loan`,
                time: 'Just now',
                read: false
            };
            this.notifications.unshift(notification);

            // Check if loan is fully repaid
            if (this.loan.paid >= this.loan.amount) {
                this.loan = { amount: 0, paid: 0 };
                notification.title = 'Loan Completed';
                notification.message = 'Congratulations! You have fully repaid your loan';
            }

            this.saveState();
            return { success: true, message: 'Payment processed successfully' };
        }

        // RULE: Bank transfer requires receipt and admin approval
        if (method === 'bank_transfer') {
            if (!receiptImage) {
                return { success: false, error: 'Receipt is required for bank transfers' };
            }

            const { requestId, transactionId } = this.createAdminRequest('loan_repayment_bank', amount, 'bank_transfer', receiptImage);
            return {
                success: true,
                message: 'Loan repayment submitted for admin review',
                requestId,
                transactionId
            };
        }

        return { success: false, error: 'Invalid payment method' };
    }

    // ===========================
    // Helper Methods
    // ===========================
    getTransactionDescription(type, amount) {
        const descriptions = {
            'wallet_topup_bank': `Wallet Top-up (Bank Transfer) - ₦${amount.toLocaleString()}`,
            'loan_repayment_bank': `Loan Repayment (Bank Transfer) - ₦${amount.toLocaleString()}`,
            'savings_transfer_bank': `Savings Transfer (Bank) - ₦${amount.toLocaleString()}`
        };
        return descriptions[type] || `Transaction - ₦${amount.toLocaleString()}`;
    }

    addNotification(type, title, message) {
        const notification = {
            id: 'notif_' + Date.now(),
            type,
            title,
            message,
            time: 'Just now',
            read: false
        };
        this.notifications.unshift(notification);
        this.saveState();
    }

    markAllNotificationsRead() {
        this.notifications.forEach(n => n.read = true);
        this.saveState();
    }

    updateNotificationBadge(badge) {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        badge.textContent = unreadCount;
        badge.style.display = unreadCount === 0 ? 'none' : 'block';
    }

    updateUser(name, email) {
        this.user.name = name;
        this.user.email = email;
        this.saveState();
    }

    clearNotifications() {
        this.notifications = [];
        this.saveState();
    }

    getLoanRemaining() {
        return this.loan.amount - this.loan.paid;
    }

    getLoanProgress() {
        if (this.loan.amount === 0) return 0;
        return Math.round((this.loan.paid / this.loan.amount) * 100);
    }

    getTransactionStatusClass(status) {
        const classes = {
            'pending': 'badge-warning',
            'successful': 'badge-success',
            'failed': 'badge-danger'
        };
        return classes[status] || 'badge-gray';
    }

    getTransactionStatusLabel(status) {
        const labels = {
            'pending': 'Pending',
            'successful': 'Successful',
            'failed': 'Failed'
        };
        return labels[status] || status;
    }
}

// ===========================
// Enhanced UI Controller v2.0
// ===========================
class UIControllerV2 {
    constructor(appState) {
        this.appState = appState;
        this.currentPage = 'dashboard';
        this.initializeElements();
        this.attachEventListeners();
        this.updateUI();
    }

    initializeElements() {
        // Navigation
        this.navItems = document.querySelectorAll('.nav-item');
        this.pages = document.querySelectorAll('.page');
        this.menuToggle = document.getElementById('menuToggle');
        this.sidebar = document.getElementById('sidebar');
        
        // User profile
        this.userProfile = document.getElementById('userProfile');
        this.profileDropdown = document.getElementById('profileDropdown');
        this.displayUserName = document.getElementById('displayUserName');
        this.userName = document.getElementById('userName');
        this.userAvatar = document.getElementById('userAvatar');
        
        // Notifications
        this.notificationIcon = document.getElementById('notificationIcon');
        this.notificationBadge = document.getElementById('notificationBadge');
        
        // Dashboard elements
        this.walletBalance = document.getElementById('walletBalance');
        this.totalSavings = document.getElementById('totalSavings');
        this.activeLoan = document.getElementById('activeLoan');
        this.remainingLoan = document.getElementById('remainingLoan');
        this.progressFill = document.getElementById('progressFill');
        this.progressPercent = document.getElementById('progressPercent');
        this.recentTransactionsList = document.getElementById('recentTransactionsList');
        
        // Modal elements
        this.modal = document.getElementById('actionModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalSubmit = document.getElementById('modalSubmit');
        this.modalCancel = document.getElementById('modalCancel');
        
        // Buttons
        this.topUpBtn = document.getElementById('topUpBtn');
        this.makePaymentBtn = document.getElementById('makePaymentBtn');
        this.addSavingsBtn = document.getElementById('addSavingsBtn');
        this.logoutBtn = document.getElementById('logoutBtn');
    }

    attachEventListeners() {
        // Navigation
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                this.switchPage(page);
            });
        });

        // Menu toggle
        if (this.menuToggle) {
            this.menuToggle.addEventListener('click', () => {
                this.sidebar.classList.toggle('active');
            });
        }

        // User profile
        if (this.userProfile) {
            this.userProfile.addEventListener('click', () => {
                this.profileDropdown.classList.toggle('active');
            });
        }

        // Logout
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('treasureFortuneLoggedIn');
                localStorage.removeItem('treasureFortuneCurrentUser');
                window.location.href = 'login.html';
            });
        }

        // Action buttons
        if (this.topUpBtn) {
            this.topUpBtn.addEventListener('click', () => this.showTopUpModal());
        }

        if (this.makePaymentBtn) {
            this.makePaymentBtn.addEventListener('click', () => this.showPaymentModal());
        }

        if (this.addSavingsBtn) {
            this.addSavingsBtn.addEventListener('click', () => this.showSavingsModal());
        }

        // Modal controls
        if (this.modalCancel) {
            this.modalCancel.addEventListener('click', () => this.closeModal());
        }

        // Notification icon
        if (this.notificationIcon) {
            this.notificationIcon.addEventListener('click', () => this.switchPage('notifications'));
        }
    }

    switchPage(page) {
        this.pages.forEach(p => p.classList.remove('active'));
        const targetPage = document.getElementById(page + 'Page');
        if (targetPage) {
            targetPage.classList.add('active');
        }
        this.currentPage = page;
    }

    showTopUpModal() {
        const modal = document.getElementById('topUpModal') || this.createTopUpModal();
        modal.style.display = 'flex';
    }

    createTopUpModal() {
        const modal = document.createElement('div');
        modal.id = 'topUpModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Top-up Wallet</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Amount (₦)</label>
                        <input type="number" id="topupAmount" placeholder="Enter amount" min="1">
                    </div>
                    <div class="form-group">
                        <label>Payment Method</label>
                        <select id="topupMethod">
                            <option value="card_payment">Card Payment (Instant)</option>
                            <option value="bank_transfer">Bank Transfer (Requires Receipt)</option>
                        </select>
                    </div>
                    <div id="receiptSection" style="display:none;" class="form-group">
                        <label>Upload Receipt</label>
                        <input type="file" id="topupReceipt" accept="image/*">
                        <small>Receipt is required for bank transfers</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-cancel">Cancel</button>
                    <button class="btn btn-primary" id="topupSubmit">Top-up</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const methodSelect = modal.querySelector('#topupMethod');
        const receiptSection = modal.querySelector('#receiptSection');
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.modal-cancel');
        const submitBtn = modal.querySelector('#topupSubmit');
        
        methodSelect.addEventListener('change', (e) => {
            receiptSection.style.display = e.target.value === 'bank_transfer' ? 'block' : 'none';
        });
        
        closeBtn.addEventListener('click', () => modal.style.display = 'none');
        cancelBtn.addEventListener('click', () => modal.style.display = 'none');
        
        submitBtn.addEventListener('click', () => this.handleTopup(modal));
        
        return modal;
    }

    handleTopup(modal) {
        const amount = parseFloat(modal.querySelector('#topupAmount').value);
        const method = modal.querySelector('#topupMethod').value;
        const receiptInput = modal.querySelector('#topupReceipt');
        
        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        
        if (method === 'bank_transfer' && !receiptInput.files.length) {
            alert('Receipt is required for bank transfers');
            return;
        }
        
        let receiptImage = null;
        if (receiptInput.files.length) {
            const reader = new FileReader();
            reader.onload = (e) => {
                receiptImage = e.target.result;
                const result = this.appState.createWalletTopup(amount, method, receiptImage);
                
                if (result.success) {
                    alert(result.message);
                    modal.style.display = 'none';
                    modal.querySelector('#topupAmount').value = '';
                    this.updateUI();
                } else {
                    alert('Error: ' + result.error);
                }
            };
            reader.readAsDataURL(receiptInput.files[0]);
        } else {
            const result = this.appState.createWalletTopup(amount, method, receiptImage);
            
            if (result.success) {
                alert(result.message);
                modal.style.display = 'none';
                modal.querySelector('#topupAmount').value = '';
                this.updateUI();
            } else {
                alert('Error: ' + result.error);
            }
        }
    }

    showPaymentModal() {
        const remaining = this.appState.getLoanRemaining();
        if (remaining <= 0) {
            alert('You have no active loan');
            return;
        }
        
        const modal = document.getElementById('paymentModal') || this.createPaymentModal();
        modal.style.display = 'flex';
    }

    createPaymentModal() {
        const remaining = this.appState.getLoanRemaining();
        const modal = document.createElement('div');
        modal.id = 'paymentModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Make Payment</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="info-box">
                        <p>Remaining Balance: <strong>₦${remaining.toLocaleString()}</strong></p>
                    </div>
                    <div class="form-group">
                        <label>Amount (₦)</label>
                        <input type="number" id="paymentAmount" placeholder="Enter amount" min="1" max="${remaining}">
                    </div>
                    <div class="form-group">
                        <label>Payment Method</label>
                        <select id="paymentMethod">
                            <option value="wallet">Wallet (Instant)</option>
                            <option value="bank_transfer">Bank Transfer (Requires Receipt)</option>
                        </select>
                    </div>
                    <div id="receiptSection2" style="display:none;" class="form-group">
                        <label>Upload Receipt</label>
                        <input type="file" id="paymentReceipt" accept="image/*">
                        <small>Receipt is required for bank transfers</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-cancel">Cancel</button>
                    <button class="btn btn-primary" id="paymentSubmit">Pay</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const methodSelect = modal.querySelector('#paymentMethod');
        const receiptSection = modal.querySelector('#receiptSection2');
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.modal-cancel');
        const submitBtn = modal.querySelector('#paymentSubmit');
        
        methodSelect.addEventListener('change', (e) => {
            receiptSection.style.display = e.target.value === 'bank_transfer' ? 'block' : 'none';
        });
        
        closeBtn.addEventListener('click', () => modal.style.display = 'none');
        cancelBtn.addEventListener('click', () => modal.style.display = 'none');
        
        submitBtn.addEventListener('click', () => this.handlePayment(modal));
        
        return modal;
    }

    handlePayment(modal) {
        const amount = parseFloat(modal.querySelector('#paymentAmount').value);
        const method = modal.querySelector('#paymentMethod').value;
        const receiptInput = modal.querySelector('#paymentReceipt');
        
        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        
        if (method === 'bank_transfer' && !receiptInput.files.length) {
            alert('Receipt is required for bank transfers');
            return;
        }
        
        let receiptImage = null;
        if (receiptInput.files.length) {
            const reader = new FileReader();
            reader.onload = (e) => {
                receiptImage = e.target.result;
                const result = this.appState.createLoanRepayment(amount, method, receiptImage);
                
                if (result.success) {
                    alert(result.message);
                    modal.style.display = 'none';
                    modal.querySelector('#paymentAmount').value = '';
                    this.updateUI();
                } else {
                    alert('Error: ' + result.error);
                }
            };
            reader.readAsDataURL(receiptInput.files[0]);
        } else {
            const result = this.appState.createLoanRepayment(amount, method, receiptImage);
            
            if (result.success) {
                alert(result.message);
                modal.style.display = 'none';
                modal.querySelector('#paymentAmount').value = '';
                this.updateUI();
            } else {
                alert('Error: ' + result.error);
            }
        }
    }

    showSavingsModal() {
        const modal = document.getElementById('savingsModal') || this.createSavingsModal();
        modal.style.display = 'flex';
    }

    createSavingsModal() {
        const modal = document.createElement('div');
        modal.id = 'savingsModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Transfer to Savings</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="info-box">
                        <p>Available Wallet Balance: <strong>₦${this.appState.wallet.toLocaleString()}</strong></p>
                    </div>
                    <div class="form-group">
                        <label>Amount (₦)</label>
                        <input type="number" id="savingsAmount" placeholder="Enter amount" min="1" max="${this.appState.wallet}">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-cancel">Cancel</button>
                    <button class="btn btn-primary" id="savingsSubmit">Transfer</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.modal-cancel');
        const submitBtn = modal.querySelector('#savingsSubmit');
        
        closeBtn.addEventListener('click', () => modal.style.display = 'none');
        cancelBtn.addEventListener('click', () => modal.style.display = 'none');
        
        submitBtn.addEventListener('click', () => this.handleSavings(modal));
        
        return modal;
    }

    handleSavings(modal) {
        const amount = parseFloat(modal.querySelector('#savingsAmount').value);
        
        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        
        const result = this.appState.createSavingsTransfer(amount);
        
        if (result.success) {
            alert(result.message);
            modal.style.display = 'none';
            modal.querySelector('#savingsAmount').value = '';
            this.updateUI();
        } else {
            alert('Error: ' + result.error);
        }
    }

    closeModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }

    updateUI() {
        this.updateDashboard();
        this.updateTransactionsList();
        this.updateUserProfile();
        this.appState.updateNotificationBadge(this.notificationBadge);
    }

    updateDashboard() {
        if (this.walletBalance) this.walletBalance.textContent = '₦' + this.appState.wallet.toLocaleString();
        if (this.totalSavings) this.totalSavings.textContent = '₦' + this.appState.savings.toLocaleString();
        if (this.activeLoan) this.activeLoan.textContent = '₦' + this.appState.loan.amount.toLocaleString();
        if (this.remainingLoan) this.remainingLoan.textContent = '₦' + this.appState.getLoanRemaining().toLocaleString();
        
        const progress = this.appState.getLoanProgress();
        if (this.progressFill) this.progressFill.style.width = progress + '%';
        if (this.progressPercent) this.progressPercent.textContent = progress + '% Complete';
    }

    updateTransactionsList() {
        if (!this.recentTransactionsList) return;
        
        const recent = this.appState.transactions.slice(0, 5);
        if (recent.length === 0) {
            this.recentTransactionsList.innerHTML = '<div class="empty-state-small">No transactions yet</div>';
            return;
        }
        
        this.recentTransactionsList.innerHTML = recent.map(txn => `
            <div class="transaction-item">
                <div class="transaction-left">
                    <div class="transaction-icon">
                        <i class="fas fa-${this.getTransactionIcon(txn.type)}"></i>
                    </div>
                    <div class="transaction-details">
                        <p class="transaction-description">${txn.description}</p>
                        <p class="transaction-date">${txn.date}</p>
                    </div>
                </div>
                <div class="transaction-right">
                    <p class="transaction-amount">${txn.amount > 0 ? '+' : ''}₦${Math.abs(txn.amount).toLocaleString()}</p>
                    <span class="badge ${this.appState.getTransactionStatusClass(txn.status)}">${this.appState.getTransactionStatusLabel(txn.status)}</span>
                </div>
            </div>
        `).join('');
    }

    updateUserProfile() {
        if (this.displayUserName) this.displayUserName.textContent = this.appState.user.name;
        if (this.userName) this.userName.textContent = this.appState.user.name;
    }

    getTransactionIcon(type) {
        const icons = {
            'savings_transfer': 'piggy-bank',
            'loan_repayment': 'hand-holding-usd',
            'wallet_topup': 'wallet',
            'wallet_topup_bank': 'university'
        };
        return icons[type] || 'exchange-alt';
    }
}

// ===========================
// Initialize Application
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    const appState = new AppStateV2();
    const uiController = new UIControllerV2(appState);
});
