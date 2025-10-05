<?php
session_start();
require_once __DIR__ . '/config.php';
$isLoggedIn = $_SESSION['loggedin'] ?? false;
$nickname = $_SESSION['nickname'] ?? 'Guest';
$rank = $_SESSION['rank'] ?? 'Member';
$avatarRaw = $_SESSION['avatar'] ?? null;
$avatar = get_avatar_url($avatarRaw);
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PJChalita - ศูนย์กลางการสื่อสาร</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/profile.css">
</head>
<body class="index-landing">

<nav class="navbar navbar-expand-lg navbar-custom sticky-top">
    <div class="container">
        <a class="navbar-brand fw-bold text-light" href="index.php">PJChalita</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="mainNav">
            <ul class="navbar-nav ms-auto align-items-lg-center gap-lg-2">
                        <!-- Switch Account dropdown (populated by JS) -->
                        <li class="nav-item dropdown">
                            <a class="nav-link" href="#" id="switchAccountToggler" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                <i class="bi bi-people-fill text-light"></i>
                            </a>
                            <ul class="dropdown-menu dropdown-menu-end p-2" aria-labelledby="switchAccountToggler" style="min-width:320px;" id="switchAccountMenu">
                                <div class="d-flex justify-content-between align-items-center px-2 mb-2">
                                    <strong>Switch Account</strong>
                                    <div>
                                        <button id="addQuickAccountBtn" class="btn btn-sm btn-outline-primary me-1">เพิ่ม</button>
                                        <button id="editQuickAccountToggle" class="btn btn-sm btn-outline-secondary">แก้ไข</button>
                                    </div>
                                </div>
                                <div id="switchAccountContent" class="d-flex flex-column gap-2 px-1">
                                    <div class="text-muted small px-2">กำลังโหลดบัญชี...</div>
                                </div>
                            </ul>
                        </li>
                <?php if ($isLoggedIn): ?>
                    <li class="nav-item">
                        <a class="nav-link position-relative" href="#" onclick="openMailbox()" title="กล่องข้อความ">
                            <i class="bi bi-envelope-fill text-light"></i>
                            <span id="mailboxBadge" class="badge bg-danger position-absolute top-0 start-100 translate-middle" style="display: none;">0</span>
                        </a>
                    </li>
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle d-flex align-items-center" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <img src="<?= htmlspecialchars($avatar) ?>" alt="avatar" class="rounded-circle me-2" style="width:32px;height:32px;object-fit:cover;">
                            <span class="text-light"><?= htmlspecialchars($nickname) ?></span>
                        </a>
                        <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow-lg">
                            <li><a class="dropdown-item" href="profile.php"><i class="bi bi-person-circle me-2"></i>โปรไฟล์ของฉัน</a></li>
                            <li><a class="dropdown-item" href="VideoCall.php"><i class="bi bi-camera-video me-2"></i>เข้าห้องสนทนา</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="logout.php"><i class="bi bi-box-arrow-right me-2"></i>ออกจากระบบ</a></li>
                        </ul>
                    </li>
                <?php else: ?>
                    <li class="nav-item"><a class="nav-link text-light" href="quick-login.php"><i class="bi bi-grid-3x2-gap-fill me-2"></i>Quick Login</a></li>
                    <li class="nav-item"><a class="nav-link text-light" href="login.php">เข้าสู่ระบบ</a></li>
                    <li class="nav-item"><a class="btn btn-primary ms-lg-2" href="register.php">สร้างบัญชี</a></li>
                <?php endif; ?>
            </ul>
        </div>
    </div>
</nav>

