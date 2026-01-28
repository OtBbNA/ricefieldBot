import { polls } from './state.js';

const esc = (code) => `\x1b[${code}m`;
const rst = '\x1b[0m';
const SEGMENTS = 66;

export function generateEmptyAnsiFrameString() {
    const top = esc('1;30') + '┏' + '━'.repeat(SEGMENTS) + '┓' + rst;
    const middle = esc('1;30') + '┃' + rst + esc('1;30') + '▉'.repeat(SEGMENTS) + rst + esc('1;30') + '┃' + rst;
    const bot = esc('1;30') + '┗' + '━'.repeat(SEGMENTS) + '┛' + rst;
    return `${top}\n${middle}\n${bot}`;
}

function buildAnsiBarString(parts) {
    let inside = '';
    for (const p of parts) {
        inside += esc(p.colorCode) + '▉'.repeat(p.count) + rst;
    }
    if (inside.length < SEGMENTS) {
        inside += esc('1;30') + '▉'.repeat(SEGMENTS - inside.length) + rst;
    }
    return inside;
}

export async function updatePollMessage(message, poll) {
    try {
        if (poll._updating) return;
        poll._updating = true;
        setTimeout(() => (poll._updating = false), 500);

        const a = poll.votes.a.size;
        const b = poll.votes.b.size;
        const c = poll.votes.c.size;
        const total = a + b + c;

        const seg = (v) => Math.round((v / total) * SEGMENTS || 0);

        let bar;
        if (poll.optionsCount === 3) {
            bar = buildAnsiBarString([
                { count: seg(a), colorCode: '1;32' },
                { count: seg(b), colorCode: '1;34' },
                { count: SEGMENTS - seg(a) - seg(b), colorCode: '1;31' },
            ]);
        } else {
            bar = buildAnsiBarString([
                { count: seg(a), colorCode: '1;32' },
                { count: SEGMENTS - seg(a), colorCode: '1;31' },
            ]);
        }

        const frame = generateEmptyAnsiFrameString();
        const content =
        message.content.split('```ansi')[0] +
        '```ansi\n' +
        frame.replace(/▉+/g, bar) +
        '\n```';

        await message.edit(content);
    } catch (err) {
        console.error('updatePollMessage error', err);
    }
}
