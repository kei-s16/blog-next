/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
    reactStrictMode: true,
    swcMinify: true,
  },
};

const { withContentlayer } = require('next-contentlayer')
module.exports = withContentlayer(nextConfig);
