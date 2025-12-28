const { FileStore } = require("metro-cache");
const { withNativeWind } = require("nativewind/metro");
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config");
const path = require("node:path");

const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = withTurborepoManagedCache(
  withNativeWind(wrapWithReanimatedMetroConfig(getSentryExpoConfig(__dirname)), {
    input: "./global.css",
    configPath: "./tailwind.config.ts",
  })
);

// XXX: Resolve our exports in workspace packages
// https://github.com/expo/expo/issues/26926
config.resolver.unstable_enablePackageExports = true;

// This helps support certain popular third-party libraries
// such as Firebase that use the extension cjs.
config.resolver.sourceExts.push("cjs");

// Add support for lottie files
config.resolver.assetExts.push("lottie");

module.exports = config;

/**
 * Move the Metro cache to the `.cache/metro` folder.
 * If you have any environment variables, you can configure Turborepo to invalidate it when needed.
 *
 * @see https://turbo.build/repo/docs/reference/configuration#env
 * @param {import('expo/metro-config').MetroConfig} config
 * @returns {import('expo/metro-config').MetroConfig}
 */
function withTurborepoManagedCache(config) {
  config.cacheStores = [new FileStore({ root: path.join(__dirname, ".cache/metro") })];
  return config;
}
