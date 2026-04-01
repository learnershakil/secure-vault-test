import { useState } from "react";
import { Text, View, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { secureAxios } from "../src/network/secureAxios";

export default function Index() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchSecureData = async () => {
    setLoading(true);
    setError("");
    setData(null);
    try {
      // secureAxios automatically handles HMAC signing and AES payload encryption/decryption
      const response = await secureAxios.post("/api/vault/secure-data", {
        action: "FETCH_BALANCE",
        device: "react-native-client"
      });
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to fetch secure data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Secure Vault</Text>
      <Text style={styles.subtitle}>Protected by AES, HMAC, and App Attestation</Text>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={fetchSecureData} 
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.buttonText}>Fetch Secure Data (Encrypted)</Text>
        )}
      </TouchableOpacity>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {data ? (
        <View style={styles.dataBox}>
          <Text style={styles.dataLabel}>Decrypted Response:</Text>
          <Text style={styles.dataJson}>{JSON.stringify(data, null, 2)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#00ffcc",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginBottom: 40,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#00ffcc",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    shadowColor: "#00ffcc",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  buttonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 0, 0, 0.3)",
    borderRadius: 8,
    width: "100%",
  },
  errorText: {
    color: "#ff4444",
  },
  dataBox: {
    marginTop: 24,
    width: "100%",
    padding: 16,
    backgroundColor: "rgba(0, 255, 204, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 204, 0.2)",
    borderRadius: 12,
  },
  dataLabel: {
    color: "#00ffcc",
    fontSize: 12,
    marginBottom: 8,
    opacity: 0.8,
  },
  dataJson: {
    color: "#fff",
    fontFamily: "monospace",
    fontSize: 14,
  }
});
