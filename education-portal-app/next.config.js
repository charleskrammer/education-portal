/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // output: "standalone" is only for Docker/self-hosted deployments.
  // Vercel does not support this option and will break if it is set.
  // Set DOCKER_BUILD=1 in the Docker build stage to enable it.
  ...(process.env.DOCKER_BUILD === "1" ? { output: "standalone" } : {}),
};

module.exports = nextConfig;
