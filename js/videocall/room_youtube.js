// js/videocall/room_youtube.js

(function() {
    let player = null;
    let isSyncing = true;
    let isCollaborative = false;
    let peerManagerRef = null;
    let playlistCache = [];
    
    // --- Draggable Popup Logic ---
    function makeDraggable(popup, header) {
        let isDragging = false;
        let offset = { x: 0, y: 0 };

        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            offset.x = e.clientX - popup.offsetLeft;
            offset.y = e.clientY - popup.offsetTop;
            popup.style.transition = 'none'; // Disable transition while dragging
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            let newX = e.clientX - offset.x;
            let newY = e.clientY - offset.y;

            // Constrain within viewport
            const maxX = window.innerWidth - popup.offsetWidth;
            const maxY = window.innerHeight - popup.offsetHeight;
            
            popup.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
            popup.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
            popup.style.transform = 'none'; // Remove translateX
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            popup.style.transition = ''; // Re-enable transition
        });
    }


    // The API will call this function when the player is ready
    window.onYouTubeIframeAPIReady = () => {};
    
    function createPlayer(options) {
        if (player) {
            player.destroy();
        }
        player = new YT.Player('youtube-player', {
            height: '100%',
            width: '100%',
            videoId: options.videoId || undefined,
            playerVars: {
                'playsinline': 1,
                'autoplay': 1,
                'controls': 1,
                'listType': options.listType || undefined,
                'list': options.list || undefined,
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    }

    function onPlayerReady(event) {
        console.log("YouTube Player is ready.");
        updatePlaylistUI();
    }

    function onPlayerStateChange(event) {
        updatePlaylistUI(); // Highlight current video
        if (!isSyncing || !peerManagerRef) return;
        
        const state = event.data;
        const videoData = player.getVideoData();
        const videoId = videoData.video_id;

        const broadcastData = {
            type: 'youtube-state',
            time: player.getCurrentTime(),
            videoId: videoId,
            playlistId: player.getPlaylistId(),
            playlistIndex: player.getPlaylistIndex(),
        };

        if (state === YT.PlayerState.PLAYING) {
            broadcastData.state = 'play';
            peerManagerRef.broadcast(broadcastData);
        } else if (state === YT.PlayerState.PAUSED) {
            broadcastData.state = 'pause';
            peerManagerRef.broadcast(broadcastData);
        }
    }
    
    function getUrlParams(url) {
        const params = {};
        const parser = document.createElement('a');
        parser.href = url;
        const query = parser.search.substring(1);
        const vars = query.split('&');
        for (let i = 0; i < vars.length; i++) {
            const pair = vars[i].split('=');
            params[pair[0]] = decodeURIComponent(pair[1]);
        }
        return params;
    }

    function loadFromUrl(url) {
        const params = getUrlParams(url);
        const videoId = params.v;
        const playlistId = params.list;
        
        const broadcastData = { type: 'youtube-state' };
        let playerOptions = {};
        
        if (playlistId) {
            playerOptions = { listType: 'playlist', list: playlistId };
            broadcastData.state = 'load_playlist';
            broadcastData.playlistId = playlistId;
        } else if (videoId) {
            playerOptions = { videoId: videoId };
            broadcastData.state = 'load_video';
            broadcastData.videoId = videoId;
        } else {
            Swal.fire('ผิดพลาด', 'ไม่พบ Video ID หรือ Playlist ID ใน URL', 'error');
            return;
        }
        
        createPlayer(playerOptions);
        if(isSyncing && peerManagerRef) {
            peerManagerRef.broadcast(broadcastData);
        }
    }
    
    function renderPlaylist(playlist) {
        const container = document.getElementById('youtube-playlist');
        if (!playlist || playlist.length === 0) {
             container.innerHTML = '<p class="text-muted text-center small p-3">ไม่มีวิดีโอใน Playlist นี้</p>';
             return;
        }
        playlistCache = playlist;
        container.innerHTML = playlist.map((title, index) => 
            `<div class="playlist-item" data-index="${index}">${index + 1}. ${title}</div>`
        ).join('');

        container.querySelectorAll('.playlist-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                player.playVideoAt(index);
                if (isSyncing && peerManagerRef) {
                    peerManagerRef.broadcast({
                        type: 'youtube-state',
                        state: 'play_at_index',
                        index: index
                    });
                }
            });
        });
    }

    function updatePlaylistUI() {
        if (!player || typeof player.getPlaylist !== 'function') return;

        const playlist = player.getPlaylist();
        if (playlist && playlist.length > 0 && playlist.length !== playlistCache.length) {
            player.getPlaylist().then(renderPlaylist);
        }
        
        const currentIndex = player.getPlaylistIndex();
        document.querySelectorAll('#youtube-playlist .playlist-item').forEach(item => {
            item.classList.toggle('active', parseInt(item.dataset.index) === currentIndex);
        });
    }


    // Handle incoming messages from other peers
    function handleYouTubeData(peerId, data) {
        if (data.type !== 'youtube-state' || !isSyncing) return;

        // Everyone follows collaborative setting from sender
        isCollaborative = document.getElementById('allow-control-toggle')?.checked || false;
        
        if (data.state === 'load_video') {
            createPlayer({ videoId: data.videoId });
        } else if (data.state === 'load_playlist') {
            createPlayer({ listType: 'playlist', list: data.playlistId });
        } else if (player) {
             // Apply state change with a small delay
            setTimeout(() => {
                if(data.state === 'play_at_index') {
                    player.playVideoAt(data.index);
                }
                if (data.state === 'play') {
                    player.seekTo(data.time, true);
                    player.playVideo();
                } else if (data.state === 'pause') {
                    player.seekTo(data.time, true);
                    player.pauseVideo();
                }
            }, 250);
        }
    }
    
    function openPopup() {
        document.getElementById('youtube-popup-container').classList.add('visible');
    }
    function closePopup() {
        document.getElementById('youtube-popup-container').classList.remove('visible');
        if (player) {
            player.stopVideo();
        }
    }

    function install({ streamManager, UIManager, PeerManager }) {
        if (!PeerManager) return;
        
        peerManagerRef = PeerManager;
        PeerManager.registerDataHandler(handleYouTubeData);

        const popup = document.getElementById('youtube-popup-container');
        const header = popup.querySelector('.youtube-header');
        makeDraggable(popup, header);

        const openBtn = document.getElementById('youtube-btn');
        const closeBtn = document.getElementById('youtube-close-btn');
        const loadBtn = document.getElementById('load-youtube-btn');
        const urlInput = document.getElementById('youtube-url-input');
        
        openBtn?.addEventListener('click', openPopup);
        closeBtn?.addEventListener('click', closePopup);
        loadBtn?.addEventListener('click', () => loadFromUrl(urlInput.value));
        
        // Sync toggles
        document.getElementById('sync-video-toggle')?.addEventListener('change', (e) => isSyncing = e.target.checked);
        document.getElementById('allow-control-toggle')?.addEventListener('change', (e) => isCollaborative = e.target.checked);
    }

    window.RoomYoutubeModule = { install };
})();