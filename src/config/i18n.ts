export const supportedLocales = ["lo", "en", "zh"] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "lo";
