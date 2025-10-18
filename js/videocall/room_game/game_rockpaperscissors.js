// PJChalita/js/videocall/room_game/game_rockpaperscissors.js

document.addEventListener('DOMContentLoaded', () => {
    const popup = document.getElementById('rockpaperscissors-popup-container');
    const closeBtn = document.getElementById('rockpaperscissors-close-btn');
    const choiceBtns = document.querySelectorAll('.choice-btn');
    const betAmountInput = document.getElementById('rps-bet-amount');
    const playerCountSpan = document.getElementById('rps-player-count');
    const emojiSelect = document.getElementById('rps-emoji-select');
    const emojiBtn = document.getElementById('rps-emoji-btn');
    const emojiStream = document.getElementById('rps-emoji-stream');
    const playBtn = document.getElementById('rps-play-btn');
    const resetBtn = document.getElementById('rps-reset-btn');
    const statusDiv = document.querySelector('.rockpaperscissors-status');
    const resultsDiv = document.querySelector('.results-display');

    let playerChoice = null;
    let gameInProgress = false;
    let players = new Map();

    // Close popup
    closeBtn.addEventListener('click', () => {
        popup.classList.remove('visible');
        resetGame();
    });

    // Choice selection
    choiceBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (gameInProgress) return;

            choiceBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            playerChoice = btn.dataset.choice;
        });
    });

    // Emoji sending
    emojiBtn.addEventListener('click', () => {
        const emoji = emojiSelect.value;
        sendEmoji(emoji);
    });

    // Play game
    playBtn.addEventListener('click', () => {
        if (!playerChoice || gameInProgress) return;

        const betAmount = parseFloat(betAmountInput.value) || 0;
        if (betAmount < 0) {
            alert('จำนวนเดิมพันต้องไม่ติดลบ');
            return;
        }

        gameInProgress = true;
        statusDiv.textContent = 'กำลังรอผู้เล่นคนอื่น...';

        // Simulate opponent choice (in real implementation, this would be multiplayer)
        setTimeout(() => {
            const choices = ['rock', 'paper', 'scissors'];
            const opponentChoice = choices[Math.floor(Math.random() * choices.length)];
            determineWinner(playerChoice, opponentChoice, betAmount);
        }, 2000);
    });

    // Reset game
    resetBtn.addEventListener('click', () => {
        resetGame();
    });

    function determineWinner(player, opponent, bet) {
        let result = '';
        let winner = '';

        if (player === opponent) {
            result = 'เสมอ!';
            winner = 'draw';
        } else if (
            (player === 'rock' && opponent === 'scissors') ||
            (player === 'paper' && opponent === 'rock') ||
            (player === 'scissors' && opponent === 'paper')
        ) {
            result = 'คุณชนะ!';
            winner = 'player';
        } else {
            result = 'คุณแพ้!';
            winner = 'opponent';
        }

        resultsDiv.innerHTML = `
            <div class="player-choice">คุณเลือก: ${getChoiceName(player)}</div>
            <div class="opponent-choice">คู่ต่อสู้เลือก: ${getChoiceName(opponent)}</div>
            <div class="winner-announcement">${result}</div>
        `;

        statusDiv.textContent = 'เกมจบแล้ว! กดเริ่มรอบใหม่เพื่อเล่นต่อ';
        gameInProgress = false;

        // Here you would handle coin transactions based on winner
        // For now, just log the result
        console.log(`Game result: ${result}, Bet: ${bet}, Winner: ${winner}`);
    }

    function getChoiceName(choice) {
        const names = {
            'rock': '✊ หิน',
            'paper': '✋ กระดาษ',
            'scissors': '✌️ กรรไกร'
        };
        return names[choice] || choice;
    }

    function sendEmoji(emoji) {
        const emojiElement = document.createElement('div');
        emojiElement.textContent = emoji;
        emojiElement.style.fontSize = '2rem';
        emojiElement.style.display = 'inline-block';
        emojiElement.style.margin = '5px';
        emojiElement.style.animation = 'fadeInOut 3s ease-in-out';

        emojiStream.appendChild(emojiElement);

        setTimeout(() => {
            emojiStream.removeChild(emojiElement);
        }, 3000);
    }

    function resetGame() {
        playerChoice = null;
        gameInProgress = false;
        choiceBtns.forEach(btn => btn.classList.remove('selected'));
        resultsDiv.innerHTML = '';
        statusDiv.textContent = 'เลือกตัวเลือกของคุณแล้วกดเล่น!';
    }

    // Update player count (mock implementation)
    function updatePlayerCount() {
        playerCountSpan.textContent = `ผู้เล่น: ${players.size + 1}`;
    }

    updatePlayerCount();

    // CSS for emoji animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: scale(0.5); }
            20% { opacity: 1; transform: scale(1); }
            80% { opacity: 1; transform: scale(1); }
            100% { opacity: 0; transform: scale(0.5); }
        }
    `;
    document.head.appendChild(style);
});
