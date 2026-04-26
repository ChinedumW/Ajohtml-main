// ===========================
// Admin Dashboard v2.0
// Request Approval & Receipt Verification
// ===========================

// ===========================
// Admin Authentication Check
// ===========================
const isAdminLoggedIn = localStorage.getItem('treasureFortuneAdminLoggedIn');
if (!isAdminLoggedIn) {
    window.location.href = 'admin-login.html';
}

// ===========================
// Admin State & UI Controller
// ===========================
class AdminDashboard {
    constructor() {
        this.currentFilter = 'all';
        this.currentRequest = null;
        this.initializeElements();
        this.attachEventListeners();
        this.loadAndDisplayRequests();
    }

    initializeElements() {
        // Header buttons
        this.refreshBtn = document.getElementById('refreshBtn');
        this.adminLogoutBtn = document.getElementById('adminLogoutBtn');

        // Summary cards
        this.totalRequests = document.getElementById('totalRequests');
        this.pendingCount = document.getElementById('pendingCount');
        this.approvedCount = document.getElementById('approvedCount');
        this.rejectedCount = document.getElementById('rejectedCount');

        // Filter tabs
        this.filterTabs = document.querySelectorAll('.filter-tab');

        // Table
        this.requestsTableBody = document.getElementById('requestsTableBody');

        // Modal elements
        this.requestModal = document.getElementById('requestModal');
        this.closeRequestModal = document.getElementById('closeRequestModal');
        this.closeRequestBtn = document.getElementById('closeRequestBtn');
        this.requestDetails = document.getElementById('requestDetails');
        this.receiptSection = document.getElementById('receiptSection');
        this.receiptImage = document.getElementById('receiptImage');
        this.approvalSection = document.getElementById('approvalSection');
        this.approveBtn = document.getElementById('approveBtn');
        this.rejectBtn = document.getElementById('rejectBtn');
        this.rejectionReasonGroup = document.getElementById('rejectionReasonGroup');
        this.rejectionReason = document.getElementById('rejectionReason');
    }

