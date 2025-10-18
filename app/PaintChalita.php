<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>โปรแกรมวาดภาพ PJC</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            background-color: #f0f2f5;
            margin: 0;
            padding: 20px;
        }
        h1 {
            color: #333;
        }
        #toolbar {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            align-items: center;
            background-color: #ffffff;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        #toolbar label {
            font-weight: bold;
        }
        #toolbar input[type="color"] {
            width: 40px;
            height: 40px;
            border: none;
            padding: 0;
            cursor: pointer;
        }
        #toolbar input[type="number"] {
            width: 60px;
            padding: 5px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }
        #toolbar button {
            padding: 8px 15px;
            border: none;
            background-color: #007bff;
            color: white;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        #toolbar button:hover {
            background-color: #0056b3;
        }
        #drawing-canvas {
            border: 2px solid #ccc;
            border-radius: 8px;
            background-color: #ffffff;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            cursor: crosshair;
        }
    </style>
</head>
<body>
    <h1>PJC Drawing App 🎨</h1>
    <div id="toolbar">
        <label for="strokeColor">สีเส้น:</label>
        <input type="color" id="strokeColor" value="#000000">

        <label for="lineWidth">ขนาดเส้น:</label>
        <input type="number" id="lineWidth" value="5" min="1" max="100">

        <button id="export-png">Export PNG</button>
        <button id="export-jpg">Export JPG</button>

        <button id="save-project">💾 Save Project (.PJC)</button>
        <label for="load-project">📂 Load Project:</label>
        <input type="file" id="load-project" accept=".pjc">
    </div>
    <canvas id="drawing-canvas" width="800" height="600"></canvas>

    <script src="app.js"></script>
</body>
</html>