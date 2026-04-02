import axios from 'axios';
import { Platform } from 'react-native';

let CryptoJS = null;
let AsyncStorage = null;

// Polyfill globalThis.crypto for React Native (crypto-js requires it)
if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.getRandomValues) {
    const existingCrypto = globalThis.crypto || {};
    globalThis.crypto = {
        ...existingCrypto,
        getRandomValues: (array) => {
            for (let i = 0; i < array.length; i++) {
                array[i] = Math.floor(Math.random() * 256);
            }
            return array;
        }
    };
}

try {
    CryptoJS = require('crypto-js');
} catch (e) {
    console.warn('[SecureAxios] crypto-js not available.');
}

try {
    AsyncStorage = require('@react-native-async-storage/async-storage');
    if (AsyncStorage && AsyncStorage.default) AsyncStorage = AsyncStorage.default;
} catch (e) {
    console.warn('[SecureAxios] AsyncStorage not available.');
}

// Access SecretsModule via NativeModules (interop layer bridges old modules in New Architecture)
let SecretsModule = null;
try {
    const { NativeModules } = require('react-native');
    SecretsModule = NativeModules.SecretsModule || null;
    if (SecretsModule) {
        console.log('[SecureAxios] SecretsModule loaded via NativeModules');
    } else {
        console.warn('[SecureAxios] SecretsModule is null in NativeModules');
    }
} catch (e) {
    console.warn('[SecureAxios] Failed to access NativeModules:', e.message);
}

// Local in-memory store for tokens (also backed by AsyncStorage)
let accessToken = null;
let refreshToken = null;
let isRefreshing = false;
let failedQueue = [];

