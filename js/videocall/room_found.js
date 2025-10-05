document.addEventListener('DOMContentLoaded', () => {
    const roomList = document.getElementById('room-list');
    const createRoomForm = document.getElementById('createRoomForm');
    const roomTypeSelect = document.getElementById('room_type');
    const passwordGroup = document.getElementById('private-password-group');
    const portalOverlay = document.getElementById('portal-overlay');
    const portalText = portalOverlay ? portalOverlay.querySelector('.portal-overlay__text') : null;
    const portalKeyIcon = portalOverlay ? portalOverlay.querySelector('.portal-overlay__icon--key') : null;

    const headingTitleEl = document.querySelector('[data-heading-title]');
    const headingSubtitleEl = document.querySelector('[data-heading-subtitle]');
    const headingActionEl = document.querySelector('[data-heading-action-label]');
    const backHomeLabelEl = document.querySelector('[data-back-home-label]');

    const API_URL = 'api/videocall-api.php';

    if (!roomList || !createRoomForm || !roomTypeSelect || !passwordGroup) {
        return;
    }

    const TEXT = Object.freeze({
        title: '\u0e2a\u0e33\u0e23\u0e27\u0e08\u0e2b\u0e49\u0e2d\u0e07\u0e2a\u0e19\u0e17\u0e19\u0e32\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14',
        subtitle: '\u0e40\u0e02\u0e49\u0e32\u0e23\u0e48\u0e27\u0e21\u0e2a\u0e19\u0e17\u0e19\u0e32\u0e1c\u0e48\u0e32\u0e19\u0e27\u0e34\u0e14\u0e35\u0e42\u0e2d\u0e44\u0e14\u0e49\u0e17\u0e31\u0e19\u0e17\u0e35 \u0e2b\u0e23\u0e37\u0e2d\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e2b\u0e49\u0e2d\u0e07\u0e43\u0e2b\u0e21\u0e48\u0e2a\u0e33\u0e2b\u0e23\u0e31\u0e1a\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e19\u0e02\u0e2d\u0e07\u0e04\u0e38\u0e13',
        action: '\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e2b\u0e49\u0e2d\u0e07\u0e17\u0e31\u0e19\u0e17\u0e35',
        backHome: '\u0e01\u0e25\u0e31\u0e1a\u0e2b\u0e19\u0e49\u0e32\u0e41\u0e23\u0e01',
        portal: '\u0e01\u0e33\u0e25\u0e31\u0e07\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e15\u0e48\u0e2d...',
        portalUnlock: '\u0e1b\u0e25\u0e14\u0e25\u0e47\u0e2d\u0e01\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08 \u0e01\u0e33\u0e25\u0e31\u0e07\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e2b\u0e49\u0e2d\u0e07...',
        loading: '\u0e01\u0e33\u0e25\u0e31\u0e07\u0e42\u0e2b\u0e25\u0e14\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e2b\u0e49\u0e2d\u0e07...',
        empty: '\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e2b\u0e49\u0e2d\u0e07\u0e17\u0e35\u0e48\u0e40\u0e1b\u0e34\u0e14\u0e2d\u0e22\u0e39\u0e48 \u0e25\u0e2d\u0e07\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e2b\u0e49\u0e2d\u0e07\u0e41\u0e23\u0e01\u0e02\u0e2d\u0e07\u0e04\u0e38\u0e13\u0e40\u0e25\u0e22!',
        error: '\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e42\u0e2b\u0e25\u0e14\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e2b\u0e49\u0e2d\u0e07\u0e44\u0e14\u0e49 \u0e01\u0e23\u0e38\u0e13\u0e32\u0e25\u0e2d\u0e07\u0e43\u0e2b\u0e21\u0e48\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07',
        join: '\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e2b\u0e49\u0e2d\u0e07',
        manage: '\u0e08\u0e31\u0e14\u0e01\u0e32\u0e23',
        ownerLabel: '\u0e40\u0e08\u0e49\u0e32\u0e02\u0e2d\u0e07\u0e2b\u0e49\u0e2d\u0e07',
        ownerRankPrefix: '\u0e2d\u0e31\u0e19\u0e14\u0e31\u0e1a',
        unknownOwner: '\u0e44\u0e21\u0e48\u0e23\u0e30\u0e1a\u0e38',
        unknownRoomName: '\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e0a\u0e37\u0e48\u0e2d\u0e2b\u0e49\u0e2d\u0e07',
        limitLabel: '\u0e08\u0e33\u0e19\u0e27\u0e19\u0e1c\u0e39\u0e49\u0e40\u0e02\u0e49\u0e32\u0e23\u0e48\u0e27\u0e21',
        passwordTitle: '\u0e2b\u0e49\u0e2d\u0e07\u0e19\u0e35\u0e49\u0e15\u0e49\u0e2d\u0e07\u0e43\u0e0a\u0e49\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19',
        passwordDescription: '\u0e1b\u0e49\u0e2d\u0e19\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e40\u0e02\u0e49\u0e32\u0e23\u0e48\u0e27\u0e21\u0e2b\u0e49\u0e2d\u0e07\u0e17\u0e35\u0e48\u0e25\u0e47\u0e2d\u0e01\u0e44\u0e27\u0e49',
        passwordLabel: '\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19',
        passwordSubmit: '\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19',
        passwordCancel: '\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01',
        passwordError: '\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19\u0e44\u0e21\u0e48\u0e16\u0e39\u0e01\u0e15\u0e49\u0e2d\u0e07 \u0e01\u0e23\u0e38\u0e13\u0e32\u0e25\u0e2d\u0e07\u0e43\u0e2b\u0e21\u0e48\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07',
        manageTitle: '\u0e41\u0e01\u0e49\u0e44\u0e02\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e2b\u0e49\u0e2d\u0e07',
        manageNameLabel: '\u0e0a\u0e37\u0e48\u0e2d\u0e2b\u0e49\u0e2d\u0e07',
        manageDescriptionLabel: '\u0e04\u0e33\u0e2d\u0e18\u0e34\u0e1a\u0e32\u0e22',
        manageTypeLabel: '\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17',
        manageLimitLabel: '\u0e08\u0e33\u0e19\u0e27\u0e19\u0e2a\u0e21\u0e32\u0e0a\u0e34\u0e01\u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14',
        managePasswordLabel: '\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19 (\u0e2a\u0e33\u0e23\u0e31\u0e1a\u0e2b\u0e49\u0e2d\u0e07\u0e2a\u0e48\u0e27\u0e19\u0e15\u0e31\u0e27)',
        manageDelete: '\u0e25\u0e1b\u0e2b\u0e49\u0e2d\u0e07',
        manageCancel: '\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01',
        manageSave: '\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01',
        deleteConfirm: '\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e25\u0e1a\u0e2b\u0e49\u0e2d\u0e07\u0e19\u0e35\u0e49\u0e2b\u0e23\u0e37\u0e2d\u0e44\u0e21\u0e48?',
        success: '\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e2b\u0e49\u0e2d\u0e07\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08',
        failurePrefix: '\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e2b\u0e49\u0e2d\u0e07\u0e44\u0e14\u0e49: ',
        submitError: '\u0e40\u0e01\u0e34\u0e14\u0e02\u0e49\u0e2d\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14 \u0e01\u0e23\u0e38\u0e13\u0e32\u0e25\u0e2d\u0e07\u0e43\u0e2b\u0e21\u0e48\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07',
        fallback: '\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14\u0e2a\u0e33\u0e23\u0e31\u0e1a\u0e2b\u0e49\u0e2d\u0e07\u0e19\u0e35\u0e49'
    });

    const RANK_LABELS = Object.freeze({
        Owner: 'Owner',
        Admin: 'Admin',
        Staff: 'Staff',
        Member: 'Member'
    });

    const STATE_ICONS = Object.freeze({
        empty: '<i class="bi bi-collection-play"></i>',
        error: '<i class="bi bi-cloud-slash"></i>'
    });

    if (headingTitleEl) headingTitleEl.textContent = TEXT.title;
    if (headingSubtitleEl) headingSubtitleEl.textContent = TEXT.subtitle;
    if (headingActionEl) headingActionEl.textContent = TEXT.action;
    if (backHomeLabelEl) backHomeLabelEl.textContent = TEXT.backHome;
    if (portalText) portalText.textContent = TEXT.portal;

    const passwordModal = document.getElementById('roomPasswordModal');
    const passwordForm = document.getElementById('roomPasswordForm');
    const passwordInput = document.getElementById('room-password-input');
    const passwordError = document.getElementById('room-password-error');

    const manageModalEl = document.getElementById('manageRoomModal');
    const manageForm = document.getElementById('manageRoomForm');
    const manageRoomUuidInput = document.getElementById('manage-room-uuid');
    const manageNameInput = document.getElementById('manage-room-name');
    const manageDescriptionInput = document.getElementById('manage-room-description');
    const manageTypeSelect = document.getElementById('manage-room-type');
    const manageLimitInput = document.getElementById('manage-room-limit');
    const managePasswordInput = document.getElementById('manage-room-password');
    const managePasswordGroup = document.getElementById('manage-room-password-group');
    const manageError = document.getElementById('manage-room-error');
    const manageDeleteBtn = document.getElementById('manageRoomDeleteBtn');

    const passwordModalInstance = passwordModal && window.bootstrap ? window.bootstrap.Modal.getOrCreateInstance(passwordModal) : null;
    const manageModalInstance = manageModalEl && window.bootstrap ? window.bootstrap.Modal.getOrCreateInstance(manageModalEl) : null;

    if (passwordModal) {
        const titleEl = passwordModal.querySelector('[data-password-title]');
        const descEl = passwordModal.querySelector('[data-password-description]');
        const labelEl = passwordModal.querySelector('[data-password-label]');
        const submitEl = passwordModal.querySelector('[data-password-submit]');
        const cancelEl = passwordModal.querySelector('[data-password-cancel]');
        if (titleEl) titleEl.textContent = TEXT.passwordTitle;
        if (descEl) descEl.textContent = TEXT.passwordDescription;
        if (labelEl) labelEl.textContent = TEXT.passwordLabel;
        if (submitEl) submitEl.textContent = TEXT.passwordSubmit;
        if (cancelEl) cancelEl.textContent = TEXT.passwordCancel;
    }

    if (manageModalEl) {
        const titleEl = manageModalEl.querySelector('[data-manage-title]');
        const nameLabel = manageModalEl.querySelector('[data-manage-name-label]');
        const descLabel = manageModalEl.querySelector('[data-manage-description-label]');
        const typeLabel = manageModalEl.querySelector('[data-manage-type-label]');
        const limitLabel = manageModalEl.querySelector('[data-manage-limit-label]');
        const passLabel = manageModalEl.querySelector('[data-manage-password-label]');
        const cancelBtn = manageModalEl.querySelector('[data-manage-cancel]');
        const saveBtn = manageModalEl.querySelector('[data-manage-save]');
        const deleteBtn = manageModalEl.querySelector('[data-manage-delete]');
        if (titleEl) titleEl.textContent = TEXT.manageTitle;
        if (nameLabel) nameLabel.textContent = TEXT.manageNameLabel;
        if (descLabel) descLabel.textContent = TEXT.manageDescriptionLabel;
        if (typeLabel) typeLabel.textContent = TEXT.manageTypeLabel;
        if (limitLabel) limitLabel.textContent = TEXT.manageLimitLabel;
        if (passLabel) passLabel.textContent = TEXT.managePasswordLabel;
        if (cancelBtn) cancelBtn.textContent = TEXT.manageCancel;
        if (saveBtn) saveBtn.textContent = TEXT.manageSave;
        if (deleteBtn) deleteBtn.textContent = TEXT.manageDelete;
    }

    const REFRESH_INTERVAL = 10000;
    const REFRESH_COUNT_INTERVAL = 5000; // poll counts more often
    let refreshTimer = null;
    let countTimer = null;
    let isInitialLoad = true;
    let isLoadingRoom = false;
    let roomsByUuid = new Map();
    let pendingJoin = null;

    function scheduleRefresh() {
        clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(fetchRooms, REFRESH_INTERVAL);
    }

    function stopRefresh() {
        clearTimeout(refreshTimer);
        refreshTimer = null;
    }

    function startCountRefresh(){
        if(countTimer) return;
        countTimer = setInterval(fetchRoomCounts, REFRESH_COUNT_INTERVAL);
    }

    function stopCountRefresh(){
        if(!countTimer) return;
        clearInterval(countTimer);
        countTimer = null;
    }

    async function fetchRoomCounts(){
        // lightweight fetch to update just member counts in existing cards
        try{
            const response = await fetch(`${API_URL}?action=get_rooms`, { cache: 'no-store' });
            if(!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if(data.status === 'success' && Array.isArray(data.rooms)){
                updateCountsFromRooms(data.rooms);
            }
        }catch(err){
            // silent fail - keep existing counts until next poll
            // console.debug('fetchRoomCounts failed', err);
        }
    }

    function updateCountsFromRooms(rooms){
        if(!roomList || !rooms) return;
        rooms.forEach(room=>{
            try{
                const selector = `.room-card[data-room-uuid="${room.room_uuid}"] .room-card__count`;
                const el = roomList.querySelector(selector);
                if(el){
                    el.innerHTML = `<i class="bi bi-people-fill" aria-hidden="true"></i> ${room.member_count || 0}/${room.member_limit || 0}`;
                }
            }catch(e){ /* ignore per-room errors */ }
        });
    }

    async function fetchRooms() {
        if (isLoadingRoom) return;
        if (isInitialLoad) showLoading();
        try {
            const response = await fetch(`${API_URL}?action=get_rooms`, { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (data.status === 'success' && Array.isArray(data.rooms) && data.rooms.length) {
                renderRooms(data.rooms);
            } else if (data.status === 'success') {
                showState('empty', TEXT.empty);
            } else {
                showState('error', data.message || TEXT.error);
            }
        } catch (error) {
            console.error('fetch rooms failed', error);
            showState('error', TEXT.error);
        } finally {
            isInitialLoad = false;
            scheduleRefresh();
            // start lightweight count updates once we have initial render
            startCountRefresh();
        }
    }

    function showLoading() {
        roomList.innerHTML = `
            <div class="room-loading">
                <span class="room-loading__spinner" aria-hidden="true"></span>
                <p>${TEXT.loading}</p>
            </div>
        `;
        roomsByUuid = new Map();
    }

    function showState(type, message) {
        const icon = STATE_ICONS[type] ? `<div class="room-state__icon">${STATE_ICONS[type]}</div>` : '';
        roomList.innerHTML = `
            <div class="room-state room-state--${type}">
                ${icon}
                <p>${message}</p>
            </div>
        `;
        roomsByUuid = new Map();
    }

    function renderRooms(rooms) {
        roomsByUuid = new Map(rooms.map(room => [room.room_uuid, room]));
        const markup = rooms.map(buildRoomCard).join('');
        roomList.innerHTML = markup;
        requestAnimationFrame(animateCards);
    }

    function buildRoomCard(room) {
        const name = escapeHTML(room.room_name || TEXT.unknownRoomName);
        const description = room.description ? escapeHTML(room.description) : TEXT.fallback;
        const isPrivate = room.room_type === 'private';
        const lockIcon = isPrivate ? '<i class="bi bi-lock-fill ms-2" aria-hidden="true"></i>' : '';
        const manageButton = room.can_manage ? `
            <button type="button" class="btn btn-outline-light btn-sm room-card__manage" data-room-manage="${room.room_uuid}">
                <i class="bi bi-sliders2" aria-hidden="true"></i>
                <span>${TEXT.manage}</span>
            </button>
        ` : '';
        const joinHref = `room.php?id=${encodeURIComponent(room.room_uuid)}`;
        const ownerRank = RANK_LABELS[room.creator_rank] || room.creator_rank || '';
        const ownerSummary = ownerRank ? `${TEXT.ownerLabel} • ${ownerRank}` : TEXT.ownerLabel;
        // --- จุดที่แก้ไข ---
        const avatarImg = `<img src="${escapeHTML(room.creator_avatar_url)}" alt="Creator Avatar" class="room-card__owner-img">`;
        return `
            <article class="room-card" data-room-uuid="${room.room_uuid}">
                <header class="room-card__header">
                    <div class="room-card__header-main">
                        <h5 class="room-card__title">${name}${lockIcon}</h5>
                        <p class="room-card__description">${description}</p>
                    </div>
                    ${manageButton}
                </header>
                <div class="room-card__owner">
                    <div class="room-card__owner-avatar">${avatarImg}</div>
                    <div class="room-card__owner-meta">
                        <span class="room-card__owner-label">${ownerSummary}</span>
                        <span class="room-card__owner-name">${escapeHTML(room.creator_name || TEXT.unknownOwner)}</span>
                    </div>
                </div>
                <div class="room-card__meta">
                    <span class="room-card__count"><i class="bi bi-people-fill" aria-hidden="true"></i> ${room.member_count || 0}/${room.member_limit || 0}</span>
                    <a href="${joinHref}" class="btn btn-primary btn-sm room-card__cta" data-room-href="${joinHref}">${TEXT.join}</a>
                </div>
            </article>
        `;
    }

    function animateCards() {
        roomList.querySelectorAll('.room-card').forEach((card, index) => {
            card.style.setProperty('--card-delay', `${index * 70}ms`);
            card.classList.add('animate-in');
        });
    }

    roomList.addEventListener('click', event => {
        const manageTrigger = event.target.closest('[data-room-manage]');
        if (manageTrigger) {
            const uuid = manageTrigger.getAttribute('data-room-manage');
            const room = roomsByUuid.get(uuid);
            if (room) openManageModal(room);
            return;
        }
        const joinTrigger = event.target.closest('[data-room-href]');
        if (joinTrigger) {
            event.preventDefault();
            const card = joinTrigger.closest('.room-card');
            const uuid = card ? card.getAttribute('data-room-uuid') : null;
            const room = uuid ? roomsByUuid.get(uuid) : null;
            handleJoin(room, joinTrigger.getAttribute('data-room-href'), card);
        }
    });

    function handleJoin(room, url, card) {
        if (!room || !url) return;
        if (room.room_type === 'private') {
            pendingJoin = { room, url, card };
            if (passwordError) passwordError.classList.add('d-none');
            if (passwordForm) passwordForm.reset();
            if (passwordModalInstance) passwordModalInstance.show();
            if (passwordInput) setTimeout(() => passwordInput.focus(), 120);
        } else {
            playPortalTransition(url, card, false);
        }
    }

    if (passwordForm) {
        passwordForm.addEventListener('submit', async event => {
            event.preventDefault();
            if (!pendingJoin || !passwordInput) return;
            const value = passwordInput.value.trim();
            if (!value) {
                if (passwordError) {
                    passwordError.textContent = TEXT.passwordError;
                    passwordError.classList.remove('d-none');
                }
                return;
            }
            const payload = new FormData();
            payload.append('action', 'verify_room_password');
            payload.append('room_uuid', pendingJoin.room.room_uuid);
            payload.append('password', value);
            try {
                setPasswordFormDisabled(true);
                const response = await fetch(API_URL, { method: 'POST', body: payload });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                if (data.status === 'success') {
                    if (passwordModalInstance) passwordModalInstance.hide();
                    playPortalTransition(pendingJoin.url, pendingJoin.card, true);
                    pendingJoin = null;
                } else {
                    if (passwordError) {
                        passwordError.textContent = data.message || TEXT.passwordError;
                        passwordError.classList.remove('d-none');
                    }
                }
            } catch (error) {
                console.error('verify password failed', error);
                if (passwordError) {
                    passwordError.textContent = TEXT.passwordError;
                    passwordError.classList.remove('d-none');
                }
            } finally {
                setPasswordFormDisabled(false);
            }
        });
    }

    function setPasswordFormDisabled(disabled) {
        if (!passwordForm) return;
        Array.from(passwordForm.elements).forEach(el => { el.disabled = disabled; });
    }

    function openManageModal(room) {
        if (!manageModalInstance || !manageForm) return;
        manageForm.reset();
        if (manageRoomUuidInput) manageRoomUuidInput.value = room.room_uuid;
        if (manageNameInput) manageNameInput.value = room.room_name || '';
        if (manageDescriptionInput) manageDescriptionInput.value = room.description || '';
        if (manageTypeSelect) manageTypeSelect.value = room.room_type || 'public';
        if (manageLimitInput) manageLimitInput.value = room.member_limit || 10;
        if (managePasswordInput) managePasswordInput.value = '';
        if (manageError) manageError.classList.add('d-none');
        updateManagePasswordGroup();
        manageModalInstance.show();
    }

    function updateManagePasswordGroup() {
        if (!managePasswordGroup || !manageTypeSelect) return;
        const isPrivate = manageTypeSelect.value === 'private';
        managePasswordGroup.classList.toggle('d-none', !isPrivate);
        if (!isPrivate && managePasswordInput) managePasswordInput.value = '';
    }

    if (manageTypeSelect) {
        manageTypeSelect.addEventListener('change', updateManagePasswordGroup);
    }

    if (manageForm) {
        manageForm.addEventListener('submit', async event => {
            event.preventDefault();
            const uuid = manageRoomUuidInput ? manageRoomUuidInput.value : '';
            if (!uuid) return;
            const payload = new FormData();
            payload.append('action', 'update_room');
            payload.append('room_uuid', uuid);
            if (manageNameInput) payload.append('room_name', manageNameInput.value.trim());
            if (manageDescriptionInput) payload.append('description', manageDescriptionInput.value.trim());
            if (manageTypeSelect) payload.append('room_type', manageTypeSelect.value);
            if (manageLimitInput) payload.append('member_limit', manageLimitInput.value);
            if (managePasswordInput && manageTypeSelect && manageTypeSelect.value === 'private' && managePasswordInput.value.trim()) {
                payload.append('password', managePasswordInput.value.trim());
            }
            try {
                setManageFormDisabled(true);
                const response = await fetch(API_URL, { method: 'POST', body: payload });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                if (data.status === 'success') {
                    manageModalInstance.hide();
                    fetchRooms();
                } else if (manageError) {
                    manageError.textContent = data.message || TEXT.error;
                    manageError.classList.remove('d-none');
                }
            } catch (error) {
                console.error('update room failed', error);
                if (manageError) {
                    manageError.textContent = TEXT.error;
                    manageError.classList.remove('d-none');
                }
            } finally {
                setManageFormDisabled(false);
            }
        });
    }

    if (manageDeleteBtn) {
        manageDeleteBtn.addEventListener('click', async () => {
            const uuid = manageRoomUuidInput ? manageRoomUuidInput.value : '';
            if (!uuid || !confirm(TEXT.deleteConfirm)) return;
            const payload = new FormData();
            payload.append('action', 'delete_room');
            payload.append('room_uuid', uuid);
            try {
                setManageFormDisabled(true);
                const response = await fetch(API_URL, { method: 'POST', body: payload });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                if (data.status === 'success') {
                    manageModalInstance.hide();
                    fetchRooms();
                } else if (manageError) {
                    manageError.textContent = data.message || TEXT.error;
                    manageError.classList.remove('d-none');
                }
            } catch (error) {
                console.error('delete room failed', error);
                if (manageError) {
                    manageError.textContent = TEXT.error;
                    manageError.classList.remove('d-none');
                }
            } finally {
                setManageFormDisabled(false);
            }
        });
    }

    function setManageFormDisabled(disabled) {
        if (!manageForm) return;
        Array.from(manageForm.elements).forEach(el => { el.disabled = disabled; });
        if (manageDeleteBtn) manageDeleteBtn.disabled = disabled;
    }

    function playPortalTransition(url, card, unlock) {
        isLoadingRoom = true;
        stopRefresh();
        if (card) card.classList.add('portal-transition');
        if (portalOverlay) {
            portalOverlay.classList.remove('hidden');
            portalOverlay.classList.add('active');
        }
        if (portalText) portalText.textContent = unlock ? TEXT.portalUnlock : TEXT.portal;
        if (portalKeyIcon) portalKeyIcon.classList.toggle('hidden', !unlock);
        document.body.classList.add('portal-active');
        setTimeout(() => { window.location.href = url; }, 900);
    }

    roomTypeSelect.addEventListener('change', () => {
        passwordGroup.style.display = roomTypeSelect.value === 'private' ? 'block' : 'none';
    });
    passwordGroup.style.display = roomTypeSelect.value === 'private' ? 'block' : 'none';

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopRefresh();
            stopCountRefresh();
        } else {
            fetchRooms();
            startCountRefresh();
        }
    });

    window.addEventListener('focus', () => {
        fetchRooms();
    });

    createRoomForm.addEventListener('submit', async event => {
        event.preventDefault();
        const payload = new FormData(createRoomForm);
        payload.append('action', 'create_room');
        try {
            const response = await fetch(API_URL, { method: 'POST', body: payload });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (data.status === 'success' && data.room_uuid) {
                alert(TEXT.success);
                window.location.href = `room.php?id=${encodeURIComponent(data.room_uuid)}`;
            } else {
                alert(TEXT.failurePrefix + (data.message || ''));
            }
        } catch (error) {
            console.error('create room failed', error);
            alert(TEXT.submitError);
        }
    });

    function escapeHTML(str = '') {
        return String(str).replace(/[&<>"']/g, match => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            '\'': '&#39;'
        })[match]);
    }

    fetchRooms();
});