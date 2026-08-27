/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: "../../"
  },
  serverExternalPackages: ["@prisma/client", "@repo/db"],
  output: "standalone",
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
