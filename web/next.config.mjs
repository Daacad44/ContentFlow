/** @type {import('next').NextConfig} */
const apiProxy = process.env.API_PROXY_URL ?? 'http://localhost:4000';

const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  /** Proxy /api/v1/* to the Express backend (local or ngrok/Railway in production). */
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiProxy}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
