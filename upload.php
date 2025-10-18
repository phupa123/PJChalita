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
    <title>Upload Files - PJChalita</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/upload.css">
</head>
<body class="upload-page">

<nav class="navbar navbar-expand-lg navbar-custom sticky-top">
    <div class="container">
        <a class="navbar-brand fw-bold text-light" href="index.php">PJChalita</a>
        <a href="index.php" class="btn btn-outline-light back-btn"><i class="bi bi-arrow-left me-1"></i>กลับหน้าหลัก</a>
    </div>
</nav>

<main class="container mt-5">
    <div class="upload-container">
        <div id="drop-zone" class="drop-zone">
            <div class="drop-zone-prompt">
                <i class="bi bi-cloud-arrow-up-fill"></i>
                <p>ลากไฟล์มาวางที่นี่ หรือ <strong>คลิกเพื่อเลือกไฟล์</strong></p>
                <small>รองรับการอัปโหลดหลายไฟล์พร้อมกัน</small>
            </div>
            <input type="file" id="file-input" multiple hidden>
        </div>

        <div id="upload-queue" class="upload-queue"></div>

        <div class="file-list-container mt-5">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h3><i class="bi bi-folder-fill me-2"></i>ไฟล์ที่อัปโหลดแล้ว</h3>
                <button id="refresh-list-btn" class="btn btn-sm btn-outline-secondary">
                    <i class="bi bi-arrow-clockwise"></i> รีเฟรช
                </button>
            </div>
            <div id="file-list" class="file-list">
                <p class="text-center text-muted">กำลังโหลดรายการไฟล์...</p>
            </div>
        </div>
    </div>
</main>

<div class="modal fade" id="filePreviewModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content bg-dark">
            <div class="modal-header border-0">
                <h5 class="modal-title text-light" id="filePreviewTitle"></h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body text-center">
                <div id="filePreviewContent"></div>
            </div>
            <div class="modal-footer justify-content-between border-0">
                <button class="btn btn-outline-light" id="prevFileBtn"><i class="bi bi-arrow-left"></i> ย้อนกลับ</button>
                <button class="btn btn-outline-light" id="nextFileBtn">ถัดไป <i class="bi bi-arrow-right"></i></button>
            </div>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="js/upload.js"></script>

</body>
</html>