# Extension Examples - Building on TypeScript Foundation

This document provides practical examples of how to extend the TypeScript financial system for real-world requirements.

## 1. Building an Admin Dashboard Page

### Complete Admin Dashboard TypeScript Module

```typescript
// File: ts/admin-dashboard.ts

interface AdminDashboardStats {
    totalPending: number;
    totalApproved: number;
    totalRejected: number;
    totalAmount: number;
    approvalRate: number;
}

class AdminDashboard {
    appState: AppState;
    stats: AdminDashboardStats;

    constructor(appState: AppState) {
        this.appState = appState;
        this.stats = this.calculateStats();
        this.initializeDashboard();
    }

    calculateStats(): AdminDashboardStats {
        const requests = this.appState.getAdminRequests();
        
        return {
            totalPending: requests.filter(r => r.status === 'Pending').length,
            totalApproved: requests.filter(r => r.status === 'Approved').length,
            totalRejected: requests.filter(r => r.status === 'Rejected').length,
            totalAmount: requests.reduce((sum, r) => sum + r.amount, 0),
            approvalRate: this.calculateApprovalRate(requests)
        };
    }

    calculateApprovalRate(requests: AdminRequest[]): number {
        const completed = requests.filter(r => r.status !== 'Pending');
        if (completed.length === 0) return 0;
        const approved = requests.filter(r => r.status === 'Approved');
        return Math.round((approved.length / completed.length) * 100);
    }

    initializeDashboard(): void {
        this.renderStats();
        this.renderPendingRequests();
        this.renderRequestHistory();
        this.attachEventListeners();
    }

    renderStats(): void {
        const statsContainer = document.getElementById('adminStats') as HTMLElement;
        statsContainer.innerHTML = `
            <div class="stat-card">
                <h3>Pending Requests</h3>
                <p class="stat-number">${this.stats.totalPending}</p>
            </div>
            <div class="stat-card">
                <h3>Approved</h3>
                <p class="stat-number">${this.stats.totalApproved}</p>
            </div>
            <div class="stat-card">
                <h3>Rejected</h3>
                <p class="stat-number">${this.stats.totalRejected}</p>
            </div>
            <div class="stat-card">
                <h3>Approval Rate</h3>
                <p class="stat-number">${this.stats.approvalRate}%</p>
            </div>
        `;
    }

    renderPendingRequests(): void {
        const pending = this.appState.getAdminRequests()
            .filter(r => r.status === 'Pending')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const container = document.getElementById('pendingRequestsList') as HTMLElement;
        
        if (pending.length === 0) {
            container.innerHTML = '<p>No pending requests</p>';
            return;
        }

        container.innerHTML = pending.map(req => this.createRequestElement(req)).join('');
    }

    renderRequestHistory(): void {
        const history = this.appState.getAdminRequests()
            .filter(r => r.status !== 'Pending')
            .sort((a, b) => {
                const aDate = new Date(b.processedAt || b.date);
                const bDate = new Date(a.processedAt || a.date);
                return aDate.getTime() - bDate.getTime();
            });

        const container = document.getElementById('requestHistory') as HTMLElement;
        
        if (history.length === 0) {
            container.innerHTML = '<p>No request history</p>';
            return;
        }

        container.innerHTML = history.map(req => this.createHistoryElement(req)).join('');
    }

    createRequestElement(req: AdminRequest): string {
        return `
            <div class="request-card pending">
                <div class="request-header">
                    <h4>${req.userName}</h4>
                    <span class="request-type">${req.type}</span>
                </div>
                <p><strong>Email:</strong> ${req.userEmail}</p>
                <p><strong>Amount:</strong> ₦${req.amount.toLocaleString()}</p>
                <p><strong>Method:</strong> ${req.method}</p>
                ${req.receipt ? `
                    <div class="receipt-preview">
                        <img src="${req.receipt}" alt="Receipt" style="max-width: 200px;">
                    </div>
                ` : ''}
                <div class="request-actions">
                    <button class="btn-approve" onclick="adminDashboard.approveRequest(${req.id})">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn-reject" onclick="adminDashboard.rejectRequest(${req.id})">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            </div>
        `;
    }

    createHistoryElement(req: AdminRequest): string {
        const isApproved = req.status === 'Approved';
        const statusClass = isApproved ? 'approved' : 'rejected';
        const statusText = req.status;

        return `
            <div class="history-item ${statusClass}">
                <div class="history-info">
                    <h4>${req.userName}</h4>
                    <p>${req.type} - ₦${req.amount.toLocaleString()}</p>
                    <small>${new Date(req.date).toLocaleString()}</small>
                </div>
                <div class="history-status">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
            </div>
        `;
    }

    approveRequest(requestId: number): void {
        const confirmed = confirm('Are you sure you want to approve this request?');
        if (!confirmed) return;

        this.appState.updateAdminRequest(requestId, 'Approved', true);
        this.stats = this.calculateStats();
        this.renderStats();
        this.renderPendingRequests();
        this.renderRequestHistory();
        
        this.showNotification('success', 'Request Approved', 'The request has been approved and balances updated.');
    }

    rejectRequest(requestId: number): void {
        const reason = prompt('Enter reason for rejection:');
        if (!reason) return;

        this.appState.updateAdminRequest(requestId, 'Rejected', false);
        this.stats = this.calculateStats();
        this.renderStats();
        this.renderPendingRequests();
        this.renderRequestHistory();
        
        this.showNotification('info', 'Request Rejected', `Rejection reason: ${reason}`);
    }

    attachEventListeners(): void {
        // Auto-refresh every 30 seconds
        setInterval(() => {
            this.stats = this.calculateStats();
            this.renderStats();
            this.renderPendingRequests();
        }, 30000);
    }

    showNotification(type: string, title: string, message: string): void {
        console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    }
}

// Initialize admin dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    const appState = new AppState();
    const adminDashboard = new AdminDashboard(appState);
    (window as any).adminDashboard = adminDashboard;
});
```

