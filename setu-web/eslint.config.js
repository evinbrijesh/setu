import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        // Browser globals
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        crypto: "readonly",
        URL: "readonly",
        Audio: "readonly",
        WebSocket: "readonly",
        MediaRecorder: "readonly",
        Blob: "readonly",
        fetch: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        // Node globals (Vite config, etc.)
        process: "readonly",
        import: "readonly",
      },
    },
    rules: {
      // Relax rules that are noisy for a hackathon codebase
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": "off",
    },
  },
  {
    ignores: ["dist/", "node_modules/", "ui_ideas/"],
  },
];
