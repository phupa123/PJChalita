<?php
// api/youtube-api.php
header('Content-Type: application/json');

// !!! สำคัญมาก: กรุณาใส่ API Key ของคุณที่นี่ !!!
// คุณสามารถขอรับ API Key ได้จาก Google Cloud Console -> APIs & Services -> Credentials
$apiKey = 'YOUR_YOUTUBE_API_KEY_HERE';

$action = $_GET['action'] ?? '';
$query = $_GET['q'] ?? '';

if (empty($apiKey) || $apiKey === 'YOUR_YOUTUBE_API_KEY_HERE') {
    http_response_code(500);
    echo json_encode(['error' => 'YouTube API Key is not configured on the server.']);
    exit;
}

function fetch_from_youtube($url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    $output = curl_exec($ch);
    curl_close($ch);
    return json_decode($output, true);
}

$response = [];

try {
    if ($action === 'popular') {
        $youtubeUrl = sprintf(
            'https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&chart=mostPopular&regionCode=TH&maxResults=20&key=%s',
            $apiKey
        );
        $response = fetch_from_youtube($youtubeUrl);

    } elseif ($action === 'search' && !empty($query)) {
        $youtubeUrl = sprintf(
            'https://www.googleapis.com/youtube/v3/search?part=snippet&q=%s&type=video&maxResults=20&key=%s',
            urlencode($query),
            $apiKey
        );
        $response = fetch_from_youtube($youtubeUrl);
    } else {
        throw new Exception('Invalid action or missing query.');
    }

    if (isset($response['error'])) {
        throw new Exception($response['error']['message']);
    }

    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>