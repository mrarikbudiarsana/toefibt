/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.com' },
    ],
  },
  // Optimise for test-taking — no static pre-rendering of test pages
  experimental: {
    // serverActions are enabled by default in Next.js 14+
  },
};

export default nextConfig;