    attachEventListeners() {
        // Header buttons
        this.refreshBtn.addEventListener('click', () => this.loadAndDisplayRequests());
        this.adminLogoutBtn.addEventListener('click', () => this.logout());

        // Filter tabs
        this.filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.filterTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentFilter = tab.getAttribute('data-filter');
                this.displayRequests();
            });
        });

        // Modal controls
        this.closeRequestModal.addEventListener('click', () => this.closeModal());
        this.closeRequestBtn.addEventListener('click', () => this.closeModal());

        // Approval buttons
        this.approveBtn.addEventListener('click', () => this.handleApprove());
        this.rejectBtn.addEventListener('click', () => this.showRejectionForm());
    }

    logout() {
        localStorage.removeItem('treasureFortuneAdminLoggedIn');
        window.location.href = 'admin-login.html';
    }

    loadAndDisplayRequests() {
        // Get state from user's localStorage
        const userState = JSON.parse(localStorage.getItem('treasureFortuneStateV2') || '{}');
        this.adminRequests = userState.adminRequests || [];
        this.displayRequests();
        this.updateSummaryCards();
    }

    displayRequests() {
        let filteredRequests = this.adminRequests;

        // Apply filter
        if (this.currentFilter !== 'all') {
            filteredRequests = this.adminRequests.filter(r => r.status === this.currentFilter);
        }

        // Sort by created date (newest first)
        filteredRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Build table rows
        if (filteredRequests.length === 0) {
            this.requestsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>No requests found</p>
                    </td>
                </tr>
            `;
            return;
        }

        this.requestsTableBody.innerHTML = filteredRequests.map(request => `
            <tr class="request-row" onclick="adminDashboard.openRequestModal('${request.id}')">
                <td class="request-id">${request.id.substring(0, 8)}...</td>
                <td>${this.formatRequestType(request.type)}</td>
                <td>₦${request.amount.toLocaleString()}</td>
                <td>${this.formatMethod(request.method)}</td>
                <td>
                    <span class="badge badge-${request.status}">
                        ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                </td>
                <td>${this.formatDate(request.createdAt)}</td>
                <td>
                    <button class="btn btn-small btn-primary" onclick="event.stopPropagation(); adminDashboard.openRequestModal('${request.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `).join('');
    }

    updateSummaryCards() {
        const total = this.adminRequests.length;
        const pending = this.adminRequests.filter(r => r.status === 'pending').length;
        const approved = this.adminRequests.filter(r => r.status === 'approved').length;
        const rejected = this.adminRequests.filter(r => r.status === 'rejected').length;

        this.totalRequests.textContent = total;
        this.pendingCount.textContent = pending;
        this.approvedCount.textContent = approved;
        this.rejectedCount.textContent = rejected;
    }

    openRequestModal(requestId) {
        this.currentRequest = this.adminRequests.find(r => r.id === requestId);
        if (!this.currentRequest) return;

        // Display request details
        this.displayRequestDetails();

        // Show modal
        this.requestModal.classList.add('active');
    }

    displayRequestDetails() {
        const req = this.currentRequest;
        const createdDate = new Date(req.createdAt);

        let detailsHTML = `
            <div class="detail-row">
                <span class="detail-label">Request ID</span>
                <span class="detail-value">${req.id}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Type</span>
                <span class="detail-value">${this.formatRequestType(req.type)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Amount</span>
                <span class="detail-value">₦${req.amount.toLocaleString()}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Payment Method</span>
                <span class="detail-value">${this.formatMethod(req.method)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Status</span>
                <span class="detail-value">
                    <span class="badge badge-${req.status}">
                        ${req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>
                </span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Created</span>
                <span class="detail-value">${createdDate.toLocaleString()}</span>
            </div>
        `;

        // Add review info if already reviewed
        if (req.reviewedAt) {
            const reviewedDate = new Date(req.reviewedAt);
            detailsHTML += `
                <div class="detail-row">
                    <span class="detail-label">Reviewed By</span>
                    <span class="detail-value">${req.reviewedBy}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Reviewed At</span>
                    <span class="detail-value">${reviewedDate.toLocaleString()}</span>
                </div>
            `;
        }

        // Add rejection reason if rejected
        if (req.status === 'rejected' && req.reason) {
            detailsHTML += `
                <div class="detail-row">
                    <span class="detail-label">Rejection Reason</span>
                    <span class="detail-value">${req.reason}</span>
                </div>
            `;
        }

        this.requestDetails.innerHTML = detailsHTML;

        // Show receipt if available
        if (req.receiptImage) {
            this.receiptSection.style.display = 'block';
            this.receiptImage.src = req.receiptImage;
        } else {
            this.receiptSection.style.display = 'none';
        }

        // Show approval section only for pending requests
        if (req.status === 'pending') {
            this.approvalSection.style.display = 'block';
            this.rejectionReasonGroup.style.display = 'none';
        } else {
            this.approvalSection.style.display = 'none';
        }
    }

    handleApprove() {
        if (!this.currentRequest) return;

        // Get the user state
        const userState = JSON.parse(localStorage.getItem('treasureFortuneStateV2') || '{}');
        
        // Import AppStateV2 methods
        const appState = new AppStateV2();
        
        // Approve the request
        const success = appState.approveAdminRequest(this.currentRequest.id, 'Admin');

        if (success) {
            alert('Request approved successfully!');
            this.closeModal();
            this.loadAndDisplayRequests();
        } else {
            alert('Error approving request');
        }
    }

    showRejectionForm() {
        this.rejectionReasonGroup.style.display = 'block';
        this.rejectBtn.style.display = 'none';
        
        // Create a submit button for rejection
        const submitBtn = document.createElement('button');
        submitBtn.className = 'btn btn-danger';
        submitBtn.innerHTML = '<i class="fas fa-times"></i> Confirm Rejection';
        submitBtn.style.marginTop = '10px';
        submitBtn.onclick = () => this.submitRejection();
        this.rejectionReasonGroup.appendChild(submitBtn);
    }

    submitRejection() {
        if (!this.currentRequest) return;

        const reason = this.rejectionReason.value.trim();
        if (!reason) {
            alert('Please provide a rejection reason');
            return;
        }

        // Get the user state
        const userState = JSON.parse(localStorage.getItem('treasureFortuneStateV2') || '{}');
        
        // Import AppStateV2 methods
        const appState = new AppStateV2();
        
        // Reject the request
        const success = appState.rejectAdminRequest(this.currentRequest.id, reason, 'Admin');

        if (success) {
            alert('Request rejected successfully!');
            this.closeModal();
            this.loadAndDisplayRequests();
        } else {
            alert('Error rejecting request');
        }
    }

    closeModal() {
        this.requestModal.classList.remove('active');
        this.currentRequest = null;
        this.rejectionReasonGroup.style.display = 'none';
        this.rejectionReason.value = '';
        this.rejectBtn.style.display = '';
    }

    formatRequestType(type) {
        const types = {
            'wallet_topup_bank': 'Wallet Top-up (Bank)',
            'loan_repayment_bank': 'Loan Repayment (Bank)',
            'savings_transfer_bank': 'Savings Transfer (Bank)'
        };
        return types[type] || type;
    }

    formatMethod(method) {
        const methods = {
            'bank_transfer': 'Bank Transfer',
            'card_payment': 'Card Payment',
            'wallet': 'Wallet'
        };
        return methods[method] || method;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

// ===========================
// Need to copy AppStateV2 class for admin access
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
            this.user = {};
            this.wallet = 0;
            this.savings = 0;
            this.loan = { amount: 0, paid: 0 };
            this.transactions = [];
            this.notifications = [];
            this.adminRequests = [];
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

    approveAdminRequest(requestId, adminName = 'Admin') {
        const request = this.adminRequests.find(r => r.id === requestId);
        if (!request) return false;

        // Update request status
        request.status = 'approved';
        request.reviewedAt = new Date().toISOString();
        request.reviewedBy = adminName;

        // Update transaction status
        const transaction = this.transactions.find(t => t.id === request.transactionId);
        if (transaction) {
            transaction.status = 'successful';
        }

        // Update balances
        if (request.type === 'wallet_topup_bank') {
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
        request.status = 'rejected';
        request.reviewedAt = new Date().toISOString();
        request.reviewedBy = adminName;
        request.reason = reason;

        // Update transaction status
        const transaction = this.transactions.find(t => t.id === request.transactionId);
        if (transaction) {
            transaction.status = 'failed';
        }

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
}

// ===========================
// Initialize Admin Dashboard
// ===========================
let adminDashboard;
document.addEventListener('DOMContentLoaded', () => {
    adminDashboard = new AdminDashboard();
});
