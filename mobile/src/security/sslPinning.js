let initializeSslPinning = null;

try {
    initializeSslPinning = require('react-native-ssl-public-key-pinning').initializeSslPinning;
} catch (e) {
    console.warn('[Security] react-native-ssl-public-key-pinning not available. SSL pinning will be skipped.');
}

export const setupSSLPinning = async () => {
    if (__DEV__) {
        console.log('[Security] Skipping SSL Pinning in Development Mode');
        return;
    }

    if (!initializeSslPinning) {
        console.warn('[Security] SSL Pinning skipped: native module not linked.');
        return;
    }

    try {
        await initializeSslPinning({
            'api.securevault.com': {
                includeSubdomains: true,
                publicKeyHashes: [
                    'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', // Primary Pin
                    'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=', // Backup Pin
                ],
            },
        });
        console.log('[Security] SSL Public Key Pinning Initialized');
    } catch (error) {
        console.error('[Security] FATAL: SSL Pinning failed to initialize', error);
        import('react-native').then(rn => rn.BackHandler.exitApp());
    }
};
