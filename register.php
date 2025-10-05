<?php
// เรียกไฟล์ config.php เพื่อเชื่อมต่อฐานข้อมูลและใช้ฟังก์ชัน
require_once "config.php";

// เริ่ม session
session_start();

// ถ้าล็อกอินอยู่แล้ว ให้ redirect ไปหน้า profile
if(isset($_SESSION["loggedin"]) && $_SESSION["loggedin"] === true){
    header("location: profile.php");
    exit;
}

// กำหนดตัวแปรและค่าเริ่มต้นเป็นค่าว่าง
$username = $nickname = $email = $password = $confirm_password = "";
$username_err = $nickname_err = $email_err = $password_err = $confirm_password_err = "";
$success_msg = "";

// ประมวลผลข้อมูลฟอร์มเมื่อมีการส่งข้อมูล (POST)
if($_SERVER["REQUEST_METHOD"] == "POST"){

    // ตรวจสอบ username
    if(empty(trim($_POST["username"]))){ 
        $username_err = "กรุณากรอกชื่อผู้ใช้";
    } elseif(!preg_match('/^[a-zA-Z0-9_]+$/', trim($_POST["username"]))){ 
        $username_err = "ชื่อผู้ใช้ต้องประกอบด้วยตัวอักษร, ตัวเลข, และขีดล่าง (_) เท่านั้น";
    } else {
        // เตรียมคำสั่ง SQL เพื่อเช็คว่ามี username นี้ในระบบหรือไม่
        $sql = "SELECT id FROM users WHERE username = ?";
        
        if($stmt = $mysqli->prepare($sql)){
            $stmt->bind_param("s", $param_username);
            $param_username = trim($_POST["username"]);
            
            if($stmt->execute()){
                $stmt->store_result();
                if($stmt->num_rows == 1){
                    $username_err = "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว";
                } else{
                    $username = trim($_POST["username"]);
                }
            } else{
                echo "มีบางอย่างผิดพลาด! กรุณาลองใหม่อีกครั้ง";
            }
            $stmt->close();
        }
    }

    // ตรวจสอบ nickname
    if(empty(trim($_POST["nickname"]))){ 
        $nickname_err = "กรุณากรอกชื่อเล่น/ชื่อที่แสดง";
    } else {
        $nickname = trim($_POST["nickname"]);
    }

    // ตรวจสอบ email
    if(empty(trim($_POST["email"]))){ 
        $email_err = "กรุณากรอกอีเมล";
    } else {
        // เตรียมคำสั่ง SQL เพื่อเช็คว่ามี email นี้ในระบบหรือไม่
        $sql = "SELECT id FROM users WHERE email = ?";
        
        if($stmt = $mysqli->prepare($sql)){
            $stmt->bind_param("s", $param_email);
            $param_email = trim($_POST["email"]);
            
            if($stmt->execute()){
                $stmt->store_result();
                if($stmt->num_rows == 1){
                    $email_err = "อีเมลนี้ถูกใช้งานแล้ว";
                } else{
                    $email = trim($_POST["email"]);
                }
            } else{
                echo "มีบางอย่างผิดพลาด! กรุณาลองใหม่อีกครั้ง";
            }
            $stmt->close();
        }
    }

    // ตรวจสอบ password
    if(empty(trim($_POST["password"]))){ 
        $password_err = "กรุณากรอกรหัสผ่าน";     
    } elseif(strlen(trim($_POST["password"])) < 6){ 
        $password_err = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
    } else{
        $password = trim($_POST["password"]);
    }
    
    // ตรวจสอบ confirm password
    if(empty(trim($_POST["confirm_password"]))){ 
        $confirm_password_err = "กรุณายืนยันรหัสผ่าน";     
    } else{
        $confirm_password = trim($_POST["confirm_password"]);
        if(empty($password_err) && ($password != $confirm_password)){
            $confirm_password_err = "รหัสผ่านไม่ตรงกัน";
        }
    }
    
    // ตรวจสอบ error ก่อนที่จะเพิ่มข้อมูลลงฐานข้อมูล
    if(empty($username_err) && empty($nickname_err) && empty($email_err) && empty($password_err) && empty($confirm_password_err)){
        
        // เตรียมคำสั่ง SQL สำหรับ INSERT
        $sql = "INSERT INTO users (uuid, username, nickname, email, password) VALUES (?, ?, ?, ?, ?)";
         
        if($stmt = $mysqli->prepare($sql)){
            $stmt->bind_param("sssss", $param_uuid, $param_username, $param_nickname, $param_email, $param_password);
            
            // กำหนดค่า parameters
            $param_uuid = generate_uuid(); // ใช้ฟังก์ชันจาก config.php
            $param_username = $username;
            $param_nickname = $nickname;
            $param_email = $email;
            $param_password = password_hash($password, PASSWORD_DEFAULT); // เข้ารหัสผ่าน
            
            // พยายาม execute คำสั่ง
            if($stmt->execute()){
                // ตั้งค่า session message แล้ว redirect ไปหน้า login
                $_SESSION['registration_success'] = "สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ";
                header("location: login.php");
            } else{
                echo "มีบางอย่างผิดพลาด! กรุณาลองใหม่อีกครั้ง";
            }
            $stmt->close();
        }
    }
    
    // ปิดการเชื่อมต่อ
    $mysqli->close();
}
?>

