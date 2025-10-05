<?php
session_start();
require_once 'config.php';

if (($_SESSION['loggedin'] ?? false) !== true) {
    header('location: login.php');
    exit;
}

$userUuid = $_SESSION['uuid'] ?? '';
$userRank = $_SESSION['rank'] ?? 'Member';

// --- ดึงข้อมูล Level, Coins, EXP และ Avatar ---
$user_id = $_SESSION['id'];
$level = 0; $coins = 0.00; $exp = 0; $exp_to_next_level = 100;
$avatar_url = get_avatar_url($_SESSION['avatar'] ?? null);

if ($stmt = $mysqli->prepare("SELECT level, coins, exp, exp_to_next_level FROM users WHERE id = ?")) {
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $stmt->bind_result($level, $coins, $exp, $exp_to_next_level);
    $stmt->fetch();
    $stmt->close();
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ล็อบบี้วิดีโอคอล - PJChalita</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.8.1/font/bootstrap-icons.css">
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/videocall/room_found.css">
    <link rel="stylesheet" href="css/videocall/rewards.css">
</head>
<body>
    <a href="index.php" class="back-home-btn">
        <i class="bi bi-arrow-left-short"></i>
        <span data-back-home-label>กลับหน้าแรก</span>
    </a>

    <div class="rewards-hud" id="rewards-widget">
        <a href="profile.php" class="rewards-hud-avatar">
            <img src="<?php echo htmlspecialchars($avatar_url); ?>" alt="Avatar">
        </a>
        <div class="rewards-hud-info">
            <div class="info-row">
                <div class="level-display">
                    <i class="bi bi-star-fill"></i>
                    Level <span class="level-badge" id="level-display"><?php echo $level; ?></span>
                </div>
                <div class="coins-display">
                    <i class="bi bi-coin"></i>
                    <span id="coins-display"><?php echo number_format($coins, 2); ?></span>
                </div>
            </div>
            <div class="exp-bar-container">
                <div class="exp-bar" id="exp-bar" style="width: <?php echo ($exp / $exp_to_next_level) * 100; ?>%;"></div>
                <div class="exp-text" id="exp-display"><?php echo "$exp / $exp_to_next_level"; ?></div>
            </div>
        </div>
    </div>
    
    <div id="notification-container"></div>


    <div class="container lobby-container">
        <div class="section-heading">
            <div class="heading-text">
                <h1 data-heading-title>สำรวจห้องสนทนาทั้งหมด</h1>
                <p data-heading-subtitle>เข้าร่วมสนทนาผ่านวิดีโอได้ทันที หรือสร้างห้องใหม่สำหรับเพื่อนของคุณ</p>
            </div>
            <button class="btn btn-primary create-room-btn" data-bs-toggle="modal" data-bs-target="#createRoomModal">
                <i class="bi bi-plus-lg"></i>
                <span data-heading-action-label>สร้างห้องทันที</span>
            </button>
        </div>

        <div id="room-list" class="room-grid"></div>
    </div>

    <button class="btn btn-primary btn-lg rounded-circle create-room-fab" data-bs-toggle="modal" data-bs-target="#createRoomModal">
        <i class="bi bi-plus-lg"></i>
    </button>

    <div class="modal fade" id="createRoomModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <form id="createRoomForm">
                    <div class="modal-header">
                        <h5 class="modal-title">สร้างห้องสนทนา</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label for="room_name" class="form-label">ชื่อห้อง</label>
                            <input type="text" class="form-control" name="room_name" id="room_name" placeholder="เช่น ห้องชิลล์ยามค่ำคืน">
                        </div>
                        <div class="mb-3">
                            <label for="room_description" class="form-label">คำอธิบายห้อง</label>
                            <textarea class="form-control" name="description" id="room_description" rows="3" placeholder="บอกรายละเอียดหรือธีมของห้อง"></textarea>
                        </div>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label for="room_type" class="form-label">ประเภทห้อง</label>
                                <select class="form-select" name="room_type" id="room_type">
                                    <option value="public" selected>สาธารณะ (Public)</option>
                                    <option value="private">ส่วนตัว (Private)</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label for="member_limit" class="form-label">จำนวนผู้เข้าร่วมสูงสุด (ไม่เกิน 10)</label>
                                <input type="number" class="form-control" name="member_limit" id="member_limit" value="10" min="2" max="10">
                            </div>
                        </div>
                        <div class="mt-3" id="private-password-group">
                            <label for="password" class="form-label">รหัสผ่าน (สำหรับห้องส่วนตัว)</label>
                            <input type="password" class="form-control" name="password" id="password" placeholder="กำหนดรหัสเข้าใช้งานห้อง">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                        <button type="submit" class="btn btn-primary">สร้างห้อง</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <div class="modal fade" id="roomPasswordModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <form id="roomPasswordForm">
                    <div class="modal-header">
                        <h5 class="modal-title" data-password-title>ห้องนี้ต้องใช้รหัสผ่าน</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p class="text-muted small" data-password-description>ป้อนรหัสเพื่อเข้าร่วมห้องที่ป้องกันไว้</p>
                        <div class="mb-3">
                            <label class="form-label" for="room-password-input" data-password-label>รหัสผ่าน</label>
                            <div class="input-group">
                                <span class="input-group-text"><i class="bi bi-key-fill"></i></span>
                                <input type="password" class="form-control" id="room-password-input" autocomplete="current-password" required>
                            </div>
                            <div class="invalid-feedback d-none" id="room-password-error"></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" data-password-cancel>ยกเลิก</button>
                        <button type="submit" class="btn btn-primary" data-password-submit>ยืนยัน</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <div class="modal fade" id="manageRoomModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <form id="manageRoomForm">
                    <input type="hidden" id="manage-room-uuid">
                    <div class="modal-header">
                        <h5 class="modal-title" data-manage-title>จัดการข้อมูลห้อง</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label for="manage-room-name" class="form-label" data-manage-name-label>ชื่อห้อง</label>
                            <input type="text" class="form-control" id="manage-room-name" required>
                        </div>
                        <div class="mb-3">
                            <label for="manage-room-description" class="form-label" data-manage-description-label>คำอธิบาย</label>
                            <textarea class="form-control" id="manage-room-description" rows="3"></textarea>
                        </div>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label for="manage-room-type" class="form-label" data-manage-type-label>ประเภท</label>
                                <select class="form-select" id="manage-room-type">
                                    <option value="public">สาธารณะ</option>
                                    <option value="private">ส่วนตัว</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label for="manage-room-limit" class="form-label" data-manage-limit-label>จำนวนสมาชิกสูงสุด</label>
                                <input type="number" class="form-control" id="manage-room-limit" min="2" max="10">
                            </div>
                        </div>
                        <div class="mt-3" id="manage-room-password-group">
                            <label for="manage-room-password" class="form-label" data-manage-password-label>รหัสผ่าน (สำหรับห้องส่วนตัว)</label>
                            <input type="password" class="form-control" id="manage-room-password" placeholder="เปลี่ยนรหัสเข้าห้อง">
                        </div>
                        <div class="alert alert-danger d-none mt-3" id="manage-room-error"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-danger me-auto" id="manageRoomDeleteBtn" data-manage-delete>ลบห้อง</button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" data-manage-cancel>ยกเลิก</button>
                        <button type="submit" class="btn btn-primary" data-manage-save>บันทึก</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <div id="portal-overlay" class="portal-overlay hidden" aria-hidden="true">
        <div class="portal-overlay__ring">
            <div class="portal-overlay__swirl"></div>
            <div class="portal-overlay__icon portal-overlay__icon--key hidden"><i class="bi bi-key-fill"></i></div>
            <span class="portal-overlay__text">Connecting...</span>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        window.lobbyConfig = {
            userUuid: "<?php echo htmlspecialchars($userUuid, ENT_QUOTES, 'UTF-8'); ?>",
            userRank: "<?php echo htmlspecialchars($userRank, ENT_QUOTES, 'UTF-8'); ?>"
        };
    </script>
    <script src="js/rewards.js" defer></script>
    <script src="js/videocall/room_found.js" defer></script>
</body>
</html>