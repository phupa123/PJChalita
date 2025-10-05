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
