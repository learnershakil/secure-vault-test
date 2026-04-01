const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Disable Developer Menu and debug features in production completely
if (process.env.NODE_ENV === 'production') {
  config.transformer.minifierConfig = {
    ...config.transformer.minifierConfig,
    compress: {
      ...config.transformer.minifierConfig?.compress,
      drop_console: true, // Strips console.log
      drop_debugger: true, // Strips debugger statements
    },
  };
  
  // Strict Obfuscation settings using react-native-obfuscating-transformer or obfuscator-io-metro-plugin
  config.transformer.babelTransformerPath = require.resolve('react-native-obfuscating-transformer');
  
  config.transformer.obfuscatorOptions = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 1,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 1,
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: false,
    stringArray: true,
    stringArrayEncoding: ['base64', 'rc4'],
    stringArrayThreshold: 1,
    unicodeEscapeSequence: false,
  };
}

module.exports = config;
