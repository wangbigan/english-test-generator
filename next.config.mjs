const nextConfig = {
  serverExternalPackages: ['pdf-parse'],
  webpack: (config) => {
    config.externals.push('pdf-parse');
    return config;
  }
};

export default nextConfig