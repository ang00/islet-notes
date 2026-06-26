import { getSortedNotebooks } from '@/core/diary/selectors';
import { useService } from '@/hooks/use-service';
import { useWatchEvent } from '@/hooks/use-watch-event';
import { useDiaryModel } from '@/mobile/hooks/useDiaryModel';
import { isExperienceMode } from '@/mobile/utils/experienceMode';
import { IFileAssetService } from '@/services/fileAsset/common/fileAssetService';
import React from 'react';
import { Navigate } from 'react-router';

export function HomeRedirect() {
  const fileAssetService = useService(IFileAssetService);
  useWatchEvent(fileAssetService.onDidChangeConfig);
  const canUseApp = isExperienceMode() || !!fileAssetService.getSyncConfig();
  const model = useDiaryModel();
  const targetNotebook = getSortedNotebooks(model)[0];

  if (!canUseApp) return <Navigate to='/startup' replace />;
  if (!targetNotebook || targetNotebook.lockedAt) return <Navigate to='/diaries' replace />;
  return <Navigate to={`/diary/${targetNotebook.id}`} replace />;
}
