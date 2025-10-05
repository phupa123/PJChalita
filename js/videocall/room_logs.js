(function () {
    const LOG_LEVELS = { INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR' };
    const originalConsole = {
        log: console.log.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console)
    };
    
    async function sendLogToServer(entry) {
        try {
            await fetch('api/logs-api.php?action=log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ room: window.appConfig.ROOM_ID, entry: entry })
            });
        } catch (error) {
            originalConsole.error("Failed to send log to server:", error);
        }
    }

    function captureConsole() {
        const createLogEntry = (level, args) => {
            const message = args.map(arg => {
                try {
                    if (arg instanceof Error) return arg.stack || arg.message;
                    if (typeof arg === 'object' && arg !== null) return JSON.stringify(arg);
                    return String(arg);
                } catch (e) { return 'Unserializable Object'; }
            }).join(' ');

            const entry = {
                timestamp: Date.now(),
                level: level,
                message: message,
                user: window.appConfig.MY_USER_INFO.nickname,
                room: window.appConfig.ROOM_ID
            };
            
            sendLogToServer(entry);
            return entry;
        };

        console.log = function(...args) { createLogEntry(LOG_LEVELS.INFO, args); originalConsole.log.apply(console, args); };
        console.warn = function(...args) { createLogEntry(LOG_LEVELS.WARN, args); originalConsole.warn.apply(console, args); };
        console.error = function(...args) { createLogEntry(LOG_LEVELS.ERROR, args); originalConsole.error.apply(console, args); };
    }

    function buildLogsHtml(logs) {
        if (logs.length === 0) return '<p class="text-center p-3">ยังไม่มีข้อมูล Log</p>';
        const formatTimestamp = ts => new Date(ts).toLocaleString('th-TH');
        return logs.map(log => `
            <div class="log-entry log-level-${log.level.toLowerCase()}">
                <span class="log-timestamp">[${formatTimestamp(log.timestamp)}]</span>
                <span class="log-user">[${log.user}]</span>
                <span class="log-level">[${log.level}]</span>
                <span class="log-message">${log.message}</span>
            </div>
        `).join('');
    }

    async function showLogsModal() {
        const modalBody = document.getElementById('logs-modal-body');
        if (!modalBody) return;
        
        modalBody.innerHTML = '<div class="text-center p-3">กำลังโหลด Logs...</div>';
        const logsModal = new bootstrap.Modal(document.getElementById('logsModal'));
        logsModal.show();

        try {
            const response = await fetch(`api/logs-api.php?action=get_logs&room=${window.appConfig.ROOM_ID}`);
            const data = await response.json();
            if (data.status === 'success') modalBody.innerHTML = buildLogsHtml(data.logs);
            else throw new Error(data.message);
        } catch (error) {
            modalBody.innerHTML = `<div class="text-center text-danger p-3">เกิดข้อผิดพลาด: ${error.message}</div>`;
        }
    }

    async function clearLogs() {
        const result = await Swal.fire({
            title: 'คุณแน่ใจหรือไม่?',
            text: "คุณกำลังจะลบไฟล์ Logs ทั้งหมดของห้องนี้อย่างถาวร!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33', cancelButtonText: 'ยกเลิก', confirmButtonText: 'ใช่, ลบเลย!'
        });

        if (result.isConfirmed) {
            try {
                const formData = new FormData();
                formData.append('action', 'clear_logs');
                formData.append('room', window.appConfig.ROOM_ID);
                const response = await fetch('api/logs-api.php', { method: 'POST', body: formData });
                const data = await response.json();
                if (data.status === 'success') {
                    Swal.fire('สำเร็จ!', 'ลบ Logs เรียบร้อยแล้ว', 'success');
                    showLogsModal();
                } else throw new Error(data.message);
            } catch (error) {
                Swal.fire('ผิดพลาด!', `ไม่สามารถลบ Logs ได้: ${error.message}`, 'error');
            }
        }
    }

    function install({ streamManager }) {
        if (!streamManager) return;
        if(window.appConfig.MY_USER_INFO.rank === 'Owner') {
            captureConsole();
            streamManager.showLogs = showLogsModal;
            const clearBtn = document.getElementById('clear-logs-btn');
            if (clearBtn) clearBtn.addEventListener('click', clearLogs);
        }
    }

    window.RoomLogsModule = { install };
})();