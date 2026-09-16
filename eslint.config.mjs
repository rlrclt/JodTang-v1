import nextConfig from "eslint-config-next";

const config = [
  // eslint-config-next ใช้ ignore เองบางส่วน — เราเพิ่มของโปรเจกต์นี้เองอีกชั้น
  // (build output ทุกรูปแบบ + worktree ของ worker ที่อยู่ในแผนผังโปรเจกต์)
  {
    ignores: [
      "**/.next/**",
      "**/.next.bak/**",
      ".worktrees/**",
      "**/node_modules/**",
      "next-env.d.ts",
      "coverage/**",
    ],
  },
  ...nextConfig,
];

export default config;