<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>สมัครสมาชิก - PJChalita</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/auth.css">
    <style>
        .auth-decor { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
        .auth-decor .blob { position: absolute; border-radius: 50%; filter: blur(40px); opacity: 0.25; }
        .auth-decor .blob-1 { width: 320px; height: 320px; left: 10%; top: 10%; background: linear-gradient(135deg, rgba(56,189,248,0.6), rgba(14,165,233,0.4)); }
        .auth-decor .blob-2 { width: 220px; height: 220px; right: 10%; top: 20%; background: linear-gradient(135deg, rgba(99,102,241,0.5), rgba(139,92,246,0.3)); }
        .auth-decor .blob-3 { width: 160px; height: 160px; left: 60%; bottom: 10%; background: linear-gradient(135deg, rgba(236,72,153,0.3), rgba(245,158,11,0.2)); }
        .back-btn { transition: all 0.2s ease; border-radius: 20px; padding: 0.5rem 1rem; }
        .back-btn:hover { transform: translateX(-2px); box-shadow: 0 4px 12px rgba(255,255,255,0.1); }

        body { overflow-x: hidden; width: 100%; }
        main { max-width: 100vw; overflow: hidden; }
        .auth-decor { overflow: hidden; }

        @media (max-width: 480px) {
            .auth-body { padding: 2rem 1rem; }
            .auth-container { max-width: 100%; margin: 0; }
            .auth-card { padding: 2rem; border-radius: 20px; margin: 0 0.5rem; }
            .auth-card-title { font-size: 1.75rem; margin-bottom: 1.5rem; }
            .navbar-custom { padding: 0.75rem 1.5rem; }
            .back-btn { padding: 0.5rem 1rem; font-size: 1rem; }
            .auth-decor .blob-1, .auth-decor .blob-2, .auth-decor .blob-3 { opacity: 0.15; }
            .footer { padding: 1.5rem 0; font-size: 0.9rem; }
            .form-control { font-size: 16px; } /* Prevent zoom on iOS */
            .btn, .form-control { touch-action: manipulation; }
        }
    </style>
</head>
<body class="auth-body d-flex flex-column vh-100">

<nav class="navbar navbar-expand-lg navbar-custom">
    <div class="container">
        <div class="ms-auto">
            <a href="index.php" class="btn btn-outline-light back-btn"><i class="bi bi-arrow-left me-1"></i>กลับหน้าหลัก</a>
        </div>
    </div>
</nav>

<main class="flex-grow-1 d-flex align-items-center justify-content-center position-relative">
    <div class="auth-decor">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        <div class="blob blob-3"></div>
    </div>
    <div class="auth-card text-center shadow-lg" style="z-index: 10;">
        <h3 class="auth-card-title mb-4">สมัครสมาชิก</h3>

        <form action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]); ?>" method="post" novalidate>
            <div class="mb-4">
                <label for="username" class="form-label fw-semibold">Username</label>
                <input type="text" name="username" id="username"
                       class="form-control form-control-lg <?php echo (!empty($username_err)) ? 'is-invalid' : ''; ?>"
                       value="<?php echo $username; ?>"
                       placeholder="กรอกชื่อผู้ใช้" required>
                <div class="invalid-feedback"><?php echo $username_err; ?></div>
            </div>
            <div class="mb-4">
                <label for="nickname" class="form-label fw-semibold">Nickname / ชื่อที่แสดง</label>
                <input type="text" name="nickname" id="nickname"
                       class="form-control form-control-lg <?php echo (!empty($nickname_err)) ? 'is-invalid' : ''; ?>"
                       value="<?php echo $nickname; ?>"
                       placeholder="กรอกชื่อเล่นหรือชื่อที่ต้องการแสดง" required>
                <div class="invalid-feedback"><?php echo $nickname_err; ?></div>
            </div>
            <div class="mb-4">
                <label for="email" class="form-label fw-semibold">Email</label>
                <input type="email" name="email" id="email"
                       class="form-control form-control-lg <?php echo (!empty($email_err)) ? 'is-invalid' : ''; ?>"
                       value="<?php echo $email; ?>"
                       placeholder="กรอกอีเมล" required>
                <div class="invalid-feedback"><?php echo $email_err; ?></div>
            </div>
            <div class="mb-4">
                <label for="password" class="form-label fw-semibold">Password</label>
                <input type="password" name="password" id="password"
                       class="form-control form-control-lg <?php echo (!empty($password_err)) ? 'is-invalid' : ''; ?>"
                       placeholder="กรอกรหัสผ่าน" required>
                <div class="invalid-feedback"><?php echo $password_err; ?></div>
            </div>
            <div class="mb-4">
                <label for="confirm_password" class="form-label fw-semibold">ยืนยันรหัสผ่าน</label>
                <input type="password" name="confirm_password" id="confirm_password"
                       class="form-control form-control-lg <?php echo (!empty($confirm_password_err)) ? 'is-invalid' : ''; ?>"
                       placeholder="ยืนยันรหัสผ่าน" required>
                <div class="invalid-feedback"><?php echo $confirm_password_err; ?></div>
                <div id="passwordMatchFeedback"></div>
            </div>
            <div class="d-grid mb-4">
                <button type="submit" class="btn btn-primary btn-lg">สมัครสมาชิก</button>
            </div>
        </form>

        <div class="auth-link">
            <p class="mb-0">มีบัญชีอยู่แล้ว? <a href="login.php" class="text-primary fw-semibold">เข้าสู่ระบบ</a></p>
        </div>
    </div>
