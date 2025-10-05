(function () {
    function install({ streamManager, UIManager, PeerManager, APIHandler }) {
        if (!streamManager || !PeerManager) return;

        const getMyUuid = () => window.appConfig?.MY_USER_INFO?.uuid || null;

        // This function handles the event when the current user gets kicked
        streamManager.handleKickedBy = function (sourceUuid, payload = {}) {
            if (this.isLeaving) return;
            this.isKicking = true; // Use a specific flag
            
            Swal.fire({
                icon: 'error',
                title: 'คุณถูกนำออกจากห้อง',
                text: payload.message || 'คุณถูกนำออกจากห้องโดยผู้ดูแล',
                allowOutsideClick: false,
                confirmButtonText: 'รับทราบ'
            }).then(() => {
                this.leave();
            });
        };

        // This handler listens for incoming data messages from other peers
        const handleKickMessage = (peerId, data) => {
            if (!data || data.type !== 'kick') return;
            const myUuid = getMyUuid();
            const targetUuid = data.targetUuid || null;

            if (myUuid && targetUuid === myUuid) {
                streamManager.handleKickedBy(peerId, data);
            }
        };
        
        // Register the data handler with PeerManager
        if (PeerManager.registerDataHandler) {
             PeerManager.registerDataHandler(handleKickMessage);
        }
    }

    window.RoomKickModule = { install };
})();