<main class="main-hub">
    <div class="container">
        <div class="hub-container">
                <?php if ($isLoggedIn): ?>
                <!-- Logged-in Hub -->
                <div class="profile-summary">
                    <div class="avatar-wrapper" title="คลิกเพื่อดูโปรไฟล์" style="display:flex;align-items:center;gap:12px;">
                        <img id="indexAvatar" src="<?= htmlspecialchars($avatar) ?>" alt="avatar" class="avatar-img clickable-avatar" style="cursor:pointer;width:72px;height:72px;object-fit:cover;border-radius:12px;">
                        <div>
                            <p class="user-welcome mb-1" style="margin:0;color:#fff;">สวัสดี, <?= htmlspecialchars($nickname) ?></p>
                            <span class="rank-badge"><i class="bi bi-award-fill"></i> <?= htmlspecialchars($rank) ?></span>
                        </div>
                    </div>
                </div>

                <div id="rewards-widget" style="display: none;">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div class="fw-bold text-light">Level <span id="level-display" class="badge bg-primary rounded-pill fs-6">0</span></div>
                        <div class="d-flex align-items-center gap-2 fw-bold" style="color: #facc15;">
                            <svg width="20" height="20" viewBox="0 0 20 20" style="transform: rotate(-90deg);">
                                <circle r="8" cx="10" cy="10" fill="transparent" stroke="rgba(255,255,255,0.1)" stroke-width="3"></circle>
                                <circle id="coin-timer-circle" r="8" cx="10" cy="10" fill="transparent" stroke="currentColor" stroke-width="3"></circle>
                            </svg>
                            <span id="coins-display">0.00</span>
                        </div>
                    </div>
                    <div class="progress" style="height: 10px; background-color: rgba(0,0,0,0.3);">
                        <div id="exp-bar" class="progress-bar" role="progressbar" style="width: 0%;"></div>
                    </div>
                    <div class="d-flex justify-content-between small text-muted mt-1">
                        <span>EXP</span><span id="exp-display">0 / 100</span>
                    </div>
                    <div class="progress" style="height: 2px; background-color: transparent; margin-top: 8px;">
                        <div id="exp-timer-bar" class="progress-bar" role="progressbar" style="width: 0%;"></div>
                    </div>
                </div>

                <!-- decorative effect helpers (floating blobs) -->
                <div class="hub-decor" aria-hidden="true">
                    <div class="blob blob-1"></div>
                    <div class="blob blob-2"></div>
                    <div class="blob blob-3"></div>
                </div>

                <div class="action-buttons d-grid gap-3 mt-4">
                    <a href="VideoCall.php" class="btn btn-primary btn-lg"><i class="bi bi-camera-video me-2"></i>เข้าสู่ห้องสนทนา</a>
                    <a href="profile.php" class="btn btn-outline-light"><i class="bi bi-person-gear me-2"></i>จัดการโปรไฟล์</a>
                    <a href="quick-login-auth.php" class="btn btn-outline-info"><i class="bi bi-grid-3x2-gap-fill me-2"></i>Quick Login</a>
                    <a href="index_folder/Scores/MyScore.php" class="btn btn-success btn-lg"><i class="bi bi-trophy me-2"></i>คะแนนของฉัน</a>
                </div>

            <?php else: ?>
                <!-- Logged-out CTA -->
                <h1 class="hub-title">สื่อสารด้วยเสียงและภาพได้ทุกที่ ทุกเวลา</h1>
                <p class="hub-lead">เชื่อมต่อพูดคุยกับทีมและเพื่อนแบบเรียลไทม์ผ่านระบบวิดีโอคอลที่ออกแบบให้ใช้งานง่ายและปลอดภัย</p>
                <div class="action-buttons d-flex flex-column flex-sm-row gap-3 justify-content-center">
                    <a href="register.php" class="btn btn-primary btn-lg"><i class="bi bi-person-plus me-2"></i>เริ่มต้นใช้งานฟรี</a>
                    <a href="login.php" class="btn btn-outline-light btn-lg"><i class="bi bi-box-arrow-in-right me-2"></i>เข้าสู่ระบบ</a>
                </div>
                <div class="mt-3 text-center d-flex flex-column gap-2">
                    <a href="quick-login.php" class="text-decoration-none text-light">
                        <i class="bi bi-grid-3x2-gap-fill me-2"></i>Quick Login
                    </a>
                    <a href="index_folder/Scores/MyScore.php" class="text-decoration-none text-muted small">
                        <i class="bi bi-trophy me-1"></i>ดูตัวอย่างคะแนน
                    </a>
                </div>
            <?php endif; ?>
        </div>
    </div>
</main>

<footer class="footer mt-auto py-4">
    <div class="container">
        <p class="mb-0 text-center text-muted">PJChalita &copy; <?= date('Y') ?> — พัฒนาเพื่อการสื่อสารที่ราบรื่น</p>
    </div>
</footer>

<div id="notification-container" style="position: fixed; top: 20px; right: 20px; z-index: 1050;"></div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<?php if ($isLoggedIn): ?>
<script src="js/rewards.js" defer></script>
<?php endif; ?>
<script src="js/effects.js" defer></script>
<script src="js/Switch_Account.js" defer></script>

<!-- index page small initializer -->
<script>
document.addEventListener('DOMContentLoaded', function(){
    const avatar = document.getElementById('indexAvatar');
    if(avatar){
        avatar.addEventListener('click', function(){
            // Open profile page in same tab for now
            window.location.href = 'profile.php';
        });
    }

    // subtle float animation for blobs
    const blobs = document.querySelectorAll('.hub-decor .blob');
    blobs.forEach((b, i)=>{
        const dur = 8000 + i*1200;
        b.animate([
            { transform: 'translateY(0px) translateX(0px)' },
            { transform: 'translateY(-18px) translateX(6px)' },
            { transform: 'translateY(0px) translateX(0px)' }
        ],{ duration: dur, iterations: Infinity, easing: 'ease-in-out' });
    });

    // If logged-in and rewards present, reveal widget after a short delay
    <?php if ($isLoggedIn): ?>
    setTimeout(()=>{
        const w = document.getElementById('rewards-widget');
        if(w) w.style.display = 'block';
    }, 900);
    <?php endif; ?>
});
</script>

<!-- Add Account Modal -->
<div class="modal fade" id="addAccountModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">เพิ่มบัญชีสำหรับสลับ</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="addAccountForm">
                    <div class="mb-3">
                        <label for="addUsername" class="form-label">Username / Email</label>
                        <input id="addUsername" name="username" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label for="addPassword" class="form-label">Password</label>
                        <input id="addPassword" name="password" type="password" class="form-control" required>
                    </div>
                    <div class="form-text">บัญชีจะถูกบันทึกในเบราว์เซอร์สำหรับการสลับอย่างรวดเร็วเท่านั้น (ไม่แนะนำสำหรับเครื่องสาธารณะ)</div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                <button id="addAccountSubmit" type="button" class="btn btn-primary">บันทึก</button>
            </div>
        </div>
    </div>
</div>

<script>
// Expose current account info for Switch_Account.js to mark active account
window.__CURRENT_ACCOUNT = {
        username: <?= json_encode($_SESSION['username'] ?? null) ?>,
        nickname: <?= json_encode($_SESSION['nickname'] ?? null) ?>,
        avatar: <?= json_encode(get_avatar_url($_SESSION['avatar'] ?? null)) ?>
};
</script>

<!-- Mailbox Modal -->
<div class="modal fade" id="mailboxModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title"><i class="bi bi-envelope-fill me-2"></i>กล่องข้อความ</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div id="mailboxContent">
                    <div class="text-center text-muted">กำลังโหลดข้อความ...</div>
                </div>
            </div>
        </div>
    </div>
</div>

<script src="js/mailbox.js" defer></script>

</body>
</html>
