(function () {
    function install({ streamManager }) {
        if (!streamManager) return;

        async function uploadFile(blob, fileName, fileType, format) {
            const formData = new FormData();
            formData.append('file', blob, fileName);
            formData.append('fileType', fileType); // 'image' or 'video'
            formData.append('format', format); // 'png', 'webm', or 'mp4'

            try {
                Swal.fire({
                    title: 'Uploading File',
                    text: `Your ${fileType} is being uploaded...`,
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                const response = await fetch('api/history-api.php', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (response.ok && result.status === 'success') {
                    Swal.fire('Success', `File uploaded successfully.`, 'success');
                } else {
                    throw new Error(result.message || 'Upload failed');
                }

            } catch (error) {
                console.error('Upload failed:', error);
                Swal.fire('Upload Failed', error.message, 'error');
            }
        }

        // Attach the upload function to the streamManager so other modules can use it
        streamManager.uploadFile = uploadFile;
    }

    window.UploadModule = { install };
})();