/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: "../../"
  },
  serverExternalPackages: ["@prisma/client", "@repo/db"],
  output: "standalone",
};

export default nextConfig;
