const ts = () => new Date().toISOString();

export function logIncoming(message) {
    console.log(`\n➡️  [${ts()}] ${message}`);
}

export function logSuccess(message) {
    console.log(`✅ [${ts()}] ${message}`);
}

export function logError(message, err) {
    console.error(`❌ [${ts()}] ${message}`);
    if (err) console.error(err);
}
