// PJChalita/js/videocall/room_camera_switch.js

(function () {
    function install({ streamManager, PeerManager }) {
        if (!streamManager || !PeerManager) {
            console.error("CameraSwitchModule installation failed: Missing required managers.");
            return;
        }

        // Initialize camera device management
        streamManager.availableVideoDevices = [];
        streamManager.currentDeviceIndex = 0;
        streamManager.isSwitchingCamera = false;

        // Populate available camera devices
        streamManager.populateDeviceList = async function() {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                    throw new Error("enumerateDevices() not supported.");
                }
                const devices = await navigator.mediaDevices.enumerateDevices();
                this.availableVideoDevices = devices.filter(device => device.kind === 'videoinput');

                // Update switch button visibility
                const switchBtn = document.getElementById('switch-cam-btn');
                if (switchBtn) {
                    switchBtn.style.display = this.availableVideoDevices.length > 1 ? 'flex' : 'none';
                }

                // Find current device index
                if (this.myStream) {
                    const currentTrack = this.myStream.getVideoTracks()[0];
                    if (currentTrack) {
                        const currentDeviceId = currentTrack.getSettings().deviceId;
                        this.currentDeviceIndex = this.availableVideoDevices.findIndex(d => d.deviceId === currentDeviceId);
                    }
                }

                console.log(`Found ${this.availableVideoDevices.length} camera devices`);
            } catch(e) {
                console.error("Could not list devices:", e);
            }
        };

        // Cycle through available cameras
        streamManager.cycleCamera = async function () {
            if (this.availableVideoDevices.length < 2) {
                await this.populateDeviceList();
            }
            if (this.availableVideoDevices.length < 2) {
                console.log("Only one camera available, cannot switch");
                return;
            }

            const nextIndex = (this.currentDeviceIndex + 1) % this.availableVideoDevices.length;
            const nextDeviceId = this.availableVideoDevices[nextIndex].deviceId;
            console.log(`Switching from camera ${this.currentDeviceIndex} to ${nextIndex}: ${nextDeviceId}`);
            await this.switchToDevice(nextDeviceId);
        };

        // Switch to specific camera device
        streamManager.switchToDevice = async function(deviceId) {
            if (this.isSwitchingCamera || !this.myStream) {
                console.log("Camera switch blocked: already switching or no stream");
                return;
            }

            this.isSwitchingCamera = true;
            console.log("Starting camera switch to device:", deviceId);

            try {
                // Get video element reference
                const myVideoEl = document.querySelector(`#${window.appConfig.MY_USER_INFO.uuid} video`);
                if (!myVideoEl) {
                    throw new Error("Video element not found");
                }

                // Step 1: Pause and clear video element to release camera references
                myVideoEl.pause();
                myVideoEl.srcObject = null;

                // Step 2: Stop all existing video tracks
                const oldVideoTracks = this.myStream.getVideoTracks();
                oldVideoTracks.forEach(track => {
                    console.log("Stopping old video track:", track.label);
                    track.stop();
                    this.myStream.removeTrack(track);
                });

                // Step 3: Wait for camera hardware to be fully released
                console.log("Waiting for camera hardware release...");
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Step 4: Get new video stream with retry logic
                let newVideoStream;
                let retries = 5;
                const videoConstraints = {
                    deviceId: { exact: deviceId },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                };

                while (retries > 0) {
                    try {
                        console.log(`Attempting to get camera access (attempt ${6 - retries}/5)...`);
                        newVideoStream = await navigator.mediaDevices.getUserMedia({
                            video: videoConstraints,
                            audio: false
                        });
                        console.log("Camera access successful");
                        break;
                    } catch (retryError) {
                        retries--;
                        console.warn(`Camera access failed, ${retries} attempts left:`, retryError.message);
                        if (retries > 0) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                        } else {
                            throw retryError;
                        }
                    }
                }

                const newVideoTrack = newVideoStream.getVideoTracks()[0];
                if (!newVideoTrack) {
                    throw new Error("No video track in new stream");
                }

                console.log("New video track obtained:", newVideoTrack.label);

                // Step 5: Add new track to stream and update video element
                this.myStream.addTrack(newVideoTrack);
                myVideoEl.srcObject = this.myStream;

                // Step 6: Ensure video plays
                try {
                    await myVideoEl.play();
                    console.log("Video playback started successfully");
                } catch (playError) {
                    console.warn("Could not autoplay video:", playError);
                }

                // Step 7: Update peer connections
                PeerManager.replaceTrack(newVideoTrack);
                console.log("Peer connections updated with new track");

                // Step 8: Update device index
                this.currentDeviceIndex = this.availableVideoDevices.findIndex(d => d.deviceId === deviceId);
                console.log("Camera switched successfully to device:", deviceId, `(index: ${this.currentDeviceIndex})`);

            } catch(e) {
                console.error("Failed to switch camera:", e);

                // Attempt to restore video functionality
                try {
                    const myVideoEl = document.querySelector(`#${window.appConfig.MY_USER_INFO.uuid} video`);
                    if (myVideoEl && this.myStream) {
                        myVideoEl.srcObject = this.myStream;
                        myVideoEl.play().catch(() => {});
                        console.log("Video functionality restored after switch failure");
                    }
                } catch (restoreError) {
                    console.error("Failed to restore video after camera switch error:", restoreError);
                }

                // Show user-friendly error message
                Swal.fire('ผิดพลาด', 'ไม่สามารถสลับกล้องได้ กรุณาลองใหม่อีกครั้ง', 'error');
            } finally {
                this.isSwitchingCamera = false;
                console.log("Camera switch operation completed");
            }
        };

        // Setup camera switch button for all devices
        function setupCameraSwitchButton() {
            const switchBtn = document.getElementById('switch-cam-btn');
            if (!switchBtn) {
                console.warn("Camera switch button not found");
                return;
            }

            // Remove any existing event listeners
            const newBtn = switchBtn.cloneNode(true);
            switchBtn.parentNode.replaceChild(newBtn, switchBtn);

            // Detect if device supports touch
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

            if (isTouchDevice) {
                // Mobile/Tablet: Simple tap to cycle cameras
                console.log("Setting up touch camera switch button");

                newBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }, { passive: false });

                newBtn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Button feedback sound
                    if (window.volumeManager && typeof window.volumeManager.playButtonInputSound === 'function') {
                        window.volumeManager.playButtonInputSound();
                    }

                    if (typeof streamManager.cycleCamera === 'function') {
                        console.log("Touch: Cycling camera");
                        streamManager.cycleCamera();
                    }
                });

                // Also support regular click for hybrid devices
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Button feedback sound
                    if (window.volumeManager && typeof window.volumeManager.playButtonInputSound === 'function') {
                        window.volumeManager.playButtonInputSound();
                    }

                    if (typeof streamManager.cycleCamera === 'function') {
                        console.log("Click: Cycling camera");
                        streamManager.cycleCamera();
                    }
                });

            } else {
                // Desktop: Click to cycle, long press for menu (if available)
                console.log("Setting up desktop camera switch button");

                let pressTimer = null;
                let isLongPress = false;

                const startPress = (e) => {
                    isLongPress = false;
                    e.preventDefault();
                    e.stopPropagation();

                    pressTimer = setTimeout(() => {
                        isLongPress = true;
                        // Long press - show camera menu if available
                        if (typeof streamManager.showCameraMenu === 'function') {
                            console.log("Long press: Showing camera menu");
                            if (window.volumeManager && typeof window.volumeManager.playButtonOutputSound === 'function') {
                                window.volumeManager.playButtonOutputSound();
                            }
                            streamManager.showCameraMenu();
                        }
                    }, 500);
                };

                const endPress = (e) => {
                    clearTimeout(pressTimer);
                    if (!isLongPress) {
                        // Short press - cycle camera
                        if (typeof streamManager.cycleCamera === 'function') {
                            console.log("Short press: Cycling camera");
                            if (window.volumeManager && typeof window.volumeManager.playButtonInputSound === 'function') {
                                window.volumeManager.playButtonInputSound();
                            }
                            streamManager.cycleCamera();
                        }
                    }
                };

                newBtn.addEventListener('mousedown', startPress);
                newBtn.addEventListener('mouseup', endPress);
                newBtn.addEventListener('mouseleave', endPress);

                newBtn.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    if (typeof streamManager.showCameraMenu === 'function') {
                        streamManager.showCameraMenu();
                    }
                });
            }

            console.log("Camera switch button setup completed for", isTouchDevice ? "touch device" : "desktop");
        }

        // Initialize device list and button setup
        // Run immediately to ensure button works as soon as possible
        streamManager.populateDeviceList();
        setupCameraSwitchButton();

        // Also run after a delay to catch any devices that become available later
        setTimeout(() => {
            streamManager.populateDeviceList();
            setupCameraSwitchButton();
        }, 2000);

        // Re-setup button when devices change (e.g., when camera is plugged/unplugged)
        if (navigator.mediaDevices && navigator.mediaDevices.ondevicechange !== undefined) {
            navigator.mediaDevices.ondevicechange = () => {
                console.log("Media devices changed, refreshing camera list");
                setTimeout(() => {
                    streamManager.populateDeviceList();
                    setupCameraSwitchButton();
                }, 500);
            };
        }

        console.log("CameraSwitchModule installed successfully");
    }

    window.RoomCameraSwitchModule = { install };
})();
