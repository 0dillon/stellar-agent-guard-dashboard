import nextConfig from "eslint-config-next";

// `eslint-config-next` exports an array of flat configs, so it is spread rather
// than called. Kept as the project's only lint preset so the CI gate lints with
// exactly the rules a `next lint` user would see.
const config = [
  ...nextConfig,
  {
    ignores: [".next/**", ".cache/**", "node_modules/**", "vendor/**"],
  },
];

export default config;
