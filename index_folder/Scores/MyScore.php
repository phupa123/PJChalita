<?php
session_start();
require_once '../../config.php';

// Check if user is logged in
if (!isset($_SESSION['loggedin']) || !isset($_SESSION['id'])) {
    header("Location: ../../login.php");
    exit();
}

$user_id = $_SESSION['id'];

// Fetch user's current score
$stmt = $mysqli->prepare("SELECT score FROM users WHERE id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();
$current_score = $result->fetch_assoc()['score'];

// Fetch basic profile info to show consistent avatar/nickname like profile.php
$profile = [];
if ($stmt = $mysqli->prepare('SELECT username, nickname, rank, avatar FROM users WHERE id = ?')) {
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $profile = $stmt->get_result()->fetch_assoc();
    $stmt->close();
}
// Normalize avatar path for this file's relative location
$avatarUrl = get_avatar_url($profile['avatar'] ?? null);

// Fetch score history
$stmt = $mysqli->prepare("SELECT score_change, reason, created_at FROM score_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 10");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$score_history = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Scores</title>
    <link rel="stylesheet" href="../../css/scores/myscore.css">
    <link rel="stylesheet" href="../../css/scores/effect.css">
    <link rel="stylesheet" href="../../css/profile.css">
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
</head>
<body>
    <div class="container">
        <div class="back-button">
            <a href="../../index.php" class="btn-back"><i class="bi bi-arrow-left"></i> กลับหน้าหลัก</a>
        </div>

        <div class="content-wrapper">
            <div class="profile-summary" style="margin-bottom:12px;">
                <div class="avatar-wrapper" style="display:flex;align-items:center;gap:12px;">
                    <img src="<?= htmlspecialchars($avatarUrl) ?>" alt="avatar" class="avatar-img" style="width:64px;height:64px;object-fit:cover;border-radius:12px;">
                    <div>
                        <h2 style="margin:0;color:#333;font-size:1.2rem;"><?= htmlspecialchars($profile['nickname'] ?: $profile['username']) ?></h2>
                        <div class="text-muted">@<?= htmlspecialchars($profile['username']) ?> · <span class="badge bg-secondary"><?= htmlspecialchars($profile['rank']) ?></span></div>
                    </div>
                </div>
            </div>
            <!-- Search Section -->
            <div class="search-container">
                <h3 class="search-title"><i class="bi bi-search"></i> ค้นหาผู้ใช้</h3>
                <div class="search-wrapper">
                    <input type="text"
                           id="searchInput"
                           class="search-input"
                           placeholder="พิมพ์ชื่อผู้ใช้หรืออีเมล..."
                           autocomplete="off">
                    <div id="loading" class="loading"></div>
                    <div id="searchResults" class="search-results">
                        <div id="noResults">ไม่พบผู้ใช้ที่ค้นหา</div>
                    </div>
                </div>
            </div>

            <div class="score-card">
            <h1>คะแนนของคุณ</h1>
            <div class="current-score">
                <span class="score-value"><?php echo $current_score; ?></span>
                <span class="score-label">คะแนน</span>
            </div>
            <div class="score-level">
                <?php
                $level = '';
                $levelClass = '';
                if ($current_score < 50) {
                    $level = 'Bad';
                    $levelClass = 'level-bad';
                } elseif ($current_score < 100) {
                    $level = 'Normal';
                    $levelClass = 'level-normal';
                } elseif ($current_score == 100) {
                    $level = 'Good';
                    $levelClass = 'level-good';
                } elseif ($current_score < 150) {
                    $level = 'Great';
                    $levelClass = 'level-great';
                } else {
                    $level = 'WOW';
                    $levelClass = 'level-wow';
                }
                ?>
                <span class="level-badge <?php echo $levelClass; ?>"><?php echo $level; ?></span>
            </div>
        </div>

        <div class="history-card">
            <h2>ประวัติคะแนน</h2>
            <div class="history-list">
                <?php if (empty($score_history)): ?>
                    <p class="no-history">ยังไม่มีประวัติคะแนน</p>
                <?php else: ?>
                    <?php foreach ($score_history as $history): ?>
                        <div class="history-item <?php echo $history['score_change'] >= 0 ? 'positive' : 'negative'; ?>">
                            <div class="history-details">
                                <span class="score-change">
                                    <?php echo ($history['score_change'] >= 0 ? '+' : '') . $history['score_change']; ?>
                                </span>
                                <span class="reason"><?php echo htmlspecialchars($history['reason']); ?></span>
                            </div>
                            <span class="date">
                                <?php echo date('d/m/Y H:i', strtotime($history['created_at'])); ?>
                            </span>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>
    </div>
    <script src="../../js/scores/effect.js"></script>
    <script>
        let searchTimeout = null;
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');
        const loading = document.getElementById('loading');
        const noResults = document.getElementById('noResults');

        // Debounce function
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        // Search users function
        async function searchUsers(query) {
            try {
                loading.style.display = 'block';
                searchResults.style.display = 'block';
                noResults.style.display = 'none';

                const response = await fetch(`../../api/user-search-api.php?search=${encodeURIComponent(query)}`);
                const data = await response.json();

                if (data.success && data.users.length > 0) {
                    searchResults.innerHTML = data.users.map(user => `
                        <div class="user-item" onclick="updateScoreDisplay(${JSON.stringify(user).replace(/"/g, '&quot;')})">
                            <img src="${user.avatar_url}" alt="${user.username}" class="user-avatar">
                            <div class="user-info">
                                <div>${user.username}</div>
                                <small>${user.email}</small>
                            </div>
                            <div class="user-score">${user.score}</div>
                        </div>
                    `).join('');
                } else {
                    noResults.style.display = 'block';
                }
            } catch (error) {
                console.error('Error searching users:', error);
                searchResults.innerHTML = '<div class="text-white p-3">เกิดข้อผิดพลาดในการค้นหา</div>';
            } finally {
                loading.style.display = 'none';
            }
        }

        // Update score display function
        function updateScoreDisplay(user) {
            selectedUser = user;
            const scoreValue = document.querySelector('.score-value');
            const userInfo = document.createElement('div');
            userInfo.className = 'searched-user-info';
            userInfo.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                    <img src="${user.avatar_url}" alt="${user.username}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #2196F3;">
                    <div style="font-weight: 600; color: #2196F3; font-size: 1.1rem;">คะแนนของ ${user.username}</div>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <a href="../../profile.php?id=${user.id}" style="color: #666; text-decoration: none; font-size: 0.9rem;">ดูโปรไฟล์</a>
                </div>
            `;

            scoreValue.textContent = user.score;

            // Remove any existing user info
            const existingInfo = document.querySelector('.searched-user-info');
            if (existingInfo) existingInfo.remove();

            // Insert the new user info before the score value
            scoreValue.parentNode.insertBefore(userInfo, scoreValue);

            // Add selected class to clicked item
            const items = document.querySelectorAll('.user-item');
            items.forEach(item => item.classList.remove('selected-user'));
            event.currentTarget.classList.add('selected-user');

            // Show floating button
            document.getElementById('floatingAddBtn').style.display = 'block';

            // Hide search results
            searchResults.style.display = 'none';
        }

        // Input event listener with debounce
        searchInput.addEventListener('input', debounce(function(e) {
            const query = e.target.value.trim();
            if (query.length >= 2) {
                searchUsers(query);
            } else {
                searchResults.style.display = 'none';
                noResults.style.display = 'none';
                selectedUser = null;
                document.getElementById('floatingAddBtn').style.display = 'none';
                // Reset score display to user's own score
                const scoreValue = document.querySelector('.score-value');
                scoreValue.textContent = '<?php echo $current_score; ?>';
                const existingInfo = document.querySelector('.searched-user-info');
                if (existingInfo) existingInfo.remove();
            }
        }, 300));

        // Close results when clicking outside
        document.addEventListener('click', function(e) {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });

        // Show results again when focusing on input
        searchInput.addEventListener('focus', function() {
            if (this.value.length >= 2) {
                searchResults.style.display = 'block';
            }
        });

        // Score Adjust Modal
        let selectedUser = null;

        function openScoreAdjustModal(user) {
            selectedUser = user;
            document.getElementById('adjustUserName').textContent = user.username;
            document.getElementById('adjustCurrentScore').textContent = user.score;
            document.getElementById('scoreChangeInput').value = 0;
            document.getElementById('afterScore').textContent = user.score;
            document.getElementById('reasonSelect').value = '';
            document.getElementById('otherReason').value = '';
            document.getElementById('description').value = '';
            document.getElementById('evidenceFile').value = '';
            document.getElementById('scoreAdjustModal').style.display = 'block';
            updateAfterScore();
        }

        function closeScoreAdjustModal() {
            document.getElementById('scoreAdjustModal').style.display = 'none';
        }

        function updateAfterScore() {
            const change = parseInt(document.getElementById('scoreChangeInput').value) || 0;
            const current = selectedUser.score;
            document.getElementById('afterScore').textContent = current + change;
        }

        function changeScore(amount) {
            const input = document.getElementById('scoreChangeInput');
            input.value = parseInt(input.value) + amount;
            updateAfterScore();
        }

        function toggleOtherReason() {
            const select = document.getElementById('reasonSelect');
            const otherInput = document.getElementById('otherReason');
            otherInput.style.display = select.value === 'other' ? 'block' : 'none';
        }

        async function confirmScoreAdjust() {
            if (!selectedUser) return;

            const change = parseInt(document.getElementById('scoreChangeInput').value) || 0;
            if (change === 0) {
                alert('กรุณาระบุจำนวนคะแนนที่จะปรับ');
                return;
            }

            const reasonSelect = document.getElementById('reasonSelect').value;
            let reason = reasonSelect;
            if (reason === 'other') {
                reason = document.getElementById('otherReason').value.trim();
                if (!reason) {
                    alert('กรุณาระบุสาเหตุ');
                    return;
                }
            }

            const description = document.getElementById('description').value.trim();
            const fileInput = document.getElementById('evidenceFile');

            // Show countdown
            const confirmBtn = document.getElementById('confirmAdjustBtn');
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<div class="progress-circle" style="width: 20px; height: 20px; border: 2px solid #fff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div> นับถอยหลัง...';

            let countdown = 3;
            const interval = setInterval(() => {
                countdown--;
                if (countdown > 0) {
                    confirmBtn.innerHTML = `<div class="progress-circle" style="width: 20px; height: 20px; border: 2px solid #fff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div> ${countdown}`;
                } else {
                    clearInterval(interval);
                    confirmBtn.innerHTML = 'ยืนยัน';
                    confirmBtn.disabled = false;
                }
            }, 1000);

            // Wait for user to confirm again or timeout
            setTimeout(() => {
                if (confirm('ยืนยันการปรับคะแนน ' + change + ' คะแนน?') && !confirmBtn.disabled) {
                    submitScoreAdjust(change, reason, description, fileInput.files[0]);
                }
            }, 3000);
        }

        async function submitScoreAdjust(change, reason, description, file) {
            const formData = new FormData();
            formData.append('user_id', selectedUser.id);
            formData.append('score_change', change);
            formData.append('reason', reason);
            formData.append('description', description);
            if (file) formData.append('evidence', file);

            try {
                const response = await fetch('../../api/score-adjust-api.php', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                if (data.success) {
                    alert('ปรับคะแนนเรียบร้อย');
                    closeScoreAdjustModal();
                    // Refresh score display
                    updateScoreDisplay(selectedUser);
                } else {
                    alert('เกิดข้อผิดพลาด: ' + data.message);
                }
            } catch (error) {
                alert('เกิดข้อผิดพลาดในการส่งข้อมูล');
            }
        }

        // Close modal on outside click
        window.onclick = function(event) {
            const modal = document.getElementById('scoreAdjustModal');
            if (event.target === modal) {
                closeScoreAdjustModal();
            }
        }
    </script>

    <!-- Score Adjust Modal -->
    <div id="scoreAdjustModal" style="display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.5);">
        <div style="background-color: #fefefe; margin: 5% auto; padding: 20px; border: none; border-radius: 10px; width: 90%; max-width: 500px; max-height: 80vh; overflow-y: auto;">
            <h2>หัก/เพิ่ม คะแนน</h2>
            <p><strong>ผู้ใช้:</strong> <span id="adjustUserName"></span></p>
            <p><strong>คะแนนปัจจุบัน:</strong> <span id="adjustCurrentScore"></span></p>
            
            <div style="margin: 20px 0;">
                <label>จำนวนคะแนนที่จะปรับ:</label>
                <div style="display: flex; gap: 5px; align-items: center; margin: 10px 0;">
                    <button type="button" onclick="changeScore(-5)">-5</button>
                    <button type="button" onclick="changeScore(-1)">-1</button>
                    <input type="number" id="scoreChangeInput" style="width: 80px; padding: 5px; text-align: center;" oninput="updateAfterScore()">
                    <button type="button" onclick="changeScore(1)">+1</button>
                    <button type="button" onclick="changeScore(5)">+5</button>
                </div>
                <p><strong>คะแนนหลังปรับ:</strong> <span id="afterScore"></span></p>
            </div>

            <div style="margin: 20px 0;">
                <label>สาเหตุ:</label>
                <select id="reasonSelect" onchange="toggleOtherReason()" style="width: 100%; padding: 5px;">
                    <option value="">เลือกสาเหตุ</option>
                    <option value="เบื่ออ้วนๆ">เบื่ออ้วนๆ</option>
                    <option value="โกรธอ้วนๆ">โกรธอ้วนๆ</option>
                    <option value="งอนอ้วนๆ">งอนอ้วนๆ</option>
                    <option value="ไม่ง้อ">ไม่ง้อ</option>
                    <option value="อยากให้เฉยๆ">อยากให้เฉยๆ</option>
                    <option value="other">อื่นๆ</option>
                </select>
                <input type="text" id="otherReason" style="display: none; width: 100%; padding: 5px; margin-top: 5px;">
            </div>

            <div style="margin: 20px 0;">
                <label>คำอธิบาย:</label>
                <textarea id="description" style="width: 100%; padding: 5px; height: 80px;"></textarea>
            </div>

            <div style="margin: 20px 0;">
                <label>หลักฐาน (รูปภาพ/วิดีโอ):</label>
                <input type="file" id="evidenceFile" accept="image/*,video/*" style="width: 100%; padding: 5px;">
            </div>

            <div style="text-align: right; margin-top: 20px;">
                <button onclick="closeScoreAdjustModal()" style="background: #ccc; color: black; border: none; padding: 10px 20px; border-radius: 5px; margin-right: 10px; cursor: pointer;">ยกเลิก</button>
                <button id="confirmAdjustBtn" onclick="confirmScoreAdjust()" style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">ยืนยัน</button>
            </div>
        </div>
    </div>

    <!-- Floating Action Button -->
    <button id="floatingAddBtn" onclick="if(selectedUser) openScoreAdjustModal(selectedUser);" style="position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #28a745, #20c997); color: white; border: none; font-size: 24px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1000; transition: all 0.3s ease; display: none;">
        +
    </button>

    <style>
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        button[type="button"] { background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; }
        button[type="button"]:hover { background: #0056b3; }

        #floatingAddBtn:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 16px rgba(0,0,0,0.4);
        }

        #floatingAddBtn:active {
            transform: scale(0.95);
        }
    </style>
</body>
</html>
