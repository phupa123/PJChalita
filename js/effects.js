document.addEventListener('DOMContentLoaded', () => {
    // ===================================
    // 1. Continuous Follower (Trail Effect) & Multi-touch
    // ===================================
    let lastParticleX = -1;
    let lastParticleY = -1;
    const particleDensity = 15; // Pixels between particles

    function createTrailParticle(x, y) {
        const particle = document.createElement('div');
        particle.classList.add('trail-particle');
        document.body.appendChild(particle);

        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;

        // Remove particle after animation
        particle.addEventListener('animationend', () => {
            particle.remove();
        });
    }

    function handlePointerMove(clientX, clientY) {
        if (lastParticleX === -1 || Math.hypot(clientX - lastParticleX, clientY - lastParticleY) > particleDensity) {
            createTrailParticle(clientX, clientY);
            lastParticleX = clientX;
            lastParticleY = clientY;
        }
    }

    window.addEventListener('mousemove', e => {
        handlePointerMove(e.clientX, e.clientY);
    });

    window.addEventListener('touchmove', e => {
        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            handlePointerMove(touch.clientX, touch.clientY);
        }
    });

    // ===================================
    // 2. Click Ripple Effect (Multi-touch enabled)
    // ===================================
    function createRipple(x, y) {
        const ripple = document.createElement('span');
        ripple.classList.add('click-ripple');
        document.body.appendChild(ripple);

        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;

        ripple.addEventListener('animationend', () => {
            ripple.remove();
        });
    }

    document.addEventListener('click', e => {
        createRipple(e.clientX, e.clientY);
    });

    document.addEventListener('touchend', e => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            createRipple(touch.clientX, touch.clientY);
        }
    });
});