</main>

<footer class="footer py-3">
    <div class="container">
        <p class="mb-0 text-center text-muted small">PJChalita &copy; <?= date('Y') ?> — พัฒนาเพื่อการสื่อสารที่ราบรื่น</p>
    </div>
</footer>

<script>
    // Script สำหรับตรวจสอบรหัสผ่านว่าตรงกันหรือไม่
    const password = document.getElementById('password');
    const confirm_password = document.getElementById('confirm_password');
    const feedback = document.getElementById('passwordMatchFeedback');

    function checkPasswordMatch() {
        if (password.value && confirm_password.value) {
            if (password.value !== confirm_password.value) {
                confirm_password.classList.add('is-invalid');
                feedback.innerHTML = '<span class="text-danger">รหัสผ่านไม่ตรงกัน</span>';
            } else {
                confirm_password.classList.remove('is-invalid');
                confirm_password.classList.add('is-valid');
                feedback.innerHTML = '<span class="text-success">รหัสผ่านตรงกัน</span>';
            }
        }
    }

    password.addEventListener('keyup', checkPasswordMatch);
    confirm_password.addEventListener('keyup', checkPasswordMatch);
</script>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="js/effects.js" defer></script>

<!-- Blob animation script -->
<script>
    // subtle float animation for blobs
    const blobs = document.querySelectorAll('.auth-decor .blob');
    blobs.forEach((b, i)=>{
        const dur = 8000 + i*1200;
        b.animate([
            { transform: 'translateY(0px) translateX(0px)' },
            { transform: 'translateY(-18px) translateX(6px)' },
            { transform: 'translateY(0px) translateX(0px)' }
        ],{ duration: dur, iterations: Infinity, easing: 'ease-in-out' });
    });
</script>
</body>
</html>
