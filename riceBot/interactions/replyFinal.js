import fetch from 'node-fetch';

export async function replyFinal(req, content) {
    await fetch(
        `https://discord.com/api/v10/webhooks/${req.body.application_id}/${req.body.token}/messages/@original`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
        }
    );
}