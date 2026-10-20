import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Dynamic Expo config. API URL comes from EXPO_PUBLIC_API_URL at build time
 * (.env locally, eas.json env, or EAS Secrets for production).
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const appJson = require("./app.json");

  return {
    ...appJson.expo,
    ...config,
    extra: {
      ...appJson.expo?.extra,
      ...config.extra,
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      eas: appJson.expo?.extra?.eas,
    },
  };
};
