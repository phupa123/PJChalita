<?php
session_start();
require_once 'config.php';

// --- Security & Initialization ---
if (!($_SESSION['loggedin'] ?? false)) {
    header('Location: login.php');
    exit;
}
$userId = (int) ($_SESSION['id'] ?? 0);
if ($userId <= 0) {
    header('Location: logout.php');
    exit;
}

$profileId = (int) ($_GET['id'] ?? $userId);
if ($profileId <= 0) {
    $profileId = $userId;
}
$isOwnProfile = ($profileId === $userId);

$messages = ['success' => [], 'error' => []];

// --- Helper Functions ---
function add_message(array &$collection, string $type, string $text): void {
    $collection[$type][] = $text;
}

function format_thai_date(?string $dateString): string {
    if (!$dateString) return '-';
    try {
        $dt = new DateTime($dateString);
        $months = [1 => 'ม.ค.', 2 => 'ก.พ.', 3 => 'มี.ค.', 4 => 'เม.ย.', 5 => 'พ.ค.', 6 => 'มิ.ย.', 7 => 'ก.ค.', 8 => 'ส.ค.', 9 => 'ก.ย.', 10 => 'ต.ค.', 11 => 'พ.ย.', 12 => 'ธ.ค.'];
        return sprintf('%d %s %d', $dt->format('j'), $months[(int)$dt->format('n')], (int)$dt->format('Y') + 543);
    } catch (Exception $e) {
        return '-';
    }
}

