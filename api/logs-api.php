<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../config.php';
session_start();

$LOGS_DIR = __DIR__ . '/../logs';
$response = ['status' => 'error', 'message' => 'An unknown error occurred.'];

if (!isset($_SESSION['loggedin']) || $_SESSION['loggedin'] !== true || ($_SESSION['rank'] ?? '') !== 'Owner') {
    http_response_code(403);
    $response['message'] = 'Permission denied.';
    echo json_encode($response);
    exit;
}

if (!is_dir($LOGS_DIR)) {
    if (!mkdir($LOGS_DIR, 0775, true)) {
        http_response_code(500);
        $response['message'] = 'Failed to create logs directory.';
        echo json_encode($response);
        exit;
    }
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'log':
            $data = json_decode(file_get_contents('php://input'), true);
            if (!$data || !isset($data['entry'])) throw new Exception('Invalid log data.');
            
            $roomUuid = $data['room'] ?? 'unknown_room';
            $safeRoomUuid = preg_replace('/[^a-z0-9\-]/i', '', $roomUuid);
            $logFileName = sprintf('%s/%s_%s.log', $LOGS_DIR, $safeRoomUuid, date('Y-m-d'));
            
            file_put_contents($logFileName, json_encode($data['entry']) . PHP_EOL, FILE_APPEND | LOCK_EX);
            $response = ['status' => 'success'];
            break;

        case 'get_logs':
            $roomUuid = $_GET['room'] ?? null;
            if (!$roomUuid) throw new Exception('Room ID is required.');

            $safeRoomUuid = preg_replace('/[^a-z0-9\-]/i', '', $roomUuid);
            $logPattern = sprintf('%s/%s_*.log', $LOGS_DIR, $safeRoomUuid);
            
            $logFiles = glob($logPattern);
            $allLogs = [];
            foreach ($logFiles as $file) {
                $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                foreach ($lines as $line) {
                    if ($decoded = json_decode($line, true)) $allLogs[] = $decoded;
                }
            }
            
            usort($allLogs, fn($a, $b) => ($b['timestamp'] ?? 0) <=> ($a['timestamp'] ?? 0));
            $response = ['status' => 'success', 'logs' => $allLogs];
            break;

        case 'clear_logs':
            $roomUuid = $_POST['room'] ?? null;
            if (!$roomUuid) throw new Exception('Room ID is required.');

            $safeRoomUuid = preg_replace('/[^a-z0-9\-]/i', '', $roomUuid);
            $logPattern = sprintf('%s/%s_*.log', $LOGS_DIR, $safeRoomUuid);
            $logFiles = glob($logPattern);
            
            $deletedCount = 0;
            foreach ($logFiles as $file) {
                if (unlink($file)) $deletedCount++;
            }
            $response = ['status' => 'success', 'message' => "Cleared {$deletedCount} log file(s)."];
            break;

        default:
            throw new Exception('Invalid action.');
    }
} catch (Exception $e) {
    http_response_code(400);
    $response['message'] = $e->getMessage();
}

echo json_encode($response);