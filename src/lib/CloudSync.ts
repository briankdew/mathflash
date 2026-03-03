const CLOUD_URL = 'https://script.google.com/macros/s/AKfycbxwUWpSyAiioDtMZ-p4_YbvO7k3HDBajJ2LNX-SPS--ngNY1JbQidw3IXMx2Ta868ya-g/exec';

export async function saveLogToCloud(dataObj: Record<string, string | number>) {
    try {
        const url = CLOUD_URL;

        await fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ payload: JSON.stringify(dataObj) }).toString(),
        });

        console.log('Cloud log POST sent (no-cors; response opaque).');
    } catch (err) {
        console.error('Fetch error:', err);
    }
}
