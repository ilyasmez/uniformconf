/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverRuntimeConfig: {
    projectId: process.env.UNIFORM_PROJECT_ID,
    apiKey: process.env.UNIFORM_API_KEY,
    canvasApiHost: process.env.UNIFORM_CLI_BASE_URL || "https://uniform.app",
    previewSecret: process.env.UNIFORM_PREVIEW_SECRET || "uniformconf",
    figmaAccessToken: process.env.FIGMA_ACCESS_TOKEN,
    figmaFile: process.env.FIGMA_FILE,
  },
  publicRuntimeConfig: {
    gaTrackingId: process.env.GA_UA_ID,
    edgeEnabled: false,
  },
};

module.exports = nextConfig;
