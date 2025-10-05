<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quick Login - PJChalita</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/auth.css">
    <style>
        .auth-decor { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
        .auth-decor .blob { position: absolute; border-radius: 50%; filter: blur(40px); opacity: 0.25; }
        .auth-decor .blob-1 { width: 320px; height: 320px; left: -80px; top: -120px; background: linear-gradient(135deg, rgba(56,189,248,0.6), rgba(14,165,233,0.4)); }
        .auth-decor .blob-2 { width: 220px; height: 220px; right: -60px; top: -60px; background: linear-gradient(135deg, rgba(99,102,241,0.5), rgba(139,92,246,0.3)); }
        .auth-decor .blob-3 { width: 160px; height: 160px; left: 40%; bottom: -40px; background: linear-gradient(135deg, rgba(236,72,153,0.3), rgba(245,158,11,0.2)); }
        .back-btn { transition: all 0.2s ease; border-radius: 20px; padding: 0.5rem 1rem; }
        .back-btn:hover { transform: translateX(-2px); box-shadow: 0 4px 12px rgba(255,255,255,0.1); }
        .code-display-wrapper {
            position: relative;
            margin: 1.5rem 0;
        }
        .code-display {
            font-size: 3rem;
            font-weight: 700;
            letter-spacing: 0.5rem;
            color: var(--accent);
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.1);
            padding: 1.5rem 2rem;
            border-radius: 12px;
            text-shadow: 0 0 20px rgba(56,189,248,0.3);
        }
        #copy-code-btn {
            position: absolute;
            right: 15px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255,255,255,0.1);
            border: none;
            color: var(--text-light);
            padding: 0.5rem;
            border-radius: 8px;
            transition: all 0.2s ease;
        }
        #copy-code-btn:hover {
            background: rgba(255,255,255,0.2);
            transform: translateY(-50%) scale(1.1);
        }
        #countdown {
            font-weight: 500;
            color: var(--text-muted);
        }
        #countdown strong {
            color: var(--text-light);
        }
        #qrcode-container {
            padding: 1.5rem;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 220px;
            text-align: center;
        }
        #qrcode-container table {
            display: block !important;
            margin: 0 auto !important;
            width: fit-content !important;
        }
        .nav-tabs {
            border-bottom-color: rgba(255,255,255,0.1);
            margin: 0 -1rem;
        }
        .nav-tabs .nav-link {
            color: var(--text-muted);
            border: none;
            padding: 1rem 1.5rem;
            transition: all 0.2s ease;
        }
        .nav-tabs .nav-link:hover {
            color: var(--text-light);
            border: none;
            background: rgba(255,255,255,0.02);
        }
        .nav-tabs .nav-link.active {
            color: var(--accent);
            background: none;
            border-bottom: 2px solid var(--accent);
        }
        #save-qr-btn {
            border: 1px solid rgba(255,255,255,0.1);
            color: var(--text-muted);
            transition: all 0.2s ease;
        }
        #save-qr-btn:hover {
            background: rgba(255,255,255,0.05);
            border-color: rgba(255,255,255,0.2);
            color: var(--text-light);
        }
        #refresh-btn {
            padding: 0.5rem;
            color: var(--text-muted);
            margin-left: 0.5rem;
            border-radius: 8px;
            transition: all 0.2s ease;
        }
        #refresh-btn:hover {
            color: var(--text-light);
            background: rgba(255,255,255,0.05);
            transform: rotate(180deg);
        }
        .spinner-border {
            color: var(--accent) !important;
        }
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
        <h3 class="auth-card-title mb-4">Quick Login</h3>
        
        <div id="loader">
            <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3 text-muted">กำลังสร้างรหัส...</p>
        </div>

        <div id="code-section" class="d-none">
            <ul class="nav nav-tabs nav-fill mb-4" id="login-method-tabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="pincode-tab" data-bs-toggle="tab" data-bs-target="#pincode-content" type="button" role="tab">
                        <i class="bi bi-123 me-2"></i>รหัส 6 ตัว
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="qrcode-tab" data-bs-toggle="tab" data-bs-target="#qrcode-content" type="button" role="tab">
                        <i class="bi bi-qr-code me-2"></i>QR Code
                    </button>
                </li>
            </ul>

            <div class="tab-content" id="myTabContent">
                <div class="tab-pane fade show active" id="pincode-content" role="tabpanel">
                    <p class="text-muted mb-4">กรอกรหัสนี้ในอุปกรณ์ที่ล็อกอินอยู่:</p>
                    <div class="code-display-wrapper">
                        <div class="code-display" id="login-code">------</div>
                        <button id="copy-code-btn" class="btn btn-sm" title="Copy code">
                            <i class="bi bi-clipboard"></i>
                        </button>
                    </div>
                </div>
                <div class="tab-pane fade" id="qrcode-content" role="tabpanel">
                    <p class="text-muted mb-4">สแกน QR Code นี้ด้วยอุปกรณ์ที่ล็อกอินอยู่:</p>
                    <div id="qrcode-container" class="mx-auto mb-3"></div>
                    <button id="save-qr-btn" class="btn btn-sm">
                        <i class="bi bi-download me-2"></i>บันทึก QR Code
                    </button>
                </div>
            </div>
            
            <div class="d-flex justify-content-center align-items-center mt-4">
                <p id="countdown" class="mb-0">รหัสจะหมดอายุใน: <strong>3:00</strong></p>
                <button id="refresh-btn" class="btn btn-sm" title="ขอรหัสใหม่">
                    <i class="bi bi-arrow-clockwise"></i>
                </button>
            </div>
            
            <div class="mt-4 py-3 border-top border-secondary-subtle">
                <p class="text-muted mb-2">กำลังรอการยืนยัน...</p>
                <div class="spinner-border spinner-border-sm" role="status"></div>
            </div>
        </div>

        <div id="status-section" class="d-none">
            <h4 id="status-message" class="mb-4"></h4>
            <button id="try-again-btn" class="btn btn-primary">
                <i class="bi bi-arrow-repeat me-2"></i>ลองอีกครั้ง
            </button>
        </div>

        <div class="auth-link mt-4">
            <a href="login.php">
                <i class="bi bi-arrow-left me-2"></i>กลับไปหน้าล็อกอินปกติ
            </a>
        </div>
    </div>

        </div>
    </div>
