/* Switch_Account.js
   - Manage quick-switch stored accounts in localStorage
   - Populate switch menu in navbar
   - Allow saving current logged-in account from profile page
*/

(() => {
    const STORAGE_KEY = 'pj_quick_accounts_v1';

    function readAccounts() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Failed to read quick accounts', e);
            return [];
        }
    }

    function writeAccounts(list) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    let editMode = false;
    function renderMenu() {
        const container = document.getElementById('switchAccountContent');
        if (!container) return;
        const accounts = readAccounts();
        container.innerHTML = '';

        if (!accounts.length) {
            container.innerHTML = '<div class="px-2 text-muted small">ยังไม่มีบัญชีบันทึกไว้</div>';
            const goLogin = document.createElement('a');
            goLogin.href = 'login.php';
            goLogin.className = 'btn btn-sm btn-outline-primary mt-2';
            goLogin.textContent = 'ไปที่หน้าเข้าสู่ระบบ';
            container.appendChild(goLogin);
            return;
        }

        const current = window.__CURRENT_ACCOUNT && window.__CURRENT_ACCOUNT.username ? window.__CURRENT_ACCOUNT.username : null;
        accounts.forEach(acc => {
            const item = document.createElement('div');
            item.className = 'd-flex align-items-center justify-content-between p-2';
            item.style.cursor = 'pointer';

            const left = document.createElement('div');
            left.className = 'd-flex align-items-center gap-2';
            left.innerHTML = `<img src="${acc.avatar}" alt="avatar" style="width:36px;height:36px;object-fit:cover;border-radius:6px;">`;
            const info = document.createElement('div');
            info.innerHTML = `<div style="font-weight:600">${acc.nickname || acc.username}</div><div class="small text-muted">@${acc.username}</div>`;
            left.appendChild(info);

            const actions = document.createElement('div');
            actions.className = 'd-flex gap-2 align-items-center';

            // Active check
            if (current && acc.username === current) {
                const check = document.createElement('span');
                check.className = 'badge bg-success';
                check.textContent = 'กำลังใช้';
                actions.appendChild(check);
            }

            if (!editMode) {
                const switchBtn = document.createElement('button');
                switchBtn.className = 'btn btn-sm btn-primary';
                switchBtn.textContent = 'สลับ';
                switchBtn.addEventListener('click', (e) => { e.stopPropagation(); startSwitch(acc); });
                actions.appendChild(switchBtn);
            } else {
                const removeBtn = document.createElement('button');
                removeBtn.className = 'btn btn-sm btn-outline-danger';
                removeBtn.textContent = 'ลบ';
                removeBtn.addEventListener('click', (e) => { e.stopPropagation(); removeAccount(acc.username); });
                actions.appendChild(removeBtn);
            }

            item.appendChild(left);
            item.appendChild(actions);
            container.appendChild(item);
        });
    }

    function removeAccount(username) {
        const list = readAccounts().filter(a => a.username !== username);
        writeAccounts(list);
        renderMenu();
    }

    function startSwitch(acc) {
        // Navigate to login page with prefill query param. The user must still enter password.
        const url = new URL(window.location.origin + '/PJChalita/login.php');
        url.searchParams.set('prefill', acc.username);
        window.location.href = url.toString();
    }

    function saveCurrentAccountFromPage() {
        // Try to read page meta info: data attributes on body or global JS vars
        // Expecting server to render window.__CURRENT_ACCOUNT with username, nickname, avatar
        const global = window.__CURRENT_ACCOUNT || null;
        if (!global) {
            // Try to read from DOM (profile page structure)
            const usernameEl = document.querySelector('.profile-summary h2') || document.querySelector('.profile-summary .user-welcome');
            const avatarEl = document.querySelector('#avatarPreview') || document.querySelector('.avatar-img') || document.querySelector('#indexAvatar');
            const username = usernameEl ? (usernameEl.textContent.trim() || null) : null;
            const avatar = avatarEl ? avatarEl.src : window.location.origin + '/PJChalita/images/default_profile.png';
            if (!username) { alert('ไม่พบข้อมูลบัญชีบนหน้านี้เพื่อบันทึก'); return; }
            const acct = { username: username.replace(/^@/, ''), nickname: username, avatar };
            addOrUpdateAccount(acct);
            return;
        }
        addOrUpdateAccount(global);
    }

    function addOrUpdateAccount(acc) {
        const list = readAccounts();
        const existing = list.find(a => a.username === acc.username);
        if (existing) {
            existing.nickname = acc.nickname || existing.nickname;
            existing.avatar = acc.avatar || existing.avatar;
        } else {
            list.unshift({ username: acc.username, nickname: acc.nickname || acc.username, avatar: acc.avatar || (window.location.origin + '/PJChalita/images/default_profile.png') });
            // Keep max 6
            if (list.length > 6) list.pop();
        }
        writeAccounts(list);
        renderMenu();
        alert('บันทึกบัญชีเรียบร้อย สามารถสลับได้จากเมนูบน');
    }

    // Attach save button on profile page
    document.addEventListener('DOMContentLoaded', () => {
        renderMenu();
        const saveBtn = document.getElementById('saveQuickAccountBtn');
        if (saveBtn) saveBtn.addEventListener('click', saveCurrentAccountFromPage);

        const addBtn = document.getElementById('addQuickAccountBtn');
        if (addBtn) addBtn.addEventListener('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('addAccountModal'));
            modal.show();
        });

        const editToggle = document.getElementById('editQuickAccountToggle');
        if (editToggle) editToggle.addEventListener('click', () => { editMode = !editMode; renderMenu(); editToggle.textContent = editMode ? 'เสร็จสิ้น' : 'แก้ไข'; });

        // Add account modal submit
        const addSubmit = document.getElementById('addAccountSubmit');
        if (addSubmit) addSubmit.addEventListener('click', () => {
            const form = document.getElementById('addAccountForm');
            const username = form.username.value.trim();
            const password = form.password.value;
            if (!username || !password) { alert('กรุณากรอกข้อมูลให้ครบ'); return; }

            // Create a hidden form to POST to login.php for immediate login
            const postForm = document.createElement('form');
            postForm.method = 'POST';
            postForm.action = '/PJChalita/login.php';
            postForm.style.display = 'none';
            const inputUser = document.createElement('input'); inputUser.name = 'login_identifier'; inputUser.value = username; postForm.appendChild(inputUser);
            const inputPass = document.createElement('input'); inputPass.name = 'password'; inputPass.value = password; postForm.appendChild(inputPass);
            document.body.appendChild(postForm);
            postForm.submit();
        });
    });

    // Expose for debugging
    window.PJQuickAccounts = { readAccounts, writeAccounts, renderMenu, saveCurrentAccountFromPage };
})();
