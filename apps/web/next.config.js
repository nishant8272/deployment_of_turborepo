/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: "../../"
  },
  serverExternalPackages: ["@prisma/client", "@repo/db"]
};

export default nextConfig;
