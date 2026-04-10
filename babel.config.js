module.exports = {
  presets: ["module:@react-native/babel-preset"],
  plugins: [
    // ...outros plugins
    "react-native-reanimated/plugin", // sempre por último
  ],
};
