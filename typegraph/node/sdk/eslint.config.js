import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config({
  languageOptions: { globals: globals.browser },
  ignores: ["dist/**", "node_modules/**", "src/gen/**"],
  extends: [
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
  ],
  rules: {
    // turn off rules that don't apply to JS code
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-explicit-any": "off",
  },
});
