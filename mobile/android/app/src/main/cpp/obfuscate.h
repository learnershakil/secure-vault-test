#ifndef OBFUSCATE_H
#define OBFUSCATE_H

// A simple compile-time string obfuscation macro 
// Simulating White-Box Cryptography by ensuring strings are XORed in the binary
// and only decrypted at runtime in registers.

namespace secure_vault {

    template<int size>
    struct xor_string {
        char val[size];
        
        constexpr xor_string(const char* str, char key) : val{} {
            for (int i = 0; i < size - 1; ++i) {
                val[i] = str[i] ^ key;
            }
            val[size - 1] = '\0';
        }

        void decrypt(char* output, char key) const {
            for (int i = 0; i < size - 1; ++i) {
                output[i] = val[i] ^ key;
            }
            output[size - 1] = '\0';
        }
    };

}

// Macro to define an obfuscated string cleanly
#define OBFUSCATE(str, key) \
    constexpr secure_vault::xor_string<sizeof(str)> obfuscated_##key(str, key); \
    char decrypted_##key[sizeof(str)]; \
    obfuscated_##key.decrypt(decrypted_##key, key);

#endif // OBFUSCATE_H
