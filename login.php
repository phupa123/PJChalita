<?php
// เริ่ม session
session_start();

// ถ้าล็อกอินอยู่แล้ว ให้ redirect ไปหน้า profile
if(isset($_SESSION["loggedin"]) && $_SESSION["loggedin"] === true){
    header("location: profile.php");
    exit;
}

// เรียกไฟล์ config.php
require_once "config.php";

// กำหนดตัวแปรและค่าเริ่มต้น
$login_identifier = $password = "";
// Prefill from query param (used by quick-switch)
$login_identifier = isset($_GET['prefill']) ? trim($_GET['prefill']) : $login_identifier;
$login_err = "";
$registration_success_msg = "";

// ตรวจสอบว่ามี session message จากหน้า register หรือไม่
if(isset($_SESSION['registration_success'])){
    $registration_success_msg = $_SESSION['registration_success'];
    // เคลียร์ session message หลังจากแสดงผลแล้ว
    unset($_SESSION['registration_success']);
}

// ประมวลผลข้อมูลฟอร์มเมื่อมีการส่งข้อมูล (POST)
if($_SERVER["REQUEST_METHOD"] == "POST"){

    // ตรวจสอบว่า username/email และ password ถูกส่งมาหรือไม่
    if(empty(trim($_POST["login_identifier"])) || empty(trim($_POST["password"]))){
        $login_err = "กรุณากรอกชื่อผู้ใช้/อีเมล และรหัสผ่าน";
    } else{
        $login_identifier = trim($_POST["login_identifier"]);
        $password = trim($_POST["password"]);
    }

    // ถ้าไม่มี error, ดำเนินการต่อ
    if(empty($login_err)){
        // เตรียม SQL statement
        $sql = "SELECT id, uuid, username, nickname, email, password, rank, avatar FROM users WHERE username = ? OR email = ?";
        
        if($stmt = $mysqli->prepare($sql)){
            $stmt->bind_param("ss", $param_login, $param_login);
            $param_login = $login_identifier;
            
            if($stmt->execute()){
                $stmt->store_result();
                
                if($stmt->num_rows == 1){                    
                    $stmt->bind_result($id, $uuid, $username, $nickname, $email, $hashed_password, $rank, $avatarRaw);
                    if($stmt->fetch()){
                        if(password_verify($password, $hashed_password)){
                            session_start();
                            $_SESSION["loggedin"] = true;
                            $_SESSION["id"] = $id;
                            $_SESSION["uuid"] = $uuid;
                            $_SESSION["username"] = $username;
                            $_SESSION["nickname"] = $nickname;
                            $_SESSION["rank"] = $rank;
                            $_SESSION["avatar"] = $avatarRaw ?? null;
                            header("location: profile.php");
                        } else{
                            $login_err = "ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง";
                        }
                    }
                } else{
                    $login_err = "ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง";
                }
            } else{
                echo "มีบางอย่างผิดพลาด! กรุณาลองใหม่อีกครั้ง";
            }
            $stmt->close();
        }
    }
    
    $mysqli->close();
}
?>

<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>เข้าสู่ระบบ - PJChalita</title>
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
        <h3 class="auth-card-title mb-4">เข้าสู่ระบบ</h3>

        <?php
        if(!empty($registration_success_msg)){
            echo '<div class="alert alert-success alert-dismissible fade show" role="alert">' . $registration_success_msg . '<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
        }
        if(!empty($login_err)){
            echo '<div class="alert alert-danger alert-dismissible fade show" role="alert">' . $login_err . '<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
        }
        ?>

        <form action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]); ?>" method="post" novalidate>
            <div class="mb-4">
                <label for="login_identifier" class="form-label fw-semibold">Username หรือ Email</label>
                <input type="text" name="login_identifier" id="login_identifier"
                       class="form-control form-control-lg <?php echo (!empty($login_err)) ? 'is-invalid' : ''; ?>"
                       value="<?php echo $login_identifier; ?>"
                       placeholder="กรอก Username หรือ Email" required>
                <div class="invalid-feedback">กรุณากรอก Username หรือ Email</div>
            </div>
            <div class="mb-4">
                <label for="password" class="form-label fw-semibold">Password</label>
                <input type="password" name="password" id="password"
                       class="form-control form-control-lg <?php echo (!empty($login_err)) ? 'is-invalid' : ''; ?>"
                       placeholder="กรอกรหัสผ่าน" required>
                <div class="invalid-feedback">กรุณากรอกรหัสผ่าน</div>
            </div>
            <div class="d-grid mb-4">
                <button type="submit" class="btn btn-primary btn-lg">เข้าสู่ระบบ</button>
            </div>
        </form>

        <div class="d-flex align-items-center my-4">
            <hr class="flex-grow-1">
            <span class="mx-3 text-muted fw-semibold">หรือ</span>
            <hr class="flex-grow-1">
        </div>

        <div class="d-grid mb-4">
             <a href="quick-login.php" class="btn btn-outline-secondary btn-lg">
                <i class="bi bi-grid-3x2-gap-fill me-2"></i>
                Quick Login
            </a>
        </div>

        <div class="auth-link">
            <p class="mb-0">ยังไม่มีบัญชี? <a href="register.php" class="text-primary fw-semibold">สร้างบัญชีใหม่</a></p>
        </div>
    </div>
</main>

<footer class="footer py-3">
    <div class="container">
        <p class="mb-0 text-center text-muted small">PJChalita &copy; <?= date('Y') ?> — พัฒนาเพื่อการสื่อสารที่ราบรื่น</p>
    </div>
</footer>

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
