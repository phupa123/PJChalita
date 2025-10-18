<?php
session_start();
header('Content-Type: application/json');
require_once '../config.php';

// --- Security Check: User must be logged in ---
if (!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true) {
    http_response_code(401); // Unauthorized
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

// --- Directory Configuration ---
$baseUploadDir = __DIR__ . '/../uploads/files';
$tempDir = __DIR__ . '/../uploads/temp_chunks'; // โฟลเดอร์สำหรับเก็บชิ้นส่วนไฟล์ชั่วคราว

// สร้างโฟลเดอร์ temp ถ้ายังไม่มี
if (!is_dir($tempDir)) {
    mkdir($tempDir, 0777, true);
}

/**
 * ฟังก์ชันสำหรับจำแนกประเภทไฟล์จากชื่อไฟล์
 * @param string $fileName ชื่อไฟล์
 * @return string ประเภทไฟล์ (images, videos, others)
 */
function getFileType(string $fileName): string {
    $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    $imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    $videoTypes = ['mp4', 'mov', 'avi', 'webm', 'mkv'];
    
    if (in_array($extension, $imageTypes)) return 'images';
    if (in_array($extension, $videoTypes)) return 'videos';
    return 'others';
}

/**
 * ฟังก์ชันสำหรับดึงรายการไฟล์ทั้งหมดที่อัปโหลดแล้ว
 * @param string $baseDir Path ไปยังโฟลเดอร์หลัก
 * @return array รายการไฟล์
 */
function getFiles(string $baseDir): array {
    $files = [];
    $types = ['images', 'videos', 'others'];
    foreach ($types as $type) {
        $dir = $baseDir . '/' . $type;
        if (!is_dir($dir)) continue;

        $items = scandir($dir);
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') continue;
            $filePath = $dir . '/' . $item;
            $files[] = [
                'name' => $item,
                'type' => $type,
                'size' => filesize($filePath),
                'url' => 'uploads/files/' . $type . '/' . rawurlencode($item)
            ];
        }
    }
    return $files;
}

// --- API Endpoint Routing ---
$action = $_GET['action'] ?? null;
$method = $_SERVER['REQUEST_METHOD'];

// Endpoint: ดึงรายการไฟล์
if ($method === 'GET' && $action === 'list') {
    echo json_encode(['success' => true, 'files' => getFiles($baseUploadDir)]);
    exit;
}

// Endpoint: อัปโหลดชิ้นส่วนไฟล์ (Chunk)
if ($method === 'POST' && isset($_FILES['fileChunk'])) {
    $chunk = $_FILES['fileChunk'];
    $chunkIndex = (int)$_POST['chunkIndex'];
    $totalChunks = (int)$_POST['totalChunks'];
    $identifier = preg_replace('/[^a-zA-Z0-9-_\.]/', '', $_POST['chunkIdentifier']);
    $originalFileName = basename($_POST['originalFileName']);

    $chunkDir = $tempDir . '/' . $identifier;
    if (!is_dir($chunkDir)) {
        mkdir($chunkDir, 0777, true);
    }
    
    $tempFilePath = $chunkDir . '/' . $chunkIndex . '.part';

    if (!move_uploaded_file($chunk['tmp_name'], $tempFilePath)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to save chunk.']);
        exit;
    }

    // --- ตรรกะการรวมไฟล์ (File Assembly) ---
    // ตรวจสอบว่าได้รับครบทุกชิ้นส่วนหรือยัง
    $isDone = true;
    for ($i = 0; $i < $totalChunks; $i++) {
        if (!file_exists($chunkDir . '/' . $i . '.part')) {
            $isDone = false;
            break;
        }
    }

    if ($isDone) {
        // ถ้าได้รับครบทุกชิ้นส่วนแล้ว ให้ทำการรวมไฟล์
        $fileType = getFileType($originalFileName);
        $finalDir = $baseUploadDir . '/' . $fileType;
        if (!is_dir($finalDir)) mkdir($finalDir, 0777, true);

        $finalFileName = uniqid() . '-' . preg_replace("/[^a-zA-Z0-9._-]/", "_", $originalFileName);
        $finalPath = $finalDir . '/' . $finalFileName;
        
        $outStream = fopen($finalPath, 'wb');
        if (!$outStream || !flock($outStream, LOCK_EX)) { // **ใช้ File Lock ป้องกันไฟล์เสียหาย**
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Cannot open final file for writing or get a lock.']);
            exit;
        }

        for ($i = 0; $i < $totalChunks; $i++) {
            $partPath = $chunkDir . '/' . $i . '.part';
            $inStream = fopen($partPath, 'rb');
            stream_copy_to_stream($inStream, $outStream); // **ใช้ Stream เพื่อประหยัด Memory**
            fclose($inStream);
            unlink($partPath); // ลบชิ้นส่วนทิ้งหลังรวมเสร็จ
        }
        
        flock($outStream, LOCK_UN); // **ปลดล็อกไฟล์**
        fclose($outStream);
        rmdir($chunkDir); // ลบโฟลเดอร์ของ chunk

        echo json_encode(['success' => true, 'message' => 'File assembled successfully.']);
    } else {
        // ถ้ายังไม่ครบ ให้ตอบกลับไปก่อนว่าได้รับแล้ว
        echo json_encode(['success' => true, 'message' => 'Chunk received.']);
    }
    exit;
}

// Endpoint: ลบไฟล์
if ($method === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true);
    $fileName = $data['name'] ?? null;
    $fileType = $data['type'] ?? null;

    if (!$fileName || !$fileType) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid request.']);
        exit;
    }

    $filePath = realpath($baseUploadDir . '/' . $fileType . '/' . $fileName);
    $basePath = realpath($baseUploadDir);

    // Security check to prevent directory traversal
    if ($filePath && str_starts_with($filePath, $basePath) && file_exists($filePath)) {
        if (unlink($filePath)) {
            echo json_encode(['success' => true, 'message' => 'File deleted.']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Could not delete file.']);
        }
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'File not found or invalid path.']);
    }
    exit;
}

// ถ้าไม่มี action ใดตรงกับที่ร้องขอ
http_response_code(405); // Method Not Allowed
echo json_encode(['success' => false, 'message' => 'Method not allowed or invalid request.']);
?>