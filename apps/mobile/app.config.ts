import config from './app.json';
export default {
  ...config.expo,
  experiments: { ...config.expo.experiments, baseUrl: process.env.EXPO_PUBLIC_BASE_PATH ?? '' },
};
