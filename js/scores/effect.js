// Clean mouse & touch effects for MyScore page
// - Desktop: custom cursor + click ripple
// - Touch: ripple on touchstart and small trail on touchmove
// Efficient: minimal DOM updates, requestAnimationFrame used for smooth cursor

(function () {
    'use strict';

    function ready(fn) {
        if (document.readyState !== 'loading') {
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    }

        ready(function () {
        // Utility: detect touch-capable device
        var isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0);

        // Shared click ripple effect (used on desktop and can be reused on touch)
        function createClickEffect(x, y) {
            try {
                var click = document.createElement('div');
                click.className = 'click-effect';
                click.style.left = x + 'px';
                click.style.top = y + 'px';
                document.body.appendChild(click);
                click.addEventListener('animationend', function () { if (click && click.parentNode) click.parentNode.removeChild(click); });
            } catch (e) {
                // ignore DOM errors
            }
        }

        if (!isTouchDevice) {
            // Create cursor elements
            var cursorContainer = document.createElement('div');
            cursorContainer.className = 'cursor';

            var cursorDot = document.createElement('div');
            cursorDot.className = 'cursor-dot';

            var cursorRing = document.createElement('div');
            cursorRing.className = 'cursor-ring';

            // Append visual elements inside the container for easier state classing
            cursorContainer.appendChild(cursorRing);
            cursorContainer.appendChild(cursorDot);
            document.body.appendChild(cursorContainer);

            // Enable native cursor hiding via a body class (scoped)
            document.body.classList.add('custom-cursor');

            var lastX = window.innerWidth / 2, lastY = window.innerHeight / 2;
            var dotX = lastX, dotY = lastY;
            var ringX = lastX, ringY = lastY;
            var ringEase = 0.15; // Smooth for ring

            // Ensure initial visibility
            cursorDot.style.opacity = '1';
            cursorRing.style.opacity = '1';

            // Mouse movement handler
            document.addEventListener('mousemove', function(e) {
                lastX = e.clientX;
                lastY = e.clientY;

                // Position immediately for dot (precise) and start RAF loop
                dotX = lastX; dotY = lastY;
                cursorDot.style.left = dotX + 'px';
                cursorDot.style.top = dotY + 'px';

                // Kick off smooth ring movement
                requestAnimationFrame(updateCursor);
            }, { passive: true });

            // Update cursor position with a smooth trailing ring
            function updateCursor() {
                // Smooth movement for ring
                ringX += (lastX - ringX) * ringEase;
                ringY += (lastY - ringY) * ringEase;
                cursorRing.style.left = ringX + 'px';
                cursorRing.style.top = ringY + 'px';

                // Continue animation while ring is catching up
                if (Math.abs(lastX - ringX) > 0.3 || Math.abs(lastY - ringY) > 0.3) {
                    requestAnimationFrame(updateCursor);
                }
            }

            // Hover effect for interactive elements
            var interactive = document.querySelectorAll('a, button, .history-item');
            Array.prototype.forEach.call(interactive, function(el) {
                el.addEventListener('mouseenter', function() {
                    cursorContainer.classList.add('cursor--hover');
                });
                el.addEventListener('mouseleave', function() {
                    cursorContainer.classList.remove('cursor--hover');
                });
            });

            // Click effect
            document.addEventListener('mousedown', function(e) {
                cursorContainer.classList.add('cursor--click');
                // also show a small ripple for feedback
                createClickEffect(e.clientX, e.clientY);
            });

            document.addEventListener('mouseup', function() {
                cursorContainer.classList.remove('cursor--click');
            });

            // Hide cursor when leaving window (and show when entering)
            document.addEventListener('mouseleave', function () {
                cursorContainer.style.opacity = '0';
            });
            document.addEventListener('mouseenter', function () {
                cursorContainer.style.opacity = '1';
            });
        } else {
            // --- Touch-only behavior (mobile enhancements) ---
            // Throttle helper to limit touchmove work
            function throttle(fn, wait) {
                var last = 0;
                return function() {
                    var now = Date.now();
                    if (now - last >= wait) {
                        last = now;
                        fn.apply(this, arguments);
                    }
                };
            }

            // Create touch ripple (larger on mobile)
            function createTouchRipple(x, y, size) {
                size = size || 100;
                var ripple = document.createElement('div');
                ripple.className = 'touch-ripple';
                ripple.style.left = x + 'px';
                ripple.style.top = y + 'px';
                ripple.style.width = size + 'px';
                ripple.style.height = size + 'px';
                document.body.appendChild(ripple);
                ripple.addEventListener('animationend', function() { if (ripple && ripple.parentNode) ripple.parentNode.removeChild(ripple); });
                // Safety: limit number of active ripples
                var active = document.querySelectorAll('.touch-ripple');
                if (active.length > 6) active[0].remove();
            }

            // Create touch trail dot
            function createTouchTrail(x, y) {
                var trail = document.createElement('div');
                trail.className = 'touch-trail';
                trail.style.left = x + 'px';
                trail.style.top = y + 'px';
                document.body.appendChild(trail);
                trail.addEventListener('animationend', function() { if (trail && trail.parentNode) trail.parentNode.removeChild(trail); });
                // Safety: limit trail elements
                var active = document.querySelectorAll('.touch-trail');
                if (active.length > 24) active[0].remove();
            }

            // Handle multi-touch start: create ripple for each touch
            document.addEventListener('touchstart', function(e) {
                for (var i = 0; i < e.touches.length; i++) {
                    var t = e.touches[i];
                    createTouchRipple(t.clientX, t.clientY, 120);
                }
            }, { passive: true });

            // Throttled trail on touchmove
            var throttledTrail = throttle(function(ev) {
                for (var i = 0; i < ev.touches.length; i++) {
                    var t = ev.touches[i];
                    createTouchTrail(t.clientX, t.clientY);
                }
            }, 40); // ~25fps

            document.addEventListener('touchmove', function(e) {
                throttledTrail(e);
            }, { passive: true });

            // touchend: small final ripple for taps
            document.addEventListener('touchend', function(e) {
                // If it was a quick tap, create a subtle ripple at changedTouches
                for (var i = 0; i < e.changedTouches.length; i++) {
                    var t = e.changedTouches[i];
                    createTouchRipple(t.clientX, t.clientY, 90);
                }
            }, { passive: true });
        }
    });
})();