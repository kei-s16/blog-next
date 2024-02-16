/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    swcMinify: true,
  },
};

const { withContentlayer } = require('next-contentlayer')
module.exports = withContentlayer(nextConfig);
