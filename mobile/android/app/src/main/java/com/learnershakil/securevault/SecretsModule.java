package com.learnershakil.securevault;

import android.util.Log;
import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;

@ReactModule(name = SecretsModule.NAME)
public class SecretsModule extends ReactContextBaseJavaModule {
    public static final String NAME = "SecretsModule";
    private static final String TAG = "SecretsModule";
    private static boolean nativeLibLoaded = false;

    static {
        try {
            System.loadLibrary("secrets-lib");
            nativeLibLoaded = true;
            Log.d(TAG, "✅ secrets-lib loaded successfully");
        } catch (UnsatisfiedLinkError e) {
            nativeLibLoaded = false;
            Log.e(TAG, "❌ Failed to load secrets-lib: " + e.getMessage());
        } catch (Exception e) {
            nativeLibLoaded = false;
            Log.e(TAG, "❌ Unexpected error loading secrets-lib: " + e.getMessage());
        }
    }

    public SecretsModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return NAME;
    }

    public native String getHMACSecret();
    public native String getApiBaseUrl();

    @ReactMethod
    public void getSecret(Promise promise) {
        if (!nativeLibLoaded) {
            promise.reject("ERR_NATIVE_LIB", "secrets-lib native library not loaded");
            return;
        }
        try {
            promise.resolve(getHMACSecret());
        } catch (Exception e) {
            promise.reject("ERR_SECRET", "Failed to load secret from native C++ layer", e);
        }
    }

    @ReactMethod
    public void getBaseUrl(Promise promise) {
        if (!nativeLibLoaded) {
            promise.reject("ERR_NATIVE_LIB", "secrets-lib native library not loaded");
            return;
        }
        try {
            promise.resolve(getApiBaseUrl());
        } catch (Exception e) {
            promise.reject("ERR_URL", "Failed to load base URL from native C++ layer", e);
        }
    }
}
