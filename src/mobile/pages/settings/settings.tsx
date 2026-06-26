import { APP_VERSION, PROJECT_COMMIT_HASH } from '@/base/common/version';
import { importPackage } from '@/helper/parser/importPackage';
import type { ImportAssetContent, ImportItem, ImportPackage } from '@/helper/parser/type';
import { localize } from '@/nls';
import { CellListGroup } from '@/mobile/components/CellList';
import { HeaderPage } from '@/mobile/components/layout/HeaderPage';
import { useDialog } from '@/mobile/overlay/dialog/useDialog';
import { useLoadingToast } from '@/mobile/overlay/loadingToast/useLoadingToast';
import { useSuccessToast } from '@/mobile/overlay/successToast/useSuccessToast';
import { exitExperienceMode, isExperienceMode } from '@/mobile/utils/experienceMode';
import { Settings } from '@/mobile/test.id';
import { styles } from '@/mobile/styles/ui';
import { useService } from '@/hooks/use-service';
import { IDiaryService } from '@/services/diary/common/diaryService';
import { IFileAssetService } from '@/services/fileAsset/common/fileAssetService';
import { INavigationService } from '@/services/navigationService/common/navigationService';
import React from 'react';

const EXPERIENCE_SEED_SOURCE = 'experience-test-data';
const EXPERIENCE_SEED_MARKER_KEY = 'islet.experienceSeedDataWritten';
const CHECK_IN_START_DAYS_AGO = 30;
const CHECK_IN_END_DAYS_AGO = 200;
const CHECK_IN_RECORDS_PER_DAY = 10;

export function SettingsPage() {
  const navigationService = useService(INavigationService);
  const diaryService = useService(IDiaryService);
  const fileAssetService = useService(IFileAssetService);
  const showDialog = useDialog();
  const showLoadingToast = useLoadingToast();
  const showSuccessToast = useSuccessToast();
  const experienceMode = isExperienceMode();

  const seedExperienceData = async () => {
    const loadingToast = showLoadingToast({
      message: localize('settings.experience.seedWriting', 'Adding sample data...'),
    });
    try {
      const added = await writeExperienceTestData(diaryService, fileAssetService);
      showSuccessToast({
        message: added
          ? localize('settings.experience.seedDone', 'Sample data added')
          : localize('settings.experience.seedExists', 'Sample data already exists'),
      });
    } catch {
      showSuccessToast({
        message: localize('settings.experience.seedFailed', 'Could not add sample data'),
      });
    } finally {
      loadingToast.dispose();
    }
  };

  return (
    <HeaderPage
      pageTestId={Settings.preferencesPage}
      contentTestId={Settings.preferencesContent}
      header={{ title: localize('settings.title', 'Settings'), showBack: true }}
    >
      <CellListGroup
        items={[
          {
            hide: experienceMode,
            label: localize('settings.s3', 'Cloud Sync'),
            testId: Settings.s3,
            onClick: () => navigationService.navigate({ path: '/settings/s3' }),
          },
          {
            label: localize('settings.import.title', 'Import'),
            testId: Settings.import,
            onClick: () => navigationService.navigate({ path: '/settings/import' }),
          },
          {
            label: localize('settings.language', 'Language'),
            right: { type: 'value', text: globalThis.language },
            testId: Settings.language,
            onClick: () => navigationService.navigate({ path: '/settings/language' }),
          },
          {
            label: localize('settings.groupTagManagement', 'Groups & Tags'),
            testId: Settings.preferences,
            onClick: () => navigationService.navigate({ path: '/settings/group-tag' }),
          },
          {
            label: localize('settings.theme', 'Theme'),
            testId: Settings.theme,
            onClick: () => navigationService.navigate({ path: '/settings/theme' }),
          },
          {
            label: localize('settings.version', 'Version'),
            right: { type: 'value', text: `${APP_VERSION} ${PROJECT_COMMIT_HASH.slice(0, 7)}` },
            testId: Settings.version,
          },
        ]}
      />
      <CellListGroup
        className={styles.Common.SectionGap}
        items={[
          {
            label: localize('settings.aiConfig', 'AI settings'),
            testId: Settings.ai,
            onClick: () => navigationService.navigate({ path: '/settings/ai' }),
          },
        ]}
      />
      {experienceMode && (
        <CellListGroup
          className={styles.Common.SectionGap}
          items={[
            {
              type: 'action',
              danger: true,
              label: localize('settings.experience.exit', 'Exit experience mode'),
              testId: Settings.exitExperience,
              onClick: () =>
                showDialog({
                  message: localize(
                    'settings.experience.exitConfirm',
                    'Exit experience mode? Data from this session will be cleared.',
                  ),
                  confirmLabel: localize('settings.experience.exitAction', 'Exit experience mode'),
                  cancelLabel: localize('common.cancel', 'Cancel'),
                  rootTestId: Settings.exitExperienceDialog,
                  confirmTestId: Settings.exitExperienceConfirm,
                  cancelTestId: Settings.exitExperienceCancel,
                  onConfirm: () => {
                    clearExperienceSeedMarker();
                    exitExperienceMode();
                  },
                }),
            },
            {
              type: 'action',
              label: localize('settings.experience.seedData', 'Add sample data'),
              testId: Settings.seedExperienceData,
              onClick: seedExperienceData,
            },
          ]}
        />
      )}
    </HeaderPage>
  );
}

