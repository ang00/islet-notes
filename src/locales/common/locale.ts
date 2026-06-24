import { enUS, zhCN, zhTW, ko, ja, fr, de } from 'date-fns/locale';

export const languageOptions = [
  {
    label: 'Follow System',
    value: 'auto',
  },
  {
    label: 'English',
    value: 'en-US',
  },
  {
    label: '简体中文',
    value: 'zh-CN',
  },
  {
    label: '繁體中文',
    value: 'zh-TW',
  },
  {
    label: '한국어',
    value: 'ko-KR',
  },
  {
    label: '日本語',
    value: 'ja-JP',
  },
  {
    label: 'Français',
    value: 'fr-FR',
  },
  {
    label: 'Deutsch',
    value: 'de-DE',
  },
];

const locales = {
  'en-US': ['en-US', 'en'],
  'zh-CN': ['zh-CN', 'zh'],
  'zh-TW': ['zh-TW', 'zh-Hant', 'zh-TW'],
  'ko-KR': ['ko-KR', 'ko'],
  'ja-JP': ['ja-JP', 'ja'],
  'fr-FR': ['fr-FR', 'fr'],
  'de-DE': ['de-DE', 'de'],
} as const;

export function getDateFnsLocale(locale = getCurrentLocale()) {
  switch (locale) {
    case 'zh-CN': return zhCN;
    case 'zh-TW': return zhTW;
    case 'ko-KR': return ko;
    case 'ja-JP': return ja;
    case 'fr-FR': return fr;
    case 'de-DE': return de;
    default: return enUS;
  }
}

export function getCurrentLocale(): string {
  if (globalThis.language && locales[globalThis.language as keyof typeof locales]) {
    return globalThis.language;
  }
  return 'en-US';
}

export function getValidLocaleKey(configLanguage: string) {
  let finalLocale = 'en-US';
  Object.keys(locales).forEach((key) => {
    const alias = locales[key as keyof typeof locales];
    if ((alias as readonly string[]).includes(configLanguage)) {
      finalLocale = key;
    }
  });

  return finalLocale;
}
