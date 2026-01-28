import 'dotenv/config';
import express from 'express';
import { client } from './state/discordClient.js';

const app = express();
const PORT = process.env.PORT || 3000;

/* ===== EXPRESS ===== */
app.get('/ping', (req, res) => res.send('ok'));

app.listen(PORT, () => {
    console.log(`🌐 Express listening on ${PORT}`);
});

/* ===== DISCORD ===== */
console.log('🚀 BEFORE LOGIN');

client.once('ready', () => {
    console.log('🤖 CLIENT READY:', client.user.tag);
});

client.login(process.env.DISCORD_TOKEN)
    .then(() => console.log('🚀 LOGIN PROMISE RESOLVED'))
    .catch(err => console.error('❌ LOGIN ERROR', err));