async function writeExperienceTestData(
  diaryService: IDiaryService,
  fileAssetService: IFileAssetService,
): Promise<boolean> {
  if (hasExperienceSeedMarker()) return false;

  const existing = diaryService.modelState.entries.some(
    (entry) => entry.externalSource === EXPERIENCE_SEED_SOURCE && !entry.deletedAt,
  );
  if (existing) {
    markExperienceSeedWritten();
    return false;
  }

  const notebookId = diaryService.addNotebook('测试数据：打卡压测');
  const now = new Date();
  diaryService.setIgnoreDatabaseSync(true);
  try {
    await importPackage(await buildExperienceImportPackage(now), {
      notebookId,
      diaryService,
      fileAssetService,
    });
  } finally {
    diaryService.setIgnoreDatabaseSync(false);
  }

  markExperienceSeedWritten();
  return true;
}

async function buildExperienceImportPackage(now: Date): Promise<ImportPackage> {
  const assets = [
    { filename: 'moon-night.jpg', path: '/fixture/moon-night.jpg', mimeType: 'image/jpeg' },
    {
      filename: 'islet-girl-starry.png',
      path: '/fixture/islet-girl-starry.png',
      mimeType: 'image/png',
    },
  ];
  const assetContents = new Map<string, ImportAssetContent>();
  for (const asset of assets) {
    assetContents.set(asset.filename, {
      filename: asset.filename,
      mimeType: asset.mimeType,
      content: await fetchFixtureBytes(asset.path),
    });
  }

  const items = buildExperienceImportItems(now);

  return {
    source: {
      type: EXPERIENCE_SEED_SOURCE,
      filename: 'experience-test-data',
      size: items.length,
    },
    items,
    async *streamAssets() {
      yield assetContents.get('moon-night.jpg')!;
      yield assetContents.get('islet-girl-starry.png')!;
    },
  };
}

