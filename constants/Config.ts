import Constants from 'expo-constants';

function requireApiUrl(): string {
  const url =
    process.env.EXPO_PUBLIC_API_URL ||"https://backend.elilitapp.com/api/v1/"||
    (Constants.expoConfig?.extra?.apiUrl as string | undefined);

  if (url && typeof url === 'string' && url.trim().length > 0) {
    return url.trim().replace(/\/$/, '');
  }

  if (__DEV__) {
    console.warn(
      '[Config] EXPO_PUBLIC_API_URL is not set. Please define EXPO_PUBLIC_API_URL in your .env file or Expo environment variables.'
    );
  } else {
    console.error(
      '[Config] EXPO_PUBLIC_API_URL is missing. Ensure EXPO_PUBLIC_API_URL is configured in your EAS project environment variables.'
    );
  }

  return '';
}

const API_URL = requireApiUrl();

/** Origin for media paths returned as /media/... from the API */
const API_ORIGIN = API_URL ? API_URL.replace(/\/api\/v1\/?$/, '') : '';

export default {
  API_URL,
  API_ORIGIN,
};
