/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // pdf.js references `canvas` only in Node; not needed in the browser build.
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
