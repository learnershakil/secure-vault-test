#include <jni.h>
#include <string>
#include "obfuscate.h"

extern "C" JNIEXPORT jstring JNICALL
Java_com_learnershakil_securevault_SecretsModule_getHMACSecret(JNIEnv* env, jobject /* this */) {
    // 0x4A is the XOR key. The string is XORed at compile time.
    OBFUSCATE("s3cr3t_v4u1t_hm4c_k3y_2026!@#$", 0x4A);
    jstring result = env->NewStringUTF(decrypted_0x4A);
    
    // Clear the stack buffer immediately after copying to JVM string
    for (int i = 0; i < sizeof(decrypted_0x4A); ++i) decrypted_0x4A[i] = '\0';
    
    return result;
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_learnershakil_securevault_SecretsModule_getApiBaseUrl(JNIEnv* env, jobject /* this */) {
    // 0x5B is another XOR key. 
    // Wait, using localhost for android emulator is 10.0.2.2. If physical device, use local IP.
    OBFUSCATE("http://10.0.2.2:3000/api/vault", 0x5B);
    jstring result = env->NewStringUTF(decrypted_0x5B);
    
    for (int i = 0; i < sizeof(decrypted_0x5B); ++i) decrypted_0x5B[i] = '\0';

    return result;
}
