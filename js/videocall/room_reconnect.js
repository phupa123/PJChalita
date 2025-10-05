(function () {
    function install({ streamManager, UIManager }) {
        if (!streamManager || !UIManager) return;

        let reconnectTimer = null;
        let isReconnecting = false;

        // ฟังก์ชันนี้จะถูกเรียกเมื่อการเชื่อมต่อกับ Peer Server หลุดไป
        streamManager.onPeerDisconnected = function () {
            // ถ้ากำลังพยายามเชื่อมต่อใหม่อยู่แล้ว หรือผู้ใช้ตั้งใจกดออกจากห้อง ก็ไม่ต้องทำอะไร
            if (isReconnecting || this.isLeaving) {
                return;
            }

            isReconnecting = true;
            console.warn("Connection to PeerJS server lost. Attempting a full reconnect...");
            UIManager.updateConnectionStatus('connecting', 'การเชื่อมต่อหลุด! กำลังเชื่อมต่อใหม่อัตโนมัติ...');

            // ยกเลิก timer เก่า (ถ้ามี) เพื่อป้องกันการทำงานซ้อน
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
            }

            // หน่วงเวลา 3-5 วินาทีก่อนเริ่มกระบวนการเชื่อมต่อใหม่ทั้งหมด
            reconnectTimer = setTimeout(() => {
                console.log("Executing full reconnect procedure now.");
                this.performFullReconnect();
            }, Math.random() * 2000 + 3000); // สุ่มเวลาเล็กน้อยเพื่อลดโอกาสชนกัน
        };
        
        // ฟังก์ชันนี้จะถูกเรียกเมื่อการเชื่อมต่อกลับมาสำเร็จ
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

        // เมื่อ Peer object ถูกทำลายไปเลย ให้ใช้ Logic เดียวกับการเชื่อมต่อหลุด
        streamManager.onPeerClosed = function () {
            if (this.isLeaving) return; // ไม่ต้องทำอะไรถ้าผู้ใช้ตั้งใจออก
            console.error("Peer connection was permanently closed. Triggering reconnect logic.");
            this.onPeerDisconnected();
        };

    }

    window.RoomReconnectModule = { install };
})();