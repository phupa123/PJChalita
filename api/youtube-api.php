<?php
// api/youtube-api.php
header('Content-Type: application/json');

$apiKey = 'AIzaSyAbxAXEuc8H8lYHNkTfA0KAjSQGq0owPwg';

// --- Cache Management ---
$cacheDir = __DIR__ . '/yt_cache';
if (!is_dir($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}
$cacheDuration = 3600; // 1 hour

// --- Quota Management ---
$quotaCacheFile = __DIR__ . '/youtube_quota.json';

function getQuotaStatus($cacheFile) {
    if (!file_exists($cacheFile)) return ['isExceeded' => false, 'lastChecked' => 0];
    $data = json_decode(file_get_contents($cacheFile), true);
    $lastReset = strtotime('today midnight America/Los_Angeles');
    if ($data['isExceeded'] && $data['lastChecked'] < $lastReset) {
        return ['isExceeded' => false, 'lastChecked' => 0];
    }
    return $data;
}

function setQuotaExceeded($cacheFile) {
    file_put_contents($cacheFile, json_encode(['isExceeded' => true, 'lastChecked' => time()]));
}

function getNextResetTime() {
    return (new DateTime('tomorrow midnight', new DateTimeZone('America/Los_Angeles')))->getTimestamp();
}

$action = $_GET['action'] ?? '';
$query = $_GET['q'] ?? '';
$response = [];

$quotaStatus = getQuotaStatus($quotaCacheFile);
$response['quotaStatus'] = [
    'isExceeded' => $quotaStatus['isExceeded'],
    'nextResetTimestamp' => getNextResetTime()
];

if (empty($apiKey) || $apiKey === 'YOUR_YOUTUBE_API_KEY_HERE') {
    http_response_code(500);
    echo json_encode(['error' => 'YouTube API Key is not configured.']);
    exit;
}

if ($quotaStatus['isExceeded']) {
    $response['items'] = [];
    echo json_encode($response);
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

try {
    $cacheKey = hash('md5', $action . $query);
    $cacheFile = $cacheDir . '/' . $cacheKey . '.json';

    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $cacheDuration) {
        $apiData = json_decode(file_get_contents($cacheFile), true);
    } else {
        if ($action === 'popular') {
            $youtubeUrl = sprintf('https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&chart=mostPopular&regionCode=TH&maxResults=20&key=%s', $apiKey);
        } elseif ($action === 'search' && !empty($query)) {
            $youtubeUrl = sprintf('https://www.googleapis.com/youtube/v3/search?part=snippet&q=%s&type=video&maxResults=20&key=%s', urlencode($query), $apiKey);
        } else {
            throw new Exception('Invalid action or missing query.');
        }
        $apiData = fetch_from_youtube($youtubeUrl);
        
        if (isset($apiData['error']['errors'][0]['reason']) && $apiData['error']['errors'][0]['reason'] === 'quotaExceeded') {
            setQuotaExceeded($quotaCacheFile);
            $response['quotaStatus']['isExceeded'] = true;
            $response['items'] = [];
            echo json_encode($response);
            exit;
        } elseif (isset($apiData['error'])) {
            throw new Exception($apiData['error']['message']);
        }

        file_put_contents($cacheFile, json_encode($apiData));
    }
    
    $response = array_merge($response, $apiData);
    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage(), 'quotaStatus' => $response['quotaStatus']]);
}
?>