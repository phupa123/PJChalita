(function () {
    function install({ streamManager, UIManager }) {
        if (!streamManager || !UIManager) return;

        let reconnectTimer = null;
        let isReconnecting = false;

        // ฟังก์ชันนี้จะถูกเรียกเมื่อการเชื่อมต่อกับ Peer Server หลุดไป
        streamManager.onPeerDisconnected = function () {
            if (isReconnecting || this.isLeaving) {
                return;
            }

            isReconnecting = true;
            console.warn("Connection to PeerJS server lost. Attempting a full reconnect...");
            UIManager.updateConnectionStatus('connecting', 'การเชื่อมต่อหลุด! กำลังเชื่อมต่อใหม่อัตโนมัติ...');

            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
            }

            reconnectTimer = setTimeout(() => {
                console.log("Executing full reconnect procedure now.");
                this.performFullReconnect();
            }, Math.random() * 2000 + 3000);
        };

        streamManager.onPeerConnected = function () {
            if (isReconnecting) {
                console.log("Reconnect successful!");
                UIManager.updateConnectionStatus('connected', 'เชื่อมต่ออีกครั้งสำเร็จ!');
            }
            isReconnecting = false;
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
        };

        streamManager.onPeerClosed = function () {
            if (this.isLeaving) return;
            console.error("Peer connection was permanently closed. Triggering reconnect logic.");
            this.onPeerDisconnected();
        };

        // Additional fix: handle 'unavailable-id' error by retrying with a new ID
        streamManager.onPeerError = function (err) {
            console.error("PeerJS Error:", err);
            if (err.type === 'unavailable-id') {
                UIManager.updateConnectionStatus('error', 'ID ของคุณกำลังถูกใช้งาน, กำลังลองเชื่อมต่อใหม่อีกครั้ง...');
                setTimeout(() => this.performFullReconnect(), 2000);
                return;
            }
            if (err.type === 'websocket-error' || err.type === 'network' || err.type === 'server-error') {
                this.isLeaving = true;
                UIManager.showTrustLink();
                UIManager.updateConnectionStatus('error', 'เชื่อมต่อเซิร์ฟเวอร์วิดีโอคอลล้มเหลว');
            }
        };
    }

    window.RoomReconnectModule = { install };
})();
