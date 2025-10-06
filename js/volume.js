// Global Volume Utility for PJChalita
class VolumeManager {
    constructor() {
        this.defaultVolume = 50;
        this.storageKey = 'pjchalita-volume';
        this.init();
    }

    init() {
        // Ensure volume is set in localStorage
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, this.defaultVolume);
        }
    }

    getVolume() {
        const volume = localStorage.getItem(this.storageKey);
        return volume ? parseInt(volume) : this.defaultVolume;
    }

    setVolume(volume) {
        const clampedVolume = Math.max(0, Math.min(100, volume));
        localStorage.setItem(this.storageKey, clampedVolume);
        return clampedVolume;
    }

    getVolumeRatio() {
        return this.getVolume() / 100;
    }

    playSound(soundPath, options = {}) {
        try {
            const audio = new Audio(soundPath);
            audio.volume = this.getVolumeRatio();

            if (options.loop) audio.loop = true;
            if (options.onended) audio.onended = options.onended;
            if (options.onplay) audio.onplay = options.onplay;

            audio.play().catch(error => {
                console.warn('Failed to play sound:', error);
            });

            return audio;
        } catch (error) {
            console.error('Error playing sound:', error);
            return null;
        }
    }

    // Convenience method for button click sounds
    playButtonSound() {
        return this.playSound('sound/general/button-click-289742.mp3');
    }

    // Convenience method for room join sounds
    playJoinSound() {
        const joinLeaveVolume = parseInt(localStorage.getItem('pjchalita-join-leave-volume')) || 50;
        const originalVolume = this.getVolume();
        this.setVolume(joinLeaveVolume);
        const audio = this.playSound('sound/videocall/join_room.mp3');
        this.setVolume(originalVolume); // Restore original volume
        return audio;
    }

    // Convenience method for room leave sounds
    playLeaveSound() {
        const joinLeaveVolume = parseInt(localStorage.getItem('pjchalita-join-leave-volume')) || 50;
        const originalVolume = this.getVolume();
        this.setVolume(joinLeaveVolume);
        const audio = this.playSound('sound/videocall/leave_room.mp3');
        this.setVolume(originalVolume); // Restore original volume
        return audio;
    }

    // Convenience method for button input sounds
    playButtonInputSound() {
        const buttonSoundVolume = parseInt(localStorage.getItem('pjchalita-button-sound-volume')) || 50;
        const originalVolume = this.getVolume();
        this.setVolume(buttonSoundVolume);
        const audio = this.playSound('sound/videocall/button_input.mp3');
        this.setVolume(originalVolume); // Restore original volume
        return audio;
    }

    // Convenience method for button output sounds
    playButtonOutputSound() {
        const buttonSoundVolume = parseInt(localStorage.getItem('pjchalita-button-sound-volume')) || 50;
        const originalVolume = this.getVolume();
        this.setVolume(buttonSoundVolume);
        const audio = this.playSound('sound/videocall/button_output.mp3');
        this.setVolume(originalVolume); // Restore original volume
        return audio;
    }

    // Method to update all existing audio elements on the page
    updateExistingAudio() {
        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach(audio => {
            if (!audio.hasAttribute('data-ignore-volume')) {
                audio.volume = this.getVolumeRatio();
            }
        });
    }

    // Listen for volume changes from other tabs/windows
    listenForChanges(callback) {
        window.addEventListener('storage', (e) => {
            if (e.key === this.storageKey && callback) {
                callback(parseInt(e.newValue));
            }
        });
    }
}

// Create global instance
const volumeManager = new VolumeManager();

// Make it globally available
window.VolumeManager = VolumeManager;
window.volumeManager = volumeManager;

// Auto-update existing audio elements when volume changes
volumeManager.listenForChanges(() => {
    volumeManager.updateExistingAudio();
});

// Add convenience functions to window
window.playSound = (soundPath, options) => volumeManager.playSound(soundPath, options);
window.playButtonSound = () => volumeManager.playButtonSound();
window.getVolume = () => volumeManager.getVolume();
window.setVolume = (volume) => volumeManager.setVolume(volume);
