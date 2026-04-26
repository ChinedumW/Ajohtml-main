# Admin Approval System Guide

## Overview

This guide explains how the admin approval system works in the financial application and how to integrate the admin dashboard.

## System Components

### 1. AppState Management

The `AppState` class manages all application data including admin requests:

```typescript
class AppState {
    adminRequests: AdminRequest[];
    
    // Add a new admin request
    addAdminRequest(request: AdminRequest): void
    
    // Get all pending requests
    getAdminRequests(): AdminRequest[]
    
    // Update request status and optionally update balances
    updateAdminRequest(
        requestId: number, 
        status: 'Pending' | 'Approved' | 'Rejected', 
        updateBalances: boolean = false
    ): void
}
```

### 2. Admin Request Flow

#### Request Creation
When a user makes a bank transfer request, the system:

```typescript
// 1. Create transaction with pending status
const transaction: Transaction = {
    id: transactionId,
    type: 'topup',
    amount: 50000,
    status: 'pending',  // KEY: Status is pending
    description: 'Top-up',
    method: 'Bank Transfer',
    receipt: base64ImageData
};

// 2. Create notification
const notification: Notification = {
    id: notificationId,
    type: 'pending',
    status: 'Pending',
    title: 'Request Submitted',
    message: 'Your top-up request is pending admin approval'
};

// 3. Create admin request
const adminRequest: AdminRequest = {
    id: requestId,
    type: 'Top-up',
    amount: 50000,
    status: 'Pending',
    receipt: base64ImageData,
    transactionId: transaction.id,
    notificationId: notification.id
};
```

#### Request Approval

When admin approves a request:

```typescript
appState.updateAdminRequest(requestId, 'Approved', true);
// This updates:
// 1. Transaction status → 'successful'
// 2. Admin request status → 'Approved'
// 3. Notification status → 'Approved'
// 4. User balances (because updateBalances = true)
```

When admin rejects a request:

```typescript
appState.updateAdminRequest(requestId, 'Rejected', false);
// This updates:
// 1. Transaction status → 'failed'
// 2. Admin request status → 'Rejected'
// 3. Notification status → 'Rejected'
// 4. User balances NOT updated (because updateBalances = false)
```

## Integrating the Admin Dashboard

### Admin Panel Display

```typescript
// Get pending requests
const pendingRequests = appState.getAdminRequests()
    .filter(r => r.status === 'Pending');

// Display in dashboard
pendingRequests.forEach(request => {
    // Create admin UI with:
    // - User name and email
    // - Request type (Top-up, Loan Repayment, Savings)
    // - Amount
    // - Receipt image (if available)
    // - Approve/Reject buttons
});
```

### Approve Request Handler

```typescript
function approveAdminRequest(requestId: number) {
    // Update request status to Approved
    // This automatically updates transaction and notification
    appState.updateAdminRequest(requestId, 'Approved', true);
    
    // Refresh admin dashboard UI
    loadPendingRequests();
}
```

### Reject Request Handler

```typescript
function rejectAdminRequest(requestId: number) {
    // Update request status to Rejected
    // This does NOT update balances
    appState.updateAdminRequest(requestId, 'Rejected', false);
    
    // Refresh admin dashboard UI
    loadPendingRequests();
}
```

## Request Types

### 1. Top-up Request
```typescript
{
    type: 'Top-up',
    amount: number,        // Amount to add to wallet
    status: 'Pending' | 'Approved' | 'Rejected'
}

// On Approval: wallet += amount
// On Rejection: wallet unchanged
```

### 2. Loan Repayment Request
```typescript
{
    type: 'Loan Repayment',
    amount: number,        // Amount to pay toward loan
    status: 'Pending' | 'Approved' | 'Rejected'
}

// On Approval: loan.paid += amount
// On Rejection: loan.paid unchanged
```

### 3. Savings Request
```typescript
{
    type: 'Savings',
    amount: number,        // Amount to move from wallet to savings
    status: 'Pending' | 'Approved' | 'Rejected'
}

// On Approval: wallet -= amount, savings += amount
// On Rejection: wallet and savings unchanged
```

## Data References

### Linking Records

Each admin request links three records together:

