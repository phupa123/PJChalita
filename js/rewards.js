// PJChalita/js/rewards.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const levelDisplay = document.getElementById('level-display');
    const coinsDisplay = document.getElementById('coins-display');
    const expDisplay = document.getElementById('exp-display');
    const expBar = document.getElementById('exp-bar');
    const notificationContainer = document.getElementById('notification-container');
    
    // --- Config ---
    const API_URL = 'api/rewards-api.php';
    const UPDATE_INTERVAL_SECONDS = 60;

    // --- State ---
    let mainInterval;
    window.rewardsData = {}; // Global object to hold the latest data

    // --- Initialize ---
    function init() {
        startTimers();
    }

    // --- API Communication ---
    async function triggerRewardUpdate() {
        try {
             const response = await fetch(API_URL, { method: 'POST' });
             const data = await response.json();
             if (data.status === 'success') {
                if (data.user_data) {
                    window.rewardsData = data.user_data; // Store latest data globally
                    updateUI(data.user_data);
                }
                if (data.rewards && notificationContainer) {
                    data.rewards.forEach(reward => {
                        let amount = Number.isInteger(reward.amount) ? reward.amount : reward.amount.toFixed(2);
                        showNotification(`+${amount} ${reward.type.toUpperCase()}`, reward.type);
                    });
                }
                if (data.leveled_up && notificationContainer) {
                    showNotification(`Level Up! You reached Level ${data.new_level}!`, 'level-up');
                }
             }
        } catch(error) {
             console.error('Error updating rewards:', error);
        }
    }

    // --- UI Update ---
    function updateUI(userData) {
        if (levelDisplay) levelDisplay.textContent = userData.level;
        if (coinsDisplay) coinsDisplay.textContent = parseFloat(userData.coins).toFixed(2);
        
        const expText = `${userData.exp} / ${userData.exp_to_next_level}`;
        const expPercentage = (userData.exp / userData.exp_to_next_level) * 100;
        
        if(expDisplay) expDisplay.textContent = expText;
        if(expBar) expBar.style.width = `${expPercentage}%`;
    }
    
    function showNotification(message, type = '') {
        if (!notificationContainer) return;
        const notif = document.createElement('div');
        let iconHtml = '';
        if (type === 'exp') iconHtml = '<i class="bi bi-arrow-up-circle-fill icon"></i>';
        if (type === 'coins') iconHtml = '<i class="bi bi-coin icon"></i>';
        if (type === 'level-up') iconHtml = '<i class="bi bi-stars icon"></i>';

        notif.className = `notification-popup ${type}`;
        notif.innerHTML = `${iconHtml} ${message}`;
        notificationContainer.appendChild(notif);
        setTimeout(() => { notif.remove(); }, 3900);
    }

    // --- Timers ---
    function startTimers() {
        if(mainInterval) clearInterval(mainInterval);
        
        triggerRewardUpdate(); 

        mainInterval = setInterval(() => {
            triggerRewardUpdate();
        }, UPDATE_INTERVAL_SECONDS * 1000);
    }
    
    init();
});