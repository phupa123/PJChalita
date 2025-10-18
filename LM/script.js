document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const appTitle = document.querySelector('h1');
    const tabsContainer = document.getElementById('tabs-container');
    const newProjectBtn = document.getElementById('new-project-btn');
    const mediaContainer = document.getElementById('media-container');
    const imageUpload = document.getElementById('imageUpload');
    const videoUpload = document.getElementById('videoUpload');
    const folderUpload = document.getElementById('folderUpload');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const saveZipBtn = document.getElementById('save-zip-btn');
    const selectionInfoBar = document.getElementById('selection-info-bar');
    const selectionDetails = document.getElementById('selection-details');
    const deleteSelectedBtn = document.getElementById('delete-selected-btn');
    const confirmModal = document.getElementById('confirm-modal');
    const modalText = document.getElementById('modal-text');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');

    // --- IndexedDB Helper ---
    const DB_NAME = 'MediaOrganizerDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'mediaFiles';
    let db;

    function initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = (event) => reject("Database error: " + event.target.errorCode);
            request.onsuccess = (event) => {
                db = event.target.result;
                resolve(db);
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }

    function storeFile(file) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add({ file: file });
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject('Could not store file: ' + event.target.error);
        });
    }

    function getFile(id) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME]);
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result ? request.result.file : null);
            request.onerror = (event) => reject('Could not retrieve file: ' + event.target.error);
        });
    }
    
    function deleteFile(id) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject('Could not delete file: ' + event.target.error);
        });
    }

    // --- App State ---
    let state = {
        projects: {},
        activeProjectId: null,
    };

    // --- Helper Functions ---
    const generateId = () => `proj_${Date.now()}`;
    const formatBytes = (bytes, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    // --- State Management ---
    const saveState = () => {
        localStorage.setItem('mediaOrganizerState', JSON.stringify(state));
    };

    const loadState = () => {
        const savedState = localStorage.getItem('mediaOrganizerState');
        if (savedState) {
            state = JSON.parse(savedState);
        } else {
            const defaultId = generateId();
            state.projects[defaultId] = { name: "โปรเจกต์แรก", media: [] };
            state.activeProjectId = defaultId;
            saveState();
        }
    };

    // --- Rendering Functions ---
    const render = () => {
        if (!state.activeProjectId || !state.projects[state.activeProjectId]) {
            const remainingProjectIds = Object.keys(state.projects);
            state.activeProjectId = remainingProjectIds.length > 0 ? remainingProjectIds[0] : null;
            if (!state.activeProjectId) {
                newProject();
                return;
            }
        }
        renderTabs();
        renderMedia();
        updateSelectionInfo();
    };
    
    const renderTabs = () => {
        tabsContainer.innerHTML = '';
        Object.keys(state.projects).forEach(id => {
            const project = state.projects[id];
            const tab = document.createElement('div');
            tab.className = `tab ${id === state.activeProjectId ? 'active' : ''}`;
            tab.dataset.id = id;

            const tabName = document.createElement('span');
            tabName.className = 'tab-name';
            tabName.textContent = project.name;
            tabName.contentEditable = true;
            tabName.addEventListener('blur', (e) => renameProject(id, e.target.textContent));
            tabName.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur();
                }
            });

            const closeBtn = document.createElement('button');
            closeBtn.className = 'tab-close-btn';
            closeBtn.innerHTML = '&times;';
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                deleteProject(id);
            };

            tab.appendChild(tabName);
            tab.appendChild(closeBtn);
            tab.onclick = () => switchProject(id);
            tabsContainer.appendChild(tab);
        });
    };
    
    const renderMedia = async () => {
        const activeProject = state.projects[state.activeProjectId];
        appTitle.textContent = activeProject ? activeProject.name : "ไม่มีโปรเจกต์";
        mediaContainer.innerHTML = '';
        if (!activeProject) return;

        for (const [index, mediaData] of activeProject.media.entries()) {
            const file = await getFile(mediaData.dbKey);
            if (file) {
                createMediaElement(file, mediaData, index);
            } else {
                console.error(`File with dbKey ${mediaData.dbKey} not found in IndexedDB.`);
            }
        }
    };

    const createMediaElement = (file, mediaData, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'media-wrapper';
        wrapper.dataset.index = index;

        const objectURL = URL.createObjectURL(file);

        let mediaElement;
        if (file.type.startsWith('image/')) {
            mediaElement = document.createElement('img');
        } else {
            mediaElement = document.createElement('video');
            Object.assign(mediaElement, { muted: true, autoplay: true, loop: true, playsInline: true });
        }
        mediaElement.src = objectURL;
        mediaElement.className = 'media-item';

        const orderNumber = document.createElement('span');
        orderNumber.className = 'media-order-number';
        orderNumber.textContent = index + 1;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'media-delete-btn';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            const itemIndex = parseInt(wrapper.dataset.index, 10);
            const itemToDelete = state.projects[state.activeProjectId].media[itemIndex];
            showConfirmation(`คุณต้องการลบไฟล์ "${itemToDelete.name}" ใช่หรือไม่?`, async () => {
                await deleteFile(itemToDelete.dbKey);
                state.projects[state.activeProjectId].media.splice(itemIndex, 1);
                saveState();
                render();
            });
        };
        
        wrapper.appendChild(orderNumber);
        wrapper.appendChild(deleteBtn);
        wrapper.appendChild(mediaElement);
        mediaContainer.appendChild(wrapper);
    };

    // --- Project Actions ---
    const newProject = () => {
        const name = prompt("กรุณาตั้งชื่อโปรเจกต์ใหม่:", `โปรเจกต์ ${Object.keys(state.projects).length + 1}`);
        if (name && name.trim()) {
            const id = generateId();
            state.projects[id] = { name: name.trim(), media: [] };
            state.activeProjectId = id;
            saveState();
            render();
        }
    };

    const switchProject = (id) => {
        if (id !== state.activeProjectId) {
            state.activeProjectId = id;
            saveState();
            render();
        }
    };

    const renameProject = (id, newName) => {
        if (newName && newName.trim() && state.projects[id].name !== newName) {
            state.projects[id].name = newName.trim();
            saveState();
            render();
        }
    };

    const deleteProject = (id) => {
        const project = state.projects[id];
        showConfirmation(`คุณต้องการลบโปรเจกต์ "${project.name}" ใช่หรือไม่?`, async () => {
            const mediaToDelete = project.media;
            for (const media of mediaToDelete) {
                await deleteFile(media.dbKey);
            }
            delete state.projects[id];
            saveState();
            render();
        });
    };

    // --- Media & Selection Actions ---
    const processFiles = (files) => {
        Array.from(files).forEach(async (file) => {
            if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
                try {
                    const dbKey = await storeFile(file);
                    const mediaData = {
                        dbKey: dbKey,
                        name: file.name,
                        type: file.type,
                        size: file.size,
                    };
                    const projectMedia = state.projects[state.activeProjectId].media;
                    projectMedia.push(mediaData);
                    createMediaElement(file, mediaData, projectMedia.length - 1);
                    saveState();
                } catch (error) {
                    console.error("Error processing file:", error);
                    alert("เกิดข้อผิดพลาดในการบันทึกไฟล์");
                }
            }
        });
    };

    const updateSelectionInfo = () => {
        const selectedItems = mediaContainer.querySelectorAll('.media-wrapper.selected');
        if (selectedItems.length === 0) {
            selectionInfoBar.classList.add('hidden');
            return;
        }
        let totalSize = 0;
        selectedItems.forEach(item => {
            const index = parseInt(item.dataset.index, 10);
            const mediaData = state.projects[state.activeProjectId].media[index];
            if (mediaData) totalSize += mediaData.size;
        });
        selectionDetails.textContent = `เลือก ${selectedItems.length} รายการ (${formatBytes(totalSize)})`;
        selectionInfoBar.classList.remove('hidden');
    };

    const deleteSelected = () => {
        const selectedWrappers = [...mediaContainer.querySelectorAll('.media-wrapper.selected')];
        if (selectedWrappers.length === 0) return;

        showConfirmation(`คุณต้องการลบ ${selectedWrappers.length} รายการที่เลือกใช่หรือไม่?`, async () => {
            const indicesToDelete = selectedWrappers.map(w => parseInt(w.dataset.index, 10)).sort((a, b) => b - a);
            
            const keysToDelete = indicesToDelete.map(index => state.projects[state.activeProjectId].media[index].dbKey);

            indicesToDelete.forEach(index => {
                state.projects[state.activeProjectId].media.splice(index, 1);
            });

            for (const key of keysToDelete) {
                await deleteFile(key);
            }

            saveState();
            render();
        });
    };
    
    const clearAllMedia = () => {
        const project = state.projects[state.activeProjectId];
        if (project.media.length === 0) return;
        showConfirmation('คุณต้องการลบไฟล์ทั้งหมดในโปรเจกต์นี้ใช่หรือไม่?', async () => {
            for (const media of project.media) {
                await deleteFile(media.dbKey);
            }
            project.media = [];
            saveState();
            render();
        });
    };

    // --- ZIP Function ---
    const saveAsZip = async () => {
        const project = state.projects[state.activeProjectId];
        if (!project || project.media.length === 0) {
            alert("ไม่มีไฟล์ให้บันทึก");
            return;
        }

        saveZipBtn.disabled = true;
        saveZipBtn.textContent = 'กำลังบีบอัด...';
        
        const zip = new JSZip();
        for (const [index, mediaData] of project.media.entries()) {
            const file = await getFile(mediaData.dbKey);
            if (file) {
                const newName = `${String(index + 1).padStart(2, '0')}_${mediaData.name}`;
                zip.file(newName, file);
            }
        }

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.name}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        saveZipBtn.disabled = false;
        saveZipBtn.textContent = 'บันทึกเป็น ZIP';
    };

    // --- Modal Logic ---
    let confirmCallback = null;
    const showConfirmation = (message, onConfirm) => {
        modalText.textContent = message;
        confirmCallback = onConfirm;
        confirmModal.classList.remove('hidden');
    };

    modalConfirmBtn.addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
        confirmModal.classList.add('hidden');
    });
    modalCancelBtn.addEventListener('click', () => {
        confirmModal.classList.add('hidden');
    });

    // --- Initializer & Event Listeners ---
    const init = async () => {
        try {
            await initDB();
            loadState();
            render();

            new Sortable(mediaContainer, {
                animation: 150,
                multiDrag: true,
                selectedClass: 'selected',
                onEnd: (evt) => {
                    const media = state.projects[state.activeProjectId].media;
                    const [movedItem] = media.splice(evt.oldIndex, 1);
                    media.splice(evt.newIndex, 0, movedItem);
                    saveState();
                    const wrappers = mediaContainer.querySelectorAll('.media-wrapper');
                    wrappers.forEach((wrapper, index) => {
                        wrapper.dataset.index = index;
                        const orderNumberEl = wrapper.querySelector('.media-order-number');
                        if (orderNumberEl) {
                            orderNumberEl.textContent = index + 1;
                        }
                    });
                },
                onSelect: updateSelectionInfo,
                onDeselect: updateSelectionInfo
            });
            
            // Button Listeners
            newProjectBtn.addEventListener('click', newProject);
            imageUpload.addEventListener('change', e => processFiles(e.target.files));
            videoUpload.addEventListener('change', e => processFiles(e.target.files));
            folderUpload.addEventListener('change', e => processFiles(e.target.files));
            clearAllBtn.addEventListener('click', clearAllMedia);
            deleteSelectedBtn.addEventListener('click', deleteSelected);
            saveZipBtn.addEventListener('click', saveAsZip);

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                window.addEventListener(eventName, e => {
                    e.preventDefault();
                    e.stopPropagation();
                }, false);
            });

            mediaContainer.addEventListener('dragenter', () => mediaContainer.classList.add('dragover'));
            mediaContainer.addEventListener('dragleave', () => mediaContainer.classList.remove('dragover'));
            mediaContainer.addEventListener('drop', e => {
                mediaContainer.classList.remove('dragover');
                processFiles(e.dataTransfer.files);
            });

        } catch (error) {
            console.error("Initialization failed:", error);
            alert("ไม่สามารถเริ่มต้นฐานข้อมูลได้ กรุณาลองรีเฟรชหน้าจอ");
        }
    };
    
    init(); // Start the app
});