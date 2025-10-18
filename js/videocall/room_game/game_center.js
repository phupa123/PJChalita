// PJChalita/js/videocall/room_game/game_center.js (Redesigned)
(function () {
    let gameCenterPopup = null;
    let peerManager = null;

    function install({ PeerManager }) {
        peerManager = PeerManager;
        initializeGameCenter();
    }

    function initializeGameCenter() {
        gameCenterPopup = document.getElementById('game-center-popup');
        if (!gameCenterPopup) return;

        makeDraggable(gameCenterPopup, gameCenterPopup.querySelector('.game-center-header'));

        // --- Event Listeners ---
        const gameBtn = document.getElementById('game-btn');
        gameBtn?.addEventListener('click', togglePopup);

        const closeBtn = gameCenterPopup.querySelector('#game-center-close-btn');
        closeBtn.addEventListener('click', togglePopup);

        // Game Card Listeners
        gameCenterPopup.querySelector('#play-xoxo-game').addEventListener('click', () => openGame('xoxo'));
        gameCenterPopup.querySelector('#play-headsortails-game').addEventListener('click', () => openGame('headsortails'));
        gameCenterPopup.querySelector('#play-rockpaperscissors-game').addEventListener('click', () => openGame('rockpaperscissors'));

        // Category Filter Listeners
        gameCenterPopup.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => filterGamesByCategory(btn.dataset.category));
        });

        // Emoji Sender Listener
        const sendEmojiBtn = document.getElementById('gc-send-emoji-btn');
        sendEmojiBtn?.addEventListener('click', handleSendEmoji);

        // Settings Button Listener
        const settingsBtn = gameCenterPopup.querySelector('#gc-settings-btn');
        settingsBtn?.addEventListener('click', openSettings);
    }

    let previewTl = null;
    let entryTl = null;
    function togglePopup() {
        gameCenterPopup.classList.toggle('visible');
        const nowVisible = gameCenterPopup.classList.contains('visible');
        if (nowVisible) {
            updateUserInfo();
            if (window.volumeManager) {
                window.volumeManager.playButtonOutputSound();
            }
            // Start looping entry animation
            if (window.gsap) {
                try { entryTl?.kill(); } catch (e) {}
                entryTl = gsap.timeline({ repeat: -1, defaults: { ease: 'power2.inOut' } });
                const gameCards = gameCenterPopup.querySelectorAll('.game-card');
                gameCards.forEach((card, index) => {
                    entryTl.to(card, { scale: 1.05, duration: 0.6, yoyo: true, repeat: 1 }, index * 0.2)
                           .to(card, { rotationY: 5, duration: 0.4, yoyo: true, repeat: 1 }, index * 0.2 + 0.3);
                });
            }
            // Start GSAP preview animations
            if (window.gsap) {
                try { previewTl?.kill(); } catch (e) {}
                previewTl = gsap.timeline({ repeat: -1, defaults: { ease: 'power2.inOut' } });
                const coin = gameCenterPopup.querySelector('.hot-coin');
                if (coin) {
                    previewTl.to(coin, { y: -10, duration: 0.8, yoyo: true, repeat: 1 }, 0)
                             .to(coin, { rotate: 360, duration: 1.6 }, 0)
                             .to(coin, { boxShadow: '0 16px 40px rgba(0,0,0,0.45), inset 0 2px 10px rgba(255,255,255,0.6)', duration: 0.8 }, 0);
                }
            }
        } else {
            // Stop animations when hidden
            if (entryTl) { try { entryTl.kill(); } catch (e) {} entryTl = null; }
            if (previewTl) { try { previewTl.kill(); } catch (e) {} previewTl = null; }
        }
    }
    
    function updateUserInfo() {
        // This function can be expanded to fetch real-time data
        const coinsEl = document.getElementById('gc-user-coins');
        const levelEl = document.getElementById('gc-user-level');

        if (coinsEl && window.rewardsData?.coins) {
            coinsEl.textContent = parseFloat(window.rewardsData.coins).toFixed(2);
        }
        if (levelEl && window.rewardsData?.level) {
            levelEl.textContent = window.rewardsData.level;
        }
    }

    function openGame(gameId) {
        togglePopup(); // Close game center
        
        if (window.volumeManager) window.volumeManager.playButtonOutputSound();

        let gamePopup;
        if (gameId === 'xoxo') {
            gamePopup = document.getElementById('xoxo-popup-container');
        } else if (gameId === 'headsortails') {
            gamePopup = document.getElementById('headsortails-popup-container');
            // Notify others that this game is being opened
            if (peerManager) {
                peerManager.broadcast({ type: 'headsortails_game_open', host: window.appConfig.MY_USER_INFO });
            }
        } else if (gameId === 'rockpaperscissors') {
            gamePopup = document.getElementById('rockpaperscissors-popup-container');
        }
        
        if (gamePopup) {
            gamePopup.classList.add('visible');
        }
    }
    
    function filterGamesByCategory(category) {
        // Update active button state
        gameCenterPopup.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });

        // Show/hide game cards
        gameCenterPopup.querySelectorAll('.game-card').forEach(card => {
            if (category === 'all' || card.dataset.category === category) {
                card.style.display = 'block'; // Use 'block' or 'flex' based on your card's display type
            } else {
                card.style.display = 'none';
            }
        });
    }

    function handleSendEmoji() {
        const emojiSelect = document.getElementById('gc-emoji-select');
        if (!emojiSelect) return;
        
        const emoji = emojiSelect.value;
        createFloatingEmoji(emoji); // Create effect locally

        // You can also broadcast this to other users if you want them to see it
        // if (peerManager) {
        //     peerManager.broadcast({ type: 'gc_emoji_effect', emoji: emoji });
        // }
    }

    function createFloatingEmoji(emoji) {
        const container = document.getElementById('emoji-background-container');
        if (!container) return;

        const emojiEl = document.createElement('span');
        emojiEl.className = 'floating-emoji';
        emojiEl.textContent = emoji;
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

    function openSettings() {
        // Open settings page in new tab or modal
        window.open('settings.php', '_blank');
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
            const newX = e.clientX - offset.x;
            const newY = e.clientY - offset.y;
            const maxX = window.innerWidth - popup.offsetWidth;
            const maxY = window.innerHeight - popup.offsetHeight;
            popup.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
            popup.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
        });
        document.addEventListener('mouseup', () => { isDragging = false; });
    }

    window.RoomGameCenterModule = { install };
})();
