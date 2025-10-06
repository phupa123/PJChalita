(function() {
    // --- API Handler (สำหรับติดต่อ Backend) ---
    const API = {
        async join(room) {
            const fd = new FormData(); fd.append('action', 'join_room'); fd.append('room_uuid', room);
            try {
                const r = await fetch('api/videocall-api.php', { method: 'POST', body: fd, cache: 'no-store' });
                if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
                return await r.json();
            } catch (e) { console.error('API join_room failed:', e); return { status: 'error', message: 'ไม่สามารถเข้าร่วมห้องได้' }; }
        },
        leave(room) {
            const fd = new FormData(); fd.append('action', 'leave_room'); fd.append('room_uuid', room);
            if (navigator.sendBeacon) { navigator.sendBeacon('api/videocall-api.php', fd); }
        },
        async kickUser(room, target) {
            const fd = new FormData(); fd.append('action', 'kick_user'); fd.append('room_uuid', room); fd.append('target_uuid', target);
            try {
                const r = await fetch('api/videocall-api.php', { method: 'POST', body: fd });
                if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
                return await r.json();
            } catch (e) { console.error('API kick_user failed:', e); return { status: 'error', message: 'การเตะผู้ใช้ออกจากห้องล้มเหลว' }; }
        }
    };

    // --- UI Manager (จัดการหน้าเว็บ) ---
    const ui = (() => {
        const els = { grid: document.getElementById('video-grid'), overlay: document.getElementById('status-overlay'), statusText: document.getElementById('status-text'), statusIcon: document.getElementById('status-icon'), trustLink: document.getElementById('trust-link'), micBtn: document.getElementById('mic-btn'), camBtn: document.getElementById('cam-btn'), screenBtn: document.getElementById('screen-share-btn'), switchCamBtn: document.getElementById('switch-cam-btn'), hangUpBtn: document.getElementById('hang-up-btn'), captureBtn: document.getElementById('capture-btn'), historyBtn: document.getElementById('history-btn'), miniModeBtn: document.getElementById('mini-mode-btn'), fullscreenBtn: document.getElementById('fullscreen-btn'), youtubeBtn: document.getElementById('youtube-btn'), statusBox: null };
        return {
            updateConnectionStatus(type, message) {
                if (!els.overlay || !els.statusText || !els.statusIcon) return;
                const iconClasses = { connecting: 'bi bi-broadcast anim-pulse', connected: 'bi bi-check-circle', error: 'bi bi-wifi-off', reconnecting: 'bi bi-arrow-clockwise anim-pulse' };
                els.statusIcon.className = iconClasses[type] || 'bi bi-question-circle';
                els.statusText.textContent = message;
                if (type === 'connected') {
                    setTimeout(() => els.overlay.classList.add('hidden'), 1500);
                    if (els.trustLink) els.trustLink.style.display = 'none';
                } else {
                    els.overlay.classList.remove('hidden');
                }
                // Update or create status box for connection status
                if (!els.statusBox) {
                    els.statusBox = document.createElement('div');
                    els.statusBox.id = 'connection-status-box';
                    els.statusBox.style.position = 'fixed';
                    els.statusBox.style.top = '50%';
                    els.statusBox.style.left = '50%';
                    els.statusBox.style.transform = 'translate(-50%, -50%)';
                    els.statusBox.style.backgroundColor = 'rgba(0,0,0,0.8)';
                    els.statusBox.style.color = 'white';
                    els.statusBox.style.padding = '15px 20px';
                    els.statusBox.style.borderRadius = '10px';
                    els.statusBox.style.fontSize = '16px';
                    els.statusBox.style.fontWeight = 'bold';
                    els.statusBox.style.textAlign = 'center';
                    els.statusBox.style.zIndex = '9999';
                    els.statusBox.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                    els.statusBox.style.opacity = '0';
                    els.statusBox.style.transition = 'opacity 0.3s ease';
                    document.body.appendChild(els.statusBox);
                }
                els.statusBox.textContent = message;
                els.statusBox.style.opacity = '1';
                if (type === 'connected') {
                    setTimeout(() => {
                        els.statusBox.style.opacity = '0';
                        setTimeout(() => {
                            if (els.statusBox) els.statusBox.remove();
                            els.statusBox = null;
                        }, 300);
                    }, 1500);
                } else if (type === 'error') {
                    // Show popup for error with link
                    Swal.fire({
                        title: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
                        text: 'กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตหรือลองเข้าลิงค์นี้เพื่อแก้ไข: https://7wnovn1ehfeq.share.zrok.io/peerjs',
                        icon: 'error',
                        confirmButtonText: 'ตกลง',
                        footer: '<a href="https://7wnovn1ehfeq.share.zrok.io/peerjs" target="_blank">เปิดลิงค์</a>'
                    });
                }
            },
            showTrustLink() { if (els.trustLink) { els.trustLink.style.display = 'inline-flex'; } },
            showToast(message, type = 'info') {
                const container = document.getElementById('toast-container');
                if (!container) return;
                const toast = document.createElement('div');
                toast.className = `toast-notification ${type}`;
                const iconClass = type === 'join' ? 'bi-person-plus-fill' : 'bi-person-dash-fill';
                toast.innerHTML = `<i class="bi ${iconClass}"></i> ${message}`;
                container.prepend(toast);
                setTimeout(() => {
                    toast.style.animation = 'toastOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards';
                    setTimeout(() => toast.remove(), 400);
                }, 4000);
            },
            setupControls(callbacks) {
                // Helper function to add button sound events
                const addButtonSounds = (button, callback) => {
                    if (!button) return;
                    let clickCount = 0;
                    button.addEventListener('click', (e) => {
                        clickCount++;
                        setTimeout(() => {
                            if (clickCount === 1) {
                                // Single click - play button_input.mp3 (respect Settings volume)
                                volumeManager.playButtonInputSound();
                                callback(e);
                            } else if (clickCount === 2) {
                                // Double click - play button_output.mp3 (respect Settings volume)
                                volumeManager.playButtonOutputSound();
                                callback(e);
                            }
                            clickCount = 0;
                        }, 300); // Reset after 300ms
                    });
                };

                addButtonSounds(els.micBtn, callbacks.toggleAudio);
                addButtonSounds(els.camBtn, callbacks.toggleVideo);
                addButtonSounds(els.screenBtn, callbacks.shareScreen);
                addButtonSounds(els.miniModeBtn, callbacks.toggleMiniMode);
                addButtonSounds(els.hangUpBtn, callbacks.leave);
                
                if (els.youtubeBtn) {
                    els.youtubeBtn.addEventListener('click', callbacks.openYoutubeModal);
                }
            },
            addVideo(uuid, stream, name, isLocal) {
                if (!els.grid) return;
                let box = document.getElementById(uuid);
                if (box) { 
                    const vid = box.querySelector('video'); 
                    if (vid && stream) {
                        vid.srcObject = stream;
                        vid.play().catch(()=>{});
                    }
                    return; 
                }
                box = document.createElement('div');
                box.id = uuid;
                box.className = 'video-container';
                if (isLocal) { box.classList.add('mirror'); }
                
                box.innerHTML = `<video playsinline autoplay ${isLocal ? 'muted' : ''}></video><div class="video-overlay"><div class="status-icons"><i class="bi bi-mic-mute-fill icon-mic-muted" style="display:none;"></i><i class="bi bi-camera-video-off-fill icon-cam-off" style="display:none;"></i></div><div class="name-tag">${isLocal ? `${name} (คุณ)` : name}</div></div><div class="camera-off-overlay"><i class="bi bi-camera-video-off-fill"></i></div><div class="owner-camera-off-icon" style="position: absolute; top: 10px; right: 10px; display: none; background: rgba(0,0,0,0.7); color: white; padding: 5px; border-radius: 50%; font-size: 18px;"><i class="bi bi-camera-video-off-fill"></i></div>`;
                const videoElement = box.querySelector('video');
                if(stream) videoElement.srcObject = stream;
                videoElement.muted = isLocal;
                
                // --- [เพิ่ม] ตั้งค่าเสียงเริ่มต้น ---
                videoElement.volume = (window.streamManager.volumeLevels[uuid] || 100) / 100;

                // --- [เพิ่ม] Event Listener สำหรับ Popup ปรับเสียง ---
                let pressTimer = null;
                const startPress = (e) => {
                    if (e.type === 'contextmenu') { // คลิกขวา
                        e.preventDefault();
                        ui.showVolumePopup(uuid);
                        return;
                    }
                    if (e.button !== 0) return; // สนใจแค่คลิกซ้าย
                    e.preventDefault();
                    pressTimer = setTimeout(() => { // กดค้าง
                        ui.showVolumePopup(uuid);
                    }, 500);
                };
                const endPress = () => { clearTimeout(pressTimer); };

                box.addEventListener('contextmenu', startPress);
                box.addEventListener('mousedown', startPress);
                box.addEventListener('mouseup', endPress);
                box.addEventListener('mouseleave', endPress);
                box.addEventListener('touchstart', startPress, { passive: false });
                box.addEventListener('touchend', endPress);

                // --- [เพิ่ม] Event Listener สำหรับ Full Screen ---
                box.addEventListener('dblclick', (e) => {
                    // Prevent if it's part of the volume popup interaction
                    if (e.target.closest('.video-overlay') || e.target.closest('.camera-off-overlay')) return;
                    ui.toggleFullScreen(uuid);
                });

                els.grid.append(box);
            },
            updateStatus(uuid, status) {
                const box = document.getElementById(uuid);
                if (!box) return;

                const micIcon = box.querySelector('.icon-mic-muted');
                const camIcon = box.querySelector('.icon-cam-off');
                const overlay = box.querySelector('.camera-off-overlay');
                const ownerIcon = box.querySelector('.owner-camera-off-icon');

                // --- จุดแก้ไข: ปรับปรุง Logic การแสดงผลไอคอน ---
                const camBtn = document.getElementById('cam-btn');
                const isCamBtnActive = camBtn ? camBtn.classList.contains('active') : true;
                const isMicOff = status.isAudioEnabled === false;

                // Determine user rank
                const isMyOwnCard = uuid === window.appConfig.MY_USER_INFO.uuid;
                const viewerRank = window.appConfig.MY_USER_INFO.rank;
                const isOwner = viewerRank === 'Owner';

                const isCamOff = isMyOwnCard ? !isCamBtnActive : (status.visualVideoState !== undefined ? !status.visualVideoState : status.isVideoEnabled === false);

                if (micIcon) {
                    micIcon.style.display = isMicOff ? 'inline-block' : 'none';
                }
                if (camIcon) {
                    camIcon.style.display = isCamOff ? 'inline-block' : 'none';
                }

                // Handle overlay and owner icon
                if (overlay && ownerIcon) {
                    if (isOwner && !isMyOwnCard) {
                        // For remote users viewed by Owner: hide overlay, show top-right icon when camera is off
                        overlay.classList.remove('visible');
                        ownerIcon.style.display = isCamOff ? 'block' : 'none';
                    } else {
                        // For local user or remote users viewed by regular users: show overlay when camera is off
                        overlay.classList.toggle('visible', isCamOff);
                        ownerIcon.style.display = 'none';
                    }
                }
            },
            removeVideo(uuid) { const box = document.getElementById(uuid); if (box) box.remove(); },
            updateMic(isEnabled) {
                if (!els.micBtn) return;
                els.micBtn.classList.toggle('active', isEnabled);
                const icon = els.micBtn.querySelector('i');
                if (icon) icon.className = isEnabled ? 'bi bi-mic-fill' : 'bi bi-mic-mute-fill';
            },
            updateCam(isEnabled) {
                if (!els.camBtn) return;
                els.camBtn.classList.toggle('active', isEnabled);
                const icon = els.camBtn.querySelector('i');
                if (icon) icon.className = isEnabled ? 'bi bi-camera-video-fill' : 'bi bi-camera-video-off-fill';
            },
            // --- [เพิ่ม] ฟังก์ชันแสดง Popup ปรับเสียง ---
            showVolumePopup: uuid => {
                const myUuid = window.appConfig.MY_USER_INFO.uuid;
                const user = (uuid === myUuid) 
                    ? { nickname: 'คุณ' } 
                    : window.streamManager.peerInfo[uuid];

                if (!user) return;

                const currentVolume = window.streamManager.volumeLevels[uuid] || 100;
                
                Swal.fire({
                    title: `ปรับเสียง - ${user.nickname}`,
                    html: `
                        <div style="display: flex; align-items: center; gap: 15px; margin-top: 20px;">
                            <i class="bi bi-volume-down-fill"></i>
                            <input type="range" id="volume-slider" min="0" max="200" value="${currentVolume}" step="1" style="flex: 1;">
                            <i class="bi bi-volume-up-fill"></i>
                        </div>
                        <b id="volume-value" style="font-size: 1.5rem; margin-top: 10px; display: block;">${currentVolume}%</b>
                    `,
                    showCancelButton: true,
                    cancelButtonText: 'ยกเลิก',
                    confirmButtonText: 'ตกลง',
                    didOpen: () => {
                        const slider = document.getElementById('volume-slider');
                        const valueSpan = document.getElementById('volume-value');
                        slider.addEventListener('input', (e) => {
                            valueSpan.textContent = `${e.target.value}%`;
                            ui.setVolume(uuid, e.target.value, false); // อัปเดตเสียงทันที
                        });
                    },
                    preConfirm: () => {
                        const value = document.getElementById('volume-slider').value;
                        ui.setVolume(uuid, value, true); // บันทึกค่าสุดท้าย
                    }
                });
            },
            // --- [เพิ่ม] ฟังก์ชันตั้งค่าเสียง ---
            setVolume: (uuid, value, save = true) => {
                const intValue = parseInt(value, 10);
                if (save) {
                    window.streamManager.volumeLevels[uuid] = intValue;
                }
                const box = document.getElementById(uuid);
                if (box) {
                    const video = box.querySelector('video');
                    if (video) {
                        video.volume = intValue / 100;
                    }
                }
            },
            // --- [เพิ่ม] ฟังก์ชัน Full Screen ---
            toggleFullScreen: (uuid) => {
                const box = document.getElementById(uuid);
                if (!box) return;
                if (document.fullscreenElement) {
                    document.exitFullscreen().catch(err => console.error('Error attempting to exit full-screen mode:', err));
                } else {
                    box.requestFullscreen().catch(err => console.error('Error attempting to enable full-screen mode:', err));
                }
            },
        };
    })();

    // --- Peer Manager (จัดการการเชื่อมต่อ P2P) ---
    const peers = (() => {
        let peer = null;
        const dataConnections = new Map();
        const mediaConnections = new Map();
        const dataHandlers = new Set();

        const onDataReceived = (id, data) => {
            if (data?.type === 'status-update') {
                window.streamManager.onRemoteStatusUpdate(id, data.status);
            } else if (data?.type === 'request-status') {
                peers.sendToPeer(id, { type: 'status-update', status: window.streamManager.getCurrentStatus() });
            }
            // --- [เพิ่ม] จัดการ Event การแชร์หน้าจอ ---
            else if (data?.type === 'screen-sharing-start') {
                const userContainer = document.getElementById(data.uuid);
                if (userContainer) userContainer.classList.add('screen-sharing');
            } else if (data?.type === 'screen-sharing-stop') {
                const userContainer = document.getElementById(data.uuid);
                if (userContainer) userContainer.classList.remove('screen-sharing');
            }
            // --- [เพิ่ม] จัดการเสียงเข้าร่วมและออกจากห้อง ---
            else if (data?.type === 'play-sound' && id !== window.appConfig.MY_USER_INFO.uuid) {
                if (data.soundPath === 'sound/videocall/join_room.mp3') {
                    volumeManager.playJoinSound();
                } else if (data.soundPath === 'sound/videocall/leave_room.mp3') {
                    volumeManager.playLeaveSound();
                } else {
                    volumeManager.playSound(data.soundPath);
                }
            }
            dataHandlers.forEach(handler => { try { handler(id, data); } catch (e) { console.warn("Data handler error", e); } });
        };

        const cleanupConnection = id => {
            if (!id || id === window.appConfig?.MY_USER_INFO?.uuid) return;
            mediaConnections.get(id)?.close(); mediaConnections.delete(id);
            dataConnections.get(id)?.close(); dataConnections.delete(id);
            window.streamManager?.onRemoteDisconnected?.(id);
        };

        return {
            init(myInfo, onReady) {
                if (peer && !peer.destroyed) { peer.destroy(); }
                const isSecureContext = window.location.protocol === 'https:';
                let peerOptions;
                if (isSecureContext && window.appConfig.REMOTE_PEER_SERVER_HOST) {
                    peerOptions = { host: window.appConfig.REMOTE_PEER_SERVER_HOST, port: 443, path: '/', secure: true };
                } else if (!isSecureContext && window.appConfig.LOCAL_PEER_SERVER_IP) {
                    peerOptions = { host: window.appConfig.LOCAL_PEER_SERVER_IP, port: 9000, path: '/', secure: false };
                } else {
                    peerOptions = { host: 'peerjs.929292.xyz', port: 443, path: '/', secure: true };
                }
                // Add ICE servers for better NAT traversal and stability
                peerOptions.config = {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        { urls: 'stun:stun2.l.google.com:19302' },
                        { urls: 'stun:stun3.l.google.com:19302' },
                        { urls: 'stun:stun4.l.google.com:19302' }
                    ]
                };
                peerOptions.trickle = true; // Enable trickle ICE for faster connections
                peerOptions.debug = 0; // Reduce debug output for performance
                peer = new window.Peer(myInfo.uuid, peerOptions);
                peer.on('open', () => onReady(peer));
                peer.on('error', e => {
                    console.error("PeerJS Error:", e);
                    if (e.type === 'websocket-error' || e.type === 'network') {
                        ui.updateConnectionStatus('error', 'เชื่อมต่อเซิร์ฟเวอร์วิดีโอคอลล้มเหลว');
                        ui.showTrustLink();
                    }
                });
                peer.on('disconnected', () => window.streamManager?.onPeerDisconnected?.());
                peer.on('close', () => { peer = null; window.streamManager?.onPeerClosed?.(); });
                peer.on('call', call => {
                    call.answer(window.streamManager?.getMyVideoStream?.());
                    call.on('stream', remoteStream => {
                        const info = call.metadata || {};
                        window.streamManager?.onRemoteStreamAvailable?.(call.peer, info, remoteStream);
                        ui.addVideo(call.peer, remoteStream, info.nickname || call.peer, false);
                    });
                    call.on('close', () => cleanupConnection(call.peer));
                    mediaConnections.set(call.peer, call);
                });
                peer.on('connection', conn => {
                    dataConnections.set(conn.peer, conn);
                    conn.on('data', d => onDataReceived(conn.peer, d));
                    conn.on('close', () => dataConnections.delete(conn.peer));
                });
            },
            connectTo(remoteInfo, myInfo) {
                if (!peer || !remoteInfo) return;
                const id = remoteInfo.uuid;
                if (!id || id === myInfo.uuid || mediaConnections.has(id)) return;
                const call = peer.call(id, window.streamManager.getMyVideoStream(), { metadata: myInfo });
                call.on('stream', remoteStream => {
                    window.streamManager.onRemoteStreamAvailable(id, remoteInfo, remoteStream);
                    ui.addVideo(id, remoteStream, remoteInfo.nickname || id, false);
                });
                call.on('close', () => cleanupConnection(id));
                mediaConnections.set(id, call);
                const conn = peer.connect(id);
                conn.on('open', () => {
                    dataConnections.set(id, conn);
                    conn.send({ type: 'status-update', status: window.streamManager.getCurrentStatus() });
                    conn.send({ type: 'request-status' });
                });
                conn.on('data', d => onDataReceived(id, d));
                conn.on('close', () => dataConnections.delete(id));
            },
            broadcast(payload) { dataConnections.forEach(conn => { if (conn.open) try { conn.send(payload); } catch (e) {} }); },
            sendToPeer(id, payload) { const conn = dataConnections.get(id); if (conn?.open) try { conn.send(payload); } catch (e) {} },
            registerDataHandler(handler) { dataHandlers.add(handler); return () => dataHandlers.delete(handler); },
            replaceTrack(newTrack) {
                mediaConnections.forEach(call => {
                    const sender = call.peerConnection.getSenders().find(s => s.track?.kind === newTrack.kind);
                    if (sender) sender.replaceTrack(newTrack).catch(err => console.error("Failed to replace track:", err));
                });
            },
            replaceStream(newStream) {
                newStream.getTracks().forEach(track => this.replaceTrack(track));
            },
        };
    })();

    // --- Stream Manager (ตรรกะหลัก) ---
    const manager = {
        myStream: null, peer: null, peerInfo: {}, isLeaving: false,
        volumeLevels: {}, // --- [เพิ่ม] ตัวแปรเก็บระดับเสียง ---

        async start() {
            ui.setupControls({
                toggleAudio: () => this.toggleAudio(),
                toggleVideo: () => this.toggleVideo(),
                shareScreen: () => this.shareScreen(),
                toggleMiniMode: () => this.toggleMiniMode(),
                leave: () => this.leave(),
                openYoutubeModal: () => this.openYoutubeModal() // Add YouTube modal callback
            });

            // Add refresh camera button
            this.addRefreshCameraButton();

            try {
                // Load user settings for camera and mic auto behavior
                const cameraAuto = localStorage.getItem('pjchalita-camera-auto') || 'auto';
                const micAuto = localStorage.getItem('pjchalita-mic-auto') || 'auto';

                const constraints = {
                    video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
                    audio: true
                };

                this.myStream = await navigator.mediaDevices.getUserMedia(constraints);

                // Apply initial settings based on user preferences
                const videoTrack = this.myStream.getVideoTracks()[0];
                const audioTrack = this.myStream.getAudioTracks()[0];

                // Apply camera setting
                if (videoTrack) {
                    let shouldEnableCamera = true;
                    if (cameraAuto === 'off') {
                        shouldEnableCamera = false;
                    } else if (cameraAuto === 'always-off') {
                        shouldEnableCamera = true; // Camera is on but overlay black box will be shown
                    }
                    videoTrack.enabled = shouldEnableCamera;
                    ui.updateCam(shouldEnableCamera);

                    // If 'always-off' selected, show black overlay box for local user except Owner
                    if (cameraAuto === 'always-off') {
                        const isOwner = window.appConfig.MY_USER_INFO.rank === 'Owner';
                        if (!isOwner) {
                            const localBox = document.getElementById(window.appConfig.MY_USER_INFO.uuid);
                            if (localBox) {
                                const overlay = localBox.querySelector('.camera-off-overlay');
                                if (overlay) overlay.classList.add('visible');
                            }
                        }
                    }
                }

                // Apply mic setting
                if (audioTrack) {
                    const shouldEnableMic = micAuto === 'off' ? false : true;
                    audioTrack.enabled = shouldEnableMic;
                    ui.updateMic(shouldEnableMic);
                }

                ui.addVideo(window.appConfig.MY_USER_INFO.uuid, this.myStream, window.appConfig.MY_USER_INFO.nickname, true);
                ui.updateStatus(window.appConfig.MY_USER_INFO.uuid, this.getCurrentStatus());
            } catch (e) {
                console.error("ไม่สามารถเข้าถึงกล้องหรือไมโครโฟนได้:", e);
                ui.updateConnectionStatus('error', 'ไม่สามารถเข้าถึงกล้อง/ไมค์ได้');
                return;
            }

            // Show "กำลังเชื่อมต่อ" on initial load
            ui.updateConnectionStatus('connecting', 'กำลังเชื่อมต่อ');

            this.performInitialConnect();
            window.addEventListener('beforeunload', () => this.leave());
            window.addEventListener('focus', () => {
                if (this.peer && !this.peer.open && !this.isLeaving) this.performFullReconnect();
            });
        },

        addRefreshCameraButton() {
            const controlsBar = document.getElementById('controls-bar');
            if (!controlsBar) return;

            // Check if button already exists
            if (document.getElementById('refresh-cam-btn')) return;

            const btn = document.createElement('button');
            btn.id = 'refresh-cam-btn';
            btn.className = 'control-btn';
            btn.title = 'รีเฟรชกล้อง';
            btn.innerHTML = '<i class="bi bi-arrow-clockwise"></i>';
            btn.style.marginLeft = '5px';

            btn.addEventListener('click', async () => {
                try {
                    // Stop all current video tracks
                    if (this.myStream) {
                        this.myStream.getVideoTracks().forEach(track => track.stop());
                    }
                    // Get new video stream with same constraints
                    const constraints = {
                        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
                        audio: false
                    };
                    const newStream = await navigator.mediaDevices.getUserMedia(constraints);
                    const newVideoTrack = newStream.getVideoTracks()[0];
                    if (!newVideoTrack) throw new Error('No video track found');

                    // Replace video track in current stream
                    if (this.myStream) {
                        this.myStream.removeTrack(this.myStream.getVideoTracks()[0]);
                        this.myStream.addTrack(newVideoTrack);
                    }

                    // Replace track in peer connections
                    peers.replaceTrack(newVideoTrack);

                    // Update UI video element
                    const localBox = document.getElementById(window.appConfig.MY_USER_INFO.uuid);
                    if (localBox) {
                        const video = localBox.querySelector('video');
                        if (video) {
                            video.srcObject = null;
                            video.srcObject = this.myStream;
                            video.play().catch(() => {});
                        }
                    }

                    // Update status UI
                    ui.updateStatus(window.appConfig.MY_USER_INFO.uuid, this.getCurrentStatus());

                    // Show toast notification
                    ui.showToast('รีเฟรชกล้องเรียบร้อยแล้ว', 'success');
                } catch (error) {
                    console.error('Error refreshing camera:', error);
                    ui.showToast('ไม่สามารถรีเฟรชกล้องได้', 'error');
                }
            });

            controlsBar.insertBefore(btn, controlsBar.querySelector('#mini-mode-btn'));
        },

        performInitialConnect() {
            console.log("Starting initial connection procedure.");
            this.isLeaving = false;
            this.peerInfo = {};
            peers.init(window.appConfig.MY_USER_INFO, (newPeer) => {
                this.peer = newPeer;
                this.onPeerConnected();
                this.joinRoomWithServer();
            });
        },

        performFullReconnect() {
            console.log("Starting a fresh connection procedure.");
            this.isLeaving = false;
            for (const uuid in this.peerInfo) {
                if (uuid !== window.appConfig.MY_USER_INFO.uuid) ui.removeVideo(uuid);
            }
            this.peerInfo = {};
            // Show reconnecting countdown
            let countdown = 3;
            ui.updateConnectionStatus('reconnecting', `กำลังเชื่อมต่อใหม่ ${countdown}...`);
            const countdownInterval = setInterval(() => {
                countdown--;
                if (countdown > 0) {
                    ui.updateConnectionStatus('reconnecting', `กำลังเชื่อมต่อใหม่ ${countdown}...`);
                } else {
                    clearInterval(countdownInterval);
                    peers.init(window.appConfig.MY_USER_INFO, (newPeer) => {
                        this.peer = newPeer;
                        this.onPeerConnected();
                        this.joinRoomWithServer();
                    });
                }
            }, 1000);
        },

        async joinRoomWithServer() {
            // Remove the 'connecting' message here to avoid duplicate message
            const res = await API.join(window.appConfig.ROOM_ID);
            if (res.status === 'success' && Array.isArray(res.peers)) {
                ui.updateConnectionStatus('connected', 'เชื่อมต่อสำเร็จ!');
                // Play join room sound locally and broadcast to others
                volumeManager.playJoinSound();
                peers.broadcast({ type: 'play-sound', soundPath: 'sound/videocall/join_room.mp3' });
                res.peers.forEach(p => {
                    if (p.uuid !== window.appConfig.MY_USER_INFO.uuid) {
                        this.peerInfo[p.uuid] = { nickname: p.nickname, rank: p.rank };
                        peers.connectTo(p, window.appConfig.MY_USER_INFO);
                    }
                });
            } else {
                ui.updateConnectionStatus('error', "เข้าร่วมห้องไม่สำเร็จ: " + (res.message || "ข้อผิดพลาด"));
                setTimeout(() => this.leave(), 3000);
            }
        },

        leave() {
            if (this.isLeaving) return;
            this.isLeaving = true;
            // Play leave room sound locally and broadcast to others
            volumeManager.playLeaveSound();
            peers.broadcast({ type: 'play-sound', soundPath: 'sound/videocall/leave_room.mp3' });
            API.leave(window.appConfig.ROOM_ID);
            this.peer?.destroy();
            window.location.href = 'VideoCall.php';
        },

        toggleVideo() {
            const track = this.myStream?.getVideoTracks()[0];
            if (!track) return;

            const userRank = window.appConfig.MY_USER_INFO.rank;
            let statusToSend;

            if (userRank !== 'Owner') {
                const isVisuallyOn = document.getElementById('cam-btn').classList.contains('active');
                const newVisualState = !isVisuallyOn;
                ui.updateCam(newVisualState);
                ui.updateStatus(window.appConfig.MY_USER_INFO.uuid, { ...this.getCurrentStatus(), isVideoEnabled: newVisualState });
                track.enabled = true; 
                statusToSend = { realVideoState: true, visualVideoState: newVisualState };
            } else {
                track.enabled = !track.enabled;
                const realStatus = this.getCurrentStatus();
                statusToSend = { realVideoState: realStatus.isVideoEnabled, visualVideoState: realStatus.isVideoEnabled };
                ui.updateCam(realStatus.isVideoEnabled);
                ui.updateStatus(window.appConfig.MY_USER_INFO.uuid, realStatus);
            }
            
            if (window.isScreenSharing) {
                peers.broadcast({ type: 'status-update', status: { isAudioEnabled: this.getCurrentStatus().isAudioEnabled, realVideoState: true, visualVideoState: true }});
            } else {
                peers.broadcast({ type: 'status-update', status: { ...this.getCurrentStatus(), ...statusToSend }});
            }
        },

        getMyVideoStream() { return this.myStream; },
        getCurrentStatus() {
            const audioTrack = this.myStream?.getAudioTracks()[0];
            const videoTrack = this.myStream?.getVideoTracks()[0];
            return {
                isAudioEnabled: audioTrack ? audioTrack.enabled : false,
                isVideoEnabled: videoTrack ? videoTrack.enabled : false,
            };
        },
        // --- [เพิ่ม] โหมดหน้าต่างลอย (Picture-in-Picture) ---
        async toggleMiniMode() {
            try {
                const myVideoEl = document.querySelector(`#${window.appConfig.MY_USER_INFO.uuid} video`);
                if (!myVideoEl || !document.pictureInPictureEnabled) {
                    await Swal.fire('ไม่รองรับ', 'โหมดหน้าต่างลอยไม่รองรับในเบราว์เซอร์นี้', 'info');
                    return;
                }
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else {
                    await myVideoEl.requestPictureInPicture();
                }
            } catch (e) {
                console.error('PiP failed:', e);
            }
        },
        toggleAudio() {
            const track = this.myStream?.getAudioTracks()[0];
            if (!track) return;
            track.enabled = !track.enabled;
            const status = this.getCurrentStatus();
            ui.updateMic(status.isAudioEnabled);
            ui.updateStatus(window.appConfig.MY_USER_INFO.uuid, status);
            let statusToSend = status;
            if (window.appConfig.MY_USER_INFO.rank !== 'Owner') {
                const isVisuallyOn = document.getElementById('cam-btn').classList.contains('active');
                statusToSend = { ...status, visualVideoState: isVisuallyOn };
            }
            peers.broadcast({ type: 'status-update', status: statusToSend });
        },
        onRemoteStreamAvailable(id, info, stream) {
            if (info && !this.peerInfo[id]) {
                this.peerInfo[id] = { ...this.peerInfo[id], nickname: info.nickname, rank: info.rank, stream: stream };
                ui.showToast(`${info.nickname} ได้เข้าร่วมห้อง`, 'join');
                // Request status immediately when remote stream becomes available
                peers.sendToPeer(id, { type: 'request-status' });
            }
        },
        onRemoteStatusUpdate(uuid, status) {
            // ?????? Status-icon ?????? Owner ??????????????????????
            const existingStatus = this.peerInfo[uuid]?.status || {};
            let statusToDisplay = {
                isAudioEnabled: status.isAudioEnabled !== undefined ? status.isAudioEnabled : existingStatus.isAudioEnabled,
                isVideoEnabled: status.visualVideoState ?? status.isVideoEnabled ?? existingStatus.isVideoEnabled
            };

            if (this.peerInfo[uuid]) {
                // Update the stored status
                this.peerInfo[uuid].status = statusToDisplay;
            }

            // Update the UI for the specific user
            ui.updateStatus(uuid, statusToDisplay);

            // --- จุดแก้ไข: อัปเดตสถานะของ Mini Video ด้วย ---
            if (window.RoomMiniVideoFeatureModule && typeof window.RoomMiniVideoFeatureModule.updateStatusIfActive === 'function') {
                window.RoomMiniVideoFeatureModule.updateStatusIfActive(uuid, statusToDisplay);
            }
            if (window.RoomMiniVideoModule && typeof window.RoomMiniVideoModule.updateStatusIfActive === 'function') {
                window.RoomMiniVideoModule.updateStatusIfActive(uuid, statusToDisplay);
            }
        },
        onRemoteDisconnected(id) {
            const user = this.peerInfo[id];
            if (user) {
                ui.showToast(`${user.nickname} ได้ออกจากห้อง`, 'leave');
                delete this.peerInfo[id];
                ui.removeVideo(id);
            }
        },
        openYoutubeModal() {
            if (streamManager.openYoutubeModal) {
                 streamManager.openYoutubeModal();
            }
             else {
                console.warn("YouTube module not ready or missing openModal function.");
                Swal.fire('YouTube Module Missing', 'ไม่สามารถเปิด YouTube ได้ในขณะนี้', 'warning');
            }
        }
    };

    // --- Initializer (ตัวเริ่มการทำงาน) ---
    function initialize() {
        window.streamManager = manager;
        window.UIManager = ui; // --- [เพิ่ม] ทำให้ UIManager เป็น Global ---
        const modules = [
            'RoomCameraSwitchModule',
            'RoomShareScreenModule',
            'RoomReconnectModule',
            'RoomKickModule',
            'UploadModule',
            'ScreenshotModule',
            'HistoryModule',
            'RecordingModule',
            'RoomLogsModule',
            'RoomMiniVideoFeatureModule',
            'RoomYoutubeModule'
        ];
        modules.forEach(modName => {
            if (window[modName]?.install) {
                try {
                    window[modName].install({ streamManager: manager, UIManager: ui, PeerManager: peers, APIHandler: API });
                } catch (e) {
                    console.error(`เกิดข้อผิดพลาดในการติดตั้งโมดูล ${modName}:`, e);
                }
            }
        });

        // --- จุดแก้ไข: เพิ่ม Event Listener สำหรับ Fullscreen และควบคุม Controls Bar ---
        let fullscreenControlsTimer = null;
        function showFullscreenControlsBar() {
            const controlsBarEl = document.getElementById('controls-bar');
            if (!controlsBarEl) return;
            controlsBarEl.classList.add('fullscreen-visible');
            if (fullscreenControlsTimer) clearTimeout(fullscreenControlsTimer);
            fullscreenControlsTimer = setTimeout(() => {
                controlsBarEl.classList.remove('fullscreen-visible');
            }, 2500);
        }
        document.addEventListener('fullscreenchange', () => {
            // Refresh all statuses on fullscreen enter or exit
            const myStatus = manager.getCurrentStatus();
            ui.updateStatus(window.appConfig.MY_USER_INFO.uuid, myStatus);

            for (const uuid in manager.peerInfo) {
                if (manager.peerInfo[uuid].status) {
                    ui.updateStatus(uuid, manager.peerInfo[uuid].status);
                }
            }
            // Show controls briefly when entering fullscreen
            if (document.fullscreenElement) {
                showFullscreenControlsBar();
            }
        });
        // Show/hide controls on user activity during fullscreen
        ['mousemove','touchstart','touchmove','keydown'].forEach(evt => {
            document.addEventListener(evt, () => {
                if (document.fullscreenElement) showFullscreenControlsBar();
            }, { passive: true });
        });

        const toggleControlsBtn = document.getElementById('toggle-controls-btn');
        const controlsBar = document.getElementById('controls-bar');
        if(toggleControlsBtn && controlsBar){
            toggleControlsBtn.addEventListener('click', () => controlsBar.classList.toggle('collapsed'));
        }

        const ownerLogsBtn = document.getElementById('owner-logs-btn');
        if(ownerLogsBtn && typeof manager.showLogs === 'function'){
            ownerLogsBtn.addEventListener('click', (e) => { e.preventDefault(); manager.showLogs(); });
        }
        const ownerCaptureBtn = document.getElementById('owner-capture-btn');
        if(ownerCaptureBtn && typeof manager.handleCaptureButtonClick === 'function'){
            ownerCaptureBtn.addEventListener('click', (e) => { e.preventDefault(); manager.handleCaptureButtonClick(); });
        }
        const ownerHistoryBtn = document.getElementById('owner-history-btn');
        if(ownerHistoryBtn && typeof manager.showHistory === 'function'){
            ownerHistoryBtn.addEventListener('click', (e) => { e.preventDefault(); manager.showHistory(); });
        }

        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                // Default to toggle fullscreen on your own video container
                window.UIManager.toggleFullScreen(window.appConfig.MY_USER_INFO.uuid);
            });
        }

        manager.start();
    }

    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', initialize) : initialize();
})();