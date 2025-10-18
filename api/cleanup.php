<?php
// cleanup.php - สคริปต์สำหรับลบไฟล์ชิ้นส่วนที่อัปโหลดไม่สำเร็จ

// ตั้งค่าความปลอดภัย: อนุญาตให้รันสคริปต์นี้จาก command line หรือโดย admin เท่านั้น
// ในที่นี้จะใช้การ check session แบบง่ายๆ ก่อน
session_start();
if (($_SESSION['loggedin'] ?? false) !== true || ($_SESSION['rank'] ?? 'Member') !== 'Owner') {
     die('Access Denied.');
}

header('Content-Type: text/plain');

$tempDir = __DIR__ . '/../uploads/temp_chunks';
$maxFileAge = 24 * 3600; // 24 ชั่วโมง (ในหน่วยวินาที)
$filesDeleted = 0;
$sizeCleaned = 0;

if (!is_dir($tempDir)) {
    echo "Temporary directory not found. Nothing to do.\n";
    exit;
}

echo "Starting cleanup process for directory: " . $tempDir . "\n";
echo "Max file age: " . ($maxFileAge / 3600) . " hours\n\n";

$dirs = scandir($tempDir);

foreach ($dirs as $dir) {
    if ($dir === '.' || $dir === '..') continue;

    $chunkDir = $tempDir . '/' . $dir;
    if (is_dir($chunkDir)) {
        $dirAge = time() - filemtime($chunkDir);
        if ($dirAge > $maxFileAge) {
            // ลบไฟล์ทั้งหมดในโฟลเดอร์ chunk ที่เก่าแล้ว
            $files = glob($chunkDir . '/*.part');
            foreach ($files as $file) {
                $fileSize = filesize($file);
                if (unlink($file)) {
                    $filesDeleted++;
                    $sizeCleaned += $fileSize;
                }
            }
            // ลบโฟลเดอร์ chunk เอง
            if (rmdir($chunkDir)) {
                 echo "Deleted old chunk directory: " . $dir . "\n";
            }
        }
    }
}

echo "\nCleanup complete.\n";
echo "Files deleted: " . $filesDeleted . "\n";
echo "Total size cleaned: " . number_format($sizeCleaned / 1024 / 1024, 2) . " MB\n";
?>