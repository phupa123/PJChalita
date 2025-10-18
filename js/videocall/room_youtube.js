// PJChalita/js/videocall/room_youtube.js (Upgraded for personal controls & high-precision sync)
(function() {
    // --- STATE ---
    let player;
    let peerManagerRef;
    let isApiReady = false;
    let isPopupVisible = false;
    let isPlayerReady = false;
    let myUuid = null;
    let userState = 'GUEST'; // GUEST, MEMBER, DJ, LEADER
    let groupState = {
        leaderUuid: null,
        djUuids: [],
        invitedUuids: []
    };
    let lastPlayerState = -1;
    let lastBroadcastTime = 0;
    let isSeeking = false; // Flag to prevent broadcasting own seek events

    // --- DOM Elements ---
    const DOMElements = {
        popup: document.getElementById('youtube-popup-container'),
        header: document.querySelector('#youtube-popup-container .youtube-header'),
        closeBtn: document.getElementById('youtube-close-btn'),
        openBtn: document.getElementById('youtube-btn'),
        searchBtn: document.getElementById('youtube-search-btn'),
        searchInput: document.getElementById('youtube-search-input'),
        searchResults: document.getElementById('youtube-search-results'),
        nowPlaying: document.getElementById('yt-current-title'),
        playerArea: document.querySelector('.youtube-player-area'),
        syncBtnContainer: document.getElementById('yt-sync-button-container'),
        // Personal Controls
        playPauseBtn: document.getElementById('yt-play-pause-btn'),
        personalVolumeSlider: document.getElementById('yt-personal-volume-slider'),
        qualityMenu: document.getElementById('yt-quality-menu'),
        fullscreenBtn: document.getElementById('yt-fullscreen-btn'),
        forceSyncBtn: document.getElementById('yt-force-sync-btn'),
        // Permissions
        settingsTabBtn: document.getElementById('yt-settings-tab-btn'),
        settingsUserList: document.getElementById('yt-settings-user-list'),
        invitationSection: document.getElementById('yt-invitation-section'),
    };

    // --- HELPERS ---
    const hasPermission = () => userState === 'LEADER' || userState === 'DJ';
    
    // --- INITIALIZATION ---
    function install({ PeerManager }) {
        if (!PeerManager) return;
        peerManagerRef = PeerManager;
        myUuid = window.appConfig.MY_USER_INFO.uuid;

        setupEventListeners();
        PeerManager.registerDataHandler(handlePeerData);
    }

    function setupEventListeners() {
        if (!DOMElements.popup) return;
        makeDraggable(DOMElements.popup, DOMElements.header);

        DOMElements.openBtn?.addEventListener('click', openPopup);
        DOMElements.closeBtn?.addEventListener('click', closePopup);
        DOMElements.searchBtn?.addEventListener('click', handleSearch);
        DOMElements.searchInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSearch(); });

        // Personal Controls Listeners
        DOMElements.playPauseBtn?.addEventListener('click', handlePlayPause);
        DOMElements.personalVolumeSlider?.addEventListener('input', handleVolumeChange);
        DOMElements.fullscreenBtn?.addEventListener('click', () => DOMElements.playerArea?.requestFullscreen());
        DOMElements.forceSyncBtn?.addEventListener('click', handleForceSync);

        DOMElements.popup.querySelectorAll('.yt-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                DOMElements.popup.querySelectorAll('.yt-tab-btn, .youtube-tab-content').forEach(el => el.classList.remove('active'));
                btn.classList.add('active');
                const tabContent = document.getElementById(`yt-tab-${tabName}`);
                if (tabContent) tabContent.classList.add('active');
            });
        });
    }

    // --- UI & POPUP MANAGEMENT ---
    function openPopup() {
        if (isPopupVisible) return;
        isPopupVisible = true;
        if(DOMElements.popup) DOMElements.popup.classList.add('visible');
        
        if (!isApiReady && typeof YT === 'undefined') {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            document.head.appendChild(tag);
        } else if (isApiReady && !player) {
            createPlayer({}); 
        }

        peerManagerRef.broadcast({ type: 'youtube-sync-request' });
        
        setTimeout(() => {
            if (!groupState.leaderUuid) {
                becomeLeader();
            }
            updateUI();
        }, 1000); 

        if(DOMElements.searchResults && DOMElements.searchResults.childElementCount <= 1) {
            fetchYouTube('popular').then(data => data && renderVideoResults(data.items));
        }
    }

    function closePopup() {
        isPopupVisible = false;
        if(DOMElements.popup) DOMElements.popup.classList.remove('visible');
        if (player && userState === 'GUEST' && typeof player.stopVideo === 'function') {
            player.stopVideo();
        }
    }

    function updateUI() {
        if (!isPopupVisible) return;
        updateUserState();
        renderSyncButton();
        renderPermissions();
        updatePersonalControls();
        
        DOMElements.forceSyncBtn.style.display = (userState === 'MEMBER') ? 'inline-flex' : 'none';

        if (DOMElements.nowPlaying) {
             if (player && isPlayerReady && typeof player.getVideoData === 'function' && player.getVideoData().title) {
                DOMElements.nowPlaying.textContent = player.getVideoData().title;
            } else {
                DOMElements.nowPlaying.textContent = "ยังไม่มีวิดีโอ";
            }
        }
    }
    
    // --- PLAYER MANAGEMENT ---
    window.onYouTubeIframeAPIReady = () => {
        isApiReady = true;
        if(isPopupVisible && !player) {
            createPlayer({});
        }
    };

    function createPlayer(options) {
        if (!isApiReady) return;
        isPlayerReady = false;
        if (player) try { player.destroy(); player = null; } catch(e) {}
        
        const controls = (hasPermission() || userState === 'GUEST') ? 1 : 0;
        
        if(options.videoId) {
            player = new YT.Player('youtube-player', {
                height: '100%', width: '100%', videoId: options.videoId,
                playerVars: { 
                    'playsinline': 1, 'autoplay': 1, 'controls': controls, 
                    'disablekb': 1, 'modestbranding': 1, 'origin': window.location.origin 
                },
                events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange }
            });
        }
    }

    function onPlayerReady(event) {
        isPlayerReady = true;
        if(DOMElements.personalVolumeSlider) {
             event.target.setVolume(DOMElements.personalVolumeSlider.value);
        }
        updatePersonalControls();
        populateQualityMenu();
    }

    function onPlayerStateChange(event) {
        updatePersonalControls();
        if (isSeeking || !isPlayerReady || !hasPermission()) return;
        
        const state = event.data;
        if (state === lastPlayerState) return;
        lastPlayerState = state;
        
        const videoId = player.getVideoData()?.video_id;
        if (!videoId) return;

        const now = Date.now();
        if (now - lastBroadcastTime < 200) return; // Throttle at 200ms
        lastBroadcastTime = now;

        const broadcastData = {
            type: 'youtube-state',
            state: '',
            time: player.getCurrentTime(),
            videoId: videoId,
        };

        if (state === YT.PlayerState.PLAYING) broadcastData.state = 'play';
        else if (state === YT.PlayerState.PAUSED) broadcastData.state = 'pause';
        else if (state === YT.PlayerState.BUFFERING) broadcastData.state = 'pause';
        else return;

        peerManagerRef.broadcast(broadcastData);
    }
    
    // --- PERSONAL CONTROLS HANDLERS ---
    function handlePlayPause() {
        if (!player || !isPlayerReady) return;
        const currentState = player.getPlayerState();
        if (currentState === YT.PlayerState.PLAYING) {
            player.pauseVideo();
        } else {
            player.playVideo();
        }
    }

    function handleVolumeChange(e) {
        if (player && typeof player.setVolume === 'function') {
            player.setVolume(e.target.value);
        }
    }

    function handleForceSync() {
        if(userState === 'MEMBER' && groupState.leaderUuid){
            peerManagerRef.sendToPeer(groupState.leaderUuid, { type: 'youtube-force-sync-request', from: myUuid });
        }
    }

    function updatePersonalControls() {
        if (!player || !isPlayerReady || !DOMElements.playPauseBtn) return;
        const currentState = player.getPlayerState();
        const icon = DOMElements.playPauseBtn.querySelector('i');
        if (currentState === YT.PlayerState.PLAYING) {
            icon.className = 'bi bi-pause-fill';
        } else {
            icon.className = 'bi bi-play-fill';
        }
    }

    function populateQualityMenu() {
        if (!player || !isPlayerReady || !DOMElements.qualityMenu) return;
        const availableQualities = player.getAvailableQualityLevels();
        const currentQuality = player.getPlaybackQuality();

        const qualityMap = {
            'hd2880': '4K', 'hd2160': '4K', 'hd1440': '1440p',
            'hd1080': '1080p', 'hd720': '720p', 'large': '480p',
            'medium': '360p', 'small': '240p', 'tiny': '144p', 'auto': 'Auto'
        };
        
        DOMElements.qualityMenu.innerHTML = availableQualities.map(q => {
            const label = qualityMap[q] || q;
            const activeClass = q === currentQuality ? 'active' : '';
            return `<li><a class="dropdown-item ${activeClass}" href="#" data-quality="${q}">${label}</a></li>`;
        }).join('');

        DOMElements.qualityMenu.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const quality = e.target.dataset.quality;
                player.setPlaybackQuality(quality);
                setTimeout(populateQualityMenu, 500); // Re-check after a moment
            });
        });
    }

    // --- SYNC & PERMISSIONS LOGIC ---
    function handlePeerData(peerId, data) {
        switch (data.type) {
            case 'youtube-state': handleStateSync(peerId, data); break;
            case 'youtube-perms': handlePermissionChange(peerId, data); break;
            case 'youtube-sync-request':
                if (userState === 'LEADER') peerManagerRef.broadcast({ type: 'youtube-sync-response', groupState });
                break;
            case 'youtube-sync-response':
                if (peerId === data.groupState.leaderUuid && (userState === 'GUEST' || userState === 'MEMBER')) {
                    groupState = data.groupState;
                    updateUI();
                }
                break;
            case 'youtube-force-sync-request':
                if(userState === 'LEADER' && player && isPlayerReady) {
                    const currentState = player.getPlayerState();
                    const syncData = {
                        type: 'youtube-state',
                        state: (currentState === YT.PlayerState.PLAYING) ? 'play' : 'pause',
                        time: player.getCurrentTime(),
                        videoId: player.getVideoData().video_id
                    };
                    peerManagerRef.sendToPeer(data.from, syncData);
                }
                break;
            case 'youtube-accept-invite':
            case 'youtube-decline-invite':
            case 'youtube-leave-dj':
                 if (userState === 'LEADER') {
                     if (data.type === 'youtube-accept-invite') {
                         groupState.invitedUuids = groupState.invitedUuids.filter(id => id !== data.uuid);
                         if (!groupState.djUuids.includes(data.uuid)) groupState.djUuids.push(data.uuid);
                     } else if (data.type === 'youtube-decline-invite') {
                         groupState.invitedUuids = groupState.invitedUuids.filter(id => id !== data.uuid);
                     } else if (data.type === 'youtube-leave-dj') {
                         groupState.djUuids = groupState.djUuids.filter(id => id !== data.uuid);
                     }
                     broadcastPermissionUpdate();
                 }
                break;
        }
    }

    function handleStateSync(senderId, data) {
        if (userState === 'GUEST' || (userState === 'MEMBER' && !groupState.leaderUuid)) return;

        const senderIsController = senderId === groupState.leaderUuid || groupState.djUuids.includes(senderId);
        if (!senderIsController) return;

        isSeeking = true;
        if (data.state === 'load_video' && player?.getVideoData()?.video_id !== data.videoId) {
            createPlayer({ videoId: data.videoId });
        } else if (player && isPlayerReady) {
            const currentTime = player.getCurrentTime();
            if (Math.abs(currentTime - data.time) > 1.5) { // Drift correction
                player.seekTo(data.time, true);
            }
            
            if (data.state === 'play' && player.getPlayerState() !== YT.PlayerState.PLAYING) {
                player.playVideo();
            } else if (data.state === 'pause' && player.getPlayerState() !== YT.PlayerState.PAUSED) {
                player.pauseVideo();
            }
        }
        setTimeout(() => { isSeeking = false; }, 500);
    }
    
    function handlePermissionChange(senderId, data) {
        if (senderId !== groupState.leaderUuid && senderId !== data.newState?.leaderUuid) return;
        groupState = data.newState;
        updateUI();

        const currentVideoId = player?.getVideoData()?.video_id;
        createPlayer({ videoId: currentVideoId });
    }
    
    function broadcastPermissionUpdate() {
        if (userState !== 'LEADER') return;
        peerManagerRef.broadcast({ type: 'youtube-perms', newState: groupState });
    }
    
    function updateUserState() {
        if (groupState.leaderUuid === myUuid) userState = 'LEADER';
        else if (groupState.djUuids.includes(myUuid)) userState = 'DJ';
        else if (groupState.leaderUuid) userState = 'MEMBER';
        else userState = 'GUEST';
    }

    // --- ACTIONS ---
    function becomeLeader() {
        groupState.leaderUuid = myUuid;
        groupState.djUuids = [];
        groupState.invitedUuids = [];
        broadcastPermissionUpdate();
        updateUI();
    }

    function joinSync() {
        if(userState !== 'GUEST' || !groupState.leaderUuid) return;
        peerManagerRef.sendToPeer(groupState.leaderUuid, { type: 'youtube-sync-request' });
        updateUI();
    }
    
    function leaveSync() {
        if(userState === 'LEADER') {
            groupState.leaderUuid = null;
            groupState.djUuids = [];
            groupState.invitedUuids = [];
            broadcastPermissionUpdate();
        } else if (userState === 'DJ') {
            peerManagerRef.sendToPeer(groupState.leaderUuid, {type: 'youtube-leave-dj', uuid: myUuid});
        }
        userState = 'GUEST'; // Locally revert to guest
        if(player && typeof player.pauseVideo === 'function') player.pauseVideo();
        updateUI();
    }
    
    // --- RENDERING ---
    function renderSyncButton() {
        if (!DOMElements.syncBtnContainer) return;
        let btnHtml = '';
        if (userState === 'GUEST' && groupState.leaderUuid) {
            btnHtml = `<button class="btn btn-sm btn-success" id="join-sync-btn">ขอเข้าร่วมกลุ่ม</button>`;
        } else if (userState !== 'GUEST') {
            btnHtml = `<button class="btn btn-sm btn-outline-danger" id="leave-sync-btn">ออกจากกลุ่ม</button>`;
        }
        DOMElements.syncBtnContainer.innerHTML = btnHtml;
        
        document.getElementById('join-sync-btn')?.addEventListener('click', joinSync);
        document.getElementById('leave-sync-btn')?.addEventListener('click', leaveSync);
    }
    
    function renderPermissions() {
        if (!DOMElements.settingsTabBtn) return;
        const hasInvite = groupState.invitedUuids.includes(myUuid);
        DOMElements.settingsTabBtn.innerHTML = `<i class="bi bi-sliders me-1"></i>จัดการสิทธิ์ ${hasInvite ? `<span class="badge bg-danger rounded-pill">!</span>` : ''}`;
        
        if (hasInvite && DOMElements.invitationSection) {
            DOMElements.invitationSection.innerHTML = `
                <p class="mb-2"><strong>${groupState.leaderUuid ? (window.streamManager.peerInfo[groupState.leaderUuid]?.nickname || 'Leader') : ''}</strong> ได้เชิญคุณเป็น DJ!</p>
                <div>
                    <button class="btn btn-success btn-sm" id="accept-invite-btn">ยอมรับ</button>
                    <button class="btn btn-danger btn-sm" id="decline-invite-btn">ปฏิเสธ</button>
                </div>`;
            DOMElements.invitationSection.style.display = 'block';
            document.getElementById('accept-invite-btn').onclick = () => window.RoomYoutubeModule.acceptInvite();
            document.getElementById('decline-invite-btn').onclick = () => window.RoomYoutubeModule.declineInvite();
        } else {
            DOMElements.invitationSection.style.display = 'none';
        }
        
        const allUuids = [...new Set([myUuid, ...Object.keys(window.streamManager.peerInfo)])];
        if (DOMElements.settingsUserList) {
            DOMElements.settingsUserList.innerHTML = allUuids.map(uuid => {
                const user = (uuid === myUuid) 
                    ? { nickname: 'คุณ', avatar: window.appConfig.MY_USER_INFO.avatar } 
                    : window.streamManager.peerInfo[uuid];
                
                if(!user) return '';

                let roleBadge = '';
                if (uuid === groupState.leaderUuid) roleBadge = '<span class="role-badge leader">Leader</span>';
                else if (groupState.djUuids.includes(uuid)) roleBadge = '<span class="role-badge dj">DJ</span>';
                else if (groupState.invitedUuids.includes(uuid)) roleBadge = '<span class="role-badge invited">Invited</span>';

                let actions = '';
                if (userState === 'LEADER' && uuid !== myUuid) {
                     if (groupState.djUuids.includes(uuid)) {
                        actions = `<button class="btn btn-sm btn-outline-danger" onclick="window.RoomYoutubeModule.removeDj('${uuid}')">Remove DJ</button>`;
                     } else if (groupState.invitedUuids.includes(uuid)) {
                        actions = `<button class="btn btn-sm btn-outline-secondary" onclick="window.RoomYoutubeModule.cancelInvite('${uuid}')">Cancel Invite</button>`;
                     } else {
                        actions = `<button class="btn btn-sm btn-outline-info" onclick="window.RoomYoutubeModule.invite('${uuid}')">Invite DJ</button>`;
                     }
                     actions += `<button class="btn btn-sm btn-outline-warning ms-1" onclick="window.RoomYoutubeModule.setLeader('${uuid}')">Set Leader</button>`;
                } else if (userState === 'DJ' && uuid === myUuid) {
                    actions = `<button class="btn btn-sm btn-outline-danger" onclick="window.RoomYoutubeModule.leaveDj()">Leave DJ Role</button>`;
                }

                return `<div class="yt-user-item">
                            <img src="${user.avatar || './images/default_profile.png'}" class="yt-user-avatar">
                            <div class="yt-user-info"><span class="name">${user.nickname}</span>${roleBadge}</div>
                            <div class="yt-user-actions">${actions}</div>
                        </div>`;
            }).join('');
        }
    }

    // --- YOUTUBE API ---
    async function fetchYouTube(action, query = '') {
        const url = `api/youtube-api.php?action=${action}&q=${encodeURIComponent(query)}`;
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) { console.error("YouTube API fetch error:", error); return null; }
    }

    async function handleSearch() {
        const query = DOMElements.searchInput.value.trim();
        if (!query) return;

        const data = await fetchYouTube('search', query);
        if (data) renderVideoResults(data.items);
    }
    
    function renderVideoResults(items) {
        if (!DOMElements.searchResults) return;
        if (!items || items.length === 0) {
            DOMElements.searchResults.innerHTML = '<p class="text-muted text-center p-3">ไม่พบผลลัพธ์</p>';
            return;
        }
        DOMElements.searchResults.innerHTML = items.map(item => {
            if(!item.id || !item.snippet) return '';
            const videoId = item.id.videoId || item.id;
            return `<div class="video-item" data-video-id="${videoId}">
                        <img src="${item.snippet.thumbnails.high.url}" alt="Thumbnail">
                        <div class="video-info"><h6>${item.snippet.title}</h6><p>${item.snippet.channelTitle}</p></div>
                    </div>`;
        }).join('');

        DOMElements.searchResults.querySelectorAll('.video-item').forEach(item => {
            item.addEventListener('click', () => {
                if (hasPermission()) {
                    const videoId = item.dataset.videoId;
                    createPlayer({ videoId });
                    peerManagerRef.broadcast({ type: 'youtube-state', state: 'load_video', videoId, time: 0 });
                } else {
                    Swal.fire('ไม่มีสิทธิ์', 'คุณต้องเป็น Leader หรือ DJ เพื่อเปลี่ยนวิดีโอ', 'warning');
                }
            });
        });
    }

    function makeDraggable(popup, header) {
        if (!popup || !header) return;
        let isDragging = false, offset = { x: 0, y: 0 };
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            offset = { x: e.clientX - popup.offsetLeft, y: e.clientY - popup.offsetTop };
            popup.style.transition = 'none';
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            let newX = e.clientX - offset.x;
            let newY = e.clientY - offset.y;
            const maxX = window.innerWidth - popup.offsetWidth;
            const maxY = window.innerHeight - popup.offsetHeight;
            popup.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
            popup.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
            popup.style.transform = 'none';
        });
        document.addEventListener('mouseup', () => { isDragging = false; popup.style.transition = ''; });
    }

    window.RoomYoutubeModule = { 
        install,
        invite: (uuid) => {
            if (userState !== 'LEADER' || groupState.invitedUuids.includes(uuid) || groupState.djUuids.includes(uuid)) return;
            groupState.invitedUuids.push(uuid);
            broadcastPermissionUpdate();
        },
        acceptInvite: () => {
             if (!groupState.invitedUuids.includes(myUuid)) return;
             peerManagerRef.sendToPeer(groupState.leaderUuid, {type: 'youtube-accept-invite', uuid: myUuid});
        },
        declineInvite: () => {
             if (!groupState.invitedUuids.includes(myUuid)) return;
             peerManagerRef.sendToPeer(groupState.leaderUuid, {type: 'youtube-decline-invite', uuid: myUuid});
        },
        cancelInvite: (uuid) => {
            if (userState !== 'LEADER') return;
            groupState.invitedUuids = groupState.invitedUuids.filter(id => id !== uuid);
            broadcastPermissionUpdate();
        },
        removeDj: (uuid) => {
            if (userState !== 'LEADER') return;
            groupState.djUuids = groupState.djUuids.filter(id => id !== uuid);
            broadcastPermissionUpdate();
        },
        leaveDj: () => {
            peerManagerRef.sendToPeer(groupState.leaderUuid, {type: 'youtube-leave-dj', uuid: myUuid});
        },
        setLeader: (uuid) => {
            if (userState !== 'LEADER') return;
            const oldLeader = myUuid;
            groupState.leaderUuid = uuid;
            groupState.djUuids = groupState.djUuids.filter(id => id !== uuid);
            if(!groupState.djUuids.includes(oldLeader)) groupState.djUuids.push(oldLeader); // Old leader becomes a DJ
            broadcastPermissionUpdate();
        }
    };
})();