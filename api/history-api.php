<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once '../config.php';
session_start();

header('Content-Type: application/json');

// ตรวจสอบสิทธิ์ - อนุญาตเฉพาะ Owner
if (!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true || ($_SESSION['rank'] ?? '') !== 'Owner') {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Permission denied.']);
    exit;
}

$user_uuid = $_SESSION['uuid'];
$method = $_SERVER['REQUEST_METHOD'];

// ใช้ $mysqli จาก config.php
global $mysqli;

switch ($method) {
    case 'GET':
        handleGet($mysqli, $user_uuid);
        break;
    case 'POST':
        handlePost($mysqli, $user_uuid);
        break;
    case 'DELETE':
        handleDelete($mysqli, $user_uuid);
        break;
    default:
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Method not allowed.']);
        break;
}

function handleGet($mysqli, $user_uuid) {
    $sql = "SELECT id, file_name, file_type, file_size, created_at FROM recordings WHERE user_uuid = ? ORDER BY created_at DESC";
    if($stmt = $mysqli->prepare($sql)) {
        $stmt->bind_param('s', $user_uuid);
        $stmt->execute();
        $result = $stmt->get_result();
        $recordings = $result->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        echo json_encode(['status' => 'success', 'data' => $recordings]);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Database query failed.']);
    }
}

function handlePost($mysqli, $user_uuid) {
    if (!isset($_FILES['file']) || !isset($_POST['fileType'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Missing file or file type.']);
        return;
    }

    $file = $_FILES['file'];
    $fileType = $_POST['fileType']; // 'image' or 'video'
    $format = $_POST['format'] ?? 'png'; // 'png', 'webm', or 'mp4'

    $baseDir = '../uploads/recordings/';
    $uploadDir = $baseDir . ($fileType === 'image' ? 'images/' : 'videos/');

    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0777, true)) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to create upload directory.']);
            return;
        }
    }

    $fileExtension = pathinfo($file['name'], PATHINFO_EXTENSION);
    if (empty($fileExtension)) { // จัดการกรณีที่ไฟล์ไม่มีนามสกุล (เช่น blob)
        $fileExtension = $format;
    }
    $uniqueName = uniqid('rec_', true) . '.' . $fileExtension;
    $uploadPath = $uploadDir . $uniqueName;

    if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to move uploaded file.']);
        return;
    }

    $final_filename = $uniqueName;
    $final_filesize = $file['size'];

    // --- การแปลงไฟล์วิดีโอเป็น MP4 ---
    // **หมายเหตุ:** เซิร์ฟเวอร์ของคุณต้องติดตั้ง FFmpeg ก่อน!
    if ($fileType === 'video' && $format === 'mp4' && $fileExtension !== 'mp4') {
        $mp4_filename = pathinfo($uniqueName, PATHINFO_FILENAME) . '.mp4';
        $mp4_path = $uploadDir . $mp4_filename;
        
        // คำสั่ง FFmpeg (อาจต้องระบุ path เต็มของ ffmpeg หากไม่ได้อยู่ใน PATH ของระบบ)
        $command = "ffmpeg -i " . escapeshellarg($uploadPath) . " -c:v libx264 -preset veryfast -crf 23 -c:a aac -b:a 128k -y " . escapeshellarg($mp4_path) . " 2>&1";
        
        $output = shell_exec($command); // รันคำสั่ง

        if (file_exists($mp4_path) && filesize($mp4_path) > 0) {
            unlink($uploadPath); // ลบไฟล์ .webm ต้นฉบับ
            $final_filename = $mp4_filename;
            $final_filesize = filesize($mp4_path);
        } else {
            // หากแปลงไฟล์ไม่สำเร็จ ให้ใช้ไฟล์ .webm เดิม
            // สามารถ log $output เพื่อดู error จาก ffmpeg ได้
        }
    }

    $sql = "INSERT INTO recordings (uuid, user_uuid, file_name, file_type, file_size) VALUES (?, ?, ?, ?, ?)";
    if($stmt = $mysqli->prepare($sql)) {
        $uuid = uniqid();
        $stmt->bind_param('ssssi', $uuid, $user_uuid, $final_filename, $fileType, $final_filesize);
        if ($stmt->execute()) {
            echo json_encode(['status' => 'success', 'message' => 'File uploaded successfully.', 'file' => $final_filename]);
        } else {
            http_response_code(500);
            unlink($uploadDir . $final_filename);
            echo json_encode(['status' => 'error', 'message' => 'Database insert failed.']);
        }
        $stmt->close();
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Database prepare statement failed.']);
    }
}

function handleDelete($mysqli, $user_uuid) {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!isset($data['id'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Missing recording ID.']);
        return;
    }

    $recording_id = (int)$data['id'];

    // ดึงข้อมูลไฟล์เพื่อตรวจสอบและลบ
    $sql_select = "SELECT file_name, file_type FROM recordings WHERE id = ? AND user_uuid = ?";
    if($stmt_select = $mysqli->prepare($sql_select)) {
        $stmt_select->bind_param('is', $recording_id, $user_uuid);
        $stmt_select->execute();
        $result = $stmt_select->get_result();
        $recording = $result->fetch_assoc();
        $stmt_select->close();

        if ($recording) {
            // ลบไฟล์จริง
            $baseDir = '../uploads/recordings/';
            $filePath = $baseDir . ($recording['file_type'] === 'image' ? 'images/' : 'videos/') . $recording['file_name'];
            if (file_exists($filePath)) {
                unlink($filePath);
            }

            // ลบข้อมูลในฐานข้อมูล
            $sql_delete = "DELETE FROM recordings WHERE id = ?";
            if($stmt_delete = $mysqli->prepare($sql_delete)) {
                $stmt_delete->bind_param('i', $recording_id);
                $stmt_delete->execute();
                $stmt_delete->close();
                echo json_encode(['status' => 'success', 'message' => 'Recording deleted successfully.']);
            }
        } else {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Recording not found or permission denied.']);
        }
    }
}
?>