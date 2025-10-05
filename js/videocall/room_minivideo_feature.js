(function () {
    let miniVideoContainer = null;
    let showMiniVideoButton = null;
    let isDragging = false;
    let offsetX, offsetY;

    function install({ streamManager, UIManager }) {
        if (!streamManager || !UIManager) {
            console.error("Mini Video Module installation failed: Missing required managers.");
            return;
        }

        // --- Event Listeners ---
        document.addEventListener('fullscreenchange', () => {
            const fsElement = document.fullscreenElement;
            if (fsElement) {
                const container = fsElement.closest('.video-container');
                const fullscreenedVideoId = container ? container.id : null;
                setupMiniVideo(fullscreenedVideoId, streamManager, UIManager);
            } else {
                destroyMiniVideo();
            }
        });
    }

    /**
     * สร้างและตั้งค่า Mini Video
     * @param {string | null} fullscreenedVideoId - ID ของวิดีโอที่กำลังแสดงเต็มจอ
     * @param {object} streamManager - ตัวจัดการสตรีมของแอปพลิเคชัน
     * @param {object} UIManager - ตัวจัดการ UI
     */
    function setupMiniVideo(fullscreenedVideoId, streamManager, UIManager) {
        destroyMiniVideo(); // ทำลายของเก่า (ถ้ามี) ก่อนสร้างใหม่

        const myUuid = window.appConfig.MY_USER_INFO.uuid;
        let targetUuid, targetStream, targetName;

        // ตรรกะการเลือกวิดีโอที่จะแสดงใน Mini Video
        if (fullscreenedVideoId === myUuid) {
            // ถ้าเต็มจอวิดีโอตัวเอง ให้หาคนแรกในห้องมาแสดง
            const firstPeerId = Object.keys(streamManager.peerInfo)[0];
            if (firstPeerId) {
                targetUuid = firstPeerId;
                targetStream = streamManager.peerInfo[firstPeerId].stream;
                targetName = streamManager.peerInfo[firstPeerId].nickname;
            }
        } else {
            // ถ้าเต็มจอวิดีโอคนอื่น ให้แสดงวิดีโอของตัวเอง
            targetUuid = myUuid;
            targetStream = streamManager.getMyVideoStream();
            targetName = "คุณ";
        }

        if (!targetStream) return; // ถ้าไม่มีสตรีมให้แสดง ก็ไม่ต้องทำอะไรต่อ

        createMiniVideoElement(targetUuid, targetStream, targetName, streamManager, UIManager);
    }

    /**
     * สร้าง Element ของ Mini Video และปุ่มควบคุม
     * @param {string} uuid - UUID ของผู้ใช้ที่แสดงใน Mini Video
     * @param {MediaStream} stream - สตรีมวิดีโอที่จะแสดง
     * @param {string} name - ชื่อที่จะแสดงบน Mini Video
     * @param {object} streamManager - ตัวจัดการสตรีม
     * @param {object} UIManager - ตัวจัดการ UI
     */
    function createMiniVideoElement(uuid, stream, name, streamManager, UIManager) {
        // สร้างกรอบ Mini Video
        miniVideoContainer = document.createElement('div');
        miniVideoContainer.id = 'mini-video-container';
        miniVideoContainer.className = 'draggable';
        miniVideoContainer.dataset.currentUuid = uuid; // เก็บ UUID ปัจจุบันไว้
        miniVideoContainer.innerHTML = `
            <video id="mini-video" autoplay playsinline muted></video>
            <div class="mini-video-overlay">
                <span class="mini-video-name">${name}</span>
            </div>
        `;
        document.body.appendChild(miniVideoContainer);

        const videoElement = miniVideoContainer.querySelector('#mini-video');
        videoElement.srcObject = stream;
        videoElement.volume = (streamManager.volumeLevels[uuid] || 100) / 100;


        // สร้างปุ่มสำหรับแสดง Mini Video (ซ่อนไว้ก่อน)
        showMiniVideoButton = document.createElement('button');
        showMiniVideoButton.id = 'show-mini-video-btn';
        showMiniVideoButton.innerHTML = '<i class="bi bi-window-stack"></i>';
        showMiniVideoButton.style.display = 'none';
        document.body.appendChild(showMiniVideoButton);

        // --- เพิ่ม Event Listeners ให้กับ Mini Video ---
        let longPressTimer;

        const startPress = (e) => {
            // คลิกขวา
            if (e.type === 'contextmenu') {
                e.preventDefault();
                const videoId = miniVideoContainer.dataset.currentUuid;
                if(videoId && UIManager.showVolumePopup) UIManager.showVolumePopup(videoId);
                return;
            }
            if (e.button !== 0) return; // สนใจเฉพาะคลิกซ้าย
            longPressTimer = setTimeout(() => showUserSelectionPopup(streamManager, UIManager), 500);
            startDrag(e);
        };
        const endPress = () => { clearTimeout(longPressTimer); stopDrag(); };

        miniVideoContainer.addEventListener('contextmenu', startPress);
        miniVideoContainer.addEventListener('mousedown', startPress);
        miniVideoContainer.addEventListener('mouseup', endPress);
        miniVideoContainer.addEventListener('mouseleave', endPress);
        miniVideoContainer.addEventListener('touchstart', startPress, { passive: false });
        miniVideoContainer.addEventListener('touchend', endPress);
        
        // ดับเบิลคลิกเพื่อซ่อน
        miniVideoContainer.addEventListener('dblclick', toggleMiniVideoVisibility);
        showMiniVideoButton.addEventListener('click', toggleMiniVideoVisibility);

        // การลาก
        document.addEventListener('mousemove', drag);
    }

    /**
     * ทำลาย Mini Video และปุ่มที่เกี่ยวข้อง
     */
    function destroyMiniVideo() {
        if (miniVideoContainer) miniVideoContainer.remove();
        if (showMiniVideoButton) showMiniVideoButton.remove();
        miniVideoContainer = null;
        showMiniVideoButton = null;
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDrag);
    }

    /**
     * สลับการซ่อน/แสดง Mini Video
     */
    function toggleMiniVideoVisibility() {
        if (!miniVideoContainer || !showMiniVideoButton) return;
        
        const isHidden = miniVideoContainer.style.display === 'none';
        miniVideoContainer.style.display = isHidden ? 'block' : 'none';
        showMiniVideoButton.style.display = isHidden ? 'none' : 'block';
    }

    /**
     * แสดง Popup สำหรับเลือกผู้ใช้
     * @param {object} streamManager
     * @param {object} UIManager
     */
    function showUserSelectionPopup(streamManager, UIManager) {
        const myUuid = window.appConfig.MY_USER_INFO.uuid;
        const myNickname = "คุณ";

        const inputOptions = { [myUuid]: myNickname };
        for (const uuid in streamManager.peerInfo) {
            inputOptions[uuid] = streamManager.peerInfo[uuid].nickname;
        }

        Swal.fire({
            title: 'เลือกวิดีโอที่จะแสดง',
            input: 'select',
            inputOptions: inputOptions,
            inputValue: miniVideoContainer.dataset.currentUuid, // แสดงคนที่เลือกอยู่ปัจจุบัน
            inputPlaceholder: 'เลือกผู้ใช้',
            showCancelButton: true,
            confirmButtonText: 'ตกลง'
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const selectedUuid = result.value;
                let newStream, newName;
                if (selectedUuid === myUuid) {
                    newStream = streamManager.getMyVideoStream();
                    newName = myNickname;
                } else {
                    newStream = streamManager.peerInfo[selectedUuid].stream;
                    newName = streamManager.peerInfo[selectedUuid].nickname;
                }
                
                const videoEl = miniVideoContainer.querySelector('#mini-video');
                const nameEl = miniVideoContainer.querySelector('.mini-video-name');
                if (videoEl && newStream) videoEl.srcObject = newStream;
                if (nameEl) nameEl.textContent = newName;
                miniVideoContainer.dataset.currentUuid = selectedUuid;
                
                // อัปเดตระดับเสียงตามผู้ใช้ที่เลือก
                UIManager.setVolume(selectedUuid, streamManager.volumeLevels[selectedUuid] || 100);
            }
        });
    }

    // --- ฟังก์ชันสำหรับการลาก (Drag and Drop) ---
    function startDrag(e) {
        isDragging = true;
        const rect = miniVideoContainer.getBoundingClientRect();
        offsetX = (e.clientX || e.touches[0].clientX) - rect.left;
        offsetY = (e.clientY || e.touches[0].clientY) - rect.top;
        miniVideoContainer.style.cursor = 'grabbing';
    }

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        
        let newX = clientX - offsetX;
        let newY = clientY - offsetY;

        newX = Math.max(0, Math.min(newX, window.innerWidth - miniVideoContainer.offsetWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - miniVideoContainer.offsetHeight));

        miniVideoContainer.style.left = `${newX}px`;
        miniVideoContainer.style.top = `${newY}px`;
    }

    function stopDrag() {
        isDragging = false;
        if (miniVideoContainer) miniVideoContainer.style.cursor = 'grab';
    }


    // ติดตั้งโมดูล
    window.RoomMiniVideoFeatureModule = { install };

})();