// --- POST Request Handling ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $isOwnProfile) {
    $action = $_POST['profile_action'] ?? '';

    // Update User Info
    if ($action === 'update_info') {
        $displayName = trim($_POST['display_name'] ?? '');
        $email = trim($_POST['email'] ?? '');
        if (empty($displayName) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            add_message($messages, 'error', 'กรุณากรอกชื่อและอีเมลที่ถูกต้อง');
        } else {
            if ($stmt = $mysqli->prepare('UPDATE users SET nickname = ?, email = ? WHERE id = ?')) {
                $stmt->bind_param('ssi', $displayName, $email, $userId);
                if ($stmt->execute()) {
                    $_SESSION['nickname'] = $displayName;
                    $_SESSION['email'] = $email;
                    add_message($messages, 'success', 'บันทึกข้อมูลโปรไฟล์เรียบร้อย');
                } else {
                    add_message($messages, 'error', 'บันทึกข้อมูลไม่สำเร็จ');
                }
                $stmt->close();
            }
        }
    }

    // Change Password
    if ($action === 'change_password') {
        $currentPassword = $_POST['current_password'] ?? '';
        $newPassword = $_POST['new_password'] ?? '';
        $confirmPassword = $_POST['confirm_password'] ?? '';

        if ($newPassword !== $confirmPassword) add_message($messages, 'error', 'รหัสผ่านใหม่ไม่ตรงกัน');
        elseif (strlen($newPassword) < 8) add_message($messages, 'error', 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร');
        elseif (empty($currentPassword)) add_message($messages, 'error', 'กรุณากรอกรหัสผ่านปัจจุบัน');
        else {
            if ($stmt = $mysqli->prepare('SELECT password FROM users WHERE id = ?')) {
                $stmt->bind_param('i', $userId);
                $stmt->execute();
                $stmt->bind_result($existingHash);
                if ($stmt->fetch() && password_verify($currentPassword, $existingHash)) {
                    $stmt->close();
                    $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);
                    if ($stmt_update = $mysqli->prepare('UPDATE users SET password = ? WHERE id = ?')) {
                        $stmt_update->bind_param('si', $passwordHash, $userId);
                        $stmt_update->execute() ? add_message($messages, 'success', 'เปลี่ยนรหัสผ่านเรียบร้อย') : add_message($messages, 'error', 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
                        $stmt_update->close();
                    }
                } else {
                    add_message($messages, 'error', 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
                    if (!$stmt->fetch()) $stmt->close();
                }
            }
        }
    }

    // Avatar Upload
    if ($action === 'upload_avatar' && isset($_FILES['avatar_file']) && $_FILES['avatar_file']['error'] === UPLOAD_ERR_OK) {
        // Simplified avatar handling logic from previous steps
        $file = $_FILES['avatar_file'];
        $webPath = 'uploads/avatars/' . 'avatar_' . $userId . '_' . time() . '.' . strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (move_uploaded_file($file['tmp_name'], __DIR__ . '/' . $webPath)) {
            if ($stmt = $mysqli->prepare('UPDATE users SET avatar = ? WHERE id = ?')) {
                $stmt->bind_param('si', $webPath, $userId);
                if ($stmt->execute()) {
                    $_SESSION['avatar'] = $webPath;
                    add_message($messages, 'success', 'อัปเดตรูปโปรไฟล์เรียบร้อย');
                }
                $stmt->close();
            }
        }
    }

    // Avatar Reset
    if ($action === 'reset_avatar') {
        if ($stmt = $mysqli->prepare('UPDATE users SET avatar = NULL WHERE id = ?')) {
            $stmt->bind_param('i', $userId);
            if ($stmt->execute()) {
                unset($_SESSION['avatar']);
                add_message($messages, 'success', 'รีเซ็ตรูปโปรไฟล์แล้ว');
            }
            $stmt->close();
        }
    }
}

// --- Data Fetching ---
if ($stmt = $mysqli->prepare('SELECT username, nickname, email, rank, avatar, created_at FROM users WHERE id = ?')) {
    $stmt->bind_param('i', $profileId);
    $stmt->execute();
    $profile = $stmt->get_result()->fetch_assoc();
    $stmt->close();
}

$avatarUrl = get_avatar_url($profile['avatar'] ?? null);
$joinedLabel = format_thai_date($profile['created_at']);

$mysqli->close();
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>โปรไฟล์<?= $isOwnProfile ? 'ของฉัน' : 'ของ ' . htmlspecialchars($profile['nickname'] ?: $profile['username']) ?> - PJChalita</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="css/profile.css">
</head>
<body class="profile-page">

<header class="profile-header">
    <div class="container">
        <a href="index.php" class="back-link"><i class="bi bi-arrow-left"></i> กลับหน้าหลัก</a>
        <h1>โปรไฟล์<?= $isOwnProfile ? 'ของฉัน' : 'ของ ' . htmlspecialchars($profile['nickname'] ?: $profile['username']) ?></h1>
        <p><?= $isOwnProfile ? 'จัดการข้อมูลบัญชีและรูปภาพของคุณ' : 'ดูข้อมูลโปรไฟล์' ?></p>
    </div>
</header>

<main class="container py-4 py-lg-5">
    
    <?php foreach (['success', 'error'] as $type):
        foreach ($messages[$type] as $message):
            $variant = ($type === 'success') ? 'success' : 'danger'; ?>
            <div class="row justify-content-center"><div class="col-lg-10 col-xl-8"><div class="alert alert-<?= $variant ?> alert-dismissible fade show" role="alert">
                <?= htmlspecialchars($message) ?><button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div></div></div>
    <?php endforeach; endforeach; ?>

    <div class="row justify-content-center g-4 g-lg-5">
        <div class="col-12 col-lg-4">
            <div class="card profile-summary-card sticky-lg-top" style="top: 2rem;">
                <div class="avatar-wrapper">
                    <img src="<?= htmlspecialchars($avatarUrl) ?>" alt="รูปโปรไฟล์" id="avatarPreview" class="avatar-img">
                </div>
                <div class="card-body">
                    <h2 class="h4 mb-1 text-light"><?= htmlspecialchars($profile['nickname'] ?: $profile['username']) ?></h2>
                    <p class="text-muted mb-2">@<?= htmlspecialchars($profile['username']) ?></p>
                    <span class="badge rank-badge rank-<?= strtolower(htmlspecialchars($profile['rank'])) ?>"><?= htmlspecialchars($profile['rank']) ?></span>
                    <hr class="my-3 opacity-25">

                        <div class="mb-3">
                            <button id="saveQuickAccountBtn" type="button" class="btn btn-sm btn-outline-primary">บันทึกบัญชีสำหรับสลับ</button>
                        </div>

                    <div id="rewards-widget" style="display: none; margin-top: 1.5rem; text-align: left;">
                        <!-- Level & Coins -->
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <div class="fw-bold text-light">
                                Level <span id="level-display" class="badge bg-primary rounded-pill fs-6" style="vertical-align: middle;">0</span>
                            </div>
                            <div class="d-flex align-items-center gap-2 fw-bold" style="color: #facc15;">
                                <svg id="coin-timer-svg" width="20" height="20" viewBox="0 0 20 20" style="transform: rotate(-90deg);">
                                    <circle r="8" cx="10" cy="10" fill="transparent" stroke="rgba(255,255,255,0.1)" stroke-width="3"></circle>
                                    <circle id="coin-timer-circle" r="8" cx="10" cy="10" fill="transparent" stroke="currentColor" stroke-width="3"></circle>
                                </svg>
                                <span id="coins-display">0.00</span>
                            </div>
                        </div>

                        <!-- EXP Bar -->
                        <div class="progress" style="height: 10px; background-color: rgba(0,0,0,0.3);">
                            <div id="exp-bar" class="progress-bar" role="progressbar" style="width: 0%; background-color: var(--accent);"></div>
                        </div>
                        <div class="d-flex justify-content-between small text-muted mt-1">
                            <span>EXP</span>
                            <span id="exp-display">0 / 100</span>
                        </div>

                        <!-- EXP Timer Bar -->
                        <div class="progress" style="height: 2px; background-color: transparent; margin-top: 8px;">
                            <div id="exp-timer-bar" class="progress-bar" role="progressbar" style="width: 0%; background-color: rgba(255,255,255,0.2);"></div>
                        </div>
                    </div>

                    <p class="text-muted small mb-0">เป็นสมาชิกตั้งแต่ <?= htmlspecialchars($joinedLabel) ?></p>
                </div>
            </div>
        </div>

        <div class="col-12 col-lg-6">
            <div class="card mb-4">
                <div class="card-body p-lg-4">
                    <h3 class="h5 mb-4 text-light">เปลี่ยนรูปโปรไฟล์</h3>
                    <form method="post" enctype="multipart/form-data" id="avatarForm">
                        <input type="hidden" name="profile_action" value="upload_avatar">
                        <div class="mb-3">
                            <label for="avatarInput" class="form-label">เลือกไฟล์รูปภาพใหม่</label>
                            <input class="form-control" type="file" accept="image/*" name="avatar_file" id="avatarInput" required>
                            <div class="form-text mt-2">รองรับ: JPG, PNG, GIF, WEBP (ขนาดไม่เกิน 2MB)</div>
                        </div>
                        <div class="d-flex flex-column flex-sm-row gap-2">
                            <button type="submit" class="btn btn-primary"><i class="bi bi-upload me-2"></i>อัปโหลด</button>
                            <button type="submit" form="resetAvatarForm" class="btn btn-outline-danger"><i class="bi bi-trash me-2"></i>ใช้รูปเริ่มต้น</button>
                        </div>
                    </form>
                    <form method="post" id="resetAvatarForm" class="d-none"><input type="hidden" name="profile_action" value="reset_avatar"></form>
                </div>
            </div>

            <div class="card mb-4">
                <div class="card-body p-lg-4">
                    <h3 class="h5 mb-4 text-light">ข้อมูลบัญชี</h3>
                    <form method="post" id="infoForm">
                        <input type="hidden" name="profile_action" value="update_info">
                        <div class="row g-3">
                            <div class="col-12">
                                <label class="form-label" for="displayName">ชื่อที่ใช้แสดง</label>
                                <input type="text" class="form-control" id="displayName" name="display_name" value="<?= htmlspecialchars($profile['nickname']) ?>" required>
                            </div>
                            <div class="col-12">
                                <label class="form-label" for="email">อีเมล</label>
                                <input type="email" class="form-control" id="email" name="email" value="<?= htmlspecialchars($profile['email']) ?>" required>
                            </div>
                        </div>
                        <div class="mt-4">
                            <button type="submit" class="btn btn-primary"><i class="bi bi-save me-2"></i>บันทึกข้อมูล</button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="card">
                <div class="card-body p-lg-4">
                    <h3 class="h5 mb-4 text-light">เปลี่ยนรหัสผ่าน</h3>
                    <form method="post" id="passwordForm">
                        <input type="hidden" name="profile_action" value="change_password">
                        <div class="row g-3">
                            <div class="col-12">
                                <label class="form-label" for="currentPassword">รหัสผ่านปัจจุบัน</label>
                                <input type="password" class="form-control" id="currentPassword" name="current_password" required placeholder="กรอกเพื่อยืนยัน">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label" for="newPassword">รหัสผ่านใหม่</label>
                                <input type="password" class="form-control" id="newPassword" name="new_password" minlength="8" required placeholder="อย่างน้อย 8 ตัวอักษร">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label" for="confirmPassword">ยืนยันรหัสผ่านใหม่</label>
                                <input type="password" class="form-control" id="confirmPassword" name="confirm_password" minlength="8" required placeholder="พิมพ์รหัสใหม่อีกครั้ง">
                            </div>
                        </div>
                        <div class="mt-4">
                            <button type="submit" class="btn btn-primary"><i class="bi bi-shield-lock me-2"></i>เปลี่ยนรหัสผ่าน</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</main>

<div id="notification-container"></div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script>
    // Simple preview for avatar
    const avatarInput = document.getElementById('avatarInput');
    const avatarPreview = document.getElementById('avatarPreview');
    if (avatarInput && avatarPreview) {
        avatarInput.addEventListener('change', () => {
            const file = avatarInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => { avatarPreview.src = e.target.result; };
                reader.readAsDataURL(file);
            }
        });
    }
</script>
<script src="js/rewards.js" defer></script>
<script src="js/effects.js" defer></script>
<script src="js/Switch_Account.js" defer></script>

</body>
</html>
