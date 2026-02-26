import fetch from 'node-fetch';

export async function updateOriginalInteractionResponse(appId, token, content) {
    const res = await fetch(`https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    });

    if (!res.ok) {
        const responseBody = await res.text();
        console.error(`[Discord Response Error] Status: ${res.status}. Body: ${responseBody}`);
        throw new Error(`Failed to update original interaction response: ${res.status}`);
    }
}