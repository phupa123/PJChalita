// PJChalita/js/videocall/room_camera.js

(function () {
    function install({ streamManager, PeerManager }) {
        if (!streamManager || !PeerManager) {
            console.error("CameraModule installation failed: Missing required managers.");
            return;
        }

        streamManager.availableVideoDevices = [];
        streamManager.currentDeviceIndex = 0;
        streamManager.isSwitchingCamera = false;

        streamManager.populateDeviceList = async function() {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                    throw new Error("enumerateDevices() not supported.");
                }
                const devices = await navigator.mediaDevices.enumerateDevices();
                this.availableVideoDevices = devices.filter(device => device.kind === 'videoinput');
                
                const switchBtn = document.getElementById('switch-cam-btn');
                if (switchBtn) {
                    switchBtn.style.display = this.availableVideoDevices.length > 1 ? 'flex' : 'none';
                }
                
                const currentTrack = this.myStream?.getVideoTracks()[0];
                if(currentTrack) {
                    const currentDeviceId = currentTrack.getSettings().deviceId;
                    this.currentDeviceIndex = this.availableVideoDevices.findIndex(d => d.deviceId === currentDeviceId);
                }
            } catch(e) { console.error("Could not list devices:", e); }
        };

        streamManager.cycleCamera = async function () {
            if(this.availableVideoDevices.length < 2) await this.populateDeviceList();
            if(this.availableVideoDevices.length < 2) return;
            
            const nextIndex = (this.currentDeviceIndex + 1) % this.availableVideoDevices.length;
            this.switchToDevice(this.availableVideoDevices[nextIndex].deviceId);
        };

        streamManager.switchToDevice = async function(deviceId) {
            if (this.isSwitchingCamera || !this.myStream) return;
            this.isSwitchingCamera = true;
            try {
                const constraints = { video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false };
                const newMediaStream = await navigator.mediaDevices.getUserMedia(constraints);
                const newVideoTrack = newMediaStream.getVideoTracks()[0];
                
                const oldVideoTrack = this.myStream.getVideoTracks()[0];
                this.myStream.removeTrack(oldVideoTrack);
                oldVideoTrack.stop();
                this.myStream.addTrack(newVideoTrack);
                
                PeerManager.replaceTrack(newVideoTrack);
                
                const myVideoEl = document.querySelector(`#${window.appConfig.MY_USER_INFO.uuid} video`);
                if(myVideoEl) myVideoEl.srcObject = new MediaStream([newVideoTrack, ...this.myStream.getAudioTracks()]);
                
                this.currentDeviceIndex = this.availableVideoDevices.findIndex(d => d.deviceId === deviceId);
            } catch(e) {
                console.error("Failed to switch camera:", e);
                Swal.fire('ผิดพลาด', 'ไม่สามารถสลับกล้องได้', 'error');
            } finally {
                this.isSwitchingCamera = false;
            }
        };
        
        streamManager.toggleMiniMode = async function() {
            const myVideoEl = document.querySelector(`#${window.appConfig.MY_USER_INFO.uuid} video`);
            if (!myVideoEl || !document.pictureInPictureEnabled) {
                return Swal.fire('ไม่รองรับ', 'โหมดหน้าต่างลอยไม่รองรับในเบราว์เซอร์นี้', 'info');
            }
            try {
                if (document.pictureInPictureElement) await document.exitPictureInPicture();
                else await myVideoEl.requestPictureInPicture();
            } catch (e) { console.error('PiP failed:', e); }
        };

        // Initial scan
        setTimeout(() => streamManager.populateDeviceList(), 2000);
    }

    window.RoomCameraModule = { install };
})();