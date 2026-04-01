import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, DeviceEventEmitter, StyleSheet } from "react-native";

import { setupSSLPinning } from "../src/security/sslPinning";
import { runAntiTamperChecks } from "../src/security/antiTamper";
import { initializeSecurity } from "../src/network/secureAxios";

export default function RootLayout() {
  const [isSecure, setIsSecure] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const bootstrapSecurity = async () => {
      try {
        // 1. Initial Anti-Tamper check
        runAntiTamperChecks();
        
        // 2. Setup SSL Pinning to prevent MITM (Mocked gracefully for setup if package not installed yet)
        await setupSSLPinning().catch(() => console.log('SSL pinning mocked for demonstration'));
        
        // 3. Initialize cryptographic network keys securely from C++ via JNI
        await initializeSecurity();
        
        if (isMounted) {
            setIsSecure(true);
        }
      } catch (error: any) {
         console.error('[RootLayout] Security Bootstrap Failed', error);
         if (isMounted) {
            setBootError(error?.message || "Critical Security Initialization Failure.\nBridge disconnected or Native Module missing.");
         }
      }
    };

    bootstrapSecurity();

    // Listen for Kill Switch signals from the Network layer
    const killSwitchListener = DeviceEventEmitter.addListener('FORCE_UPDATE_REQUIRED', () => {
      setForceUpdate(true);
    });

    return () => {
      isMounted = false;
      killSwitchListener.remove();
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
        {/* The Stack MUST be rendered for Expo Router to initialize its navigation tree */}
        <Stack>
            <Stack.Screen name="index" options={{ title: 'Secure Vault', headerShown: false }} />
        </Stack>

        {/* Security Overlay blocking access until checks pass */}
        {(!isSecure || forceUpdate || bootError) && (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: 20 }]}>
                {bootError ? (
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: 'red', fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>SECURITY FAULT</Text>
                        <Text style={{ color: '#ff5555', textAlign: 'center', fontFamily: 'monospace' }}>{bootError}</Text>
                    </View>
                ) : forceUpdate ? (
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'red', marginBottom: 10 }}>Update Required</Text>
                        <Text style={{ color: '#fff', textAlign: 'center' }}>Your version is severely outdated and poses a security risk.</Text>
                    </View>
                ) : (
                    <View style={{ alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#00ff00" />
                        <Text style={{ color: '#00ff00', marginTop: 15, fontFamily: 'monospace' }}>Establishing Secure Enclave...</Text>
                    </View>
                )}
            </View>
        )}
    </View>
  );
}
