# Secure Vault - Advanced Mobile Security Architecture

Secure Vault is a production-ready, highly secure full-stack application demonstrating **10 advanced security layers**. It features a **React Native (Expo Bare Workflow) mobile application** communicating with a **Next.js (App Router) Backend Edge API**.

This project is built to withstand MITM (Man-in-the-Middle) attacks, reverse engineering, unauthorized API access, and tampering, utilizing native C++ JNI bindings and White-Box Cryptography concepts.

---

## Architecture & Security Layers

### 1. Real-Time Security Dashboard (SSE)
The Next.js backend includes a real-time log dashboard (`app/page.tsx`) operating via Server-Sent Events (SSE). It streams cryptographic successes, HMAC failures, and Kill Switch interventions directly to the browser without polling.

### 2. Edge-Compatible Security Middleware
The Next.js `middleware.ts` runs on the Vercel Edge Runtime using the native Web Crypto API (`lib/cryptoEdge.ts`). It strictly enforces security requirements before requests ever reach the route handlers.

### 3. HMAC Signed Requests (Replay Attack Prevention)
Every secure request coming from the mobile app is signed with a dynamic HMAC-SHA256 signature containing:
- The raw JSON payload.
- A 16-byte cryptographically secure **Nonce**.
- A UNIX **Timestamp**.
The backend validates this signature, caches the nonce in memory to reject **replay attacks**, and rejects any requests older than **120 seconds**.

### 4. AES-GCM Encrypted Payloads
Payloads to the `/api/vault` routes are never sent in plaintext.
- The mobile app dynamically derives a 256-bit AES key using `SHA256(SessionToken + HMAC_Secret)`.
- It encrypts the request body using `AES-GCM` and generates a secure Initialization Vector (IV).
- The Next.js backend derives the exact same key, decrypts the body, processes the request, and re-encrypts the response payload.

### 5. Native Secrets & White-Box Cryptography (C++ NDK/JNI)
The HMAC Secret and API Base URLs are **NOT** stored in `.env` files or JavaScript.
- They are stored inside `mobile/android/app/src/main/cpp/secrets.cpp`.
- A compile-time macro (`obfuscate.h`) XOR-encrypts the strings physically inside the `.so` binary library.
- They are only decrypted at runtime directly into CPU registers when requested by the React Native `SecretsModule` via JNI (Java Native Interface), making reverse engineering via string dumping (`strings libsecrets.so`) impossible.

### 6. SSL Certificate Pinning
The mobile app uses `react-native-ssl-public-key-pinning` to hardcode the expected SHA-256 Public Key hashes of the server's SSL certificate. If a proxy (like Charles or Burp Suite) intercepts the traffic with a substitute certificate, the network layer will forcibly abort the connection.

### 7. App Attestation (Google Play Integrity API)
The Axios interceptor attaches a verified device token (`x-play-integrity-token`) to prove the app executing the request is the genuine binary downloaded from the Play Store and not a cloned script or malicious bot.

#### How it Works:
1. **Request:** The React Native app requests an Integrity Token from Google Play Services by providing a cryptographically secure nonce.
2. **Evaluation:** Google evaluates the Android device (checking for root, unlocked bootloaders, unrecognized apps, and Google Play licensing).
3. **Transmission:** The mobile app sends this encrypted token in the `x-play-integrity-token` header to the Next.js backend.
4. **Verification:** The Next.js middleware decrypts and verifies the token using Google's public keys to physically confirm the app's legitimacy before allowing the API request to proceed.

#### Setup for Production:
1. **Google Play Console:** Go to **Release** -> **Setup** -> **App Integrity** and link your Google Cloud Project.
2. **Backend Config:** In your Next.js backend, you will use Google's auth libraries (e.g., `google-auth-library`) to verify the incoming tokens against your Google Cloud Service Account credentials.
3. **Frontend Integration:** 
   - Install a wrapper like `react-native-google-play-integrity`.
   - Update `src/network/secureAxios.js` to replace the mock token with a live request: `await RNPlayIntegrity.requestIntegrityToken(nonce)`.

