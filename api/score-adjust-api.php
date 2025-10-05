<?php
session_start();
require_once '../config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['loggedin']) || !isset($_SESSION['id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$user_id_session = $_SESSION['id'];

$action = $_GET['action'] ?? '';

if ($action === 'get_history') {
    $history_id = (int) ($_GET['id'] ?? 0);
    if ($history_id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid history ID']);
        exit;
    }

    $stmt = $mysqli->prepare('SELECT * FROM score_history WHERE id = ? AND adjuster_id = ?');
    $stmt->bind_param('ii', $history_id, $user_id_session);
    $stmt->execute();
    $history = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($history) {
        echo json_encode(['success' => true, 'history' => $history]);
    } else {
        echo json_encode(['success' => false, 'message' => 'History not found or not authorized']);
    }
    exit;
}

if ($action === 'edit_history') {
    $data = json_decode(file_get_contents('php://input'), true);
    $history_id = (int) ($data['id'] ?? 0);
    $reason = trim($data['reason'] ?? '');
    $description = trim($data['description'] ?? '');

    if ($history_id <= 0 || empty($reason)) {
        echo json_encode(['success' => false, 'message' => 'Invalid data']);
        exit;
    }

    $stmt = $mysqli->prepare('UPDATE score_history SET reason = ?, description = ? WHERE id = ? AND adjuster_id = ?');
    $stmt->bind_param('ssii', $reason, $description, $history_id, $user_id_session);
    $stmt->execute();
    $affected = $stmt->affected_rows;
    $stmt->close();

    if ($affected > 0) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update or not authorized']);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid method']);
    exit;
}

$adjuster_id = $user_id_session;

$user_id = (int) ($_POST['user_id'] ?? 0);
$score_change = (int) ($_POST['score_change'] ?? 0);
$reason = trim($_POST['reason'] ?? '');
$description = trim($_POST['description'] ?? '');

if ($user_id <= 0 || $score_change == 0 || empty($reason)) {
    echo json_encode(['success' => false, 'message' => 'Invalid data']);
    exit;
}

// Check if adjuster has permission (e.g., admin or specific role)
$stmt = $mysqli->prepare('SELECT rank FROM users WHERE id = ?');
$stmt->bind_param('i', $adjuster_id);
$stmt->execute();
$adjuster_rank = $stmt->get_result()->fetch_assoc()['rank'];
$stmt->close();

if (!in_array($adjuster_rank, ['Admin', 'Moderator'])) {
    echo json_encode(['success' => false, 'message' => 'Insufficient permissions']);
    exit;
}

// Handle file upload
$evidence_file = null;
if (isset($_FILES['evidence']) && $_FILES['evidence']['error'] === UPLOAD_ERR_OK) {
    $file = $_FILES['evidence'];
    $allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/avi'];
    if (in_array($file['type'], $allowed_types) && $file['size'] <= 50 * 1024 * 1024) { // 50MB
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = 'evidence_' . $user_id . '_' . time() . '.' . $ext;
        $path = '../uploads/evidence/' . $filename;
        if (move_uploaded_file($file['tmp_name'], $path)) {
            $evidence_file = 'uploads/evidence/' . $filename;
        }
    }
}

// Update user score
$mysqli->begin_transaction();
try {
    $stmt = $mysqli->prepare('UPDATE users SET score = score + ? WHERE id = ?');
    $stmt->bind_param('ii', $score_change, $user_id);
    $stmt->execute();
    $stmt->close();

    // Add to score_history
    $stmt = $mysqli->prepare('INSERT INTO score_history (user_id, adjuster_id, score_change, reason, description, evidence_file) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->bind_param('iiisss', $user_id, $adjuster_id, $score_change, $reason, $description, $evidence_file);
    $stmt->execute();
    $history_id = $stmt->insert_id;
    $stmt->close();

    // Send notification to mailbox
    $title = 'การปรับคะแนน';
    $message = "คะแนนของคุณถูกปรับเปลี่ยน {$score_change} คะแนน\nสาเหตุ: {$reason}\nคำอธิบาย: {$description}";
    $stmt = $mysqli->prepare('INSERT INTO mailbox (user_id, sender_id, title, message) VALUES (?, ?, ?, ?)');
    $stmt->bind_param('iiss', $user_id, $adjuster_id, $title, $message);
    $stmt->execute();
    $stmt->close();

    $mysqli->commit();
    echo json_encode(['success' => true, 'message' => 'Score adjusted successfully', 'history_id' => $history_id]);
} catch (Exception $e) {
    $mysqli->rollback();
    echo json_encode(['success' => false, 'message' => 'Failed to adjust score']);
}
?>