function buildExperienceImportItems(now: Date): ImportItem[] {
  const items: ImportItem[] = [];
  const thisWeekStart = getMonday(now);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const records = [
    {
      id: 'today-morning',
      text: '今天上午整理了日记本首页的图片长按问题，确认 WebView 调试可用。',
      date: atPastTime(now, 9, 20, now, 20),
    },
    {
      id: 'today-evening',
      text: '晚上回看了一下日历页，点击记录可以直接回到对应日记。',
      date: atPastTime(now, 20, 10, now, 10),
    },
    {
      id: 'this-week-plan',
      text: '本周计划：补齐移动端几个高频入口的体验细节。',
      date: atPastTime(addDays(thisWeekStart, 1), 10, 30, now, 30),
    },
    {
      id: 'this-week-note',
      text: '本周灵感：日历只负责回看，编辑和管理仍然回到日记页面完成。',
      date: atPastTime(addDays(thisWeekStart, 3), 16, 45, now, 15),
    },
    {
      id: 'last-week-review',
      text: '上周复盘：同步设置和导入流程的提示需要继续保持克制。',
      date: atTime(addDays(lastWeekStart, 2), 11, 5),
    },
    {
      id: 'last-week-life',
      text: '上周末拍了几张照片，适合作为日记本封面候选。',
      date: atTime(addDays(lastWeekStart, 5), 18, 20),
    },
    {
      id: 'last-month-summary',
      text: '上个月总结：先把核心记录链路做顺，再增加更多整理能力。',
      date: atTime(new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 12), 14, 0),
    },
    {
      id: 'last-month-life',
      text: '上个月有几天连续记录，日历上看起来很直观。',
      date: atTime(new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 24), 21, 15),
    },
  ];

  for (const record of records) {
    items.push({
      type: 'text',
      id: record.id,
      text: record.text,
      createdAt: record.date.getTime(),
    });
  }

  appendCheckInItems(items, now);
  appendFixtureImageItems(items, now);
  return items;
}

function appendFixtureImageItems(items: ImportItem[], now: Date): void {
  const fixtures = [
    {
      id: 'fixture-moon-night-today',
      filename: 'moon-night.jpg',
      date: atPastTime(now, 12, 30, now, 25),
    },
    {
      id: 'fixture-islet-girl-this-week',
      filename: 'islet-girl-starry.png',
      date: atPastTime(addDays(getMonday(now), 2), 19, 40, now, 35),
    },
    {
      id: 'fixture-moon-night-last-week',
      filename: 'moon-night.jpg',
      date: atTime(addDays(getMonday(now), -3), 8, 10),
    },
    {
      id: 'fixture-islet-girl-last-month',
      filename: 'islet-girl-starry.png',
      date: atTime(addMonths(now, -1), 22, 5),
    },
  ];

  for (const fixture of fixtures) {
    items.push({
      type: 'asset',
      mediaType: 'image',
      id: fixture.id,
      filename: fixture.filename,
      createdAt: fixture.date.getTime(),
    });
  }
}

async function fetchFixtureBytes(path: string): Promise<Uint8Array> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load fixture image: ${path}`);
  return new Uint8Array(await response.arrayBuffer());
}

function appendCheckInItems(items: ImportItem[], now: Date): void {
  let index = 0;
  for (let daysAgo = CHECK_IN_START_DAYS_AGO; daysAgo <= CHECK_IN_END_DAYS_AGO; daysAgo++) {
    const date = addDays(now, -daysAgo);
    for (let dailyIndex = 0; dailyIndex < CHECK_IN_RECORDS_PER_DAY; dailyIndex++) {
      const createdAt = atTime(date, 8 + dailyIndex, dailyIndex % 2 === 0 ? 10 : 40).getTime();
      index += 1;
      items.push({
        type: 'text',
        id: `check-in-${daysAgo}-${dailyIndex + 1}`,
        text: `第 ${index} 次打卡：${formatLocalDateTime(new Date(createdAt))}。`,
        createdAt,
      });
    }
  }
}

function getMonday(date: Date): Date {
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  return atTime(addDays(date, offset), 0, 0);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function addMonths(date: Date, months: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth() + months,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

function atTime(date: Date, hours: number, minutes: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
}

function atPastTime(
  date: Date,
  hours: number,
  minutes: number,
  now: Date,
  fallbackMinutesAgo: number,
): Date {
  const candidate = atTime(date, hours, minutes);
  if (candidate.getTime() <= now.getTime()) return candidate;
  return new Date(now.getTime() - fallbackMinutesAgo * 60_000);
}

function formatLocalDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function hasExperienceSeedMarker(): boolean {
  return sessionStorage.getItem(EXPERIENCE_SEED_MARKER_KEY) === 'true';
}

function markExperienceSeedWritten(): void {
  sessionStorage.setItem(EXPERIENCE_SEED_MARKER_KEY, 'true');
}

function clearExperienceSeedMarker(): void {
  sessionStorage.removeItem(EXPERIENCE_SEED_MARKER_KEY);
}
