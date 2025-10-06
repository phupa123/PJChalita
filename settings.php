 <?php
session_start();
require_once 'config.php';

if (!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true) {
    header("location: login.php");
    exit;
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ตั้งค่า - PJChalita</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="css/settings.css">
</head>
<body>
    <div class="container-fluid">
        <div class="row">
            <!-- Sidebar -->
            <nav class="col-md-3 col-lg-2 d-md-block bg-dark sidebar">
                <div class="position-sticky pt-3">
                    <h5 class="text-white px-3 mb-3">ตั้งค่า</h5>
                    <ul class="nav flex-column">
                        <li class="nav-item">
                            <a class="nav-link active" href="#video-audio" onclick="showSection('video-audio')">
                                <i class="bi bi-camera-video me-2"></i>วิดีโอ & เสียง
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="#volume" onclick="showSection('volume')">
                                <i class="bi bi-volume-up me-2"></i>ระดับเสียง
                            </a>
                        </li>
                    </ul>
                </div>
            </nav>

            <!-- Main content -->
            <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4">
                <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <div class="d-flex align-items-center">
                        <button onclick="goBack()" class="btn btn-outline-primary me-3">
                            <i class="bi bi-arrow-left me-1"></i>ย้อนกลับ
                        </button>
                        <h1 class="h2 mb-0">ตั้งค่า</h1>
                    </div>
                    <div class="btn-toolbar mb-2 mb-md-0">
                        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="resetSettings()">
                            <i class="bi bi-arrow-counterclockwise me-1"></i>รีเซ็ตเป็นค่าเริ่มต้น
                        </button>
                    </div>
                </div>

                <!-- Video & Audio Settings -->
                <div id="video-audio-section" class="settings-section">
                    <h3><i class="bi bi-camera-video me-2"></i>ตั้งค่าวิดีโอ & เสียง</h3>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card mb-3">
                                <div class="card-body">
                                    <h5 class="card-title">กล้อง</h5>
                                    <div class="mb-3">
                                        <label class="form-label">การเปิดกล้องอัตโนมัติ</label>
                                        <select class="form-select" id="camera-auto">
                                            <option value="auto">อัตโนมัติ</option>
                                            <option value="on">เปิดเสมอ</option>
                                            <option value="off">ปิดเสมอ</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card mb-3">
                                <div class="card-body">
                                    <h5 class="card-title">ไมโครโฟน</h5>
                                    <div class="mb-3">
                                        <label class="form-label">การเปิดไมค์อัตโนมัติ</label>
                                        <select class="form-select" id="mic-auto">
                                            <option value="auto">อัตโนมัติ</option>
                                            <option value="on">เปิดเสมอ</option>
                                            <option value="off">ปิดเสมอ</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Volume Settings -->
                <div id="volume-section" class="settings-section" style="display: none;">
                    <h3><i class="bi bi-volume-up me-2"></i>ตั้งค่าระดับเสียง</h3>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card mb-3">
                                <div class="card-body">
                                    <h5 class="card-title">เสียงเข้าออกห้อง</h5>
                                    <div class="mb-3">
                                        <label class="form-label">ระดับเสียง: <span id="join-leave-volume-value">50</span>%</label>
                                        <input type="range" class="form-range" id="join-leave-volume" min="0" max="100" value="50">
                                    </div>
                                    <button type="button" class="btn btn-outline-secondary btn-sm" onclick="testJoinLeaveSound()">
                                        <i class="bi bi-play-circle me-1"></i>ทดสอบเสียงเข้าห้อง
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card mb-3">
                                <div class="card-body">
                                    <h5 class="card-title">เสียงปุ่ม</h5>
                                    <div class="mb-3">
                                        <label class="form-label">ระดับเสียง: <span id="button-sound-volume-value">50</span>%</label>
                                        <input type="range" class="form-range" id="button-sound-volume" min="0" max="100" value="50">
                                    </div>
                                    <button type="button" class="btn btn-outline-secondary btn-sm" onclick="testButtonSound()">
                                        <i class="bi bi-play-circle me-1"></i>ทดสอบเสียงปุ่ม
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="js/settings.js"></script>
</body>
</html>
