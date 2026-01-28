module.exports = (link) => {
    const parts = link.split('/');
    if (parts.length < 7) return null;

    return {
        guildId: parts.at(-3),
        channelId: parts.at(-2),
        messageId: parts.at(-1)
    };
};
