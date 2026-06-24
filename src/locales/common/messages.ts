import enUS from '../en-US.json';
import zhCN from '../zh-CN.json';
import zhTW from '../zh-TW.json';
import koKR from '../ko-KR.json';
import jaJP from '../ja-JP.json';
import frFR from '../fr-FR.json';
import deDE from '../de-DE.json';
import { getValidLocaleKey } from './locale';

const messages: Record<string, Record<string, string | { content: string }>> = {
  'en-US': enUS,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'ko-KR': koKR,
  'ja-JP': jaJP,
  'fr-FR': frFR,
  'de-DE': deDE,
};

export function configMessages(localeInput: string) {
  const locale = getValidLocaleKey(localeInput);
  globalThis.language = locale;
  globalThis.i18nMessages = messages[locale] ?? enUS;

  Object.keys(globalThis.i18nMessages).forEach((key) => {
    if (typeof globalThis.i18nMessages[key] !== 'string') {
      globalThis.i18nMessages[key] = globalThis.i18nMessages[key].content;
    }
  });
}
