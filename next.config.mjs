import createMDX from '@next/mdx'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Enable MDX support for .mdx files in app directory
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  experimental: {
    ppr: 'incremental',
    inlineCss: true,
    reactCompiler: true,
    // MDX is already optimized with React Server Components
    mdxRs: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bevgyjm5apuichhj.public.blob.vercel-storage.com",
        port: "",
        pathname: "/**",
        search: "",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/insights/vitals.js",
        destination:
          "https://cdn.vercel-insights.com/v1/speed-insights/script.js",
      },
      {
        source: "/insights/events.js",
        destination: "https://cdn.vercel-insights.com/v1/script.js",
      },
      {
        source: "/hfi/events/:slug*",
        destination:
          "https://vitals.vercel-insights.com/v1/:slug*?dsn=KD0ni5HQVdxsHAF2tqBECObqH",
      },
      {
        source: "/hfi/vitals",
        destination:
          "https://vitals.vercel-insights.com/v2/vitals?dsn=fsGnK5U2NRPzYx0Gch0g5w5PxT1",
      },
    ];
  },
};

// Wrap Next.js config with MDX
const withMDX = createMDX({
  // Performance optimizations
  options: {
    // Optimize MDX compilation
    remarkPlugins: [],
    rehypePlugins: [],
    // Enable strict mode for better error handling
    development: process.env.NODE_ENV === 'development',
  },
})

export default withMDX(nextConfig);
