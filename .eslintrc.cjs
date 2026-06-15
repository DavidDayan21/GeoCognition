module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  plugins: ["@typescript-eslint", "react-hooks"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "prettier",
  ],
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "no-console": "error",
  },
  overrides: [
    {
      files: ["scripts/**/*.ts"],
      env: { node: true, browser: false },
      rules: { "no-console": "off" },
    },
    {
      files: ["tests/**/*.ts", "**/*.test.ts", "**/*.test.tsx"],
      env: { node: true },
    },
  ],
  ignorePatterns: [
    "dist",
    "node_modules",
    "src-tauri/target",
    "src-tauri/gen",
    "playwright-report",
    "test-results",
  ],
};
