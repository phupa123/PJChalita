<?php
session_start();

if(!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true){
    header("location: login.php");
    exit;
}
?>

<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authorize Quick Login - PJChalita</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/auth.css">
    <style>
        .code-input { font-size: 2rem; text-align: center; letter-spacing: 0.5rem; border: 2px solid rgba(255,255,255,0.1); border-radius: 12px; background: rgba(255,255,255,0.04); color: var(--text-light); transition: all 0.2s ease; }
        .code-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(56,189,248,0.15); background: rgba(255,255,255,0.08); }
        .nav-tabs { border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 1.5rem; }
        .nav-tabs .nav-link { color: var(--text-muted); cursor: pointer; border: none; background: none; padding: 0.75rem 1rem; border-radius: 8px; transition: all 0.2s ease; position: relative; }
        .nav-tabs .nav-link:hover { color: var(--text-light); background: rgba(255,255,255,0.05); }
        .nav-tabs .nav-link.active { color: var(--accent); font-weight: 600; background: rgba(56,189,248,0.1); }
        .nav-tabs .nav-link.active::after { content: ''; position: absolute; bottom: -1px; left: 50%; transform: translateX(-50%); width: 60%; height: 2px; background: var(--accent); border-radius: 1px; }
        #qr-reader-wrapper { position: relative; width: 100%; max-width: 500px; margin: auto; border-radius: 20px; overflow: hidden; background: var(--card-bg); border: 1px solid var(--card-border); box-shadow: var(--shadow-lg); min-height: 300px; backdrop-filter: blur(10px); }
        #qr-reader-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); border-radius: 20px; }
        #qr-reader-overlay::before { content: ''; position: absolute; top: 50%; left: 50%; width: 250px; height: 250px; transform: translate(-50%, -50%); border: 3px solid var(--accent); border-radius: 12px; box-shadow: 0 0 0 3px rgba(56,189,248,0.2); }
        .camera-controls { position: absolute; top: 15px; right: 15px; z-index: 10; display: flex; gap: 8px; }
        .camera-controls .btn { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: var(--text-light); border-radius: 8px; padding: 0.5rem; transition: all 0.2s ease; }
        .camera-controls .btn:hover { background: var(--accent); border-color: var(--accent); transform: scale(1.05); }
        #drop-zone { border: 2px dashed rgba(255,255,255,0.3); border-radius: 20px; padding: 30px; text-align: center; cursor: pointer; background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)); transition: all 0.3s ease; position: relative; overflow: hidden; }
        #drop-zone::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, var(--accent), rgba(56,189,248,0.1)); opacity: 0; transition: opacity 0.3s ease; }
        #drop-zone:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: 0 8px 25px rgba(56,189,248,0.2); }
        #drop-zone:hover::before { opacity: 0.1; }
        #drop-zone.dragover { border-color: var(--accent); background: linear-gradient(135deg, rgba(56,189,248,0.1), rgba(56,189,248,0.05)); transform: scale(1.02); }
        #drop-zone.dragover::before { opacity: 0.2; }
        #drop-zone p { color: var(--text-muted); margin: 0; font-size: 1.1rem; }
        #drop-zone p .text-primary { color: var(--accent); font-weight: 500; }
        #preview-wrapper { margin-top: 20px; }
        #image-preview { max-width: 100%; max-height: 250px; border-radius: 15px; border: 1px solid var(--card-border); box-shadow: var(--shadow-lg); }
        .tab-pane { display: none; opacity: 0; transform: translateY(10px); transition: all 0.3s ease; } /* Hide all panes by default */
        .tab-pane.active { display: block; opacity: 1; transform: translateY(0); } /* Show only active pane */
        #auth-view, #confirm-view, #status-view { transition: all 0.4s ease; }
        #auth-view.d-none, #confirm-view.d-none, #status-view.d-none { opacity: 0; transform: scale(0.95); }
        .auth-card .btn { background: linear-gradient(135deg, var(--accent), var(--accent-hover)); border: none; font-weight: 600; border-radius: 12px; transition: all 0.2s ease; position: relative; overflow: hidden; }
        .auth-card .btn::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); transition: left 0.5s; }
        .auth-card .btn:hover::before { left: 100%; }
        .auth-card .btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(56,189,248,0.3); }
        .auth-card .btn-success { background: linear-gradient(135deg, #10b981, #059669); }
        .auth-card .btn-danger { background: linear-gradient(135deg, #ef4444, #dc2626); }
        .auth-card .btn-secondary { background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05)); border: 1px solid rgba(255,255,255,0.1); color: var(--text-muted); }
        .auth-card .btn-secondary:hover { background: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.1)); color: var(--text-light); }
        .auth-card-title { position: relative; }
        .auth-card-title::after { content: ''; position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 50px; height: 3px; background: var(--accent); border-radius: 2px; }
        .auth-card { position: relative; }
        .auth-card::before { content: ''; position: absolute; top: -2px; left: -2px; right: -2px; bottom: -2px; background: linear-gradient(135deg, var(--accent), rgba(56,189,248,0.3), var(--accent)); border-radius: 26px; z-index: -1; opacity: 0.3; filter: blur(8px); }
        .auth-decor { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
        .auth-decor .blob { position: absolute; border-radius: 50%; filter: blur(40px); opacity: 0.25; }
        .auth-decor .blob-1 { width: 320px; height: 320px; left: -80px; top: -120px; background: linear-gradient(135deg, rgba(56,189,248,0.6), rgba(14,165,233,0.4)); }
        .auth-decor .blob-2 { width: 220px; height: 220px; right: -60px; top: -60px; background: linear-gradient(135deg, rgba(99,102,241,0.5), rgba(139,92,246,0.3)); }
        .auth-decor .blob-3 { width: 160px; height: 160px; left: 40%; bottom: -40px; background: linear-gradient(135deg, rgba(236,72,153,0.3), rgba(245,158,11,0.2)); }
        .back-btn { transition: all 0.2s ease; border-radius: 20px; padding: 0.5rem 1rem; }
        .back-btn:hover { transform: translateX(-2px); box-shadow: 0 4px 12px rgba(255,255,255,0.1); }
    </style>
</head>
<body class="index-landing">

<nav class="navbar navbar-expand-lg navbar-custom sticky-top">
    <div class="container">
        <a class="navbar-brand fw-bold text-light" href="index.php">PJChalita</a>
        <div class="ms-auto">
            <a href="index.php" class="btn btn-outline-light back-btn"><i class="bi bi-arrow-left me-1"></i>กลับหน้าหลัก</a>
        </div>
    </div>
</nav>

<main class="main-hub">
    <div class="container">
        <div class="hub-container">
            <div class="auth-decor">
                <div class="blob blob-1"></div>
                <div class="blob blob-2"></div>
                <div class="blob blob-3"></div>
            </div>
    <div class="auth-card text-center">
        
        <div id="auth-view">
            <h3 class="auth-card-title">Authorize Device</h3>
            <div id="error-message" class="alert alert-danger d-none"></div>

            <ul class="nav nav-tabs nav-fill mb-3" id="auth-tabs">
                <li class="nav-item"><a class="nav-link" id="scan-tab"><i class="bi bi-camera me-1"></i>สแกนสด</a></li>
                <li class="nav-item"><a class="nav-link" id="upload-tab"><i class="bi bi-upload me-1"></i>อัปโหลดรูป</a></li>
                <li class="nav-item"><a class="nav-link active" id="code-tab"><i class="bi bi-keyboard me-1"></i>กรอกรหัส</a></li>
            </ul>

            <div class="tab-content pt-2">
                <div class="tab-pane" id="scan-content">
                    <div id="qr-reader-wrapper">
                        <div id="qr-reader"></div>
                        <div id="qr-reader-overlay"></div>
                        <div class="camera-controls d-none">
                            <button id="refresh-camera-btn" class="btn btn-sm btn-outline-light" title="รีเฟรชกล้อง"><i class="bi bi-camera-video"></i></button>
                            <button id="switch-camera-btn" class="btn btn-sm btn-outline-light" title="สลับกล้อง"><i class="bi bi-arrow-repeat"></i></button>
                        </div>
                    </div>
                    <p id="scan-error" class="text-danger mt-2"></p>
                </div>
                <div class="tab-pane" id="upload-content">
                    <div id="drop-zone">
                        <p>ลากและวางไฟล์ภาพที่นี่<br>หรือ <span class="text-primary">กดเพื่อเลือกไฟล์</span></p>
                        <input class="form-control d-none" type="file" id="qr-input-file" accept="image/*">
                    </div>
                    <div id="preview-wrapper" class="d-none"><img id="image-preview" src="#" alt="Preview"></div>
                </div>
                <div class="tab-pane active" id="code-content">
                    <form id="code-form">
                        <div class="mb-3"><input type="text" id="code-input" class="form-control code-input" maxlength="6"></div>
                        <div class="d-grid"><button type="submit" class="btn btn-primary">ยืนยันรหัส</button></div>
                    </form>
                </div>
            </div>
        </div>

        <div id="confirm-view" class="d-none">
            <h3 class="auth-card-title">Confirm Login</h3>
            <p>คุณกำลังจะอนุญาตให้อุปกรณ์ใหม่เข้าสู่ระบบในชื่อ <strong class="text-primary"><?php echo htmlspecialchars($_SESSION['nickname']); ?></strong></p>
            <div class="d-grid gap-2 mt-4">
                <button id="allow-btn" class="btn btn-success">อนุญาต</button>
                <button id="deny-btn" class="btn btn-danger">ปฏิเสธ</button>
                <button id="cancel-confirm-btn" class="btn btn-secondary">ยกเลิก</button>
            </div>
        </div>

        <div id="status-view" class="d-none">
            <h3 id="final-status-message"></h3>
            <a href="quick-login-auth.php" class="btn btn-primary mt-3">อนุญาตเครื่องอื่นต่อ</a>
            <a href="index.php" class="btn btn-secondary mt-3">กลับหน้าแรก</a>
        </div>

        </div>
    </div>
</main>

<footer class="footer mt-auto py-4">
    <div class="container">
        <p class="mb-0 text-center text-muted">PJChalita &copy; <?= date('Y') ?> — พัฒนาเพื่อการสื่อสารที่ราบรื่น</p>
    </div>
</footer>

<script src="https://unpkg.com/html5-qrcode"></script>
<script>
    // Views & Elements
    const authView = document.getElementById('auth-view');
    const confirmView = document.getElementById('confirm-view');
    const statusView = document.getElementById('status-view');
    const errorMessage = document.getElementById('error-message');
    const codeInput = document.getElementById('code-input');
    const fileInput = document.getElementById('qr-input-file');
    const scanError = document.getElementById('scan-error');
    const switchCameraBtn = document.getElementById('switch-camera-btn');
    const refreshCameraBtn = document.getElementById('refresh-camera-btn');
    const cameraControls = document.querySelector('.camera-controls');
    const dropZone = document.getElementById('drop-zone');
    const previewWrapper = document.getElementById('preview-wrapper');
    const imagePreview = document.getElementById('image-preview');
    const allowBtn = document.getElementById('allow-btn');
    const denyBtn = document.getElementById('deny-btn');
    const cancelConfirmBtn = document.getElementById('cancel-confirm-btn');
    const finalStatusMessage = document.getElementById('final-status-message');
    const tabs = document.querySelectorAll('#auth-tabs .nav-link');
    const panes = document.querySelectorAll('.tab-content .tab-pane');

    // State
    let currentCode = '';
    let html5QrCode = null;
    let cameras = [];
    let currentCameraIndex = 0;

    // --- Manual Tab Control ---
    function showPane(tabId) {
        showError('');
        stopScanner();

        panes.forEach(pane => pane.classList.remove('active'));
        tabs.forEach(tab => tab.classList.remove('active'));

        const activeTab = document.getElementById(tabId);
        const activePane = document.getElementById(tabId.replace('-tab', '-content'));

        if (activeTab) activeTab.classList.add('active');
        if (activePane) activePane.classList.add('active');

        if (tabId === 'scan-tab') {
            setTimeout(initializeCamera, 50);
        }
    }

    // --- Core Logic ---
    async function submitCode(code) {
        await stopScanner();
        showError('');
        
        const formData = new FormData();
        formData.append('action', 'submit_code');
        formData.append('code', code);

        try {
            const response = await fetch('api/quick-login-api.php', { method: 'POST', body: formData });
            const data = await response.json();

            if (data.status === 'success') {
                currentCode = code;
                authView.classList.add('d-none');
                confirmView.classList.remove('d-none');
            } else {
                showError(data.message || 'เกิดข้อผิดพลาด');
            }
        } catch (error) {
            showError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        }
    }

    async function handleConfirmation(action) {
        const formData = new FormData();
        formData.append('action', action);
        formData.append('code', currentCode);

        const response = await fetch('api/quick-login-api.php', { method: 'POST', body: formData });
        const data = await response.json();

        confirmView.classList.add('d-none');
        statusView.classList.remove('d-none');

        if (data.status === 'success') {
            finalStatusMessage.className = 'text-success';
            finalStatusMessage.textContent = (action === 'confirm_login') ? 'อนุญาตสำเร็จแล้ว!' : 'ปฏิเสธคำขอเรียบร้อย';
        } else {
            finalStatusMessage.className = 'text-danger';
            finalStatusMessage.textContent = data.message || 'ไม่สามารถอัปเดตสถานะได้';
        }
    }

    function showError(message) {
        if(message) {
            errorMessage.textContent = message;
            errorMessage.classList.remove('d-none');
        } else {
            errorMessage.classList.add('d-none');
            errorMessage.textContent = '';
        }
    }

    // --- Scanner Logic ---
    function onScanSuccess(decodedText, decodedResult) { submitCode(decodedText); }

    async function startScanner(deviceId) {
        scanError.textContent = '';
        if (html5QrCode && html5QrCode.isScanning) await stopScanner();
        
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        try {
            await html5QrCode.start(deviceId, config, onScanSuccess, (err) => {});
        } catch (err) {
            scanError.textContent = "ไม่สามารถเปิดกล้องได้";
            cameraControls.classList.remove('d-none');
        }
    }

    async function stopScanner() {
        if (html5QrCode && html5QrCode.isScanning) {
            try { await html5QrCode.stop(); } catch (err) {}
        }
    }

    async function initializeCamera() {
        scanError.textContent = '';
        cameraControls.classList.add('d-none');
        try {
            cameras = await Html5Qrcode.getCameras();
            if (cameras && cameras.length) {
                let cameraIndex = cameras.findIndex(c => c.label.toLowerCase().includes('back'));
                currentCameraIndex = (cameraIndex === -1) ? 0 : cameraIndex;
                switchCameraBtn.classList.toggle('d-none', cameras.length <= 1);
                await startScanner(cameras[currentCameraIndex].id);
            } else {
                scanError.textContent = "ไม่พบกล้องในอุปกรณ์นี้";
            }
        } catch (err) {
            scanError.textContent = "ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบการอนุญาต";
            cameraControls.classList.remove('d-none');
        }
    }

    // --- Event Listeners & Initializers ---
    document.addEventListener('DOMContentLoaded', () => {
        html5QrCode = new Html5Qrcode("qr-reader", { formatsToSupport: [0] });
        
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                showPane(e.target.id);
            });
        });
    });

    document.getElementById('code-form').addEventListener('submit', (e) => {
        e.preventDefault();
        if(codeInput.value) submitCode(codeInput.value);
    });

    // Drag and Drop & File Upload
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => handleFile(e.target.files));
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    }));
    ['dragenter', 'dragover'].forEach(eventName => dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover')));
    ['dragleave', 'drop'].forEach(eventName => dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover')));
    dropZone.addEventListener('drop', (e) => handleFile(e.dataTransfer.files));

    function handleFile(files) {
        if (files.length === 0) return;
        const file = files[0];
        showError('');
        previewWrapper.classList.remove('d-none');
        imagePreview.src = URL.createObjectURL(file);
        html5QrCode.scanFile(file, false)
            .then(onScanSuccess)
            .catch(err => showError('ไม่พบ QR Code ในรูปภาพ ลองเลือกไฟล์ใหม่'));
    }

    switchCameraBtn.addEventListener('click', async () => {
        currentCameraIndex = (currentCameraIndex + 1) % cameras.length;
        await startScanner(cameras[currentCameraIndex].id);
    });

    refreshCameraBtn.addEventListener('click', initializeCamera);
    
    cancelConfirmBtn.addEventListener('click', () => {
        confirmView.classList.add('d-none');
        authView.classList.remove('d-none');
        showError('');
        showPane('code-tab'); // Go back to default tab
    });

    allowBtn.addEventListener('click', () => handleConfirmation('confirm_login'));
    denyBtn.addEventListener('click', () => handleConfirmation('deny_login'));

    // subtle float animation for blobs
    const blobs = document.querySelectorAll('.auth-decor .blob');
    blobs.forEach((b, i)=>{
        const dur = 8000 + i*1200;
        b.animate([
            { transform: 'translateY(0px) translateX(0px)' },
            { transform: 'translateY(-18px) translateX(6px)' },
            { transform: 'translateY(0px) translateX(0px)' }
        ],{ duration: dur, iterations: Infinity, easing: 'ease-in-out' });
    });

</script>

</body>
</html>
