import 'dotenv/config';

export const config = {
    token: process.env.DISCORD_TOKEN,
    publicKey: process.env.PUBLIC_KEY,
    port: process.env.PORT || 3000,
};
