<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Media Project Organizer</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>

    <div class="container">
        <div id="project-controls">
            <div id="tabs-container"></div>
            <button id="new-project-btn" class="control-btn">+</button>
        </div>

        <h1></h1> <p>
            <strong>ลากไฟล์มาวางที่นี่</strong> หรือใช้ปุ่มด้านล่างเพื่ออัปโหลด
        </p>

        <div class="controls">
            <input type="file" id="imageUpload" accept="image/*" multiple style="display: none;">
            <label for="imageUpload" class="upload-btn">อัปโหลดรูปภาพ</label>

            <input type="file" id="videoUpload" accept="video/*" multiple style="display: none;">
            <label for="videoUpload" class="upload-btn video">อัปโหลดวิดีโอ</label>
            
            <input type="file" id="folderUpload" webkitdirectory directory multiple style="display: none;">
            <label for="folderUpload" class="upload-btn folder">อัปโหลดโฟลเดอร์</label>
            
            <button id="clear-all-btn" class="control-btn danger">ล้างทั้งหมด</button>
            <button id="save-zip-btn" class="control-btn success">บันทึกเป็น ZIP</button>
        </div>
        
        <div id="selection-info-bar" class="hidden">
            <span id="selection-details"></span>
            <button id="delete-selected-btn" class="control-btn danger">ลบที่เลือก</button>
        </div>

        <div id="media-container"></div>
    </div>

    <div id="confirm-modal" class="modal-overlay hidden">
        <div class="modal-content">
            <p id="modal-text"></p>
            <button id="modal-confirm-btn" class="modal-btn confirm">ยืนยัน</button>
            <button id="modal-cancel-btn" class="modal-btn cancel">ยกเลิก</button>
        </div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.0/Sortable.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/plugins/MultiDrag/Sortable.MultiDrag.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    
    <script src="script.js"></script>

</body>
</html>