<?php
/*
-- การตั้งค่าการเชื่อมต่อฐานข้อมูล --
*/

// กำหนดค่าการเชื่อมต่อ
define('DB_SERVER', 'localhost');
define('DB_USERNAME', 'root'); // <-- ใส่ username ของคุณ
define('DB_PASSWORD', 'ikuysus'); // <-- ใส่ password ของคุณ
define('DB_NAME', 'pjchalita_db'); // <-- ชื่อฐานข้อมูล

// พยายามเชื่อมต่อกับฐานข้อมูล MySQL
$mysqli = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);

// ตรวจสอบการเชื่อมต่อ
if($mysqli === false){
    die("ERROR: ไม่สามารถเชื่อมต่อฐานข้อมูลได้. " . $mysqli->connect_error);
}

// ตั้งค่า character set เป็น utf8mb4
$mysqli->set_charset("utf8mb4");

/**
 * Return a consistent web-accessible avatar URL for an avatar stored in DB.
 * If $avatar is empty, return the project's default profile image path.
 * This returns a path rooted at the web-server document for the project (e.g. /PJChalita/...)
 */
function get_avatar_url($avatar) {
    // Base URL path for the app on localhost. Adjust if your project sits in a different subfolder.
    $base = '/PJChalita/';
    if (empty($avatar)) {
        return $base . 'images/default_profile.png';
    }
    // If avatar already looks like an absolute URL or starts with '/', keep it relative to document root
    if (strpos($avatar, 'http://') === 0 || strpos($avatar, 'https://') === 0) {
        return $avatar;
    }
    if ($avatar[0] === '/') {
        return $base . ltrim($avatar, '/');
    }
    // Otherwise assume it's a relative path stored like 'uploads/avatars/...' inside project
    return $base . ltrim($avatar, '/');
}

/*
-- ฟังก์ชันสำหรับสร้าง UUID v4 --
*/
function generate_uuid() {
    return sprintf( '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        // 32 bits for "time_low"
        mt_rand( 0, 0xffff ), mt_rand( 0, 0xffff ),

        // 16 bits for "time_mid"
        mt_rand( 0, 0xffff ),

        // 16 bits for "time_hi_and_version",
        // four most significant bits holds version number 4
        mt_rand( 0, 0x0fff ) | 0x4000,

        // 16 bits, 8 bits for "clk_seq_hi_res",
        // 8 bits for "clk_seq_low",
        // two most significant bits holds zero and one for variant DCE1.1
        mt_rand( 0, 0x3fff ) | 0x8000,

        // 48 bits for "node"
        mt_rand( 0, 0xffff ), mt_rand( 0, 0xffff ), mt_rand( 0, 0xffff )
    );
}

?>