const API_URL = 'api/videocall-api.php';

export async function joinRoom(roomId) {
    try {
        const formData = new FormData();
        formData.append('action', 'join_room');
        formData.append('room_uuid', roomId);
        const response = await fetch(API_URL, { method: 'POST', body: formData });
        return await response.json();
    } catch (error) {
        console.error('API join room error:', error);
        return { status: 'error', message: 'API call failed' };
    }
}

export function leaveRoom(roomId) {
    const formData = new FormData();
    formData.append('action', 'leave_room');
    formData.append('room_uuid', roomId);
    navigator.sendBeacon(API_URL, formData);
}