</main>

<footer class="footer mt-auto py-4">
    <div class="container">
        <p class="mb-0 text-center text-muted">PJChalita &copy; <?= date('Y') ?> — พัฒนาเพื่อการสื่อสารที่ราบรื่น</p>
    </div>
</footer>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
<script src="js/effects.js" defer></script>
<script>
    const loader = document.getElementById('loader');
    const codeSection = document.getElementById('code-section');
    const statusSection = document.getElementById('status-section');
    const loginCodeDisplay = document.getElementById('login-code');
    const countdownDisplay = document.getElementById('countdown').querySelector('strong');
    const statusMessage = document.getElementById('status-message');
    const qrcodeContainer = document.getElementById('qrcode-container');
    const copyBtn = document.getElementById('copy-code-btn');
    const saveQrBtn = document.getElementById('save-qr-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const tryAgainBtn = document.getElementById('try-again-btn');

    let pollingInterval, countdownInterval, qrCodeInstance;
    let currentCode = '';

    function resetUI() {
        clearIntervals();
        statusSection.classList.add('d-none');
        codeSection.classList.add('d-none');
        loader.classList.remove('d-none');
    }

    async function generateCode() {
        resetUI();
        try {
            const response = await fetch('api/quick-login-api.php?action=generate_code');
            const data = await response.json();

            if (data.status === 'success') {
                currentCode = data.code;
                loginCodeDisplay.textContent = currentCode;

                if(qrCodeInstance) {
                    qrCodeInstance.makeCode(currentCode);
                } else {
                    qrCodeInstance = new QRCode(qrcodeContainer, { text: currentCode, width: 180, height: 180 });
                }

                loader.classList.add('d-none');
                codeSection.classList.remove('d-none');
                startCountdown(data.duration);
                startPolling(currentCode);
            } else {
                showStatus('เกิดข้อผิดพลาด: ' + data.message, true);
            }
        } catch (error) {
            showStatus('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', true);
        }
    }

    function startPolling(code) {
        pollingInterval = setInterval(async () => {
            const formData = new FormData();
            formData.append('action', 'check_status');
            formData.append('code', code);

            const response = await fetch('api/quick-login-api.php', { method: 'POST', body: formData });
            const data = await response.json();

            if (data.status === 'authorized') {
                clearIntervals();
                showStatus('อนุญาตสำเร็จ! กำลังนำคุณเข้าสู่ระบบ...');
                window.location.href = 'profile.php';
            } else if (data.status === 'denied' || data.status === 'expired') {
                clearIntervals();
                const message = data.status === 'denied' ? 'คำขอถูกปฏิเสธ' : 'รหัสหมดอายุแล้ว';
                showStatus(message, true);
            }
        }, 3000);
    }

    function startCountdown(duration) {
        let timer = duration;
        countdownInterval = setInterval(() => {
            const minutes = Math.floor(timer / 60);
            const seconds = timer % 60;
            countdownDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            if (--timer < 0) {
                clearInterval(countdownInterval);
                // The polling will handle the expired status message
            }
        }, 1000);
    }

    function showStatus(message, isError = false) {
        clearIntervals();
        loader.classList.add('d-none');
        codeSection.classList.add('d-none');
        statusSection.classList.remove('d-none');
        statusMessage.textContent = message;
        statusMessage.className = isError ? 'text-danger' : 'text-success';
    }
    
    function clearIntervals(){
        clearInterval(pollingInterval);
        clearInterval(countdownInterval);
    }

    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(currentCode).then(() => {
            const originalIcon = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="bi bi-check-lg"></i>';
            copyBtn.classList.add('btn-success');
            setTimeout(() => {
                copyBtn.innerHTML = originalIcon;
                copyBtn.classList.remove('btn-success');
            }, 2000);
        });
    });

    saveQrBtn.addEventListener('click', () => {
        const canvas = qrcodeContainer.querySelector('canvas');
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `pjchalita-qrcode-${currentCode}.png`;
        link.click();
    });

    refreshBtn.addEventListener('click', generateCode);
    tryAgainBtn.addEventListener('click', generateCode);

    document.addEventListener('DOMContentLoaded', generateCode);

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