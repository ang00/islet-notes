import { localize } from '@/nls';
import { languageOptions } from '@/locales/common/locale';
import { CellListGroup } from '@/mobile/components/CellList';
import { HeaderPage } from '@/mobile/components/layout/HeaderPage';
import { LanguageSettings } from '@/mobile/test.id';
import React, { useState } from 'react';

type LanguagePreference = 'auto' | 'en-US' | 'zh-CN' | 'zh-TW' | 'ko-KR' | 'ja-JP' | 'fr-FR' | 'de-DE';

function getLanguagePreference(): LanguagePreference {
  const saved = localStorage.getItem('language');
  const valid: LanguagePreference[] = ['en-US', 'zh-CN', 'zh-TW', 'ko-KR', 'ja-JP', 'fr-FR', 'de-DE'];
  return (valid as string[]).includes(saved ?? '') ? (saved as LanguagePreference) : 'auto';
}

export function SettingsLanguagePage() {
  const [language, setLanguage] = useState<LanguagePreference>(getLanguagePreference());

  const save = () => {
    if (language === 'auto') {
      localStorage.removeItem('language');
    } else {
      localStorage.setItem('language', language);
    }
    window.location.reload();
  };

  return (
    <HeaderPage
      pageTestId={LanguageSettings.page}
      contentTestId={LanguageSettings.content}
      header={{
        title: localize('settings.language', 'Language'),
        showBack: true,
        right: {
          type: 'button',
          label: localize('common.save', 'Save'),
          onClick: save,
        },
      }}
    >
      <CellListGroup
        items={languageOptions.map((option) => ({
          type: 'option' as const,
          key: option.value,
          label:
            option.value === 'auto'
              ? localize('settings.followSystem', 'Follow system')
              : option.label,
          selected: language === option.value,
          testId:
            option.value === 'en-US'
              ? LanguageSettings.english
              : option.value === 'zh-CN'
                ? LanguageSettings.chinese
                : LanguageSettings.option,
          onClick: () => setLanguage(option.value as LanguagePreference),
        }))}
      />
    </HeaderPage>
  );
}
