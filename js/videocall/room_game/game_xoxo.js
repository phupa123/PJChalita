// PJChalita/js/videocall/room_game/game_xoxo.js (ฉบับแก้ไข)
(function () {
    let peerManager = null;
    let myUuid = null;
    
    // Audio
    const sounds = {
        click: new Audio('sound/game/ui-button-heavy-button-press-metallic.mp3'),
        join: new Audio('sound/videocall/join_room.mp3'),
        leave: new Audio('sound/videocall/leave_room.mp3'),
        music: new Audio('sound/game/XOXO/background-music.mp3'),
        button: new Audio('sound/game/XOXO/button-pressed.mp3'),
        win: new Audio('sound/game/XOXO/win.mp3'),
        lose: new Audio('sound/game/XOXO/lose.mp3'),
        turn: new Audio('sound/game/XOXO/my_turn.mp3'),
        start: new Audio('sound/game/XOXO/TimeStart.mp3'),
        end: new Audio('sound/game/XOXO/TimeEnd.mp3'),
    };
    sounds.music.loop = true;
    let muted = false;
    let volume = 0.8;
    
    // Game state
    let gameState = Array(9).fill(null);
    let currentPlayer = 'X';
    let gameActive = true;
    let players = {};
    let bets = {}; // { uuid: amount }
    let selectedBet = 0; // My bet amount
    let playerCount = 0;
    let timerInterval = null;
    let timeLeft = 28;
    
    // DOM Elements
    let gamePopup, board, statusDisplay, resetBtn, betAmountInput, playerCountDisplay;
    let muteBtn, volumeSlider;

    function install({ PeerManager, UIManager }) {
        if (!PeerManager) return;
        peerManager = PeerManager;
        myUuid = window.appConfig.MY_USER_INFO.uuid;

        gamePopup = document.getElementById('xoxo-popup-container');
        if (!gamePopup) return;

        board = gamePopup.querySelector('.xoxo-board');
        statusDisplay = gamePopup.querySelector('.xoxo-status');
        resetBtn = gamePopup.querySelector('.xoxo-reset-btn');
        betAmountInput = gamePopup.querySelector('#xoxo-bet-amount'); // Assume added in HTML/CSS
        playerCountDisplay = gamePopup.querySelector('#xoxo-player-count'); // Assume added
        const closeBtn = gamePopup.querySelector('#xoxo-close-btn');
        
        // Volume controls
        muteBtn = gamePopup.querySelector('#xoxo-mute-btn');
        volumeSlider = gamePopup.querySelector('#xoxo-volume');
        const setVolumeAll = (v) => { Object.values(sounds).forEach(a => { if (a) a.volume = v; }); };
        setVolumeAll(volume);
        muteBtn?.addEventListener('click', () => {
            muted = !muted;
            Object.values(sounds).forEach(a => { a.muted = muted; });
            muteBtn.innerHTML = muted ? '<i class="bi bi-volume-up-fill"></i> เปิดเสียงเกม' : '<i class="bi bi-volume-mute-fill"></i> ปิดเสียงเกม';
        });
        volumeSlider?.addEventListener('input', (e) => {
            volume = parseFloat(e.target.value || '0.8');
            setVolumeAll(volume);
        });
        // Emoji controls
        const emojiBtn = gamePopup.querySelector('#xoxo-emoji-btn');
        const emojiSelect = gamePopup.querySelector('#xoxo-emoji-select');
        const hideNameCheck = gamePopup.querySelector('#xoxo-emoji-hide-name');
        emojiBtn?.addEventListener('click', () => {
            const emoji = emojiSelect?.value || '👍';
            const showName = !(hideNameCheck?.checked);
            const nickname = window.appConfig.MY_USER_INFO?.nickname || '';
            createFloatingEmoji(emoji, showName ? nickname : null);
            peerManager.broadcast({ type: 'xoxo_emoji', emoji, showName, nickname });
        });

        // สร้าง Cell ของเกม (ถ้ายังไม่มี)
        if (board.children.length === 0) {
            for (let i = 0; i < 9; i++) {
                const cell = document.createElement('div');
                cell.classList.add('xoxo-cell');
                cell.dataset.index = i;
                cell.addEventListener('click', handleCellClick);
                board.appendChild(cell);
            }
        }

        // --- จุดแก้ไขสำคัญ ---
        // ปุ่ม #game-btn จะถูกจัดการโดย game_center.js เท่านั้น

        // เพิ่มการยืนยันก่อนปิด
        closeBtn.addEventListener('click', () => {
            Swal.fire({
                title: 'ออกจากเกม XO?',
                text: 'คุณแน่ใจหรือไม่ว่าต้องการปิดหน้าต่างเกมนี้',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'ใช่, ออกจากเกม',
                cancelButtonText: 'ยกเลิก'
            }).then((result) => {
                if (result.isConfirmed) {
                    gamePopup.classList.remove('visible');
                }
            });
        });
        
        resetBtn.addEventListener('click', () => {
            try { sounds.click.currentTime = 0; sounds.click.play(); } catch (e) {}
            peerManager.broadcast({ type: 'xoxo_reset' });
            handleResetGame();
        });

        // Add progress bar for timer
        const progressBar = document.createElement('div');
        progressBar.id = 'xoxo-timer-progress';
        progressBar.style.cssText = `
            width: 100%;
            height: 8px;
            background: rgba(255,255,255,0.2);
            border-radius: 4px;
            margin-bottom: 1rem;
            overflow: hidden;
        `;
        const progressFill = document.createElement('div');
        progressFill.id = 'xoxo-timer-fill';
        progressFill.style.cssText = `
            height: 100%;
            background: linear-gradient(90deg, #38bdf8, #0ea5e9);
            width: 100%;
            transition: width 1s linear;
        `;
        progressBar.appendChild(progressFill);
        statusDisplay.parentNode.insertBefore(progressBar, statusDisplay);
        
        betAmountInput?.addEventListener('change', handleBetChange);
        
        makeDraggable(gamePopup, gamePopup.querySelector('.xoxo-header'));
        peerManager.registerDataHandler(handlePeerData);

        // Add looping entry animation on popup open
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (gamePopup.classList.contains('visible')) {
                        startEntryAnimation();
                    }
                }
            });
        });
        observer.observe(gamePopup, { attributes: true });

        updateStatus();
    }
    
    function handleBetChange() {
        const amount = parseInt(betAmountInput.value) || 0;
        if (amount < 0 || !gameActive) return;
        selectedBet = amount;
        peerManager.broadcast({ type: 'xoxo_bet', uuid: myUuid, amount });
        bets[myUuid] = amount;
        updateStatus();
    }
    
    function handleCellClick(event) {
        const clickedCell = event.target;
        const clickedCellIndex = parseInt(clickedCell.dataset.index);

        if (!gameActive || gameState[clickedCellIndex] !== null) {
            return;
        }

        if(Object.keys(players).length >= 2 && players[currentPlayer] !== myUuid) {
            return;
        }

        try { sounds.button.currentTime = 0; sounds.button.play(); } catch (e) {}

        peerManager.broadcast({
            type: 'xoxo_move',
            index: clickedCellIndex,
            player: currentPlayer,
            senderUuid: myUuid
        });

        handleMove(clickedCellIndex, currentPlayer, myUuid);
    }

    function handleMove(index, player, senderUuid) {
        if (gameState[index] !== null || !gameActive) return;

        if (Object.keys(players).length < 2) {
            if (!Object.values(players).includes(senderUuid)) {
                players[player] = senderUuid;
            }
        }
        
        gameState[index] = player;
        const cell = board.querySelector(`[data-index='${index}']`);
        cell.textContent = player;
        cell.classList.add(player.toLowerCase());

        checkForWinner();
    }
    
    function checkForWinner() {
        const winningConditions = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];

        let roundWon = false;
        let winningLine = [];
        for (let i = 0; i < winningConditions.length; i++) {
            const winCondition = winningConditions[i];
            let a = gameState[winCondition[0]];
            let b = gameState[winCondition[1]];
            let c = gameState[winCondition[2]];
            if (a === null || b === null || c === null) continue;
            if (a === b && b === c) {
                roundWon = true;
                winningLine = winCondition;
                break;
            }
        }

        if (roundWon) {
            statusDisplay.textContent = `ผู้เล่น ${currentPlayer} ชนะ!`;
            gameActive = false;
            clearInterval(timerInterval);
            winningLine.forEach(index => {
                try { sounds.win.currentTime = 0; sounds.win.play(); } catch (e) {}
                board.querySelector(`[data-index='${index}']`).classList.add('win');
            });
            calculateRewards(true, currentPlayer);
            return;
        }

        if (!gameState.includes(null)) {
            statusDisplay.textContent = `เกมเสมอ!`;
            gameActive = false;
            clearInterval(timerInterval);
            try { sounds.lose.currentTime = 0; sounds.lose.play(); } catch (e) {}
            calculateRewards(false);
            return;
        }

        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        startTimer();
        updateStatus();
    }

    function calculateRewards(won, winner) {
        Object.keys(players).forEach(async playerSymbol => {
            const uuid = players[playerSymbol];
            const betAmount = bets[uuid] || 0;
            const isWinner = won && playerSymbol === winner;
            const result = won ? (isWinner ? 'win' : 'loss') : 'draw';
            const form = new FormData();
            form.append('action','update_result');
            form.append('game_type','xoxo');
            form.append('result', result);
            form.append('bet_amount', betAmount || 0);
            form.append('booster_exp', window.appConfig.boosterExp || 1);
            form.append('booster_coins', window.appConfig.boosterCoins || 1);
            try {
                const res = await fetch('api/game-stats-api.php', { method: 'POST', body: form });
                const json = await res.json();
                console.log('Update result:', json);
            } catch (e) {
                console.warn('Failed to update game result', e);
            }
        });
    }

    function handleResetGame() {
        gameState = Array(9).fill(null);
        gameActive = true;
        currentPlayer = 'X';
        players = {};
        bets = {};
        selectedBet = 0;
        clearInterval(timerInterval);
        timeLeft = 28;
        const progressFill = document.getElementById('xoxo-timer-fill');
        if (progressFill) progressFill.style.width = '100%';
        board.querySelectorAll('.xoxo-cell').forEach(cell => {
            cell.textContent = '';
            cell.classList.remove('x', 'o', 'win');
        });
        updateStatus();
    }
    
    function updateStatus() {
        if (!gameActive) return;
        const isMyTurn = players[currentPlayer] === myUuid;
        statusDisplay.textContent = `ตาของผู้เล่น: ${currentPlayer}${isMyTurn ? ' (ตาคุณ)' : ''}`;
        playerCount = Object.keys(players).length;
        if (playerCountDisplay) {
            playerCountDisplay.textContent = `มีผู้เล่นในเกม: ${playerCount}`;
        }
        if (isMyTurn) {
            try { sounds.turn.currentTime = 0; sounds.turn.play(); } catch (e) {}
        }
    }

    function startTimer() {
        clearInterval(timerInterval);
        timeLeft = 28;
        const progressFill = document.getElementById('xoxo-timer-fill');
        if (progressFill) progressFill.style.width = '100%';

        const isMyTurn = players[currentPlayer] === myUuid;
        if (isMyTurn) {
            try { sounds.start.currentTime = 0; sounds.start.play(); } catch (e) {}
        }

        timerInterval = setInterval(() => {
            timeLeft--;
            const percentage = (timeLeft / 28) * 100;
            if (progressFill) {
                progressFill.style.width = `${percentage}%`;
                if (isMyTurn) {
                    progressFill.style.background = timeLeft <= 5 ? 'linear-gradient(90deg, #ef4444, #dc2626)' : 'linear-gradient(90deg, #38bdf8, #0ea5e9)';
                } else {
                    progressFill.style.background = 'linear-gradient(90deg, #6b7280, #4b5563)';
                }
            }

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                try { sounds.end.currentTime = 0; sounds.end.play(); } catch (e) {}
                // Force switch turn
                currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
                startTimer();
                updateStatus();
            }
        }, 1000);
    }

    function handlePeerData(id, data) {
        if (data.type === 'xoxo_move') {
            handleMove(data.index, data.player, data.senderUuid);
        } else if (data.type === 'xoxo_reset') {
            handleResetGame();
        } else if (data.type === 'xoxo_bet') {
            bets[data.uuid] = data.amount;
            updateStatus();
        } else if (data.type === 'xoxo_emoji') {
            const { emoji, showName, nickname } = data;
            createFloatingEmoji(emoji, showName ? (nickname || 'ผู้เล่น') : null);
        }
    }

    function createFloatingEmoji(emoji, senderName) {
        const container = gamePopup.querySelector('.xoxo-body') || gamePopup;
        if (!container) return;

        const emojiEl = document.createElement('span');
        emojiEl.className = 'floating-emoji';
        emojiEl.textContent = emoji + (senderName ? ` ${senderName}` : '');
        container.appendChild(emojiEl);

        // Randomize animation properties
        const containerRect = container.getBoundingClientRect();
        const startX = Math.random() * containerRect.width;
        const startY = containerRect.height + 50; // Start from bottom
        const endX = Math.random() * containerRect.width;
        const endY = -100; // End above the top
        const midX1 = (Math.random() - 0.5) * 200;
        const midY1 = (Math.random() - 0.5) * 200;
        const rot1 = (Math.random() - 0.5) * 180 + 'deg';
        const rot2 = (Math.random() - 0.5) * 360 + 'deg';
        const duration = (Math.random() * 5 + 5) + 's'; // 5-10 seconds

        emojiEl.style.setProperty('--start-x', `${startX}px`);
        emojiEl.style.setProperty('--start-y', `${startY}px`);
        emojiEl.style.setProperty('--end-x', `${endX}px`);
        emojiEl.style.setProperty('--end-y', `${endY}px`);
        emojiEl.style.setProperty('--mid-x-1', `${midX1}px`);
        emojiEl.style.setProperty('--mid-y-1', `${midY1}px`);
        emojiEl.style.setProperty('--rot-1', rot1);
        emojiEl.style.setProperty('--rot-2', rot2);
        emojiEl.style.animationDuration = duration;

        emojiEl.addEventListener('animationend', () => {
            emojiEl.remove();
        });
    }

    function showEmoji(streamId, emoji, senderName) {
        const stream = document.getElementById(streamId);
        if (!stream) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'emoji-bubble';
        wrapper.textContent = emoji + (senderName ? ` ${senderName}` : '');
        stream.appendChild(wrapper);
        setTimeout(() => { wrapper.remove(); }, 3000);
    }

    function startEntryAnimation() {
        if (window.gsap) {
            gsap.fromTo(gamePopup, { scale: 0.8, rotationY: -10 }, { scale: 1, rotationY: 0, duration: 0.6, ease: 'back.out(1.7)' });
            gsap.fromTo('.xoxo-board', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, delay: 0.2, ease: 'power2.out' });
            gsap.fromTo('.xoxo-options', { x: -50, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, delay: 0.4, ease: 'power2.out' });
        }
    }

    function makeDraggable(popup, header) {
        let isDragging = false, offset = { x: 0, y: 0 };
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            offset = { x: e.clientX - popup.offsetLeft, y: e.clientY - popup.offsetTop };
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            popup.style.left = `${e.clientX - offset.x}px`;
            popup.style.top = `${e.clientY - offset.y}px`;
        });
        document.addEventListener('mouseup', () => { isDragging = false; });
    }

    window.RoomXOXOGameModule = { install };
})();
