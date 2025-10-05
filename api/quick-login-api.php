<?php
header('Content-Type: application/json');
require_once '../config.php'; // เข้าถึงไฟล์ config จากโฟลเดอร์แม่
session_start();

// --- Automatic Cleanup ---
if (rand(1, 5) == 1) {
    $mysqli->query("DELETE FROM quick_login_sessions WHERE status IN ('authorized', 'denied')");
}
// -----------------------

$response = [];
$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'generate_code':
        $php_session_id = session_id();
        $mysqli->query("UPDATE quick_login_sessions SET status = 'expired' WHERE php_session_id = '{$php_session_id}' AND status = 'pending'");

        $code = '';
        $is_unique = false;
        while(!$is_unique) {
            $code = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
            $sql = "SELECT id FROM quick_login_sessions WHERE code = ? AND status = 'pending' AND expires_at > NOW()";
            $stmt = $mysqli->prepare($sql);
            $stmt->bind_param('s', $code);
            $stmt->execute();
            $stmt->store_result();
            if ($stmt->num_rows == 0) $is_unique = true;
            $stmt->close();
        }

        $duration_seconds = 180;
        $expires_at = date('Y-m-d H:i:s', time() + $duration_seconds);

        $sql = "INSERT INTO quick_login_sessions (code, php_session_id, expires_at) VALUES (?, ?, ?)";
        $stmt = $mysqli->prepare($sql);
        $stmt->bind_param('sss', $code, $php_session_id, $expires_at);
        if ($stmt->execute()) {
            $response['status'] = 'success';
            $response['code'] = $code;
            $response['duration'] = $duration_seconds;
        } else {
            $response['status'] = 'error';
            $response['message'] = 'ไม่สามารถสร้างรหัสได้';
        }
        $stmt->close();
        break;

    case 'check_status':
        $code = $_POST['code'] ?? '';
        if (empty($code)) {
            $response['status'] = 'error'; $response['message'] = 'ไม่พบรหัส'; break;
        }

        $sql = "SELECT status, authorizing_user_id, expires_at FROM quick_login_sessions WHERE code = ?";
        $stmt = $mysqli->prepare($sql);
        $stmt->bind_param('s', $code);
        $stmt->execute();
        $stmt->store_result();
        $stmt->bind_result($status, $authorizing_user_id, $expires_at);
        $stmt->fetch();

        if ($stmt->num_rows > 0) {
            $is_expired = strtotime($expires_at) < time();
            if ($is_expired && $status == 'pending') {
                 $response['status'] = 'expired';
            } else {
                $response['status'] = $status;
            }

            if ($status == 'authorized') {
                $user_sql = "SELECT id, uuid, username, nickname, rank FROM users WHERE id = ?";
                $user_stmt = $mysqli->prepare($user_sql);
                $user_stmt->bind_param('i', $authorizing_user_id);
                $user_stmt->execute();
                $user_stmt->bind_result($id, $uuid, $username, $nickname, $rank);
                if ($user_stmt->fetch()) {
                    $_SESSION["loggedin"] = true; $_SESSION["id"] = $id; $_SESSION["uuid"] = $uuid;
                    $_SESSION["username"] = $username; $_SESSION["nickname"] = $nickname; $_SESSION["rank"] = $rank;
                }
                $user_stmt->close();
            }
        } else {
            $response['status'] = 'expired';
        }
        $stmt->close();
        break;

    case 'submit_code':
        $code = $_POST['code'] ?? '';
        if (!isset($_SESSION['loggedin']) || $_SESSION['loggedin'] !== true) {
            $response['status'] = 'error';
            $response['message'] = 'คุณต้องล็อกอินก่อน';
            break;
        }

        // Step 1: Select the code to validate it first
        $sql = "SELECT status, expires_at FROM quick_login_sessions WHERE code = ?";
        $stmt = $mysqli->prepare($sql);
        $stmt->bind_param('s', $code);
        $stmt->execute();
        $stmt->store_result();
        
        if ($stmt->num_rows == 0) {
            $response['status'] = 'error';
            $response['message'] = 'รหัสไม่ถูกต้อง';
            $stmt->close();
            break;
        }
        
        $stmt->bind_result($status, $expires_at);
        $stmt->fetch();
        $stmt->close();

        // Step 2: Check status and expiry in PHP
        if ($status !== 'pending') {
            $response['status'] = 'error';
            $response['message'] = 'รหัสนี้ถูกใช้ไปแล้วหรือกำลังรอการยืนยันจากที่อื่น';
            break;
        }

        if (strtotime($expires_at) < time()) {
            $response['status'] = 'error';
            $response['message'] = 'รหัสหมดอายุแล้ว';
            break;
        }

        // Step 3: If all checks pass, perform the update
        $update_sql = "UPDATE quick_login_sessions SET status = 'awaiting_confirmation', authorizing_user_id = ? WHERE code = ? AND status = 'pending'";
        $update_stmt = $mysqli->prepare($update_sql);
        $update_stmt->bind_param('is', $_SESSION['id'], $code);
        
        if ($update_stmt->execute() && $update_stmt->affected_rows > 0) {
            $response['status'] = 'success';
            $response['message'] = 'พบคำขอ, กรุณายืนยัน';
        } else {
            $response['status'] = 'error';
            $response['message'] = 'เกิดข้อผิดพลาดที่ไม่คาดคิด ao-update';
        }
        $update_stmt->close();
        break;

    case 'confirm_login':
    case 'deny_login':
        $code = $_POST['code'] ?? '';
        if (!isset($_SESSION['loggedin']) || $_SESSION['loggedin'] !== true) {
            $response['status'] = 'error'; $response['message'] = 'คุณต้องล็อกอินก่อน'; break;
        }

        $new_status = ($action == 'confirm_login') ? 'authorized' : 'denied';
        $sql = "UPDATE quick_login_sessions SET status = ? WHERE code = ? AND authorizing_user_id = ? AND status = 'awaiting_confirmation'";
        $stmt = $mysqli->prepare($sql);
        $stmt->bind_param('ssi', $new_status, $code, $_SESSION['id']);
        if ($stmt->execute() && $stmt->affected_rows > 0) {
            $response['status'] = 'success';
            $response['message'] = ($new_status == 'authorized') ? 'อนุญาตสำเร็จ' : 'ปฏิเสธสำเร็จ';
        } else {
            $response['status'] = 'error';
            $response['message'] = 'ไม่สามารถอัปเดตสถานะได้';
        }
        $stmt->close();
        break;

    default:
        $response['status'] = 'error';
        $response['message'] = 'Invalid action';
        break;
}

$mysqli->close();
echo json_encode($response);
?>