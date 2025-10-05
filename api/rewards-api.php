<?php
// PJChalita/api/rewards-api.php

header('Content-Type: application/json');
require_once '../config.php';
session_start();

// ตรวจสอบว่าล็อกอินอยู่หรือไม่
if (!isset($_SESSION["loggedin"]) || $_SESSION["loggedin"] !== true) {
    echo json_encode(['status' => 'error', 'message' => 'Not logged in']);
    exit;
}

$user_id = $_SESSION['id'];
$response = ['status' => 'success', 'rewards' => []];

// --- ค่าคงที่ของระบบ ---
define('EXP_INTERVAL_SECONDS', 60); // ทุก 60 วินาที
define('COIN_INTERVAL_SECONDS', 300); // ทุก 300 วินาที (5 นาที)
define('MIN_EXP_GAIN', 1);
define('MAX_EXP_GAIN', 5);
define('MIN_COIN_GAIN', 0.1);
define('MAX_COIN_GAIN', 0.5);

// --- ดึงข้อมูลผู้ใช้ล่าสุด ---
$sql = "SELECT level, exp, exp_to_next_level, coins, last_seen FROM users WHERE id = ?";
if ($stmt = $mysqli->prepare($sql)) {
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();

    if (!$user) {
        echo json_encode(['status' => 'error', 'message' => 'User not found']);
        exit;
    }

    $last_seen_time = strtotime($user['last_seen']);
    $current_time = time();
    $time_diff = $current_time - $last_seen_time;
    
    // อัปเดต last_seen ทุกครั้งที่มีการเรียก API
    $mysqli->query("UPDATE users SET last_seen = NOW() WHERE id = {$user_id}");
    
    // --- คำนวณรางวัล ---
    // ให้รางวัลแค่ 1 ครั้งต่อการเรียก API เพื่อป้องกันการฟาร์ม
    if ($time_diff < EXP_INTERVAL_SECONDS * 1.5) { // ให้มีความยืดหยุ่นเล็กน้อย
        
        // 1. รางวัล EXP (ทุก 1 นาที)
        $exp_gain = rand(MIN_EXP_GAIN, MAX_EXP_GAIN);
        $user['exp'] += $exp_gain;
        array_push($response['rewards'], ['type' => 'exp', 'amount' => $exp_gain]);

        // 2. รางวัล Coins (ทุก 5 นาที)
        $_SESSION['coin_timer'] = isset($_SESSION['coin_timer']) ? $_SESSION['coin_timer'] + EXP_INTERVAL_SECONDS : EXP_INTERVAL_SECONDS;
        if ($_SESSION['coin_timer'] >= COIN_INTERVAL_SECONDS) {
            $coin_gain = mt_rand(MIN_COIN_GAIN * 10, MAX_COIN_GAIN * 10) / 10.0;
            $user['coins'] += $coin_gain;
            array_push($response['rewards'], ['type' => 'coins', 'amount' => $coin_gain]);
            $_SESSION['coin_timer'] = 0; // รีเซ็ตตัวนับ
        }

        // 3. ตรวจสอบการเลเวลอัป
        if ($user['exp'] >= $user['exp_to_next_level']) {
            $user['level']++;
            $user['exp'] -= $user['exp_to_next_level'];
            $user['exp_to_next_level'] = floor($user['exp_to_next_level'] * 1.5);
            $response['leveled_up'] = true;
            $response['new_level'] = $user['level'];
        }

        // 4. อัปเดตข้อมูลลงฐานข้อมูล
        $update_sql = "UPDATE users SET level = ?, exp = ?, exp_to_next_level = ?, coins = ? WHERE id = ?";
        if($update_stmt = $mysqli->prepare($update_sql)){
            $update_stmt->bind_param("iidsi", $user['level'], $user['exp'], $user['exp_to_next_level'], $user['coins'], $user_id);
            $update_stmt->execute();
            $update_stmt->close();
        }
    } else {
        $_SESSION['coin_timer'] = 0;
    }
}

// ส่งข้อมูลล่าสุดกลับไปให้ Frontend
$sql = "SELECT level, exp, exp_to_next_level, coins FROM users WHERE id = ?";
if ($stmt = $mysqli->prepare($sql)) {
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $latest_user_data = $result->fetch_assoc();
    $stmt->close();
    $response['user_data'] = $latest_user_data;
}

$mysqli->close();
echo json_encode($response);
?>