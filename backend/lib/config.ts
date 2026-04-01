// Store for our secrets. In production, these should be in environment variables,
// but for the sake of strict matching with the mobile app's C++ secrets, we define them here.

export const SECRETS = {
  // MUST match the C++ White-Box HMAC Secret exactly
  HMAC_SECRET: "s3cr3t_v4u1t_hm4c_k3y_2026!@#$",
  
  // Internal JWT Secret for Token generation
  JWT_SECRET: "jw7_5up3r_53cr37_n3x7j5",

  // Minimum allowed version for Kill Switch
  MIN_APP_VERSION: "1.0.0",

  // Android App Package Name for Play Integrity verification
  ANDROID_PACKAGE_NAME: "com.securevault",
};
