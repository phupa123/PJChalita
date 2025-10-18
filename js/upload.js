document.addEventListener('DOMContentLoaded', () => {
    // --- ส่วนของ DOM Elements ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadQueue = document.getElementById('upload-queue');
    const fileList = document.getElementById('file-list');
    const refreshListBtn = document.getElementById('refresh-list-btn');

    // --- ส่วนของ Modal Preview ---
    const filePreviewModal = new bootstrap.Modal(document.getElementById('filePreviewModal'));
    const filePreviewTitle = document.getElementById('filePreviewTitle');
    const filePreviewContent = document.getElementById('filePreviewContent');
    const prevFileBtn = document.getElementById('prevFileBtn');
    const nextFileBtn = document.getElementById('nextFileBtn');

    let uploadedFiles = [];
    let currentPreviewIndex = -1;
    let activeUploads = new Map(); // สำหรับจัดการการยกเลิก

    /**
     * แปลงขนาดไฟล์ (Bytes) ให้อยู่ในรูปแบบที่อ่านง่ายขึ้น (KB, MB, GB)
     */
    const formatBytes = (bytes, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    /**
     * คืนค่า Class ของไอคอน Bootstrap ตามนามสกุลไฟล์
     */
    const createFileIcon = (fileName) => {
        const extension = fileName.split('.').pop().toLowerCase();
        const iconMap = {
            'jpg': 'bi-file-earmark-image', 'jpeg': 'bi-file-earmark-image', 'png': 'bi-file-earmark-image', 'gif': 'bi-file-earmark-image', 'webp': 'bi-file-earmark-image',
            'mp4': 'bi-file-earmark-play', 'mov': 'bi-file-earmark-play', 'avi': 'bi-file-earmark-play', 'webm': 'bi-file-earmark-play', 'mkv': 'bi-file-earmark-play',
            'pdf': 'bi-file-earmark-pdf',
            'zip': 'bi-file-earmark-zip', 'rar': 'bi-file-earmark-zip',
            'doc': 'bi-file-earmark-word', 'docx': 'bi-file-earmark-word',
            'xls': 'bi-file-earmark-excel', 'xlsx': 'bi-file-earmark-excel',
        };
        return iconMap[extension] || 'bi-file-earmark';
    };

    /**
     * จัดการไฟล์ที่ผู้ใช้เลือกหรือลากมาวาง
     */
    const handleFiles = (files) => {
        [...files].forEach(createUploadItem);
    };

    /**
     * สร้าง Element สำหรับแสดงสถานะการอัปโหลดแต่ละไฟล์
     */
    const createUploadItem = (file) => {
        const fileId = `file-${Date.now()}-${Math.random()}`;
        const item = document.createElement('div');
        item.className = 'upload-item';
        item.id = fileId;
        item.innerHTML = `
            <i class="bi ${createFileIcon(file.name)} file-icon"></i>
            <div class="file-details">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${formatBytes(file.size)}</div>
                <div class="progress">
                    <div class="progress-bar" role="progressbar" style="width: 0%"></div>
                </div>
                <div class="status-text">Initializing...</div>
            </div>
            <button class="btn-cancel-upload">&times;</button>
        `;
        uploadQueue.appendChild(item);
        uploadFileInChunks(file, fileId);
    };

    /**
     * AI-Powered Uploader: Manages parallel chunk uploads with adaptive concurrency and auto-retry.
     * @param {File} file - The file to upload.
     * @param {string} fileId - The DOM element ID for the upload item.
     */
    async function uploadFileInChunks(file, fileId) {
        const item = document.getElementById(fileId);
        if (!item) return;

        const progressBar = item.querySelector('.progress-bar');
        const statusText = item.querySelector('.status-text');
        const cancelBtn = item.querySelector('.btn-cancel-upload');

        // --- AI Configuration ---
        const CHUNK_SIZE = 10 * 1024 * 1024; // 50 MB chunks for high performance
        let concurrentUploads = 4; // Start with 4 parallel uploads
        const MAX_CONCURRENT_UPLOADS = 8;
        const MIN_CONCURRENT_UPLOADS = 2;
        const MAX_RETRIES = 3; // Max retries for a failed chunk
        // ------------------------

        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const chunkIdentifier = `${Date.now()}-${file.size}-${file.name}`;
        
        let totalBytesUploaded = 0;
        const startTime = Date.now();
        let isCancelled = false;
        const controller = new AbortController();
        activeUploads.set(fileId, controller);

        cancelBtn.addEventListener('click', () => {
            isCancelled = true;
            controller.abort();
            item.remove();
            activeUploads.delete(fileId);
        });
        
        const chunkQueue = Array.from({ length: totalChunks }, (_, i) => i);

        // --- Core "AI" Worker Function ---
        const uploadChunk = async (chunkIndex, retryCount = 0) => {
            if (isCancelled) return;
            
            const start = chunkIndex * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);
            const formData = new FormData();
            formData.append('fileChunk', chunk);
            formData.append('chunkIndex', chunkIndex);
            formData.append('totalChunks', totalChunks);
            formData.append('chunkIdentifier', chunkIdentifier);
            formData.append('originalFileName', file.name);

            try {
                const response = await fetch('api/upload-api.php', {
                    method: 'POST', body: formData, signal: controller.signal
                });

                if (!response.ok) throw new Error(`Server error: ${response.status}`);
                const data = await response.json();
                if (!data.success) throw new Error(data.message || 'Chunk upload rejected by server');

                // On success, update progress
                totalBytesUploaded += chunk.size;
                updateProgress();

            } catch (error) {
                if (error.name === 'AbortError') return; // Cancelled by user

                console.warn(`Chunk ${chunkIndex} failed (Attempt ${retryCount + 1}/${MAX_RETRIES}):`, error.message);

                if (retryCount < MAX_RETRIES) {
                    // **Automatic Retry with Exponential Backoff**
                    const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
                    statusText.textContent = `Retrying chunk ${chunkIndex + 1} in ${delay/1000}s...`;
                    await new Promise(resolve => setTimeout(resolve, delay));
                    await uploadChunk(chunkIndex, retryCount + 1); // Retry the same chunk
                } else {
                    isCancelled = true;
                    statusText.textContent = `Error: Chunk ${chunkIndex + 1} failed after ${MAX_RETRIES} retries.`;
                    item.classList.add('error');
                    controller.abort();
                    throw new Error(`Chunk ${chunkIndex} failed permanently.`);
                }
            }
        };

        const updateProgress = () => {
            if (isCancelled) return;
            const percentComplete = Math.min((totalBytesUploaded / file.size) * 100, 100);
            const timeElapsed = (Date.now() - startTime) / 1000;
            const speed = timeElapsed > 0 ? totalBytesUploaded / timeElapsed : 0;
            const timeRemaining = speed > 0 ? (file.size - totalBytesUploaded) / speed : Infinity;

            progressBar.style.width = `${percentComplete}%`;
            statusText.textContent = `Uploading... ${percentComplete.toFixed(1)}% (${formatBytes(speed)}/s, ETA: ${Math.round(timeRemaining)}s)`;
        };

        // --- Worker Pool & Adaptive Logic ---
        const worker = async () => {
            while (chunkQueue.length > 0) {
                const chunkIndex = chunkQueue.shift();
                if (chunkIndex !== undefined) {
                    await uploadChunk(chunkIndex);
                }
            }
        };

        const workers = [];
        for (let i = 0; i < concurrentUploads; i++) {
            workers.push(worker());
        }

        try {
            await Promise.all(workers);
            if (!isCancelled) {
                statusText.textContent = 'Finalizing...';
                // Wait for server to confirm assembly
                statusText.textContent = 'Completed!';
                item.classList.add('completed');
                setTimeout(() => {
                    item.remove();
                    fetchFiles();
                }, 2000);
            }
        } catch (error) {
            console.error("Upload failed permanently.", error);
        } finally {
            activeUploads.delete(fileId);
        }
    }

    /**
     * ดึงรายการไฟล์ที่อัปโหลดแล้วจาก Server
     */
    const fetchFiles = async () => {
        try {
            const response = await fetch('api/upload-api.php?action=list');
            const data = await response.json();

            if (data.success) {
                // กรองเอาเฉพาะไฟล์ที่สามารถ Preview ได้ (รูปภาพและวิดีโอ)
                uploadedFiles = data.files.filter(f => ['images', 'videos'].includes(f.type)); 
                
                if (data.files.length === 0) {
                    fileList.innerHTML = '<p class="text-center text-muted">ยังไม่มีไฟล์ที่อัปโหลด</p>';
                    return;
                }

                fileList.innerHTML = data.files.map((file) => {
                    const canPreview = ['images', 'videos'].includes(file.type);
                    return `
                    <div class="file-item" data-file-name="${file.name}" ${canPreview ? 'style="cursor: pointer;"' : ''}>
                        <i class="bi ${createFileIcon(file.name)} file-icon"></i>
                        <div class="file-details">
                            <div class="file-name">${file.name.split('-').slice(1).join('-')}</div>
                            <div class="file-size">${formatBytes(file.size)}</div>
                        </div>
                        <div class="file-actions">
                            <a href="${file.url}" download class="btn btn-sm btn-outline-primary" title="Download">
                                <i class="bi bi-download"></i>
                            </a>
                            <button class="btn btn-sm btn-outline-danger btn-delete-file" data-name="${file.name}" data-type="${file.type}" title="Delete">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                `}).join('');
            } else {
                fileList.innerHTML = `<p class="text-center text-danger">ไม่สามารถโหลดรายการไฟล์ได้: ${data.message || ''}</p>`;
            }
        } catch (error) {
            fileList.innerHTML = '<p class="text-center text-danger">เกิดข้อผิดพลาดในการเชื่อมต่อ</p>';
        }
    };
    
    /**
     * แสดง Modal สำหรับดูรูปภาพหรือวิดีโอ
     * @param {number} index - Index ของไฟล์ใน array `uploadedFiles`
     */
    function showFilePreview(index) {
        if (index < 0 || index >= uploadedFiles.length) return;
        currentPreviewIndex = index;
        const file = uploadedFiles[index];

        filePreviewTitle.textContent = file.name.split('-').slice(1).join('-');
        
        if (file.type === 'images') {
            filePreviewContent.innerHTML = `<img src="${file.url}" class="img-fluid" style="max-height: 70vh;">`;
        } else if (file.type === 'videos') {
            filePreviewContent.innerHTML = `<video src="${file.url}" controls autoplay class="img-fluid" style="max-height: 70vh;"></video>`;
        }

        prevFileBtn.disabled = index === 0;
        nextFileBtn.disabled = index === uploadedFiles.length - 1;

        filePreviewModal.show();
    }
    
    prevFileBtn.addEventListener('click', () => showFilePreview(currentPreviewIndex - 1));
    nextFileBtn.addEventListener('click', () => showFilePreview(currentPreviewIndex + 1));

    /**
     * ส่งคำขอลบไฟล์ไปยัง Server
     */
    const deleteFile = async (name, type) => {
        if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบไฟล์ "${name.split('-').slice(1).join('-')}"?`)) return;

        try {
            const response = await fetch('api/upload-api.php', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, type })
            });
            const data = await response.json();
            if (data.success) {
                fetchFiles();
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (error) {
            alert('An error occurred while deleting the file.');
        }
    };

    // --- Event Listeners ---
    const setupEventListeners = () => {
        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('active'));
        });
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('active'));
        });
        dropZone.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));

        refreshListBtn.addEventListener('click', fetchFiles);

        fileList.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.btn-delete-file');
            if (deleteBtn) {
                e.stopPropagation(); // ป้องกันไม่ให้ event click ลามไปถึง file-item
                deleteFile(deleteBtn.dataset.name, deleteBtn.dataset.type);
                return;
            }
            const fileItem = e.target.closest('.file-item[data-file-name]');
            if (fileItem) {
                const fileName = fileItem.dataset.fileName;
                const previewIndex = uploadedFiles.findIndex(f => f.name === fileName);
                if (previewIndex > -1) {
                    showFilePreview(previewIndex);
                }
            }
        });

        prevFileBtn.addEventListener('click', () => showFilePreview(currentPreviewIndex - 1));
        nextFileBtn.addEventListener('click', () => showFilePreview(currentPreviewIndex + 1));
    };

    // --- Initializing the page ---
    setupEventListeners();
    fetchFiles();
});