<?php
require_once 'config.php';
session_start();

// Check if user is logged in
if (!isset($_SESSION['loggedin'])) {
    header('Location: index.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ค้นหาคะแนนผู้ใช้</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="css/scores/myscore.css" rel="stylesheet">
    <link href="css/scores/effect.css" rel="stylesheet">
    <style>
        .search-container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .search-input {
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            border-radius: 8px;
            padding: 10px 15px;
            width: 100%;
            margin-bottom: 15px;
        }
        .search-input::placeholder {
            color: rgba(255, 255, 255, 0.6);
        }
        .search-input:focus {
            background: rgba(255, 255, 255, 0.2);
            outline: none;
            box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
        }
        .search-results {
            max-height: 300px;
            overflow-y: auto;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            display: none;
        }
        .user-item {
            padding: 10px 15px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            cursor: pointer;
            display: flex;
            align-items: center;
            transition: all 0.3s ease;
        }
        .user-item:hover {
            background: rgba(255, 255, 255, 0.1);
        }
        .user-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            margin-right: 15px;
            object-fit: cover;
            border: 2px solid rgba(255, 255, 255, 0.2);
        }
        .user-info {
            flex-grow: 1;
            color: white;
        }
        .user-score {
            font-weight: bold;
            color: #4CAF50;
            margin-left: 15px;
        }
        .selected-user {
            background: rgba(255, 255, 255, 0.15);
        }
        #noResults {
            color: white;
            text-align: center;
            padding: 15px;
            display: none;
        }
        .loading {
            text-align: center;
            color: white;
            padding: 10px;
            display: none;
        }
        .loading::after {
            content: '';
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s linear infinite;
            margin-left: 10px;
            vertical-align: middle;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container mt-5">
        <div class="row justify-content-center">
            <div class="col-md-8">
                <div class="search-container">
                    <h2 class="text-white mb-4">ค้นหาคะแนนผู้ใช้</h2>
                    <input type="text" 
                           id="searchInput" 
                           class="search-input" 
                           placeholder="พิมพ์ชื่อผู้ใช้หรืออีเมล์เพื่อค้นหา..." 
                           autocomplete="off">
                    <div id="loading" class="loading">กำลังค้นหา...</div>
                    <div id="searchResults" class="search-results">
                        <div id="noResults">ไม่พบผู้ใช้ที่ค้นหา</div>
                    </div>
                </div>

                <!-- Score Display Section -->
                <div id="scoreDisplay" class="score-card" style="display: none;">
                    <div class="text-center mb-3">
                        <img id="userAvatar" src="" alt="User Avatar" class="user-avatar" style="width: 80px; height: 80px;">
                        <h3 id="userName" class="text-white mt-2"></h3>
                    </div>
                    <div class="score-value text-center">
                        <span id="userScore">0</span>
                        <small class="text-white-50 d-block">คะแนน</small>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="js/scores/effect.js"></script>
    <script>
        let searchTimeout = null;
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');
        const loading = document.getElementById('loading');
        const noResults = document.getElementById('noResults');
        const scoreDisplay = document.getElementById('scoreDisplay');

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

                const response = await fetch(`api/user-search-api.php?search=${encodeURIComponent(query)}`);
                const data = await response.json();

                if (data.success && data.users.length > 0) {
                    searchResults.innerHTML = data.users.map(user => `
                        <div class="user-item" onclick="selectUser(${JSON.stringify(user).replace(/"/g, '&quot;')})">
                            <img src="${user.avatar_url}" alt="${user.username}" class="user-avatar">
                            <div class="user-info">
                                <div>${user.username}</div>
                                <small class="text-white-50">${user.email}</small>
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

        // Select user function
        function selectUser(user) {
            document.getElementById('userAvatar').src = user.avatar_url;
            document.getElementById('userName').textContent = user.username;
            document.getElementById('userScore').textContent = user.score;
            scoreDisplay.style.display = 'block';

            // Add selected class to clicked item
            const items = document.querySelectorAll('.user-item');
            items.forEach(item => item.classList.remove('selected-user'));
            event.currentTarget.classList.add('selected-user');

            // Optional: Smooth scroll to score display
            scoreDisplay.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Input event listener with debounce
        searchInput.addEventListener('input', debounce(function(e) {
            const query = e.target.value.trim();
            if (query.length >= 2) {
                searchUsers(query);
            } else {
                searchResults.style.display = 'none';
                noResults.style.display = 'none';
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
    </script>
</body>
</html>