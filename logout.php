<?php
// เริ่ม session
session_start();
 
// ลบค่า session ทั้งหมด
$_SESSION = array();
 
// ทำลาย session
session_destroy();
 
// Redirect ไปยังหน้าแรก
header("location: index.php");
exit;
?>