## 2. Adding Email Notifications

### Email Service Extension

```typescript
// File: ts/email-service.ts

interface EmailTemplate {
    subject: string;
    body: string;
    html: string;
}

class EmailService {
    apiEndpoint = '/api/send-email'; // Your backend endpoint

    async sendRequestSubmittedEmail(request: AdminRequest, userEmail: string): Promise<void> {
        const template = this.getRequestSubmittedTemplate(request);
        await this.sendEmail(userEmail, template);
    }

    async sendApprovalEmail(request: AdminRequest, userEmail: string): Promise<void> {
        const template = this.getApprovalTemplate(request);
        await this.sendEmail(userEmail, template);
    }

    async sendRejectionEmail(request: AdminRequest, userEmail: string, reason: string): Promise<void> {
        const template = this.getRejectionTemplate(request, reason);
        await this.sendEmail(userEmail, template);
    }

    async sendAdminNotificationEmail(request: AdminRequest, adminEmail: string): Promise<void> {
        const template = this.getAdminNotificationTemplate(request);
        await this.sendEmail(adminEmail, template);
    }

    private getRequestSubmittedTemplate(request: AdminRequest): EmailTemplate {
        return {
            subject: `${request.type} Request Submitted - Awaiting Approval`,
            body: `Your ${request.type.toLowerCase()} request of ₦${request.amount.toLocaleString()} has been submitted and is pending admin approval.`,
            html: `
                <h2>${request.type} Request Submitted</h2>
                <p>Your ${request.type.toLowerCase()} request has been submitted successfully.</p>
                <ul>
                    <li><strong>Amount:</strong> ₦${request.amount.toLocaleString()}</li>
                    <li><strong>Status:</strong> Pending Admin Approval</li>
                    <li><strong>Submitted:</strong> ${new Date(request.date).toLocaleString()}</li>
                </ul>
                <p>You will receive a notification once your request has been reviewed.</p>
            `
        };
    }

    private getApprovalTemplate(request: AdminRequest): EmailTemplate {
        return {
            subject: `${request.type} Request Approved!`,
            body: `Your ${request.type.toLowerCase()} request of ₦${request.amount.toLocaleString()} has been approved.`,
            html: `
                <h2>${request.type} Request Approved!</h2>
                <p>Great news! Your ${request.type.toLowerCase()} request has been approved.</p>
                <ul>
                    <li><strong>Amount:</strong> ₦${request.amount.toLocaleString()}</li>
                    <li><strong>Status:</strong> Approved</li>
                    <li><strong>Approved:</strong> ${new Date().toLocaleString()}</li>
                </ul>
                <p>Your account has been updated. Log in to see your updated balances.</p>
            `
        };
    }

    private getRejectionTemplate(request: AdminRequest, reason: string): EmailTemplate {
        return {
            subject: `${request.type} Request Status Update`,
            body: `Your ${request.type.toLowerCase()} request could not be processed.`,
            html: `
                <h2>${request.type} Request Update</h2>
                <p>We regret to inform you that your ${request.type.toLowerCase()} request could not be approved.</p>
                <ul>
                    <li><strong>Amount:</strong> ₦${request.amount.toLocaleString()}</li>
                    <li><strong>Status:</strong> Rejected</li>
                    <li><strong>Reason:</strong> ${reason}</li>
                </ul>
                <p>Please contact support for more information.</p>
            `
        };
    }

    private getAdminNotificationTemplate(request: AdminRequest): EmailTemplate {
        return {
            subject: `New ${request.type} Request Pending Review`,
            body: `A new ${request.type.toLowerCase()} request requires admin review.`,
            html: `
                <h2>New Admin Request</h2>
                <p>A new request requires your review:</p>
                <ul>
                    <li><strong>Type:</strong> ${request.type}</li>
                    <li><strong>User:</strong> ${request.userName} (${request.userEmail})</li>
                    <li><strong>Amount:</strong> ₦${request.amount.toLocaleString()}</li>
                    <li><strong>Method:</strong> ${request.method}</li>
                    <li><strong>Submitted:</strong> ${new Date(request.date).toLocaleString()}</li>
                </ul>
                <p><a href="/admin-dashboard">Review Request</a></p>
            `
        };
    }

    private async sendEmail(to: string, template: EmailTemplate): Promise<void> {
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to,
                    subject: template.subject,
                    body: template.body,
                    html: template.html
                })
            });

            if (!response.ok) {
                console.error('[EmailService] Failed to send email');
            }
        } catch (error) {
            console.error('[EmailService] Email service error:', error);
        }
    }
}
```

