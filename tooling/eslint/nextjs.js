const config = {
  extends: ["plugin:@next/next/core-web-vitals"],
  rules: {
    "@next/next/no-html-link-for-pages": "off",
    "@typescript-eslint/require-await": "off",
    "@typescript-eslint/triple-slash-reference": "off",
  },
};

module.exports = config;
