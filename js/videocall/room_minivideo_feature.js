(function () {
    let miniVideoContainer = null;
    let showMiniVideoButton = null;
    let isDragging = false;
    let offsetX, offsetY;
    let longPressTimer = null;

    // --- ฟังก์ชันสำหรับอัปเดตสถานะไอคอนใน Mini Video ---
    function updateMiniVideoStatus(status) {
        if (!miniVideoContainer) return;
        const micIcon = miniVideoContainer.querySelector('.icon-mic-muted');
        const camIcon = miniVideoContainer.querySelector('.icon-cam-off');

        if (micIcon) {
            micIcon.style.display = status.isAudioEnabled === false ? 'inline-block' : 'none';
        }
        if (camIcon) {
            camIcon.style.display = status.isVideoEnabled === false ? 'inline-block' : 'none';
        }
    }

    // --- ฟังก์ชันหลักสำหรับติดตั้งโมดูล ---
    function install({ streamManager }) {
        if (!streamManager) {
            console.error("Mini Video Module installation failed: Missing streamManager.");
            return;
        }

        // Event Listener สำหรับการเปลี่ยนแปลงโหมดเต็มจอ
        document.addEventListener('fullscreenchange', () => {
            console.log('Fullscreen change detected:', document.fullscreenElement ? 'entered' : 'exited');
            if (document.fullscreenElement) {
                // เมื่อเข้าโหมดเต็มจอ
                console.log('Setting up mini video...');
                setupMiniVideo(streamManager);
            } else {
                // เมื่อออกจากโหมดเต็มจอ
                console.log('Destroying mini video...');
                destroyMiniVideo();
            }
        });

        // ทำให้ Module สามารถรับการอัปเดตจากภายนอกได้ (สำคัญมาก)
        window.RoomMiniVideoFeatureModule = {
            install,
            updateStatusIfActive: (uuid, status) => {
                // อัปเดตสถานะไอคอนของ Mini Video เฉพาะเมื่อเป็นสถานะของตัวเราเอง
                if (miniVideoContainer && uuid === window.appConfig.MY_USER_INFO.uuid) {
                    updateMiniVideoStatus(status);
                }
            }
        };
    }

    // --- ฟังก์ชันสร้าง Mini Video ---
    function setupMiniVideo(streamManager) {
        destroyMiniVideo(); // ทำลายของเก่า (ถ้ามี) ก่อน

        const myStream = streamManager.getMyVideoStream();
        const myStatus = streamManager.getCurrentStatus();

        if (!myStream) return; // ถ้าไม่มีสตรีมของตัวเอง ก็ไม่ต้องสร้าง

        // สร้าง Element ของ Mini Video
        miniVideoContainer = document.createElement('div');
        miniVideoContainer.id = 'mini-video-container';
        miniVideoContainer.innerHTML = `
            <video id="mini-video" autoplay playsinline muted></video>
            <div class="mini-video-overlay">
                <div class="status-icons">
                    <i class="bi bi-mic-mute-fill icon-mic-muted" style="display:none;"></i>
                    <i class="bi bi-camera-video-off-fill icon-cam-off" style="display:none;"></i>
                </div>
                <span class="mini-video-name">คุณ (Me)</span>
            </div>
        `;
        document.body.appendChild(miniVideoContainer);

        const videoElement = miniVideoContainer.querySelector('#mini-video');
        videoElement.srcObject = myStream;

        // อัปเดตสถานะไอคอนเริ่มต้น
        if (myStatus) {
            updateMiniVideoStatus(myStatus);
        }
    }

    // --- ฟังก์ชันสำหรับทำลาย Mini Video ---
    function destroyMiniVideo() {
        if (miniVideoContainer) {
            miniVideoContainer.remove();
            miniVideoContainer = null;
        }
    }

    // ติดตั้งโมดูล
    window.RoomMiniVideoFeatureModule = { install };

})();