## 3. Adding Audit Logging

### Audit Log Extension

```typescript
// File: ts/audit-log.ts

interface AuditLog {
    id: number;
    timestamp: string;
    action: string;
    userId: string;
    adminId?: string;
    requestId: number;
    changes: Record<string, any>;
    status: string;
}

class AuditLogger {
    logs: AuditLog[] = [];

    logRequestCreated(request: AdminRequest, userId: string): void {
        this.logs.push({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            action: 'REQUEST_CREATED',
            userId,
            requestId: request.id,
            changes: {
                type: request.type,
                amount: request.amount,
                method: request.method
            },
            status: request.status
        });
        this.save();
    }

    logRequestApproved(request: AdminRequest, adminId: string, balanceChanges: any): void {
        this.logs.push({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            action: 'REQUEST_APPROVED',
            userId: request.userEmail,
            adminId,
            requestId: request.id,
            changes: balanceChanges,
            status: 'Approved'
        });
        this.save();
    }

    logRequestRejected(request: AdminRequest, adminId: string, reason: string): void {
        this.logs.push({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            action: 'REQUEST_REJECTED',
            userId: request.userEmail,
            adminId,
            requestId: request.id,
            changes: { reason },
            status: 'Rejected'
        });
        this.save();
    }

    getAuditTrail(requestId: number): AuditLog[] {
        return this.logs.filter(log => log.requestId === requestId);
    }

    save(): void {
        localStorage.setItem('auditLogs', JSON.stringify(this.logs));
    }

    load(): void {
        const saved = localStorage.getItem('auditLogs');
        if (saved) {
            this.logs = JSON.parse(saved);
        }
    }
}
```

## 4. Enhanced Error Handling

### Error Handler Service