```typescript
adminRequest {
    id: 12345,
    transactionId: 67890,      // Reference to transaction
    notificationId: 11111      // Reference to notification
}

// Find the linked transaction
const transaction = appState.transactions.find(t => t.id === adminRequest.transactionId);

// Find the linked notification
const notification = appState.notifications.find(n => n.id === adminRequest.notificationId);
```

## Status Flow

```
Creation:
  Transaction: 'pending'
  Admin Request: 'Pending'
  Notification: 'pending'

Approval Path:
  Transaction: 'pending' → 'successful'
  Admin Request: 'Pending' → 'Approved'
  Notification: 'pending' → 'success' (title/message updated)
  Balances: Updated

Rejection Path:
  Transaction: 'pending' → 'failed'
  Admin Request: 'Pending' → 'Rejected'
  Notification: 'pending' → 'error' (title/message updated)
  Balances: NOT updated
```

## Receipt Handling

Receipts are stored as base64 in the admin request:

```typescript
// Receipt is available at:
adminRequest.receipt // Base64 encoded image data

// Display in admin panel:
const img = document.createElement('img');
img.src = adminRequest.receipt; // Base64 data URL
img.style.maxWidth = '300px';
adminPanel.appendChild(img);
```

## Sample Admin Dashboard Logic

```typescript
function loadPendingRequests() {
    const pending = appState.getAdminRequests()
        .filter(r => r.status === 'Pending');
    
    const html = pending.map(req => `
        <div class="admin-request">
            <h3>${req.userName}</h3>
            <p>Email: ${req.userEmail}</p>
            <p>Type: ${req.type}</p>
            <p>Amount: ₦${req.amount.toLocaleString()}</p>
            ${req.receipt ? `<img src="${req.receipt}" style="max-width: 300px;">` : ''}
            <button onclick="approveRequest(${req.id})">Approve</button>
            <button onclick="rejectRequest(${req.id})">Reject</button>
        </div>
    `).join('');
    
    document.getElementById('adminPanel').innerHTML = html;
}

function approveRequest(requestId: number) {
    appState.updateAdminRequest(requestId, 'Approved', true);
    loadPendingRequests();
}

function rejectRequest(requestId: number) {
    appState.updateAdminRequest(requestId, 'Rejected', false);
    loadPendingRequests();
}
```

## Common Use Cases

### Check if request is pending
```typescript
const isPending = adminRequest.status === 'Pending';
```

### Check if user has pending requests
```typescript
const userHasPending = appState.getAdminRequests()
    .some(r => r.status === 'Pending');
```

### Get approval status for transaction
```typescript
const transaction = appState.transactions.find(t => t.id === transactionId);
const adminRequest = appState.adminRequests.find(r => r.transactionId === transactionId);

if (transaction?.status === 'pending') {
    console.log('Request still pending, status:', adminRequest?.status);
}
```

### Display pending approval count
```typescript
const pendingCount = appState.getAdminRequests()
    .filter(r => r.status === 'Pending').length;

document.getElementById('pendingBadge').textContent = pendingCount;
```

## Error Handling

### Request Not Found
```typescript
const request = appState.adminRequests.find(r => r.id === requestId);
if (!request) {
    console.error('Admin request not found');
    return;
}
```

### Balance Verification
```typescript
// Verify balance exists before approval
if (request.type === 'Top-up') {
    const newBalance = appState.wallet + request.amount;
    console.log(`New wallet balance after approval: ₦${newBalance}`);
}
```

## Testing the System

### Test 1: Create Top-up Request
1. User opens Top-up modal
2. Enters amount and uploads receipt
3. Confirms payment
4. Check: Transaction status = 'pending', Admin Request status = 'Pending'

### Test 2: Admin Approves
1. Admin opens admin dashboard
2. Views pending request
3. Clicks "Approve"
4. Check: Transaction status = 'successful', Wallet updated, Notification updated

### Test 3: Admin Rejects
1. Admin opens admin dashboard
2. Views pending request
3. Clicks "Reject"
4. Check: Transaction status = 'failed', Wallet NOT updated, Notification shows rejection

## Key Points

✅ Transactions are created with pending status
✅ Admin requests track all three types of transfers
✅ Notifications are linked to requests
✅ Balances only update on approval
✅ All three records are kept in sync
✅ Receipt data is preserved
✅ Timestamps track when requests were processed
✅ Proper error handling throughout
