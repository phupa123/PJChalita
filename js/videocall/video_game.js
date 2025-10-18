// PJChalita/js/videocall/video_game.js

document.addEventListener('DOMContentLoaded', () => {
    const gameBtn = document.getElementById('game-btn');
    if (!gameBtn) return;

    // --- สร้าง Popup สำหรับเกม ---
    function createGamePopup() {
        if (document.getElementById('game-center-popup')) return; // สร้างไปแล้ว

        const popup = document.createElement('div');
        popup.id = 'game-center-popup';
        popup.className = 'game-popup-container'; // ใช้สไตล์จาก video_game.css
        popup.innerHTML = `
            <div class="game-header">
                <h5><i class="bi bi-controller me-2"></i>Game Center</h5>
                <button id="game-center-close-btn" class="btn-close btn-close-white"></button>
            </div>
            <div class="game-body">
                <div class="game-grid">
                    <div class="game-card" id="play-xoxo-btn">
                        <img src="https://i.imgur.com/k4d3xAn.png" alt="XOXO Game" class="game-card-image">
                        <h3>XOXO Game</h3>
                        <p>เกม XO สุดคลาสสิก เล่นพร้อมกันในห้อง</p>
                        <span class="play-btn"><i class="bi bi-play-circle-fill me-1"></i>เล่นเลย</span>
                    </div>
                    
                    </div>
            </div>
        `;
        document.body.appendChild(popup);

        // --- ทำให้ Popup ขยับได้ ---
        makeDraggable(popup, popup.querySelector('.game-header'));

        // --- Event Listeners ---
        const closeBtn = document.getElementById('game-center-close-btn');
        closeBtn.addEventListener('click', () => {
            popup.classList.remove('visible');
        });
        
        // Listener for opening XOXO game window
        const playXoxoBtn = document.getElementById('play-xoxo-btn');
        playXoxoBtn.addEventListener('click', () => {
            const xoxoPopup = document.getElementById('xoxo-popup-container');
            if (xoxoPopup) {
                xoxoPopup.classList.add('visible');
            }
            // Optional: close the game center when a game is opened
            popup.classList.remove('visible');
        });
    }

    // --- จัดการการคลิกปุ่มเกม ---
    gameBtn.addEventListener('click', () => {
        createGamePopup(); // สร้าง popup ถ้ายังไม่มี
        const popup = document.getElementById('game-center-popup');
        if (popup) {
            popup.classList.toggle('visible');
        }
    });

    // --- ฟังก์ชันสำหรับทำให้ Element ขยับได้ ---
    function makeDraggable(popup, header) {
        let isDragging = false, offset = { x: 0, y: 0 };
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            offset = { x: e.clientX - popup.offsetLeft, y: e.clientY - popup.offsetTop };
            popup.style.transition = 'none';
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            let newX = e.clientX - offset.x;
            let newY = e.clientY - offset.y;
            const maxX = window.innerWidth - popup.offsetWidth;
            const maxY = window.innerHeight - popup.offsetHeight;
            popup.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
            popup.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
            popup.style.transform = 'none';
        });
        document.addEventListener('mouseup', () => { 
            isDragging = false; 
            popup.style.transition = ''; 
        });
    }
});