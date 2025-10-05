<?php
require_once __DIR__ . '/../config.php';

header('Content-Type: application/json');

// Validate and sanitize input
$search = isset($_GET['search']) ? trim($_GET['search']) : '';
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;

try {
    $mysqli = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);
    
    if ($mysqli->connect_error) {
        throw new Exception("Connection failed: " . $mysqli->connect_error);
    }
    
    // Set character encoding
    $mysqli->set_charset("utf8mb4");

    // Prepare search query
    $searchParam = "%" . $mysqli->real_escape_string($search) . "%";
    $query = "SELECT id, username, email, avatar, score 
              FROM users 
              WHERE username LIKE ? OR email LIKE ? 
              ORDER BY username ASC 
              LIMIT ?";
    
    $stmt = $mysqli->prepare($query);
    if (!$stmt) {
        throw new Exception("Query preparation failed: " . $mysqli->error);
    }

    $stmt->bind_param("ssi", $searchParam, $searchParam, $limit);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $users = [];
    while ($row = $result->fetch_assoc()) {
        // Normalize avatar to an absolute web path using helper from config.php
        $row['avatar_url'] = get_avatar_url($row['avatar'] ?? null);
        $users[] = $row;
    }
    
    echo json_encode([
        'success' => true,
        'users' => $users
    ]);
    
    $stmt->close();
    $mysqli->close();
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred: ' . $e->getMessage()
    ]);
}
?>