import { Alert, BackHandler } from 'react-native';

export const runAntiTamperChecks = () => {
    let JailMonkey = null;

    try {
        JailMonkey = require('jail-monkey').default || require('jail-monkey');
    } catch (e) {
        // Package not installed at all
    }

    // If the native module bridge is unavailable, skip gracefully in dev
    try {
        if (!JailMonkey || typeof JailMonkey.isJailBroken !== 'function') {
            console.warn('[Security] Anti-tamper skipped: jail-monkey native bridge not available.');
            return;
        }

        // 1. Check if the device is Rooted or Jailbroken
        if (JailMonkey.isJailBroken()) {
            triggerSecurityViolation('Root Privileges Detected! App cannot run in an insecure environment.');
        }

        // 2. Check if the app is running on an Emulator
        if (!__DEV__ && JailMonkey.canMockLocation()) {
            triggerSecurityViolation('Mock Location / Emulated Environment Detected!');
        }

        // 3. Check for Hooking frameworks (e.g., Xposed, Substrate)
        if (typeof JailMonkey.hookDetected === 'function' && JailMonkey.hookDetected()) {
            triggerSecurityViolation('Hooking Framework Detected! Reverse Engineering attempt blocked.');
        }

        // 4. Check if Developer mode / USB Debugging is strictly off in Production
        if (!__DEV__ && typeof JailMonkey.isDebuggedMode === 'function' && JailMonkey.isDebuggedMode()) {
            triggerSecurityViolation('Active Debugger Detected!');
        }
    } catch (e) {
        console.warn('[Security] Anti-tamper check failed (native module not linked):', e.message);
    }
};

const triggerSecurityViolation = (reason) => {
    console.error(`[Security Violation]: ${reason}`);
    
    if (!__DEV__) {
        BackHandler.exitApp();
        return;
    } else {
        Alert.alert(
            "Security Warning (DEV_MODE)",
            `${reason}\n\nIn production, the app would crash immediately.`
        );
    }
};
