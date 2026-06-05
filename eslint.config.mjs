import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"

const eslintConfig = [
  {
    ignores: ["dist/**", ".next/**", "node_modules/**"],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Existing tables/hooks use established patterns; avoid blocking CI on new strict defaults.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
]

export default eslintConfig
