/** @type {import('@babel/core').TransformOptions} */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          // https://github.com/pmndrs/zustand/discussions/1967#discussioncomment-12801707
          unstable_transformImportMeta: true,
        },
      ],
    ],
    plugins: ["react-native-reanimated/plugin"],
  };
};
