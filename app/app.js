window.addEventListener('load', () => {
    // --- Setup ---
    const canvas = document.getElementById('drawing-canvas');
    const ctx = canvas.getContext('2d');

    const colorPicker = document.getElementById('strokeColor');
    const lineWidthInput = document.getElementById('lineWidth');
    const exportPngBtn = document.getElementById('export-png');
    const exportJpgBtn = document.getElementById('export-jpg');
    const saveProjectBtn = document.getElementById('save-project');
    const loadProjectInput = document.getElementById('load-project');

    // --- State Variables ---
    let isPainting = false;
    let hasUnsavedChanges = false;

    // --- Initial Canvas Settings ---
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // --- Drawing Functions ---
    function startPosition(e) {
        isPainting = true;
        draw(e);
    }

    function finishedPosition() {
        isPainting = false;
        ctx.beginPath();
    }

    function draw(e) {
        if (!isPainting) return;
        hasUnsavedChanges = true; // Mark that a change has occurred

        ctx.lineWidth = lineWidthInput.value;
        ctx.strokeStyle = colorPicker.value;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    // --- Export Functions ---
    function exportCanvasAs(format) {
        const link = document.createElement('a');
        const fileName = `drawing-${Date.now()}.${format}`;
        link.download = fileName;

        if (format === 'jpg') {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.fillStyle = '#FFFFFF';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(canvas, 0, 0);
            link.href = tempCanvas.toDataURL('image/jpeg', 0.9);
        } else {
            link.href = canvas.toDataURL(`image/${format}`);
        }

        link.click();
        hasUnsavedChanges = false; // Reset after saving
    }

    // --- Save/Load Project Functions ---
    function saveProject() {
        const dataUrl = canvas.toDataURL();
        const projectData = { imageData: dataUrl };
        const jsonString = JSON.stringify(projectData);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.download = `project-${Date.now()}.pjc`;
        link.href = url;
        link.click();
        
        hasUnsavedChanges = false; // Reset after saving
    }

    function loadProject(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const projectData = JSON.parse(event.target.result);
                if (projectData && projectData.imageData) {
                    const img = new Image();
                    img.onload = () => {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0);
                    };
                    img.src = projectData.imageData;
                    hasUnsavedChanges = false; // Reset after loading a project
                }
            } catch (error) {
                console.error('Error loading project file:', error);
                alert('ไม่สามารถเปิดไฟล์โปรเจกต์ได้ อาจเป็นไฟล์ที่ไม่ถูกต้อง');
            }
        };
        reader.readAsText(file);
        // Reset the file input to allow loading the same file again
        e.target.value = null; 
    }

    // --- Unsaved Changes Protection ---
    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges) {
            const confirmationMessage = 'คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?';
            e.preventDefault();
            e.returnValue = confirmationMessage;
            return confirmationMessage;
        }
    });

    // --- Event Listeners ---
    canvas.addEventListener('mousedown', startPosition);
    canvas.addEventListener('mouseup', finishedPosition);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseleave', finishedPosition);

    exportPngBtn.addEventListener('click', () => exportCanvasAs('png'));
    exportJpgBtn.addEventListener('click', () => exportCanvasAs('jpg'));

    saveProjectBtn.addEventListener('click', saveProject);
    loadProjectInput.addEventListener('change', loadProject);
});