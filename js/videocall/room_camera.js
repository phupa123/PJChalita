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
                // Get reference to video element
                const myVideoEl = document.querySelector(`#${window.appConfig.MY_USER_INFO.uuid} video`);
                if (!myVideoEl) throw new Error("Video element not found");

                // Pause video and clear srcObject to release camera
                myVideoEl.pause();
                myVideoEl.srcObject = null;

                // Stop all existing video tracks completely
                const oldVideoTracks = this.myStream.getVideoTracks();
                oldVideoTracks.forEach(track => {
                    track.stop();
                    this.myStream.removeTrack(track);
                });

                // Force garbage collection hint and wait for camera release
                if (window.gc) window.gc();
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Get new video stream with retry logic
                let newVideoStream;
                let retries = 5;
                const videoConstraints = {
                    deviceId: { exact: deviceId },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                };

                while (retries > 0) {
                    try {
                        newVideoStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
                        break;
                    } catch (retryError) {
                        retries--;
                        console.log(`Camera access failed, retrying... (${retries} attempts left)`, retryError);
                        if (retries > 0) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                        } else {
                            throw retryError;
                        }
                    }
                }

                const newVideoTrack = newVideoStream.getVideoTracks()[0];
                if (!newVideoTrack) throw new Error("No video track in new stream");

                // Add the new video track to the existing stream
                this.myStream.addTrack(newVideoTrack);

                // Update video element with the complete stream
                myVideoEl.srcObject = this.myStream;

                // Ensure video plays
                try {
                    await myVideoEl.play();
                } catch (playError) {
                    console.warn("Could not autoplay video:", playError);
                }

                // Replace track in peer connections
                PeerManager.replaceTrack(newVideoTrack);

                // Update device index
                this.currentDeviceIndex = this.availableVideoDevices.findIndex(d => d.deviceId === deviceId);

                console.log("Camera switched successfully to device:", deviceId);
            } catch(e) {
                console.error("Failed to switch camera:", e);
                // Try to restore video functionality
                try {
                    const myVideoEl = document.querySelector(`#${window.appConfig.MY_USER_INFO.uuid} video`);
                    if (myVideoEl && this.myStream) {
                        myVideoEl.srcObject = this.myStream;
                        myVideoEl.play().catch(() => {});
                    }
                } catch (restoreError) {
                    console.error("Failed to restore video after camera switch error:", restoreError);
                }
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