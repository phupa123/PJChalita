# Fix Controls-Bar and Icons Not Appearing in FullScreen Mode

## Problem
- Controls-bar and icons do not appear when in full screen mode
- CSS for full screen was not included in the HTML

## Plan
1. Update `css/videocall/room_fullscreen.css` with proper styles for controls-bar in full screen
2. Ensure the CSS file link is in `room.php` (not room_fix.php as per user request)
3. Verify `toggleFullScreen` function exists in `js/videocall/room_main_fix.js` (which room.php uses)
4. Verify double-click event listener is in video containers

## Steps
- [x] Update `css/videocall/room_fullscreen.css` with :fullscreen .controls-bar styles to position at top-right and override transforms
- [x] Confirm `<link rel="stylesheet" href="css/videocall/room_fullscreen.css">` is in `room.php` (already present)
- [x] Confirm `toggleFullScreen(uuid)` function exists in `js/videocall/room_main_fix.js` (already implemented)
- [x] Confirm `box.addEventListener('dblclick', () => ui.toggleFullScreen(uuid));` is in `addVideo` function (already implemented)
- [x] Remove fullscreen CSS link from `room_fix.php` as per user request

# Implement Global Volume Manager

## Problem
- Sound effects were hardcoded in each page with local volume settings
- Volume changes in settings.php didn't affect other pages
- No centralized volume management system

## Plan
1. Create a global volume manager in `js/volume.js`
2. Update settings.php to use the global volume manager
3. Update all other pages (index.php, profile.php, MyScore.php) to include volume.js and use global volume manager
4. Ensure volume settings persist across pages

## Steps
- [x] Create `js/volume.js` with VolumeManager class that handles volume storage and playback
- [x] Update `settings.php` to include `js/volume.js` before `js/settings.js`
- [x] Update `js/settings.js` to use `volumeManager.playButtonSound()` and `volumeManager.getVolume()` in test sound button
- [x] Update `index.php` to include `js/volume.js` and use global volume manager for sound effects
- [x] Update `profile.php` to include `js/volume.js` and use global volume manager for sound effects
- [x] Update `index_folder/Scores/MyScore.php` to include `js/volume.js` and use global volume manager for sound effects
- [x] Update `quick-login-auth.php` to include `js/volume.js` (already had sound effects using global volume manager)
- [x] Verify volume settings persist and affect sound playback across all pages
