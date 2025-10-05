document.addEventListener('DOMContentLoaded', function() {
    loadMailboxBadge();
});

function openMailbox() {
    const modal = new bootstrap.Modal(document.getElementById('mailboxModal'));
    modal.show();
    loadMailboxMessages();
}

async function loadMailboxBadge() {
    try {
        const response = await fetch('api/mailbox-api.php?action=get_unread_count');
        const data = await response.json();
        if (data.success && data.unread > 0) {
            document.getElementById('mailboxBadge').textContent = data.unread;
            document.getElementById('mailboxBadge').style.display = 'block';
        } else {
            document.getElementById('mailboxBadge').style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading mailbox badge:', error);
    }
}

async function loadMailboxMessages() {
    const content = document.getElementById('mailboxContent');
    content.innerHTML = '<div class="text-center text-muted">กำลังโหลดข้อความ...</div>';

    try {
        const response = await fetch('api/mailbox-api.php?action=get_messages');
        const data = await response.json();

        if (data.success) {
            if (data.messages.length === 0) {
                content.innerHTML = '<div class="text-center text-muted">ไม่มีข้อความใหม่</div>';
            } else {
                content.innerHTML = data.messages.map(msg => `
                    <div class="card mb-2 ${msg.is_read ? '' : 'border-primary'}">
                        <div class="card-body">
                            <h6 class="card-title">${msg.title}</h6>
                            <p class="card-text small text-muted">${msg.message}</p>
                            <small class="text-muted">${new Date(msg.created_at).toLocaleString('th-TH')}</small>
                            ${!msg.is_read ? '<button class="btn btn-sm btn-outline-primary ms-2" onclick="markAsRead(' + msg.id + ')">อ่านแล้ว</button>' : ''}
                        </div>
                    </div>
                `).join('');
            }
        } else {
            content.innerHTML = '<div class="text-center text-danger">เกิดข้อผิดพลาดในการโหลดข้อความ</div>';
        }
    } catch (error) {
        content.innerHTML = '<div class="text-center text-danger">เกิดข้อผิดพลาดในการโหลดข้อความ</div>';
    }
}

async function markAsRead(messageId) {
    try {
        const response = await fetch('api/mailbox-api.php?action=mark_read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message_id: messageId })
        });
        const data = await response.json();
        if (data.success) {
            loadMailboxMessages();
            loadMailboxBadge();
        }
    } catch (error) {
        console.error('Error marking message as read:', error);
    }
}