let hmacSecretCache = null;
let apiBaseUrlCache = null;

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// Helper to prevent infinite bridge hangs under New Architecture interop layer
const withTimeout = (promise, ms, name) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Native module bridge timeout: ${name}`)), ms))
    ]);
};

// --- Initialization ---
export const initializeSecurity = async () => {
    // Attempt to read secrets from native C++ JNI bridge
    if (SecretsModule && typeof SecretsModule.getSecret === 'function') {
        try {
            console.log('[SecureAxios] Calling SecretsModule.getSecret()...');
            hmacSecretCache = await withTimeout(SecretsModule.getSecret(), 2000, 'getSecret');
            console.log('[SecureAxios] SecretsModule.getSecret() succeeded!');
        } catch (e) {
            console.warn('[SecureAxios] SecretsModule.getSecret() failed or timed out:', e.message);
        }
    }
    
    // Fallback HMAC secret for development when native module isn't linked
    if (!hmacSecretCache) {
        console.warn('[SecureAxios] Using fallback HMAC secret (dev only). Native C++ bridge not available or timed out.');
        hmacSecretCache = 's3cr3t_v4u1t_hm4c_k3y_2026!@#$';
    }

    apiBaseUrlCache = Platform.select({
        android: __DEV__ ? 'http://10.249.118.166' : 'https://api.lpulive.in',
        ios: 'http://localhost:3000',
    });
    
    // Use Native Module URL if in production/Release and available
    if (!__DEV__ && SecretsModule && typeof SecretsModule.getBaseUrl === 'function') {
        try {
            apiBaseUrlCache = await withTimeout(SecretsModule.getBaseUrl(), 2000, 'getBaseUrl');
        } catch (e) {
            console.warn('[SecureAxios] SecretsModule.getBaseUrl() failed or timed out:', e.message);
        }
    }
    
    secureAxios.defaults.baseURL = apiBaseUrlCache;
    
    // Load tokens from secure storage
    if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
        try {
            accessToken = await AsyncStorage.getItem('access_token');
            refreshToken = await AsyncStorage.getItem('refresh_token');
        } catch (e) {
            console.warn('[SecureAxios] AsyncStorage.getItem failed:', e.message);
        }
    }

    // If no tokens exist, perform initial authentication
    if (!accessToken) {
        try {
            const { data } = await axios.post(`${apiBaseUrlCache}/api/auth/token`, {
                username: 'admin',
                password: 'admin123',
            });
            accessToken = data.accessToken;
            refreshToken = data.refreshToken;

            if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
                await AsyncStorage.setItem('access_token', accessToken);
                await AsyncStorage.setItem('refresh_token', refreshToken);
            }
            console.log('[SecureAxios] Initial authentication successful.');
        } catch (e) {
            console.warn('[SecureAxios] Initial auth failed:', e.message);
        }
    }

    console.log('[SecureAxios] Security initialized. Base URL:', apiBaseUrlCache);
};

// --- Crypto Utils ---
const generateNonce = () => {
    // React Native doesn't have window.crypto, so generate random hex manually
    const chars = '0123456789abcdef';
    let nonce = '';
    for (let i = 0; i < 32; i++) {
        nonce += chars[Math.floor(Math.random() * chars.length)];
    }
    return nonce;
};

const computeHMAC = (bodyStr, timestamp, nonce) => {
    const payload = `${bodyStr}${timestamp}${nonce}`;
    return CryptoJS.HmacSHA256(payload, hmacSecretCache).toString(CryptoJS.enc.Hex);
};

const deriveAESKey = (sessionToken) => {
    return CryptoJS.SHA256(sessionToken + hmacSecretCache).toString(CryptoJS.enc.Hex);
};

// --- Axios Instance ---
export const secureAxios = axios.create({
    headers: {
        'x-app-version': '1.0.0', // Verified by Kill Switch
        'Content-Type': 'application/json',
    }
});

// --- Request Interceptor ---
secureAxios.interceptors.request.use(async (config) => {
    // 1. Google Play Integrity Mock Token (App Attestation)
    const playIntegrityToken = "mock_valid_play_token"; // In reality: await fetchPlayIntegrityToken()
    config.headers['x-play-integrity-token'] = playIntegrityToken;

    // 2. Attach Authorization
    if (accessToken) {
        config.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Only apply strict HMAC/AES to /api/vault routes
    if (config.url && config.url.includes('/api/vault')) {
        const timestamp = Date.now().toString();
        const nonce = generateNonce();
        
        let bodyStr = '';

        // 3. Encrypt Payload if method is POST/PUT
        if (config.data) {
            const rawBody = JSON.stringify(config.data);
            const aesKeyHex = deriveAESKey(accessToken);
            const aesKey = CryptoJS.enc.Hex.parse(aesKeyHex);
            const iv = CryptoJS.lib.WordArray.random(16);
            
            const encrypted = CryptoJS.AES.encrypt(rawBody, aesKey, { iv: iv }).toString();
            
            config.data = {
                iv: iv.toString(),
                ciphertext: encrypted
            };
            
            bodyStr = JSON.stringify(config.data);
        }

        // 4. Generate & Attach HMAC Signature
        const signature = computeHMAC(bodyStr, timestamp, nonce);
        config.headers['x-hmac-signature'] = signature;
        config.headers['x-timestamp'] = timestamp;
        config.headers['x-nonce'] = nonce;
    }

    return config;
}, (error) => Promise.reject(error));

// --- Response Interceptor ---
secureAxios.interceptors.response.use(async (response) => {
    
    // Decrypt AES response if coming from Vault API
    if (response.config.url.includes('/api/vault') && response.data.ciphertext) {
        const aesKeyHex = deriveAESKey(accessToken);
        const aesKey = CryptoJS.enc.Hex.parse(aesKeyHex);
        const iv = CryptoJS.enc.Hex.parse(response.data.iv);
        
        const decrypted = CryptoJS.AES.decrypt(response.data.ciphertext, aesKey, {
            iv: iv
        }).toString(CryptoJS.enc.Utf8);
        
        response.data = JSON.parse(decrypted);
    }
    
    return response;
}, async (error) => {
    const originalRequest = error.config;

    // 1. Kill Switch Enforcement
    if (error.response?.status === 403 && error.response?.data?.error === 'FORCE_UPDATE') {
        // Broadcast event to React UI to show Force Update Screen
        import('react-native').then(rn => rn.DeviceEventEmitter.emit('FORCE_UPDATE_REQUIRED'));
        return Promise.reject(error);
    }

    // 2. Token Rotation
    if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then(token => {
                originalRequest.headers['Authorization'] = 'Bearer ' + token;
                return secureAxios(originalRequest);
            }).catch(err => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            const { data } = await axios.post(`${apiBaseUrlCache}/api/auth/token`, { refreshToken });
            accessToken = data.accessToken;
            refreshToken = data.refreshToken;
            
            await AsyncStorage.setItem('access_token', accessToken);
            await AsyncStorage.setItem('refresh_token', refreshToken);
            
            secureAxios.defaults.headers.common['Authorization'] = 'Bearer ' + accessToken;
            originalRequest.headers['Authorization'] = 'Bearer ' + accessToken;
            
            processQueue(null, accessToken);
            return secureAxios(originalRequest);
        } catch (err) {
            processQueue(err, null);
            // Logout User
            await AsyncStorage.clear();
            accessToken = null;
            return Promise.reject(err);
        } finally {
            isRefreshing = false;
        }
    }
    
    return Promise.reject(error);
});
