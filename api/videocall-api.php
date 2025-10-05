<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../config.php';
session_start();

$response = ['status' => 'error', 'message' => 'An error occurred.'];

if (!isset($_SESSION['loggedin']) || $_SESSION['loggedin'] !== true) {
    $response['message'] = 'Authentication required.';
    echo json_encode($response);
    exit;
}

$action   = $_POST['action'] ?? $_GET['action'] ?? '';
$userId   = isset($_SESSION['id']) ? (int) $_SESSION['id'] : 0;
$userUuid = $_SESSION['uuid'] ?? '';
$userRank = $_SESSION['rank'] ?? 'Member';

if (!($mysqli instanceof mysqli)) {
    $response['message'] = 'Database connection unavailable.';
    echo json_encode($response);
    exit;
}

$mysqli->set_charset('utf8mb4');

if (!isset($_SESSION['room_access']) || !is_array($_SESSION['room_access'])) {
    $_SESSION['room_access'] = [];
}

function get_rank_level(string $rank): int {
    static $levels = ['Member' => 1, 'Staff'  => 2, 'Admin'  => 3, 'Owner'  => 4];
    return $levels[$rank] ?? 0;
}

function can_manage_room(array $room, int $userId, string $userRank): bool {
    if ((int) ($room['creator_id'] ?? 0) === $userId) return true;
    if ($userRank === 'Owner') return true;
    if ($userRank === 'Admin') {
        $creatorRank = $room['creator_rank'] ?? 'Member';
        return get_rank_level($creatorRank) < get_rank_level('Owner');
    }
    return false;
}

try {
    switch ($action) {
        case 'get_rooms':
            $sql = "SELECT r.id, r.room_uuid, r.room_name, r.description, r.room_type, r.member_limit, r.creator_id,
                           r.created_at, r.password IS NOT NULL AS has_password,
                           (SELECT COUNT(*) FROM users_in_rooms uir WHERE uir.room_id = r.id) AS member_count,
                           u.nickname AS creator_name, u.uuid AS creator_uuid, u.rank AS creator_rank, u.avatar AS creator_avatar
                    FROM video_rooms r
                    JOIN users u ON r.creator_id = u.id
                    WHERE r.status = 'active' ORDER BY r.created_at DESC";
            
            $result = $mysqli->query($sql);
            $rooms = [];
            while ($row = $result->fetch_assoc()) {
                $row['can_manage'] = can_manage_room($row, $userId, $userRank);
                $row['creator_avatar_url'] = get_avatar_url($row['creator_avatar']); // สร้าง URL ของ Avatar
                $rooms[] = $row;
            }
            $response = ['status' => 'success', 'rooms' => $rooms];
            break;

        case 'join_room':
            $roomUuid = trim($_POST['room_uuid'] ?? '');
            $stmt = $mysqli->prepare("SELECT id, member_limit FROM video_rooms WHERE room_uuid = ? AND status = 'active'");
            $stmt->bind_param('s', $roomUuid);
            $stmt->execute();
            $room = $stmt->get_result()->fetch_assoc();
            $stmt->close();

            if (!$room) {
                $response['message'] = 'ไม่พบห้องสนทนา';
                break;
            }
            
            $roomId = (int)$room['id'];
            
            $stmt_count = $mysqli->prepare("SELECT COUNT(*) FROM users_in_rooms WHERE room_id = ?");
            $stmt_count->bind_param('i', $roomId);
            $stmt_count->execute();
            $stmt_count->bind_result($memberCount);
            $stmt_count->fetch();
            $stmt_count->close();
            
            if ($memberCount >= (int)$room['member_limit']) {
                 $response['message'] = 'ห้องเต็มแล้ว';
                 break;
            }
            
            $stmt_upsert = $mysqli->prepare("INSERT INTO users_in_rooms (user_id, room_id, peer_uuid) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE peer_uuid = VALUES(peer_uuid), joined_at = NOW()");
            $stmt_upsert->bind_param('iis', $userId, $roomId, $userUuid);
            $stmt_upsert->execute();
            $stmt_upsert->close();

            $stmt_peers = $mysqli->prepare("SELECT u.uuid, u.nickname, u.rank, u.avatar FROM users_in_rooms uir JOIN users u ON uir.user_id = u.id WHERE uir.room_id = ? AND u.uuid <> ?");
            $stmt_peers->bind_param('is', $roomId, $userUuid);
            $stmt_peers->execute();
            $peers_result = $stmt_peers->get_result();
            $peers = [];
            while ($row = $peers_result->fetch_assoc()) {
                $row['avatar_url'] = get_avatar_url($row['avatar']);
                $peers[] = $row;
            }
            $stmt_peers->close();

            $response = ['status' => 'success', 'peers' => $peers];
            break;

        case 'leave_room':
            $roomUuid = $_POST['room_uuid'] ?? '';
            if ($roomUuid && $userId > 0) {
                $stmt = $mysqli->prepare("DELETE FROM users_in_rooms WHERE user_id = ? AND room_id = (SELECT id FROM video_rooms WHERE room_uuid = ?)");
                $stmt->bind_param('is', $userId, $roomUuid);
                $stmt->execute();
                $stmt->close();
            }
            $response = ['status' => 'success'];
            break;
        
        default:
            $response['message'] = 'Invalid action.';
            break;
    }
} catch (Throwable $th) {
    $response['status'] = 'error';
    $response['message'] = $th->getMessage();
}

echo json_encode($response);