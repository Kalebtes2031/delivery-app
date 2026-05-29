type LocaleModule = { default: Record<string, unknown> };
type LocaleResources = Record<string, Record<string, Record<string, unknown>>>;

declare const require: {
  context: (
    directory: string,
    useSubdirectories: boolean,
    regExp: RegExp
  ) => {
    keys: () => string[];
    (id: string): LocaleModule;
  };
};

const localeContext = require.context("./locales", true, /\.ts$/);

export const resources = localeContext.keys().reduce<LocaleResources>((acc, key) => {
  const match = key.match(/^\.\/([^/]+)\/(.+)\.ts$/);
  if (!match) return acc;

  const [, language, namespacePath] = match;
  const namespace = namespacePath.replace(/\//g, ".");

  acc[language] ??= {};
  acc[language][namespace] = localeContext(key).default;

  return acc;
}, {});

export const defaultNS = "common";
