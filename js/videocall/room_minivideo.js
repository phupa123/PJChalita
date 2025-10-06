(function () {
    let miniVideoContainer = null;
    let currentMiniUserId = null;
    let longPressTimer = null;
    let isLongPress = false;

    function install({ streamManager, UIManager, PeerManager }) {
        if (!streamManager || !UIManager || !PeerManager) return;

        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        function handleFullscreenChange() {
            if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
                // Entered fullscreen
                addMiniVideo();
            } else {
                // Exited fullscreen
                removeMiniVideo();
            }
        }

        function updateMiniVideo() {
            const mainVideo = document.querySelector('#video-grid video.main');
            if (mainVideo && mainVideo.id !== 'my-video') {
                addMiniVideo();
            } else {
                removeMiniVideo();
            }
        }

        // Expose update function
        window.RoomMiniVideoModule.update = updateMiniVideo;

        // Initial check
        updateMiniVideo();

        function addMiniVideo() {
            if (miniVideoContainer) return; // Already added

            // Default to own camera
            currentMiniUserId = window.appConfig.MY_USER_INFO.uuid;

            miniVideoContainer = document.createElement('div');
            miniVideoContainer.className = 'fullscreen-mini-video';
            miniVideoContainer.id = 'fullscreen-mini-video';

            const video = document.createElement('video');
            video.autoplay = true;
            video.muted = true; // Muted for own camera
            video.playsInline = true;

            const nameTag = document.createElement('div');
            nameTag.className = 'mini-name';
            nameTag.textContent = 'คุณ';

            // Add status icons overlay
            const statusIcons = document.createElement('div');
            statusIcons.className = 'mini-status-icons';
            statusIcons.innerHTML = `
                <i class="bi bi-mic-mute-fill icon-mic-muted" style="display:none;"></i>
                <i class="bi bi-camera-video-off-fill icon-cam-off" style="display:none;"></i>
            `;

            miniVideoContainer.appendChild(video);
            miniVideoContainer.appendChild(nameTag);
            miniVideoContainer.appendChild(statusIcons);

            // Clone the stream
            const myStream = streamManager.getMyVideoStream();
            if (myStream) {
                video.srcObject = myStream.clone();
            }

            // Update initial status
            updateMiniVideoStatus(currentMiniUserId);

            document.body.appendChild(miniVideoContainer);

            // Add long press event
            miniVideoContainer.addEventListener('mousedown', startLongPress);
            miniVideoContainer.addEventListener('mouseup', endLongPress);
            miniVideoContainer.addEventListener('mouseleave', endLongPress);
            miniVideoContainer.addEventListener('touchstart', startLongPress, { passive: false });
            miniVideoContainer.addEventListener('touchend', endLongPress);
        }

        function removeMiniVideo() {
            if (miniVideoContainer) {
                miniVideoContainer.remove();
                miniVideoContainer = null;
                currentMiniUserId = null;
            }
        }

        function startLongPress(e) {
            e.preventDefault();
            isLongPress = false;
            longPressTimer = setTimeout(() => {
                isLongPress = true;
                showUserSelectionPopup();
            }, 500);
        }

        function endLongPress(e) {
            clearTimeout(longPressTimer);
            if (!isLongPress) {
                // Short press - perhaps toggle something, but for now do nothing
            }
        }

        function showUserSelectionPopup() {
            const users = Object.keys(streamManager.peerInfo);
            users.unshift(window.appConfig.MY_USER_INFO.uuid); // Add self first

            const userOptions = users.map(uuid => {
                const name = uuid === window.appConfig.MY_USER_INFO.uuid ? 'คุณ' : streamManager.peerInfo[uuid]?.nickname || uuid;
                return `<button class="swal2-styled" data-uuid="${uuid}">${name}</button>`;
            }).join('');

            Swal.fire({
                title: 'เลือกผู้ใช้สำหรับจอเล็ก',
                html: `<div style="display: flex; flex-direction: column; gap: 10px;">${userOptions}</div>`,
                showConfirmButton: false,
                showCancelButton: true,
                cancelButtonText: 'ยกเลิก'
            }).then(result => {
                if (result.dismiss === Swal.DismissReason.cancel) return;
            });

            // Add event listeners to buttons
            document.querySelectorAll('.swal2-popup button[data-uuid]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const selectedUuid = btn.dataset.uuid;
                    switchMiniVideoToUser(selectedUuid);
                    Swal.close();
                });
            });
        }

        function updateMiniVideoStatus(uuid) {
            if (!miniVideoContainer || !uuid) return;

            let status = null;
            if (uuid === window.appConfig.MY_USER_INFO.uuid) {
                // Own status
                status = streamManager.getCurrentStatus();
            } else {
                // Other user's status
                status = streamManager.peerInfo[uuid]?.status;
            }

            if (!status) return;

            const micIcon = miniVideoContainer.querySelector('.icon-mic-muted');
            const camIcon = miniVideoContainer.querySelector('.icon-cam-off');

            if (micIcon) {
                micIcon.style.display = status.isAudioEnabled === false ? 'inline-block' : 'none';
            }
            if (camIcon) {
                camIcon.style.display = status.isVideoEnabled === false ? 'inline-block' : 'none';
            }
        }

        function switchMiniVideoToUser(uuid) {
            if (!miniVideoContainer) return;

            currentMiniUserId = uuid;

            const video = miniVideoContainer.querySelector('video');
            const nameTag = miniVideoContainer.querySelector('.mini-name');

            if (uuid === window.appConfig.MY_USER_INFO.uuid) {
                // Own camera
                const myStream = streamManager.getMyVideoStream();
                if (myStream) {
                    video.srcObject = myStream.clone();
                }
                video.muted = true;
                nameTag.textContent = 'คุณ';
            } else {
                // Other user's stream
                const peerInfo = streamManager.peerInfo[uuid];
                if (peerInfo && peerInfo.stream) {
                    video.srcObject = peerInfo.stream.clone();
                }
                video.muted = false;
                nameTag.textContent = peerInfo?.nickname || uuid;
            }

            // Update status icons for the new user
            updateMiniVideoStatus(uuid);
        }

        // Expose functions if needed
        window.RoomMiniVideoModule = {
            switchMiniVideoToUser,
            updateStatusIfActive: (uuid, status) => {
                // Update status for the currently displayed user in minivideo
                if (miniVideoContainer && currentMiniUserId === uuid) {
                    updateMiniVideoStatus(uuid);
                }
            }
        };
    }

    window.RoomMiniVideoModule = { install };
})();
