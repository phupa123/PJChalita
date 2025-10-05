<?php
session_start();
require_once '../config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['loggedin']) || !isset($_SESSION['id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$user_id = $_SESSION['id'];
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'get_unread_count':
        $stmt = $mysqli->prepare('SELECT COUNT(*) as unread FROM mailbox WHERE user_id = ? AND is_read = FALSE');
        $stmt->bind_param('i', $user_id);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        echo json_encode(['success' => true, 'unread' => $result['unread']]);
        break;

    case 'get_messages':
        $stmt = $mysqli->prepare('SELECT m.*, u.username as sender_username FROM mailbox m JOIN users u ON m.sender_id = u.id WHERE m.user_id = ? ORDER BY m.created_at DESC');
        $stmt->bind_param('i', $user_id);
        $stmt->execute();
        $messages = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        echo json_encode(['success' => true, 'messages' => $messages]);
        break;

    case 'mark_read':
        $data = json_decode(file_get_contents('php://input'), true);
        $message_id = (int) ($data['message_id'] ?? 0);
        $stmt = $mysqli->prepare('UPDATE mailbox SET is_read = TRUE WHERE id = ? AND user_id = ?');
        $stmt->bind_param('ii', $message_id, $user_id);
        $stmt->execute();
        echo json_encode(['success' => true]);
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}
?>
