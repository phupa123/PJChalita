// PJChalita/js/videocall/room_stats.js

(function() {

    function install() {
        const statsBtn = document.getElementById('stats-btn');
        const hud = document.getElementById('stats-hud');

        if (!statsBtn || !hud) return;

        // --- Stats Modal Logic ---
        statsBtn.addEventListener('click', () => {
            // Access data directly from rewards.js module if it has stored it globally
            const latestData = window.rewardsData || {};
            
            const htmlContent = `
                <div class="stat-item">
                    <i class="bi bi-star-fill stat-icon level-icon"></i>
                    <span class="stat-label">Level</span>
                    <span class="stat-value">${latestData.level || '...'}</span>
                </div>
                <div class="stat-item">
                    <i class="bi bi-lightning-charge-fill stat-icon exp-icon"></i>
                    <span class="stat-label">EXP</span>
                    <span class="stat-value">${latestData.exp || '...'} / ${latestData.exp_to_next_level || '...'}</span>
                </div>
                <div class="stat-item">
                    <i class="bi bi-coin stat-icon coins-icon"></i>
                    <span class="stat-label">Coins</span>
                    <span class="stat-value">${parseFloat(latestData.coins || 0).toFixed(2)}</span>
                </div>
            `;

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Your Stats',
                    html: htmlContent,
                    customClass: {
                        popup: 'stats-modal'
                    },
                    confirmButtonText: 'Cool!',
                });
            }
        });

        // --- Draggable HUD Logic ---
        let isDragging = false;
        let offsetX, offsetY;

        const onDragStart = (e) => {
            isDragging = true;
            hud.style.transition = 'none'; // Disable transition while dragging
            
            const clientX = e.clientX || e.touches[0].clientX;
            const clientY = e.clientY || e.touches[0].clientY;
            
            const rect = hud.getBoundingClientRect();
            offsetX = clientX - rect.left;
            offsetY = clientY - rect.top;

            document.addEventListener('mousemove', onDragMove, { passive: false });
            document.addEventListener('mouseup', onDragEnd);
            document.addEventListener('touchmove', onDragMove, { passive: false });
            document.addEventListener('touchend', onDragEnd);
        };

        const onDragMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();

            const clientX = e.clientX || e.touches[0].clientX;
            const clientY = e.clientY || e.touches[0].clientY;

            let newX = clientX - offsetX;
            let newY = clientY - offsetY;

            // Constrain within viewport
            newX = Math.max(10, Math.min(newX, window.innerWidth - hud.offsetWidth - 10));
            newY = Math.max(10, Math.min(newY, window.innerHeight - hud.offsetHeight - 10));

            hud.style.left = `${newX}px`;
            hud.style.top = `${newY}px`;
        };

        const onDragEnd = () => {
            isDragging = false;
            hud.style.transition = ''; // Re-enable transition
            
            document.removeEventListener('mousemove', onDragMove);
            document.removeEventListener('mouseup', onDragEnd);
            document.removeEventListener('touchmove', onDragMove);
            document.removeEventListener('touchend', onDragEnd);
        };

        hud.addEventListener('mousedown', onDragStart);
        hud.addEventListener('touchstart', onDragStart);
    }

    // Install on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', install);
    } else {
        install();
    }

})();