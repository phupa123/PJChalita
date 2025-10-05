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
    };

    // --- UI Manager (จัดการหน้าเว็บ) ---
    const ui = (() => {
        const els = { 
            grid: document.getElementById('video-grid'), 
            toastContainer: document.getElementById('toast-container'),
            statusOverlay: document.getElementById('status-overlay'),
            statusText: document.getElementById('status-text'),
            statusIcon: document.getElementById('status-icon'),
            trustLink: document.getElementById('trust-link'),
            micBtn: document.getElementById('mic-btn'), 
            camBtn: document.getElementById('cam-btn'), 
            screenBtn: document.getElementById('screen-share-btn'), 
            switchCamBtn: document.getElementById('switch-cam-btn'),
            miniModeBtn: document.getElementById('mini-mode-btn'),
            hangUpBtn: document.getElementById('hang-up-btn'),
        };
        return {
            updateConnectionStatus(type, message) {
                if (!els.statusOverlay || !els.statusText || !els.statusIcon) return;
                
                const iconClasses = { connecting: 'bi-broadcast', connected: 'bi-check-circle', error: 'bi-wifi-off', reconnecting: 'bi-arrow-clockwise' };
                els.statusIcon.className = `bi ${iconClasses[type] || 'bi-question-circle'}`;
                els.statusIcon.classList.toggle('anim-pulse', type === 'connecting' || type === 'reconnecting');
                els.statusText.textContent = message;

                els.statusOverlay.classList.remove('fade-out');
                els.statusOverlay.style.display = 'flex';

                if (type === 'connected') {
                    setTimeout(() => {
                        if(els.statusOverlay) {
                            els.statusOverlay.classList.add('fade-out');
                            // Hide completely after animation
                            setTimeout(() => { els.statusOverlay.style.display = 'none'; }, 500);
                        }
                    }, 1000); // Show "success" for 1 second before fading
                    if (els.trustLink) els.trustLink.style.display = 'none';
                }
            },
            showTrustLink() { 
                if (els.trustLink) els.trustLink.style.display = 'inline-flex';
            },
            showToast(message, type = 'info') {
                if (!els.toastContainer) return;
                const toast = document.createElement('div');
                toast.className = `toast-notification ${type}`;
                const iconClass = type === 'join' ? 'bi-person-plus-fill' : 'bi-person-dash-fill';
                toast.innerHTML = `<i class="bi ${iconClass}"></i> ${message}`;
                els.toastContainer.prepend(toast);
                setTimeout(() => {
                    toast.style.animation = 'toastOut 0.5s forwards';
                    setTimeout(() => toast.remove(), 500);
                }, 4000);
            },
            addVideo(uuid, stream, name, isLocal, avatarUrl) {
                if (!els.grid) return;
                let box = document.getElementById(uuid);
                if (box) { 
                    const vid = box.querySelector('video'); 
                    if (vid && stream) {
                        vid.srcObject = stream;
                        vid.play().catch(e => {});
                    }
                    return; 
                }
                box = document.createElement('div');
                box.id = uuid;
                box.className = 'video-container';
                if (isLocal) box.classList.add('mirror');
                
                box.innerHTML = `
                    <video playsinline autoplay ${isLocal ? 'muted' : ''}></video>
                    <div class="video-overlay">
                        <div class="status-icons">
                            <i class="bi bi-mic-mute-fill icon-mic-muted" style="display:none;"></i>
                            <i class="bi bi-camera-video-off-fill icon-cam-off" style="display:none;"></i>
                        </div>
                        <div class="name-tag">${isLocal ? `${name} (คุณ)` : name}</div>
                    </div>
                    <div class="camera-off-overlay">
                        <img src="${avatarUrl || ''}" class="avatar-placeholder" alt="Avatar">
                    </div>
                `;

                if (stream) {
                    const videoElement = box.querySelector('video');
                    videoElement.srcObject = stream;
                }
                els.grid.append(box);
            },
            updateStatus(uuid, status) {
                const box = document.getElementById(uuid);
                if (!box) return;
                const micIcon = box.querySelector('.icon-mic-muted');
                const camIcon = box.querySelector('.icon-cam-off');
                const overlay = box.querySelector('.camera-off-overlay');
                const isCamOff = !status.isVideoEnabled;

                if (micIcon) micIcon.style.display = status.isAudioEnabled ? 'none' : 'inline-block';
                if (camIcon) camIcon.style.display = isCamOff ? 'inline-block' : 'none';
                if (overlay) overlay.classList.toggle('visible', isCamOff);
            },
            removeVideo(uuid) { const box = document.getElementById(uuid); if (box) box.remove(); },
            updateMic(isEnabled) {
                if (!els.micBtn) return;
                els.micBtn.classList.toggle('active', isEnabled);
                els.micBtn.querySelector('i').className = isEnabled ? 'bi bi-mic-fill' : 'bi bi-mic-mute-fill';
            },
            updateCam(isEnabled) {
                if (!els.camBtn) return;
                els.camBtn.classList.toggle('active', isEnabled);
                els.camBtn.querySelector('i').className = isEnabled ? 'bi bi-camera-video-fill' : 'bi bi-camera-video-off-fill';
            },
            updateScreenShareButton(isSharing) {
                if (!els.screenBtn) return;
                els.screenBtn.classList.toggle('active', isSharing);
            }
        };
    })();

    // --- Peer Manager ---
    const peers = (() => {
        let peer = null;

        return {
            init(myInfo, onReady) {
                if (peer && !peer.destroyed) peer.destroy();
                let peerOptions;
                const commonPeerConfig = { key: 'peerjs', path: '/' };

                if (window.appConfig.REMOTE_PEER_SERVER_HOST) {
                    peerOptions = { ...commonPeerConfig, host: window.appConfig.REMOTE_PEER_SERVER_HOST, port: 443, secure: true };
                } else if (window.appConfig.LOCAL_PEER_SERVER_IP) {
                    peerOptions = { ...commonPeerConfig, host: window.appConfig.LOCAL_PEER_SERVER_IP, port: 9000, secure: window.location.protocol === 'https:' };
                } else {
                    peerOptions = { ...commonPeerConfig, host: 'peerjs.929292.xyz', port: 443, secure: true };
                }
                
                peer = new window.Peer(myInfo.uuid, peerOptions);
                peer.on('open', () => onReady(peer));
                peer.on('error', e => window.streamManager.onPeerError(e));
                peer.on('disconnected', () => window.streamManager.onPeerDisconnected());
                peer.on('close', () => { window.streamManager.onPeerClosed(); peer = null; });
                peer.on('call', call => window.streamManager.handleIncomingCall(call));
            },
            connectTo: (remoteInfo, myInfo, stream) => {
                if (!peer || !remoteInfo) return;
                ui.addVideo(remoteInfo.uuid, null, remoteInfo.nickname || remoteInfo.uuid, false, remoteInfo.avatar_url);
                const call = peer.call(remoteInfo.uuid, stream, { metadata: myInfo });
                call.on('stream', remoteStream => window.streamManager.onRemoteStreamAvailable(remoteInfo.uuid, remoteInfo, remoteStream));
            },
            replaceTrack: (newTrack) => {
                 for (const conn of Object.values(peer.connections)) {
                    conn.forEach(c => {
                        const sender = c.peerConnection?.getSenders().find(s => s.track?.kind === newTrack.kind);
                        if (sender) sender.replaceTrack(newTrack).catch(err => console.error("Failed to replace track:", err));
                    });
                }
            },
            getPeer: () => peer
        };
    })();

    // --- Stream Manager (Core Logic) ---
    const manager = {
        myStream: null,
        myScreenStream: null,
        isScreenSharing: false,
        peer: null,
        peerInfo: {},
        isLeaving: false,
        reconnectTimer: null,
        isReconnecting: false,
        availableVideoDevices: [],
        currentDeviceIndex: 0,
        isSwitchingCamera: false,

        async start() {
            this.setupControls();
            ui.addVideo(window.appConfig.MY_USER_INFO.uuid, null, window.appConfig.MY_USER_INFO.nickname, true, window.appConfig.MY_USER_INFO.avatar);
            
            try {
                const constraints = { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true };
                this.myStream = await navigator.mediaDevices.getUserMedia(constraints);
                ui.addVideo(window.appConfig.MY_USER_INFO.uuid, this.myStream, window.appConfig.MY_USER_INFO.nickname, true, window.appConfig.MY_USER_INFO.avatar);
                ui.updateStatus(window.appConfig.MY_USER_INFO.uuid, this.getCurrentStatus());
            } catch (e) {
                console.error("Could not access camera/mic:", e);
                ui.updateStatus(window.appConfig.MY_USER_INFO.uuid, { isAudioEnabled: false, isVideoEnabled: false });
                Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเข้าถึงกล้องหรือไมโครโฟนได้', 'error');
            }
            
            this.performFullReconnect();
            window.addEventListener('beforeunload', () => this.leave());
            this.populateDeviceList(); // Populate camera list early
        },

        setupControls() {
            const controls = {
                toggleAudio: () => this.toggleAudio(),
                toggleVideo: () => this.toggleVideo(),
                shareScreen: () => this.shareScreen(),
                cycleCamera: () => this.cycleCamera(),
                toggleMiniMode: () => this.toggleMiniMode(),
                leave: () => this.leave(),
                fullscreen: (id) => { const el = document.getElementById(id); if (el) el.requestFullscreen(); }
            };
            document.getElementById('mic-btn')?.addEventListener('click', controls.toggleAudio);
            document.getElementById('cam-btn')?.addEventListener('click', controls.toggleVideo);
            document.getElementById('screen-share-btn')?.addEventListener('click', controls.shareScreen);
            document.getElementById('switch-cam-btn')?.addEventListener('click', controls.cycleCamera);
            document.getElementById('mini-mode-btn')?.addEventListener('click', controls.toggleMiniMode);
            document.getElementById('hang-up-btn')?.addEventListener('click', controls.leave);
            document.getElementById('video-grid')?.addEventListener('dblclick', (e) => {
                const box = e.target.closest('.video-container');
                if (box && box.querySelector('video')?.srcObject) controls.fullscreen(box.id);
            });
        },
        
        performFullReconnect() {
            if (this.isReconnecting || this.isLeaving) return;
            ui.updateConnectionStatus('connecting', 'กำลังเชื่อมต่อห้องสนทนา...');
            this.isReconnecting = true;
            
            Object.keys(this.peerInfo).forEach(uuid => ui.removeVideo(uuid));
            this.peerInfo = {};

            peers.init(window.appConfig.MY_USER_INFO, (newPeer) => {
                this.peer = newPeer;
                this.onPeerConnected();
                this.joinRoomWithServer();
            });
        },

        async joinRoomWithServer() {
            const res = await API.join(window.appConfig.ROOM_ID);
            if (res.status === 'success' && Array.isArray(res.peers)) {
                 ui.updateConnectionStatus('connected', 'เชื่อมต่อเรียบร้อยแล้ว');
                res.peers.forEach(p => {
                    if (p.uuid !== window.appConfig.MY_USER_INFO.uuid) {
                        this.peerInfo[p.uuid] = { nickname: p.nickname, rank: p.rank, avatar: p.avatar_url };
                        peers.connectTo(p, window.appConfig.MY_USER_INFO, this.myStream);
                    }
                });
            } else {
                 ui.updateConnectionStatus('error', res.message || 'เข้าร่วมห้องไม่สำเร็จ');
                 setTimeout(() => this.leave(), 3000);
            }
        },

        leave() {
            if (this.isLeaving) return;
            this.isLeaving = true;
            this.myStream?.getTracks().forEach(track => track.stop());
            this.myScreenStream?.getTracks().forEach(track => track.stop());
            peers.getPeer()?.destroy();
            API.leave(window.appConfig.ROOM_ID);
            window.location.href = 'VideoCall.php';
        },

        toggleVideo() {
            const track = this.myStream?.getVideoTracks()[0];
            if (track) {
                track.enabled = !track.enabled;
                const status = this.getCurrentStatus();
                ui.updateCam(status.isVideoEnabled);
                ui.updateStatus(window.appConfig.MY_USER_INFO.uuid, status);
            }
        },

        toggleAudio() {
            const track = this.myStream?.getAudioTracks()[0];
            if (track) {
                track.enabled = !track.enabled;
                const status = this.getCurrentStatus();
                ui.updateMic(status.isAudioEnabled);
                ui.updateStatus(window.appConfig.MY_USER_INFO.uuid, status);
            }
        },

        async shareScreen() {
            if (this.isScreenSharing) {
                this.myScreenStream?.getTracks().forEach(track => track.stop());
                peers.replaceTrack(this.myStream.getVideoTracks()[0]);
                this.isScreenSharing = false;
                ui.updateScreenShareButton(false);
                return;
            }
            try {
                this.myScreenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
                peers.replaceTrack(this.myScreenStream.getVideoTracks()[0]);
                this.isScreenSharing = true;
                ui.updateScreenShareButton(true);

                this.myScreenStream.getVideoTracks()[0].onended = () => {
                    if (this.isScreenSharing) this.shareScreen();
                };
            } catch (err) {
                console.error("Screen share failed:", err);
                Swal.fire('แชร์หน้าจอไม่สำเร็จ', 'คุณอาจจะไม่ได้ให้สิทธิ์ในการแชร์หน้าจอ', 'error');
            }
        },

        async populateDeviceList() {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                this.availableVideoDevices = devices.filter(device => device.kind === 'videoinput');
                const switchBtn = document.getElementById('switch-cam-btn');
                if (switchBtn) switchBtn.style.display = this.availableVideoDevices.length > 1 ? 'flex' : 'none';
            } catch(e) { console.error("Could not list devices:", e); }
        },

        async cycleCamera() {
            if(this.availableVideoDevices.length < 2) await this.populateDeviceList();
            if(this.availableVideoDevices.length < 2) return;
            
            const nextIndex = (this.currentDeviceIndex + 1) % this.availableVideoDevices.length;
            this.switchToDevice(this.availableVideoDevices[nextIndex].deviceId);
        },

        async switchToDevice(deviceId) {
            if (this.isSwitchingCamera || !this.myStream) return;
            this.isSwitchingCamera = true;
            try {
                const newStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
                const newTrack = newStream.getVideoTracks()[0];
                const oldTrack = this.myStream.getVideoTracks()[0];
                this.myStream.removeTrack(oldTrack);
                oldTrack.stop();
                this.myStream.addTrack(newTrack);
                peers.replaceTrack(newTrack);
                
                const myVideoEl = document.querySelector(`#${window.appConfig.MY_USER_INFO.uuid} video`);
                if(myVideoEl) myVideoEl.srcObject = new MediaStream([newTrack, ...this.myStream.getAudioTracks()]);
                
                this.currentDeviceIndex = this.availableVideoDevices.findIndex(d => d.deviceId === deviceId);
            } catch(e) {
                console.error("Failed to switch camera:", e);
                Swal.fire('ผิดพลาด', 'ไม่สามารถสลับกล้องได้', 'error');
            } finally {
                this.isSwitchingCamera = false;
            }
        },
        
        async toggleMiniMode() {
            const myVideoEl = document.querySelector(`#${window.appConfig.MY_USER_INFO.uuid} video`);
            if (!myVideoEl || !document.pictureInPictureEnabled) {
                return Swal.fire('ไม่รองรับ', 'โหมดหน้าต่างลอยไม่รองรับในเบราว์เซอร์นี้', 'info');
            }
            try {
                if (document.pictureInPictureElement) await document.exitPictureInPicture();
                else await myVideoEl.requestPictureInPicture();
            } catch (e) { console.error('PiP failed:', e); }
        },

        onPeerConnected() {
            this.isReconnecting = false;
            clearTimeout(this.reconnectTimer);
        },

        onPeerDisconnected() {
            if (this.isReconnecting || this.isLeaving) return;
            this.isReconnecting = true;
            let countdown = 3;
            const updateMessage = () => {
                ui.updateConnectionStatus('reconnecting', `การเชื่อมต่อหลุด! กำลังเชื่อมต่อใหม่อีกครั้งใน ${countdown}...`);
                countdown--;
            };
            updateMessage();
            const interval = setInterval(updateMessage, 1000);
            this.reconnectTimer = setTimeout(() => {
                clearInterval(interval);
                this.performFullReconnect();
            }, 3000);
        },
        
        onPeerClosed() { if (!this.isLeaving) this.onPeerDisconnected(); },
        
        onPeerError(err) {
            console.error("PeerJS Error:", err);
            if (err.type === 'unavailable-id') {
                ui.updateConnectionStatus('error', 'ID ของคุณกำลังถูกใช้งาน, กำลังลองเชื่อมต่อใหม่อีกครั้ง...');
                setTimeout(() => this.performFullReconnect(), 2000);
                return;
            }
            if (err.type === 'websocket-error' || err.type === 'network' || err.type === 'server-error') {
                this.isLeaving = true;
                ui.showTrustLink();
                ui.updateConnectionStatus('error', 'เชื่อมต่อเซิร์ฟเวอร์วิดีโอคอลล้มเหลว');
            }
        },

        handleIncomingCall(call) {
             call.answer(this.myStream);
             call.on('stream', remoteStream => {
                 const info = call.metadata || {};
                 this.onRemoteStreamAvailable(call.peer, info, remoteStream);
             });
        },
        
        getMyVideoStream() { return this.myStream; },
        getCurrentStatus() {
            const audioTrack = this.myStream?.getAudioTracks()[0];
            const videoTrack = this.myStream?.getVideoTracks()[0];
            return {
                isAudioEnabled: !!audioTrack?.enabled,
                isVideoEnabled: !!videoTrack?.enabled,
            };
        },
        onRemoteStreamAvailable(id, info, stream) {
            if (!this.peerInfo[id]) {
                this.peerInfo[id] = { nickname: info.nickname, rank: info.rank, avatar: info.avatar_url };
                ui.showToast(`${info.nickname} ได้เข้าร่วมห้อง`, 'join');
            }
            this.peerInfo[id].stream = stream;
            ui.addVideo(id, stream, info.nickname || id, false, this.peerInfo[id].avatar);
        },
        onRemoteStatusUpdate(uuid, status) {
            if (this.peerInfo[uuid]) this.peerInfo[uuid].status = status;
            ui.updateStatus(uuid, status);
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

    // --- Initializer ---
    window.addEventListener('DOMContentLoaded', () => {
        window.streamManager = manager;
        manager.start();
    });

})();