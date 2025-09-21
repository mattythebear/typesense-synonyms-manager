// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.foodservicedirect.com',
      },
      {
        protocol: 'https',
        hostname: '**.foodservicedirect.ca',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 's3.amazonaws.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'www.foodservicedirect.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'magento.foodservicedirect.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'mcstaging4.foodservicedirect.net',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'mcstaging4.foodservicedirect.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'canada-mcstaging4.foodservicedirect.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'static.foodservicedirect.net',
        pathname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'colaborweb.blob.core.windows.net',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'fsd-canada.s3.amazonaws.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'drryor7280ntb.cloudfront.net',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'fsd-usa-staging.s3.us-east-2.amazonaws.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '**',
      },
    ],
  },
}

module.exports = nextConfig