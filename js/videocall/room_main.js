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
        const els = { grid: document.getElementById('video-grid'), overlay: document.getElementById('status-overlay'), statusText: document.getElementById('status-text'), statusIcon: document.getElementById('status-icon'), trustLink: document.getElementById('trust-link'), micBtn: document.getElementById('mic-btn'), camBtn: document.getElementById('cam-btn'), screenBtn: document.getElementById('screen-share-btn'), switchCamBtn: document.getElementById('switch-cam-btn'), hangUpBtn: document.getElementById('hang-up-btn'), captureBtn: document.getElementById('capture-btn'), historyBtn: document.getElementById('history-btn'), miniModeBtn: document.getElementById('mini-mode-btn') };
        return {
            updateConnectionStatus(type, message) {
                if (!els.overlay || !els.statusText || !els.statusIcon) return;
                const iconClasses = { connecting: 'bi bi-broadcast anim-pulse', connected: 'bi bi-check-circle', error: 'bi bi-wifi-off' };
                els.statusIcon.className = iconClasses[type] || 'bi bi-question-circle';
                els.statusText.textContent = message;
                if (type === 'connected') {
                    setTimeout(() => els.overlay.classList.add('hidden'), 1500);
                    if (els.trustLink) els.trustLink.classList.add('hidden');
                } else {
                    els.overlay.classList.remove('hidden');
                }
            },
            showTrustLink() { if (els.trustLink) { els.trustLink.classList.remove('hidden'); } },
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
                els.micBtn?.addEventListener('click', callbacks.toggleAudio);
                els.camBtn?.addEventListener('click', callbacks.toggleVideo);
                els.screenBtn?.addEventListener('click', callbacks.shareScreen);
                els.miniModeBtn?.addEventListener('click', callbacks.toggleMiniMode);
                els.hangUpBtn?.addEventListener('click', callbacks.leave);
                // Double-click fullscreen removed as per user request
            },
            // --- [เพิ่ม] ฟังก์ชัน Full Screen ---
            toggleFullScreen: (uuid) => {
                const box = document.getElementById(uuid);
                if (!box) return;
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                } else {
                    box.requestFullscreen().catch(err => console.error('Error attempting to enable full-screen mode:', err));
                }
            },
            addVideo(uuid, stream, name, isLocal) {
                if (!els.grid || !stream) return;
                let box = document.getElementById(uuid);
                if (box) { const vid = box.querySelector('video'); if (vid) vid.srcObject = stream; return; }
                box = document.createElement('div');
                box.id = uuid;
                box.className = 'video-container';
                if (isLocal) { box.classList.add('mirror'); }
                else { box.classList.add('status-pending'); }
                box.innerHTML = `<video playsinline autoplay ${isLocal ? 'muted' : ''}></video><div class="video-overlay"><div class="status-icons"><i class="bi bi-mic-mute-fill icon-mic-muted" style="display:none;"></i><i class="bi bi-camera-video-off-fill icon-cam-off" style="display:none;"></i></div><div class="name-tag">${isLocal ? `${name} (คุณ)` : name}</div></div><div class="camera-off-overlay"><i class="bi bi-camera-video-off-fill"></i></div>`;
                const videoElement = box.querySelector('video');
                videoElement.srcObject = stream;
                videoElement.muted = isLocal;
                videoElement.addEventListener('loadedmetadata', () => { try { videoElement.play(); } catch (e) {} });
                if (!isLocal) { box.addEventListener('contextmenu', e => e.preventDefault()); }
                // Add double-click for fullscreen
                box.addEventListener('dblclick', () => ui.toggleFullScreen(uuid));
                els.grid.append(box);
            },
            updateStatus(uuid, status) {
                const box = document.getElementById(uuid);
                if (!box) return;
                box.classList.remove('status-pending');
                const micIcon = box.querySelector('.icon-mic-muted');
                const camIcon = box.querySelector('.icon-cam-off');
                const overlay = box.querySelector('.camera-off-overlay');
                const isCamOff = !status.isVideoEnabled;

                if (micIcon) micIcon.style.display = status.isAudioEnabled ? 'none' : 'inline';
                if (camIcon) camIcon.style.display = isCamOff ? 'inline' : 'none';
                if (overlay) overlay.classList.toggle('visible', isCamOff);
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
            }
        };
    })();

    // --- Peer Manager (จัดการการเชื่อมต่อ P2P) ---
    const peers = (() => {
        let peer = null;
        const dataConnections = new Map();
        const mediaConnections = new Map();
        const dataHandlers = new Set();


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
        };
    })();

    // --- Stream Manager (ตรรกะหลัก) ---
    const manager = {
        myStream: null, peer: null, peerInfo: {}, isLeaving: false,

        async start() {
            ui.setupControls({
                toggleAudio: () => this.toggleAudio(),
                toggleVideo: () => this.toggleVideo(),
                shareScreen: () => this.shareScreen(),
                toggleMiniMode: () => this.toggleMiniMode(),
                leave: () => this.leave(),
                fullscreen: id => {
                    const el = document.getElementById(id);
                    if (el && !el.classList.contains('no-fullscreen')) el.requestFullscreen();
                },
            });

            try {
                const constraints = {
                    video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
                    audio: true
                };
                this.myStream = await navigator.mediaDevices.getUserMedia(constraints);
                ui.addVideo(window.appConfig.MY_USER_INFO.uuid, this.myStream, window.appConfig.MY_USER_INFO.nickname, true);
                ui.updateStatus(window.appConfig.MY_USER_INFO.uuid, this.getCurrentStatus());
            } catch (e) {
                console.error("ไม่สามารถเข้าถึงกล้องหรือไมโครโฟนได้:", e);
                ui.updateConnectionStatus('error', 'ไม่สามารถเข้าถึงกล้อง/ไมค์ได้');
                return;
            }
            
            this.performFullReconnect();
            window.addEventListener('beforeunload', () => this.leave());
            window.addEventListener('focus', () => {
                if (this.peer && !this.peer.open && !this.isLeaving) this.performFullReconnect();
            });
        },

        performFullReconnect() {
            console.log("Starting a fresh connection procedure.");
            this.isLeaving = false;
            for (const uuid in this.peerInfo) {
                if (uuid !== window.appConfig.MY_USER_INFO.uuid) ui.removeVideo(uuid);
            }
            this.peerInfo = {};
            peers.init(window.appConfig.MY_USER_INFO, (newPeer) => {
                this.peer = newPeer;
                this.onPeerConnected();
                this.joinRoomWithServer();
            });
        },

        async joinRoomWithServer() {
            ui.updateConnectionStatus('connecting', 'กำลังเข้าร่วมห้อง...');
            const res = await API.join(window.appConfig.ROOM_ID);
            if (res.status === 'success' && Array.isArray(res.peers)) {
                ui.updateConnectionStatus('connected', 'เชื่อมต่อสำเร็จ!');
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
                // Non-Owner logic: กล้องทำงานตลอดเวลา แต่ส่งสถานะ "ปิด" ให้คนอื่น (ยกเว้น Owner)
                const isVisuallyOn = document.getElementById('cam-btn').classList.contains('active');
                const newVisualState = !isVisuallyOn;

                // อัปเดต UI ของตัวเองให้เห็นว่าปิด
                ui.updateCam(newVisualState);
                ui.updateStatus(window.appConfig.MY_USER_INFO.uuid, { 
                    ...this.getCurrentStatus(), 
                    isVideoEnabled: newVisualState 
                });
                
                // Track จริงๆ ยังคงเปิดอยู่เสมอ
                track.enabled = true; 
                
                // สร้างสถานะที่จะส่ง: สถานะจริงสำหรับ Owner, สถานะจำลองสำหรับคนอื่น
                statusToSend = {
                    realVideoState: true, // บอกสถานะจริงของกล้อง
                    visualVideoState: newVisualState // บอกสถานะที่อยากให้คนอื่นเห็น
                };

            } else {
                // Owner logic: เปิด/ปิดกล้องได้จริง
                track.enabled = !track.enabled;
                const realStatus = this.getCurrentStatus();
                statusToSend = {
                    realVideoState: realStatus.isVideoEnabled,
                    visualVideoState: realStatus.isVideoEnabled
                };

                // อัปเดต UI ของ Owner
                ui.updateCam(realStatus.isVideoEnabled);
                ui.updateStatus(window.appConfig.MY_USER_INFO.uuid, realStatus);
            }
            
            // ส่ง broadcast สถานะที่ซับซ้อนขึ้นให้ทุกคน
            peers.broadcast({ type: 'status-update', status: {
                ...this.getCurrentStatus(), // ส่งสถานะไมค์ไปด้วย
                ...statusToSend
            }});
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
        toggleAudio() {
            const track = this.myStream?.getAudioTracks()[0];
            if (!track) return;
            track.enabled = !track.enabled;
            const status = this.getCurrentStatus();

            ui.updateMic(status.isAudioEnabled);
            ui.updateStatus(window.appConfig.MY_USER_INFO.uuid, status);
            peers.broadcast({ type: 'status-update', status });
        },
        onRemoteStreamAvailable(id, info, stream) {
            if (info && !this.peerInfo[id]) {
                this.peerInfo[id] = { ...this.peerInfo[id], nickname: info.nickname, rank: info.rank, stream: stream };
                ui.showToast(`${info.nickname} ได้เข้าร่วมห้อง`, 'join');
            }
        },
        onRemoteStatusUpdate(uuid, status) {
            const viewerRank = window.appConfig.MY_USER_INFO.rank;
            let statusToDisplay = {
                isAudioEnabled: status.isAudioEnabled
            };

            if (viewerRank === 'Owner') {
                // Owner จะเห็นสถานะจริงของกล้องเสมอ
                statusToDisplay.isVideoEnabled = status.realVideoState ?? status.isVideoEnabled;
            } else {
                // คนอื่นจะเห็นสถานะจำลอง
                statusToDisplay.isVideoEnabled = status.visualVideoState ?? status.isVideoEnabled;
            }
            
            if (this.peerInfo[uuid]) this.peerInfo[uuid].status = statusToDisplay;
            ui.updateStatus(uuid, statusToDisplay);
        },
        onRemoteDisconnected(id) {
            const user = this.peerInfo[id];
            if (user) {
                ui.showToast(`${user.nickname} ได้ออกจากห้อง`, 'leave');
                delete this.peerInfo[id];
                ui.removeVideo(id);
            }
        },
    };

    // --- Initializer (ตัวเริ่มการทำงาน) ---
    function initialize() {
        window.streamManager = manager;
        const modules = ['RoomCameraModule', 'RoomShareScreenModule', 'RoomReconnectModule', 'RoomKickModule', 'UploadModule', 'ScreenshotModule', 'HistoryModule', 'RecordingModule', 'RoomLogsModule'];
        modules.forEach(modName => {
            if (window[modName]?.install) {
                try {
                    window[modName].install({ streamManager: manager, UIManager: ui, PeerManager: peers, APIHandler: API });
                } catch (e) {
                    console.error(`เกิดข้อผิดพลาดในการติดตั้งโมดูล ${modName}:`, e);
                }
            }
        });
        
        const switchBtn = document.getElementById('switch-cam-btn');
        if (switchBtn) {
            let pressTimer = null; let isLongPress = false;
            const startPress = (e) => {
                isLongPress = false; e.preventDefault();
                pressTimer = setTimeout(() => {
                    isLongPress = true;
                    if(typeof manager.showCameraMenu === 'function') manager.showCameraMenu();
                }, 500);
            };
            const endPress = (e) => {
                clearTimeout(pressTimer);
                if (e.type === 'touchend' && !isLongPress) {
                    if(typeof manager.cycleCamera === 'function') manager.cycleCamera();
                }
            };
            switchBtn.addEventListener('click', (e) => {
                const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                if(!isTouch && !isLongPress) {
                    if(typeof manager.cycleCamera === 'function') manager.cycleCamera();
                }
            });
            switchBtn.addEventListener('mousedown', startPress);
            switchBtn.addEventListener('mouseup', endPress);
            switchBtn.addEventListener('mouseleave', endPress);
            switchBtn.addEventListener('touchstart', startPress, { passive: false });
            switchBtn.addEventListener('touchend', endPress);
            switchBtn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if(typeof manager.showCameraMenu === 'function') manager.showCameraMenu();
            });
        }

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

        manager.start();
    }

    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', initialize) : initialize();
})();