/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  clearMocks: true,
  transformIgnorePatterns: [
    "node_modules/(?!(.pnpm|(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|nativewind|react-native-css-interop|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|@shopify/flash-list|react-native-mmkv|react-native-toast-message|lucide-react-native|clsx|tailwind-merge|superjson|immer|zustand|@trpc|@tanstack))",
  ],
  testMatch: ["**/?(*.)+(spec|test).[tj]s?(x)"],
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/app/$1",
    "^@test/(.*)$": "<rootDir>/test/$1",
  },
  collectCoverageFrom: ["app/**/*.{ts,tsx}", "!app/config/**", "!app/i18n/en.ts", "!app/**/*.d.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
};
