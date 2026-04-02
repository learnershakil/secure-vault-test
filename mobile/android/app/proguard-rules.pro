# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# React Native specific rules
-keep class com.facebook.react.** { *; }
-keep class com.facebook.yoga.** { *; }
-keep class com.facebook.systrace.** { *; }
-keep class com.facebook.hermes.reactexecutor.** { *; }
-keep class expo.modules.** { *; }

# Keep our custom NativeModule
-keep class com.learnershakil.securevault.SecretsModule { *; }
-keep class com.learnershakil.securevault.SecretsPackage { *; }

# Keep methods that are called via JNI from C++
-keepclasseswithmembernames class * {
    native <methods>;
}

# Do not obfuscate any Javascript Interface classes
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Suppress warnings for libraries that are missing references but still work fine
-dontwarn com.facebook.react.**
-dontwarn okhttp3.**
-dontwarn okio.**