```typescript
// File: ts/error-handler.ts

class ErrorHandler {
    static validateAdminRequest(request: AdminRequest): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!request.userName || request.userName.trim() === '') {
            errors.push('User name is required');
        }

        if (!request.userEmail || !this.isValidEmail(request.userEmail)) {
            errors.push('Valid email is required');
        }

        if (!request.type || !['Top-up', 'Loan Repayment', 'Savings'].includes(request.type)) {
            errors.push('Invalid request type');
        }

        if (request.amount <= 0) {
            errors.push('Amount must be greater than zero');
        }

        if (request.amount > 10000000) {
            errors.push('Amount exceeds maximum limit of ₦10,000,000');
        }

        if (request.method === 'Bank Transfer' && !request.receipt) {
            errors.push('Receipt is required for bank transfers');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    static validatePaymentAmount(amount: number, type: string, currentBalance: number): { valid: boolean; message?: string } {
        if (amount <= 0) {
            return { valid: false, message: 'Amount must be positive' };
        }

        if (amount > 50000000) {
            return { valid: false, message: 'Amount exceeds maximum limit' };
        }

        if (type === 'Savings' && amount > currentBalance) {
            return { valid: false, message: 'Insufficient wallet balance' };
        }

        return { valid: true };
    }

    static handleError(error: any, context: string): void {
        console.error(`[Error in ${context}]`, error);
        // Send to error tracking service (Sentry, etc.)
    }

    private static isValidEmail(email: string): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
}
```

## 5. Testing Examples

### Unit Tests (Using Jest)

```typescript
// File: ts/__tests__/admin-request.test.ts

describe('AdminRequest Flow', () => {
    let appState: AppState;

    beforeEach(() => {
        appState = new AppState();
    });

    test('should create pending transaction on request submission', () => {
        const request: AdminRequest = {
            id: 1,
            userName: 'Test User',
            userEmail: 'test@example.com',
            type: 'Top-up',
            amount: 50000,
            method: 'Bank Transfer',
            status: 'Pending',
            date: new Date().toISOString()
        };

        appState.addAdminRequest(request);
        const requests = appState.getAdminRequests();

        expect(requests).toHaveLength(1);
        expect(requests[0].status).toBe('Pending');
    });

    test('should update balances on approval', () => {
        const initialWallet = appState.wallet;
        const request: AdminRequest = {
            id: 1,
            userName: 'Test User',
            userEmail: 'test@example.com',
            type: 'Top-up',
            amount: 50000,
            method: 'Bank Transfer',
            status: 'Pending',
            date: new Date().toISOString()
        };

        appState.addAdminRequest(request);
        appState.updateAdminRequest(request.id, 'Approved', true);

        expect(appState.wallet).toBe(initialWallet + 50000);
    });

    test('should not update balances on rejection', () => {
        const initialWallet = appState.wallet;
        const request: AdminRequest = {
            id: 1,
            userName: 'Test User',
            userEmail: 'test@example.com',
            type: 'Top-up',
            amount: 50000,
            method: 'Bank Transfer',
            status: 'Pending',
            date: new Date().toISOString()
        };

        appState.addAdminRequest(request);
        appState.updateAdminRequest(request.id, 'Rejected', false);

        expect(appState.wallet).toBe(initialWallet);
    });
});
```

## 6. Adding Real-time Updates with WebSockets

### WebSocket Service

```typescript
// File: ts/websocket-service.ts

class WebSocketService {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    connect(url: string): void {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('[WebSocket] Connected');
            this.reconnectAttempts = 0;
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
        };

        this.ws.onerror = () => {
            console.error('[WebSocket] Error occurred');
        };

        this.ws.onclose = () => {
            this.attemptReconnect(url);
        };
    }

    private handleMessage(message: any): void {
        if (message.type === 'REQUEST_APPROVED') {
            console.log('[WebSocket] Request approved:', message.requestId);
            // Trigger UI update
        } else if (message.type === 'REQUEST_REJECTED') {
            console.log('[WebSocket] Request rejected:', message.requestId);
            // Trigger UI update
        }
    }

    private attemptReconnect(url: string): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.pow(2, this.reconnectAttempts) * 1000;
            console.log(`[WebSocket] Reconnecting in ${delay}ms...`);
            setTimeout(() => this.connect(url), delay);
        }
    }

    send(message: any): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
```

These examples demonstrate how to extend the TypeScript financial system with real-world features like admin dashboards, email notifications, audit logging, error handling, and real-time updates.
