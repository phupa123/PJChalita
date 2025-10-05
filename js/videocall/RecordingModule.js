(function () {
    let isRecording = false;
    let mediaRecorder = null;
    let recordedChunks = [];
    let canvas = null;
    let ctx = null;
    let animationFrameId = null;
    let streamToRecord = null;
    let streamManagerRef = null;

    // หยุดการบันทึกและเคลียร์ทรัพยากร
    const stopRecordingInternal = () => {
        if (!isRecording || !mediaRecorder) return;
        if (mediaRecorder.state === 'recording') mediaRecorder.stop();
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        streamToRecord?.getTracks().forEach(track => track.stop());
        
        isRecording = false;
        animationFrameId = null;
        streamToRecord = null;
        canvas = null;
        ctx = null;
        updateRecordingUI();
    };

    // เมื่อการบันทึกสิ้นสุดลง จะทำการอัปโหลดไฟล์
    const finishRecordingAndUpload = async () => {
        if (recordedChunks.length === 0) return;
        
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `recording-${timestamp}.mp4`; // ตั้งชื่อเป็น mp4

        if (streamManagerRef?.uploadFile) {
            await streamManagerRef.uploadFile(blob, fileName, 'video', 'mp4');
        }
        recordedChunks = [];
    };
    
    // วาดวิดีโอลง Canvas (สำหรับอัดทั้งห้อง)
    const drawRoomToCanvas = () => {
        if (!isRecording || !canvas || !ctx) return;

        const videos = Array.from(document.querySelectorAll('#video-grid video'));
        if (videos.length === 0) {
            animationFrameId = requestAnimationFrame(drawRoomToCanvas);
            return;
        }

        const cols = Math.ceil(Math.sqrt(videos.length));
        const rows = Math.ceil(videos.length / cols);
        const cellWidth = canvas.width / cols;
        const cellHeight = canvas.height / rows;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#202124';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        videos.forEach((video, index) => {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
                const row = Math.floor(index / cols);
                const col = index % cols;
                ctx.drawImage(video, col * cellWidth, row * cellHeight, cellWidth, cellHeight);
            }
        });
        animationFrameId = requestAnimationFrame(drawRoomToCanvas);
    };

    // เริ่มกระบวนการบันทึก
    async function startRecording(type, targetUuid = null) {
        if (isRecording) return;
        
        try {
            if (type === 'room') {
                // สร้าง Canvas และรวมเสียงจากทุกคน
                canvas = document.createElement('canvas');
                canvas.width = 1920; canvas.height = 1080;
                ctx = canvas.getContext('2d');
                
                const canvasStream = canvas.captureStream(24);
                const audioContext = new AudioContext();
                const audioDestination = audioContext.createMediaStreamDestination();
                
                // รวมเสียงของตัวเองและเพื่อนๆ
                const allStreams = [streamManagerRef.getMyVideoStream(), ...Object.values(streamManagerRef.peerInfo).map(p => p.stream)];
                allStreams.forEach(s => {
                    if (s && s.getAudioTracks().length > 0) {
                        audioContext.createMediaStreamSource(s).connect(audioDestination);
                    }
                });
                
                streamToRecord = new MediaStream([...canvasStream.getVideoTracks(), ...audioDestination.stream.getAudioTracks()]);
                animationFrameId = requestAnimationFrame(drawRoomToCanvas);

            } else if (type === 'user' && targetUuid) {
                const peerInfo = streamManagerRef.peerInfo[targetUuid];
                const videoEl = document.getElementById(targetUuid)?.querySelector('video');
                
                if (!videoEl || !videoEl.srcObject) {
                    throw new Error('ไม่พบสตรีมวิดีโอของผู้ใช้ที่เลือก');
                }
                // **คำชี้แจง:** การบันทึกเสียงและวิดีโอแม้ผู้ใช้จะปิดกล้อง/ไมค์นั้น
                // ไม่สามารถทำได้จากฝั่ง Client โดยตรงหากผู้ใช้คนนั้นไม่ได้ส่งสตรีมมาเลย
                // โค้ดนี้จะบันทึกจากสตรีมที่ได้รับมาจริง ณ ขณะนั้น
                streamToRecord = videoEl.srcObject;

            } else {
                throw new Error('ประเภทการบันทึกไม่ถูกต้อง');
            }

            recordedChunks = [];
            mediaRecorder = new MediaRecorder(streamToRecord, { mimeType: 'video/webm; codecs=vp9' });
            mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
            mediaRecorder.onstop = finishRecordingAndUpload;
            streamToRecord.getVideoTracks()[0].onended = stopRecordingInternal;

            mediaRecorder.start(1000);
            isRecording = true;
            updateRecordingUI();

        } catch (err) {
            console.error('Recording failed:', err);
            Swal.fire('เกิดข้อผิดพลาด', err.message, 'error');
            stopRecordingInternal();
        }
    }

    // อัปเดต UI ของปุ่มบันทึก
    function updateRecordingUI() {
        const recordBtn = document.getElementById('capture-btn');
        if (!recordBtn) return;
        if (isRecording) {
            recordBtn.classList.add('active');
            recordBtn.title = 'หยุดบันทึก';
            recordBtn.innerHTML = '<i class="bi bi-stop-circle-fill"></i>';
        } else {
            recordBtn.classList.remove('active');
            recordBtn.title = 'บันทึกและแคปเจอร์';
            recordBtn.innerHTML = '<i class="bi bi-record-circle"></i>';
        }
    }
    
    // แสดง Modal สำหรับเลือกผู้ใช้
    function showUserSelectionModal(title, callback) {
        const peers = streamManagerRef.peerInfo;
        const users = Object.keys(peers).map(uuid => ({ uuid, nickname: peers[uuid].nickname }));

        if (users.length === 0) {
            Swal.fire('ไม่มีผู้ใช้อื่น', 'ไม่มีผู้ใช้อื่นในห้องให้เลือก', 'info');
            return;
        }

        const inputOptions = users.reduce((acc, user) => {
            acc[user.uuid] = user.nickname;
            return acc;
        }, {});
        
        Swal.fire({
            title: title,
            input: 'select',
            inputOptions: inputOptions,
            inputPlaceholder: 'เลือกผู้ใช้',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก'
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                callback(result.value);
            }
        });
    }

    // จัดการเมื่อกดปุ่ม Capture
    function handleCaptureButtonClick() {
        if (isRecording) {
            stopRecordingInternal();
            return;
        }
        
        Swal.fire({
            title: 'บันทึกและแคปเจอร์',
            html: `
                <p>เลือกสิ่งที่คุณต้องการทำ:</p>
                <button id="swal-screenshot-room" class="swal2-confirm swal2-styled">แคปเจอร์ทั้งห้อง (.png)</button>
                <button id="swal-screenshot-user" class="swal2-confirm swal2-styled">แคปเจอร์เฉพาะคน (.png)</button>
                <br><br>
                <button id="swal-record-room" class="swal2-confirm swal2-styled">บันทึกวิดีโอทั้งห้อง (.mp4)</button>
                <button id="swal-record-user" class="swal2-confirm swal2-styled">บันทึกวิดีโอเฉพาะคน (.mp4)</button>`,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'ยกเลิก',
            didOpen: () => {
                document.getElementById('swal-screenshot-room').onclick = () => { Swal.close(); streamManagerRef.takeScreenshot('room'); };
                document.getElementById('swal-screenshot-user').onclick = () => { Swal.close(); showUserSelectionModal('เลือกผู้ใช้ที่จะแคปเจอร์', (uuid) => streamManagerRef.takeScreenshot('user', uuid)); };
                document.getElementById('swal-record-room').onclick = () => { Swal.close(); startRecording('room'); };
                document.getElementById('swal-record-user').onclick = () => { Swal.close(); showUserSelectionModal('เลือกผู้ใช้ที่จะบันทึกวิดีโอ', startRecording.bind(null, 'user')); };
            }
        });
    }

    // ติดตั้งโมดูล
    function install({ streamManager }) {
        streamManagerRef = streamManager;
        streamManager.handleCaptureButtonClick = handleCaptureButtonClick;
    }

    window.RecordingModule = { install };
})();