﻿(function () {
    // --- ค่าสำเร็จรูปสำหรับคุณภาพการแชร์หน้าจอ ---
    const QUALITY_PRESETS = {
        smooth: {
            name: "ถ่ายทอดสดลื่นไหล",
            constraints: { width: 1280, height: 720, frameRate: 30 }
        },
        text: {
            name: "อ่านตัวหนังสือออก",
            constraints: { width: 1920, height: 1080, frameRate: 15 }
        },
        sharpAndSmooth: {
            name: "ถ่ายทอดสดคมชัดและลื่นไหล",
            constraints: { width: 1920, height: 1080, frameRate: 30 }
        },
        auto: {
            name: "อัตโนมัติ",
            constraints: {} // ให้เบราว์เซอร์จัดการเอง
        }
    };

    // --- ตัวเลือกสำหรับ Manual ---
    const RESOLUTIONS = {
        "160p": { width: 284, height: 160 }, "360p": { width: 640, height: 360 },
        "720p": { width: 1280, height: 720 }, "1080p": { width: 1920, height: 1080 },
        "2k": { width: 2560, height: 1440 }, "4k": { width: 3840, height: 2160 },
        "auto": {}
    };
    const FRAMERATES = {
        "10": 10, "20": 20, "30": 30, "45": 45, "60": 60, "120": 120, "auto": undefined
    };

    /**
     * สร้าง HTML สำหรับหน้าต่างเลือกคุณภาพ
     */
    function createQualitySelectorHtml() {
        const presetsHtml = Object.entries(QUALITY_PRESETS).map(([key, val]) =>
            `<button class="swal2-styled swal-preset-btn" data-preset="${key}">${val.name}</button>`
        ).join('');

        const resolutionsHtml = Object.keys(RESOLUTIONS).map(key => `<option value="${key}">${key}</option>`).join('');
        const frameratesHtml = Object.keys(FRAMERATES).map(key => `<option value="${key}">${key} fps</option>`).join('');

        return `
            <div class="share-screen-options">
                <h4>เลือกรูปแบบสำเร็จรูป</h4>
                <div class="preset-grid">${presetsHtml}</div>
                <hr>
                <h4>หรือปรับด้วยตนเอง</h4>
                <div class="manual-grid">
                    <div>
                        <label for="swal-resolution">ความคมชัด</label>
                        <select id="swal-resolution" class="swal2-select">${resolutionsHtml}</select>
                    </div>
                    <div>
                        <label for="swal-framerate">อัตราเฟรม</label>
                        <select id="swal-framerate" class="swal2-select">${frameratesHtml}</select>
                    </div>
                </div>
                <button id="swal-manual-apply" class="swal2-confirm swal2-styled">เริ่มแชร์แบบปรับเอง</button>
            </div>
            <style>
                .share-screen-options h4 { margin-top: 1.5rem; margin-bottom: 0.8rem; text-align: left; }
                .preset-grid, .manual-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                .swal-preset-btn { width: 100%; margin: 0; }
                .manual-grid label { display: block; text-align: left; margin-bottom: 5px; }
                #swal-manual-apply { margin-top: 1.5rem; width: 100%; }
                hr { margin: 1.5rem 0; border-color: rgba(255,255,255,0.1); }
            </style>
        `;
    }

    function install({ streamManager, UIManager, PeerManager }) {
        if (!streamManager || !UIManager || !PeerManager) return;

        streamManager.myVideoStream = null;
        streamManager.myScreenStream = null;
        window.isScreenSharing = false; // Use window scope for global access

        streamManager.shareScreen = async function () {
            if (window.isScreenSharing) {
                this.myScreenStream?.getTracks().forEach(track => track.stop());

                // Revert to camera stream
                const cameraVideoTrack = this.myVideoStream?.getVideoTracks()[0];
                if (cameraVideoTrack) {
                    PeerManager.replaceTrack(cameraVideoTrack);
                    const localVideo = document.getElementById(window.appConfig.MY_USER_INFO.uuid)?.querySelector('video');
                    if (localVideo) localVideo.srcObject = new MediaStream([cameraVideoTrack, ...this.myStream.getAudioTracks()]);
                }

                const localContainer = document.getElementById(window.appConfig.MY_USER_INFO.uuid);
                if (localContainer) localContainer.classList.remove('screen-sharing');

                // Notify others that screen sharing has stopped
                PeerManager.broadcast({ type: 'screen-sharing-stop', uuid: window.appConfig.MY_USER_INFO.uuid });
                
                window.isScreenSharing = false;
                UIManager.updateScreenShareButton(false);
                return;
            }

            const swalResult = await Swal.fire({
                title: 'เลือกคุณภาพการแชร์หน้าจอ',
                html: createQualitySelectorHtml(),
                showConfirmButton: false,
                showCancelButton: true,
                cancelButtonText: 'ยกเลิก',
                didOpen: () => {
                    document.querySelectorAll('.swal-preset-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            Swal.close({ value: QUALITY_PRESETS[btn.dataset.preset].constraints });
                        });
                    });
                    document.getElementById('swal-manual-apply').addEventListener('click', () => {
                        const resKey = document.getElementById('swal-resolution').value;
                        const frKey = document.getElementById('swal-framerate').value;
                        Swal.close({ value: { ...RESOLUTIONS[resKey], frameRate: FRAMERATES[frKey] } });
                    });
                }
            });

            if (!swalResult.value) return;

            try {
                const newStream = await navigator.mediaDevices.getDisplayMedia({
                    video: swalResult.value,
                    audio: true
                });

                if(!this.myVideoStream) this.myVideoStream = this.getMyVideoStream();
                
                this.myScreenStream = newStream;

                // Replace both video and audio tracks for all peers
                newStream.getTracks().forEach(track => PeerManager.replaceTrack(track));
                
                window.isScreenSharing = true;
                UIManager.updateScreenShareButton(true);

                // Update local video to show screen share
                const localVideo = document.getElementById(window.appConfig.MY_USER_INFO.uuid)?.querySelector('video');
                if (localVideo) localVideo.srcObject = newStream;
                
                const localContainer = document.getElementById(window.appConfig.MY_USER_INFO.uuid);
                if (localContainer) localContainer.classList.add('screen-sharing');
                
                // Notify others that screen sharing has started
                PeerManager.broadcast({ type: 'screen-sharing-start', uuid: window.appConfig.MY_USER_INFO.uuid });

                // Listen for the 'ended' event (e.g., user clicks "Stop sharing" in browser UI)
                newStream.getVideoTracks()[0].addEventListener('ended', () => {
                    if (window.isScreenSharing) this.shareScreen(); // Call the function again to stop sharing properly
                });

            } catch (error) {
                console.error("Cannot share screen", error);
                Swal.fire('แชร์หน้าจอไม่สำเร็จ', 'อาจเป็นเพราะคุณไม่ได้อนุญาต หรือเบราว์เซอร์ไม่รองรับ', 'error');
                if (this.myVideoStream) this.myVideoStream.getVideoTracks().forEach(track => track.enabled = true);
            }
        };

        UIManager.updateScreenShareButton = (isSharing) => {
            const btn = document.getElementById('screen-share-btn');
            if (btn) {
                btn.classList.toggle('active', isSharing);
                btn.title = isSharing ? 'หยุดแชร์หน้าจอ' : 'แชร์หน้าจอ';
            }
        };
    }

    window.RoomShareScreenModule = { install };
})();