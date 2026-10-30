// Lets a build live at another address, for the preview site:
//   MF_BASE_URL=/mathflash/preview npx expo export --platform web
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    baseUrl: process.env.MF_BASE_URL ?? config.experiments?.baseUrl,
  },
});
