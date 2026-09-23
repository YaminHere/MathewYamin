import createMDX from '@next/mdx';

/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  turbopack: {},
  allowedDevOrigins: ['192.168.1.5', 'localhost'],
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
});


export default withMDX(nextConfig);

