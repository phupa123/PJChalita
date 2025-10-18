// PJChalita/js/videocall/room_game/game_headsortails.js (ฉบับแก้ไข)
(function () {
    let peerManager = null;
    let uiManager = null;
    let myUuid = null;
    let myRank = null;

    // Game state
    let gameActive = false;
    let selectedBet = null; // { choice: 'heads' or 'tails', amount: number }
    let bets = {}; // { uuid: { choice: 'heads' | 'tails', amount: number } }
    let coinResult = null; // 'heads' or 'tails'
    let playerCount = 0; // Number of participants

    // Audio
    const sounds = {
        click: new Audio('sound/game/ui-button-heavy-button-press-metallic.mp3'),
        join: new Audio('sound/videocall/join_room.mp3'),
        leave: new Audio('sound/videocall/leave_room.mp3'),
        flip: new Audio('sound/game/HaedsOrTails/drop-coin-384921.mp3'),
        music: new Audio('sound/game/HaedsOrTails/game-music-loop-7-145285.mp3'),
        win: new Audio('sound/game/HaedsOrTails/you-win-sequence-2-183949.mp3'),
        lose: new Audio('sound/game/HaedsOrTails/game-over-39-199830.mp3'),
        show: new Audio('sound/game/HaedsOrTails/show_coin.mp3'),
    };
    sounds.music.loop = true;
    let muted = false;
    let volume = 0.8;

    // DOM Elements
    let gamePopup, statusDisplay, coinElement, flipCoinBtn, resetBtn;
    let headsBtn, tailsBtn;
    let playerBetsDisplay, betAmountInput, playerCountDisplay, coinParticles;
    let muteBtn, volumeSlider;

    function install({ PeerManager, UIManager }) {
        peerManager = PeerManager;
        uiManager = UIManager;
        myUuid = window.appConfig.MY_USER_INFO.uuid;
        myRank = window.appConfig.MY_USER_INFO.rank;

        initializeGameUI();
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
    }

    function initializeGameUI() {
        gamePopup = document.getElementById('headsortails-popup-container');
        if (!gamePopup) return;

        // Assign elements
        statusDisplay = gamePopup.querySelector('.headsortails-status');
        coinElement = gamePopup.querySelector('.coin');
        flipCoinBtn = gamePopup.querySelector('#hot-flip-coin-btn');
        resetBtn = gamePopup.querySelector('#hot-reset-btn');
        headsBtn = gamePopup.querySelector('#hot-bet-heads');
        tailsBtn = gamePopup.querySelector('#hot-bet-tails');
        playerBetsDisplay = gamePopup.querySelector('#hot-player-bets');
        betAmountInput = gamePopup.querySelector('#hot-bet-amount'); // Assume added in HTML/CSS
        playerCountDisplay = gamePopup.querySelector('#hot-player-count'); // Assume added in HTML/CSS

        // Audio controls
        muteBtn = gamePopup.querySelector('#hot-mute-btn');
        volumeSlider = gamePopup.querySelector('#hot-volume');
        coinParticles = gamePopup.querySelector('#hot-coin-particles');
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

        // Add box element for coin reveal
        const coinContainer = gamePopup.querySelector('.coin-container');
        if (coinContainer && !coinContainer.querySelector('.coin-box')) {
            const box = document.createElement('div');
            box.className = 'coin-box';
            box.innerHTML = '<div class="box-lid"></div><div class="box-base"></div>';
            coinContainer.appendChild(box);
        }

        // Emoji controls
        const emojiBtn = gamePopup.querySelector('#hot-emoji-btn');
        const emojiSelect = gamePopup.querySelector('#hot-emoji-select');
        const hideNameCheck = gamePopup.querySelector('#hot-emoji-hide-name');
        emojiBtn?.addEventListener('click', () => {
            const emoji = emojiSelect?.value || '👍';
            const showName = !(hideNameCheck?.checked);
            const nickname = window.appConfig.MY_USER_INFO?.nickname || '';
            createFloatingEmoji(emoji, showName ? nickname : null);
            peerManager.broadcast({ type: 'hot_emoji', emoji, showName, nickname });
        });

        const closeBtn = gamePopup.querySelector('#headsortails-close-btn');
        closeBtn.addEventListener('click', () => {
             Swal.fire({
                title: 'ออกจากเกมหัวก้อย?',
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
                    if (gameActive) {
                        peerManager.broadcast({ type: 'headsortails_game_end' });
                    }
                    resetGameState(true); // รีเซ็ตเกมฝั่งตัวเอง
                }
            });
        });

        makeDraggable(gamePopup, gamePopup.querySelector('.headsortails-header'));

        headsBtn.addEventListener('click', () => { sounds.click.currentTime = 0; sounds.click.play(); handleBet('heads'); });
        tailsBtn.addEventListener('click', () => { sounds.click.currentTime = 0; sounds.click.play(); handleBet('tails'); });
        flipCoinBtn?.addEventListener('click', () => { sounds.flip.currentTime = 0; sounds.flip.play(); handleFlipCoin(); });
        resetBtn?.addEventListener('click', () => { sounds.click.currentTime = 0; sounds.click.play(); handleResetGame(); });

        // Initial state update
        updateUI();
    }
    
    function updateUI() {
        // Controls visibility - now anyone can flip/reset if game active
        if (flipCoinBtn && resetBtn) {
            flipCoinBtn.style.display = gameActive ? 'block' : 'none';
            resetBtn.style.display = gameActive ? 'block' : 'none';
            flipCoinBtn.disabled = coinResult !== null; // Disable if already flipped
        }

        // Bet buttons state
        headsBtn.classList.toggle('selected', selectedBet?.choice === 'heads');
        tailsBtn.classList.toggle('selected', selectedBet?.choice === 'tails');
        headsBtn.disabled = !gameActive || selectedBet !== null;
        tailsBtn.disabled = !gameActive || selectedBet !== null;
        
        if (!gameActive) {
            statusDisplay.textContent = 'เกมยังไม่เริ่ม หรือปิดอยู่';
            headsBtn.disabled = true;
            tailsBtn.disabled = true;
        } else if (coinResult !== null) {
            statusDisplay.textContent = `ผล: ${coinResult === 'heads' ? 'หัว' : 'ก้อย'}!`;
            headsBtn.disabled = true;
            tailsBtn.disabled = true;
        } else {
            statusDisplay.textContent = selectedBet ? `คุณเลือก ${selectedBet.choice === 'heads' ? 'หัว' : 'ก้อย'} เดิมพัน ${selectedBet.amount} Coins! รอโยนเหรียญ` : 'เลือก หัว หรือ ก้อย และจำนวน Coins';
        }

        // Update player bets display
        playerBetsDisplay.innerHTML = `<h6>ผู้เล่นที่เลือก:</h6>`;
        if (Object.keys(bets).length === 0) {
            playerBetsDisplay.innerHTML += `<p class="text-muted text-center m-0">ยังไม่มีใครเลือก</p>`;
        } else {
            for (const uuid in bets) {
                const nickname = (uuid === myUuid) ? `${window.appConfig.MY_USER_INFO.nickname} (คุณ)` : (window.streamManager.peerInfo[uuid]?.nickname || uuid);
                const betValue = bets[uuid].choice;
                const betAmount = bets[uuid].amount;
                let resultClass = '';
                if (coinResult !== null) {
                    resultClass = (betValue === coinResult) ? 'correct' : 'incorrect';
                }
                playerBetsDisplay.innerHTML += `
                    <div class="player-bet-item">
                        <span>${nickname}</span>
                        <span class="bet-value ${betValue} ${resultClass}">${betValue === 'heads' ? 'หัว' : 'ก้อย'} (${betAmount} Coins)</span>
                    </div>
                `;
            }
        }

        // Update player count
        playerCount = Object.keys(bets).length + (selectedBet ? 1 : 0); // Including self if bet placed
        if (playerCountDisplay) {
            playerCountDisplay.textContent = `มีผู้เล่นในเกม: ${playerCount}`;
        }
    }

    function handleBet(choice) {
        if (!gameActive || selectedBet !== null) return;
        const amount = parseInt(betAmountInput?.value) || 0; // Get bet amount
        if (amount < 0) return; // Validate
        selectedBet = { choice, amount };
        // Broadcast bet
        peerManager.broadcast({ type: 'headsortails_bet', uuid: myUuid, choice, amount });
        // Update locally
        bets[myUuid] = { choice, amount };
        updateUI();
    }

    function handleFlipCoin() {
        if (!gameActive || coinResult !== null) return;
        
        // Randomly determine result
        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        coinResult = result;

        // Broadcast flip
        peerManager.broadcast({ type: 'headsortails_flip', result: result });
        
        animateCoinFlip(result);
        burstParticles();

        // Persist rewards via API (server authoritative)
        Object.keys(bets).forEach(async uuid => {
            const bet = bets[uuid];
            const won = bet.choice === result;
            const form = new FormData();
            form.append('action','update_result');
            form.append('game_type','headsortails');
            form.append('result', won ? 'win' : 'loss');
            form.append('bet_amount', bet.amount || 0);
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

    function animateCoinFlip(result) {
        coinElement.classList.remove('heads', 'tails');
        coinElement.classList.add('flip-animation'); // Start general flip animation

        // Animate with GSAP for smoother timing, fallback to setTimeout if gsap missing
        const done = () => {
            coinElement.classList.remove('flip-animation');
            coinElement.classList.add(result); // Snap to final position (heads/tails)
            // Show box cover
            const box = gamePopup.querySelector('.coin-box');
            if (box) {
                box.classList.add('cover');
                setTimeout(() => {
                    box.classList.remove('cover');
                    updateUI();
                    sounds.show.currentTime = 0; sounds.show.play();
                }, 1000);
            } else {
                updateUI();
                sounds.show.currentTime = 0; sounds.show.play();
            }
        };
        if (window.gsap) {
            gsap.delayedCall(2.2, done);
        } else {
            setTimeout(done, 2200);
        }
    }

    function handleResetGame() {
        peerManager.broadcast({ type: 'headsortails_reset' });
        resetGameState(true);
    }

    function resetGameState(isHostReset = false) {
        gameActive = true; // Always active after reset
        selectedBet = null;
        bets = {};
        coinResult = null;
        coinElement.classList.remove('flip-animation', 'heads', 'tails');
        coinElement.classList.add('heads'); // Default to heads visually before next flip
        updateUI();
    }

    function handlePeerData(id, data) {
        // Emoji broadcast
        if (data.type === 'hot_emoji') {
            const { emoji, showName, nickname } = data;
            createFloatingEmoji(emoji, showName ? (nickname || 'ผู้เล่น') : null);
            return;
        }
        if (data.type === 'headsortails_game_open') {
            gameActive = true;
            uiManager.showToast(`เกม Heads or Tails เริ่มแล้ว!`, 'info');
            sounds.join.currentTime = 0; sounds.join.play();
            // Sync state
            peerManager.sendToPeer(id, { type: 'headsortails_request_state', requesterUuid: myUuid });
            updateUI();

        } else if (data.type === 'headsortails_game_end') {
            uiManager.showToast(`เกม Heads or Tails จบแล้ว!`, 'leave');
            sounds.leave.currentTime = 0; sounds.leave.play();
            resetGameState(false);
            updateUI();

        } else if (data.type === 'headsortails_bet') {
            bets[data.uuid] = { choice: data.choice, amount: data.amount };
            updateUI();

        } else if (data.type === 'headsortails_flip') {
            coinResult = data.result;
            animateCoinFlip(data.result);
            burstParticles();
            sounds.flip.currentTime = 0; sounds.flip.play();

        } else if (data.type === 'headsortails_reset') {
            resetGameState(true);
            sounds.click.currentTime = 0; sounds.click.play();
            uiManager.showToast(`เริ่ม Heads or Tails รอบใหม่!`, 'info');

        } else if (data.type === 'headsortails_request_state') {
            // Anyone can sync state now
            peerManager.sendToPeer(data.requesterUuid, { 
                type: 'headsortails_sync_state',
                gameActive: gameActive,
                bets: bets,
                coinResult: coinResult
            });

        } else if (data.type === 'headsortails_sync_state') {
            gameActive = data.gameActive;
            bets = data.bets;
            coinResult = data.coinResult;
            if (coinResult !== null) {
                coinElement.classList.add(coinResult);
            } else {
                coinElement.classList.remove('heads', 'tails');
                coinElement.classList.add('heads'); // Default visual
            }
            updateUI();
        }
    }

    function burstParticles() {
        if (!coinParticles) return;
        coinParticles.innerHTML = '';
        for (let i = 0; i < 24; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            const angle = (Math.PI * 2) * (i / 24);
            const radius = 80 + Math.random() * 40;
            p.style.setProperty('--tx', `${Math.cos(angle) * radius}px`);
            p.style.setProperty('--ty', `${Math.sin(angle) * radius * 0.6}px`);
            p.style.left = '50%';
            p.style.top = '50%';
            coinParticles.appendChild(p);
            setTimeout(() => p.remove(), 1500);
        }
    }

    function createFloatingEmoji(emoji, senderName) {
        const container = gamePopup.querySelector('.headsortails-body') || gamePopup;
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
            gsap.fromTo('.coin-container', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, delay: 0.2, ease: 'power2.out' });
            gsap.fromTo('.headsortails-options', { x: -50, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, delay: 0.4, ease: 'power2.out' });
        }
    }

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

    window.RoomHeadsOrTailsModule = { install };
})();