### 8. Anti-Tamper & Environment Detection
Using `jail-monkey`, the app actively scans the device for:
- Root / Jailbreak privileges.
- Emulators or Mock Location providers.
- Hooking frameworks (Xposed, Substrate).
- Active Debuggers (in production).
If compromised, the app crashes and refuses to boot.

### 9. Kill Switch (Version Deprecation)
If a critical vulnerability is discovered in an older version of the mobile app, the backend can increment the `MIN_APP_VERSION` in `lib/config.ts`. The Next.js middleware will instantly return a `403 FORCE_UPDATE` status. The Axios interceptor emits a global event, rendering the entire app inaccessible until the user updates.

### 10. Hermes Bytecode & R8 Obfuscation
The React Native app is aggressively optimized for production:
- **Hermes:** `app.json` forces the Hermes engine, compiling JavaScript into unreadable bytecode rather than shipping raw JS strings.
- **Metro Obfuscation:** `metro.config.js` strips all `console.log` statements, flattens control flow, and aggressively minifies the code.
- **Proguard/R8:** Specific `proguard-rules.pro` ensure the Java/C++ bridges are preserved while the rest of the Android native code is shrunk, optimized, and heavily obfuscated.

---

## How to Setup and Run

### Prerequisites
- Node.js (v18+)
- Android Studio & Android SDK (NDK + CMake installed for C++ compilation)
- Java 17

### 1. Start the Next.js Security Backend

```bash
cd backend

# Install dependencies (Next.js, Tailwind, jsonwebtoken for Auth)
npm install
npm install jsonwebtoken

# Run the backend server
npm run dev
```
> Open **http://localhost:3000** in your browser. You will see the Real-Time Security Dashboard waiting for incoming secure connections.

### 2. Configure the React Native Mobile App

Open a new terminal window:

```bash
cd mobile

# Install dependencies
npm install

# Install exact security libraries required for this project
npm install axios react-native-crypto-js @react-native-async-storage/async-storage jail-monkey react-native-ssl-public-key-pinning
```

### 3. Build and Run the Android App

Because this uses deeply integrated C++ Native Modules via CMake, you **must** build the bare workflow Android project (Expo Go will not work).

```bash
# Build the C++ JNI bindings and start the app on an Android Emulator or Physical Device
npx expo run:android
```

*(Note: During the build process, Gradle will invoke CMake to compile `secrets.cpp` into a shared library `.so` file. This might take a few minutes the first time.)*

### 4. Test the System

1. In the mobile app, you should see the **Establishing Secure Enclave** screen briefly while it fetches the White-Box secrets from C++ and validates the environment (Anti-Tamper checks).
2. Once on the main screen, tap **"Fetch Secure Data"**.
3. Look at your browser running the Next.js Dashboard (`http://localhost:3000`). You will instantly see the live logs for:
   - `AUTH_SUCCESS` (Token Rotation)
   - `HMAC_VERIFIED` (Middleware verifying the request signature)
   - `AES_DECRYPT_SUCCESS` (Incoming payload decrypted)
   - `AES_ENCRYPT_SUCCESS` (Outgoing response encrypted)
4. The mobile app will display the decrypted Secure Vault payload.

---

## Security Posture & Customization

- **Change Secrets:** If you want to change the HMAC Secret or the Base URL, you must edit `mobile/android/app/src/main/cpp/secrets.cpp` and re-compile the Android app. Remember to update the matching `backend/lib/config.ts`.
- **Production Builds:** When running `npx expo run:android --variant release`, Metro will securely obfuscate your JS bundle, and Gradle will apply the strict Proguard rules found in `mobile/android/app/proguard-rules.pro`. SSL Pinning and Anti-Tamper checks will also activate strictly (crashing the app if run on an emulator).
