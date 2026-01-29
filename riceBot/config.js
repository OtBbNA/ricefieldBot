import 'dotenv/config';

export const config = {
    token: process.env.DISCORD_TOKEN,
    publicKey: process.env.PUBLIC_KEY,
    appId: process.env.APP_ID,
    guildId: process.env.GUILD_ID,
    port: process.env.PORT || 3000,
};
