import nextConfig from "eslint-config-next";

const config = [
  {
    ignores: [
      "**/.next/**",
      ".worktrees/**",
      "**/node_modules/**",
      "next-env.d.ts",
      "coverage/**",
    ],
  },
  ...nextConfig,
];

export default config;
