/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
    swcMinify: true,
  },
};

const { withContentlayer } = require('next-contentlayer')
module.exports = withContentlayer(nextConfig);
