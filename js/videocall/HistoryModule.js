(function () {
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    async function handleDeleteClick(recordingId) {
        const result = await Swal.fire({
            title: 'คุณแน่ใจหรือไม่?',
            text: "ไฟล์ที่ลบแล้วจะไม่สามารถกู้คืนได้!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ใช่, ลบเลย!',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch('api/history-api.php', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: recordingId })
                });
                const res = await response.json();
                if (!response.ok || res.status !== 'success') throw new Error(res.message);
                
                Swal.fire('ลบแล้ว!', 'ไฟล์ของคุณถูกลบเรียบร้อย', 'success');
                showHistory(); // รีเฟรชรายการ
            } catch (error) {
                Swal.fire('ผิดพลาด', `ไม่สามารถลบไฟล์ได้: ${error.message}`, 'error');
            }
        }
    }

    function buildHistoryHtml(recordings) {
        if (recordings.length === 0) {
            return '<p class="text-center">ยังไม่มีประวัติการบันทึก</p>';
        }

        let tableRows = recordings.map(rec => {
            const isImage = rec.file_type === 'image';
            const icon = isImage ? 'bi-file-earmark-image' : 'bi-file-earmark-play';
            const folder = isImage ? 'images' : 'videos';
            const filePath = `uploads/recordings/${folder}/${rec.file_name}`;
            return `
                <tr>
                    <td><i class="bi ${icon}"></i> ${isImage ? 'รูปภาพ' : 'วิดีโอ'}</td>
                    <td>${rec.file_name}</td>
                    <td>${formatBytes(rec.file_size)}</td>
                    <td>${new Date(rec.created_at).toLocaleString('th-TH')}</td>
                    <td>
                        <a href="${filePath}" download class="btn btn-sm btn-primary" title="ดาวน์โหลด"><i class="bi bi-download"></i></a>
                        <button class="btn btn-sm btn-danger delete-rec-btn" data-id="${rec.id}" title="ลบ"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>ประเภท</th>
                            <th>ชื่อไฟล์</th>
                            <th>ขนาด</th>
                            <th>วันที่</th>
                            <th>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
    }

    async function showHistory() {
        try {
            Swal.fire({
                title: 'กำลังโหลดประวัติ...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const response = await fetch('api/history-api.php');
            const res = await response.json();

            if (!response.ok || res.status !== 'success') throw new Error(res.message);

            const historyHtml = buildHistoryHtml(res.data);

            Swal.fire({
                title: 'ประวัติการบันทึก',
                html: historyHtml,
                width: '80vw',
                customClass: {
                    htmlContainer: 'swal2-html-container-left'
                },
                showConfirmButton: false,
                showCloseButton: true,
                didOpen: () => {
                    document.querySelectorAll('.delete-rec-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const id = e.currentTarget.getAttribute('data-id');
                            handleDeleteClick(id);
                        });
                    });
                }
            });
            // Custom CSS for Swal
            const style = document.createElement('style');
            style.innerHTML = `.swal2-html-container-left { text-align: left !important; }`;
            document.head.appendChild(style);


        } catch (error) {
            Swal.fire('ผิดพลาด', `ไม่สามารถโหลดประวัติได้: ${error.message}`, 'error');
        }
    }

    function install({ streamManager }) {
        streamManager.showHistory = showHistory;
    }

    window.HistoryModule = { install };
})();