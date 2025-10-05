(function () {
    function install({ streamManager }) {
        if (!streamManager) return;

        async function takeScreenshot(type, targetUuid = null) {
            let elementToCapture;
            if (type === 'room') {
                elementToCapture = document.getElementById('video-grid');
            } else if (type === 'user' && targetUuid) {
                elementToCapture = document.getElementById(targetUuid);
            }

            if (!elementToCapture) {
                Swal.fire('ผิดพลาด', 'ไม่พบเป้าหมายที่จะแคปเจอร์', 'error');
                return;
            }

            try {
                Swal.fire({
                    title: 'กำลังแคปเจอร์...',
                    text: 'กรุณารอสักครู่',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading(),
                });

                const canvas = await html2canvas(elementToCapture, {
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#202124'
                });
                
                canvas.toBlob(async (blob) => {
                    if (blob && streamManager.uploadFile) {
                        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        const fileName = `screenshot-${timestamp}.png`;
                        await streamManager.uploadFile(blob, fileName, 'image', 'png');
                    } else {
                        throw new Error('ไม่สามารถสร้างไฟล์จาก Canvas ได้');
                    }
                }, 'image/png');

            } catch (error) {
                console.error('Screenshot failed:', error);
                Swal.fire('แคปเจอร์ไม่สำเร็จ', error.message, 'error');
            }
        }
        
        streamManager.takeScreenshot = takeScreenshot;
    }

    window.ScreenshotModule = { install };
})();