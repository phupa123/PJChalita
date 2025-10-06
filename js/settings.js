// Settings management for PJChalita
(function() {
    'use strict';

    // Settings keys
    const SETTINGS_KEYS = {
        cameraAuto: 'pjchalita-camera-auto',
        micAuto: 'pjchalita-mic-auto',
        joinLeaveVolume: 'pjchalita-join-leave-volume',
        buttonSoundVolume: 'pjchalita-button-sound-volume'
    };

    // Default values
    const DEFAULTS = {
        cameraAuto: 'auto',
        micAuto: 'auto',
        joinLeaveVolume: 50,
        buttonSoundVolume: 50
    };

    // Load settings from localStorage
    function loadSettings() {
        document.getElementById('camera-auto').value = localStorage.getItem(SETTINGS_KEYS.cameraAuto) || DEFAULTS.cameraAuto;
        document.getElementById('mic-auto').value = localStorage.getItem(SETTINGS_KEYS.micAuto) || DEFAULTS.micAuto;

        const joinLeaveVol = parseInt(localStorage.getItem(SETTINGS_KEYS.joinLeaveVolume)) || DEFAULTS.joinLeaveVolume;
        document.getElementById('join-leave-volume').value = joinLeaveVol;
        document.getElementById('join-leave-volume-value').textContent = joinLeaveVol;

        const buttonVol = parseInt(localStorage.getItem(SETTINGS_KEYS.buttonSoundVolume)) || DEFAULTS.buttonSoundVolume;
        document.getElementById('button-sound-volume').value = buttonVol;
        document.getElementById('button-sound-volume-value').textContent = buttonVol;
    }

    // Save settings to localStorage
    function saveSettings() {
        localStorage.setItem(SETTINGS_KEYS.cameraAuto, document.getElementById('camera-auto').value);
        localStorage.setItem(SETTINGS_KEYS.micAuto, document.getElementById('mic-auto').value);
        localStorage.setItem(SETTINGS_KEYS.joinLeaveVolume, document.getElementById('join-leave-volume').value);
        localStorage.setItem(SETTINGS_KEYS.buttonSoundVolume, document.getElementById('button-sound-volume').value);

        // Show success message
        showToast('บันทึกการตั้งค่าเรียบร้อยแล้ว', 'success');
    }

    // Reset settings to defaults
    function resetSettings() {
        if (confirm('ต้องการรีเซ็ตการตั้งค่าทั้งหมดเป็นค่าเริ่มต้นหรือไม่?')) {
            localStorage.removeItem(SETTINGS_KEYS.cameraAuto);
            localStorage.removeItem(SETTINGS_KEYS.micAuto);
            localStorage.removeItem(SETTINGS_KEYS.joinLeaveVolume);
            localStorage.removeItem(SETTINGS_KEYS.buttonSoundVolume);

            loadSettings();
            showToast('รีเซ็ตการตั้งค่าเรียบร้อยแล้ว', 'info');
        }
    }

    // Show toast notification
    function showToast(message, type = 'info') {
        const toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';

        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        toastContainer.appendChild(toast);
        document.body.appendChild(toastContainer);

        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        toast.addEventListener('hidden.bs.toast', () => {
            document.body.removeChild(toastContainer);
        });
    }

    // Show settings section
    function showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.settings-section').forEach(section => {
            section.style.display = 'none';
        });

        // Show selected section
        const sectionEl = document.getElementById(sectionId + '-section');
        if (sectionEl) sectionEl.style.display = 'block';

        // Update active state on sidebar links without relying on global event
        const targetSelector = `.sidebar .nav-link[href="#${sectionId}"]`;
        document.querySelectorAll('.sidebar .nav-link').forEach(link => {
            if (link.matches(targetSelector)) link.classList.add('active');
            else link.classList.remove('active');
        });
    }

    // Go back to previous page
    function goBack() {
        if (document.referrer && document.referrer !== window.location.href) {
            window.history.back();
        } else {
            // Fallback to index.php if no referrer
            window.location.href = 'index.php';
        }
    }

    // Test button sound with current volume setting
    function testButtonSound() {
        try {
            const buttonSoundVolume = parseInt(localStorage.getItem(SETTINGS_KEYS.buttonSoundVolume)) || DEFAULTS.buttonSoundVolume;
            const audio = new Audio('sound/general/button-click-289742.mp3');
            audio.volume = buttonSoundVolume / 100;
            audio.play().catch(error => {
                console.warn('Failed to play test sound:', error);
                showToast('ไม่สามารถเล่นเสียงได้', 'warning');
            });
        } catch (error) {
            console.error('Error testing button sound:', error);
            showToast('เกิดข้อผิดพลาดในการทดสอบเสียง', 'error');
        }
    }

    // Test join/leave sound with current volume setting
    function testJoinLeaveSound() {
        try {
            const joinLeaveVolume = parseInt(localStorage.getItem(SETTINGS_KEYS.joinLeaveVolume)) || DEFAULTS.joinLeaveVolume;
            const audio = new Audio('sound/videocall/join_room.mp3');
            audio.volume = joinLeaveVolume / 100;
            audio.play().catch(error => {
                console.warn('Failed to play test sound:', error);
                showToast('ไม่สามารถเล่นเสียงได้', 'warning');
            });
        } catch (error) {
            console.error('Error testing join/leave sound:', error);
            showToast('เกิดข้อผิดพลาดในการทดสอบเสียง', 'error');
        }
    }

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        loadSettings();

        // Add event listeners for real-time updates
        document.getElementById('join-leave-volume').addEventListener('input', function() {
            document.getElementById('join-leave-volume-value').textContent = this.value;
        });

        document.getElementById('button-sound-volume').addEventListener('input', function() {
            document.getElementById('button-sound-volume-value').textContent = this.value;
        });

        // Auto-save on change
        document.querySelectorAll('select, input[type="range"]').forEach(element => {
            element.addEventListener('change', saveSettings);
        });

        // Make functions global
        window.resetSettings = resetSettings;
        window.showSection = showSection;
        window.goBack = goBack;
        window.testButtonSound = testButtonSound;
        window.testJoinLeaveSound = testJoinLeaveSound;
    });

})();
