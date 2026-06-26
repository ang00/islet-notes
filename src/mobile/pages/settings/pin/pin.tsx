import { hashPin } from '@/base/crypto/pin';
import { localize } from '@/nls';
import { CellListGroup } from '@/mobile/components/CellList';
import { HeaderPage } from '@/mobile/components/layout/HeaderPage';
import { PinDialog } from '@/mobile/components/PinDialog/PinDialog';
import { useDialog } from '@/mobile/overlay/dialog/useDialog';
import { useSuccessToast } from '@/mobile/overlay/successToast/useSuccessToast';
import { useService } from '@/hooks/use-service';
import { IHostService } from '@/services/native/common/hostService';
import React, { useCallback, useEffect, useState } from 'react';

const PIN_KEY = 'islet.pinHash';

async function getStoredPinHash(hostService: IHostService): Promise<string | undefined> {
  return hostService.getPreference<string>(PIN_KEY);
}

async function setStoredPinHash(hostService: IHostService, hash: string): Promise<void> {
  await hostService.savePreference(PIN_KEY, hash);
}

async function clearStoredPinHash(hostService: IHostService): Promise<void> {
  await hostService.clearPreference(PIN_KEY);
}

type PinFlow =
  | { step: 'set-enter' }
  | { step: 'set-confirm'; firstPin: string }
  | { step: 'change-verify' }
  | { step: 'change-enter' }
  | { step: 'change-confirm'; newPin: string }
  | { step: 'remove-verify' }
  ;

export function SettingsPinPage() {
  const hostService = useService(IHostService);
  const showDialog = useDialog();
  const showSuccessToast = useSuccessToast();
  const [hasPin, setHasPin] = useState(false);
  const [pinFlow, setPinFlow] = useState<PinFlow | null>(null);

  useEffect(() => {
    getStoredPinHash(hostService).then((hash) => setHasPin(!!hash));
  }, [hostService]);

  const refreshPinState = useCallback(() => {
    getStoredPinHash(hostService).then((hash) => setHasPin(!!hash));
  }, [hostService]);

  const handleSetPin = useCallback(() => {
    setPinFlow({ step: 'set-enter' });
  }, []);

  const handleChangePin = useCallback(() => {
    setPinFlow({ step: 'change-verify' });
  }, []);

  const handleRemovePin = useCallback(() => {
    showDialog({
      message: localize('settings.removePinConfirm', 'Remove PIN? Locked notebooks will no longer be protected.'),
      confirmLabel: localize('common.delete', 'Remove'),
      cancelLabel: localize('common.cancel', 'Cancel'),
      onConfirm: () => setPinFlow({ step: 'remove-verify' }),
    });
  }, [showDialog]);

  const renderPinDialog = () => {
    if (!pinFlow) return null;

    switch (pinFlow.step) {
      case 'set-enter':
        return (
          <PinDialog key='set-enter'
            title={localize('settings.enterNewPin', 'Enter new 4-digit PIN')}
            onConfirm={async (pin) => {
              setPinFlow({ step: 'set-confirm', firstPin: pin });
              return true;
            }}
            onCancel={() => setPinFlow(null)}
          />
        );
      case 'set-confirm':
        return (
          <PinDialog key='set-confirm'
            title={localize('settings.confirmPin', 'Confirm PIN')}
            errorMessage={localize('settings.pinMismatch', 'PINs do not match')}
            onConfirm={async (pin) => {
              if (pin !== pinFlow.firstPin) return false;
              const hash = await hashPin(pin);
              await setStoredPinHash(hostService, hash);
              setPinFlow(null);
              showSuccessToast({ message: localize('settings.pinSet', 'PIN has been set') });
              refreshPinState();
              return true;
            }}
            onCancel={() => setPinFlow(null)}
          />
        );
      case 'change-verify': {
        return (
          <PinDialog key='change-verify'
            title={localize('settings.enterPin', 'Enter current PIN')}
            onConfirm={async (pin) => {
              const storedHash = await getStoredPinHash(hostService);
              if (!storedHash) return false;
              const inputHash = await hashPin(pin);
              if (inputHash !== storedHash) return false;
              setPinFlow({ step: 'change-enter' });
              return true;
            }}
            onCancel={() => setPinFlow(null)}
          />
        );
      }
      case 'change-enter':
        return (
          <PinDialog key='change-enter'
            title={localize('settings.enterNewPin', 'Enter new 4-digit PIN')}
            onConfirm={async (pin) => {
              setPinFlow({ step: 'change-confirm', newPin: pin });
              return true;
            }}
            onCancel={() => setPinFlow(null)}
          />
        );
      case 'change-confirm':
        return (
          <PinDialog key='change-confirm'
            title={localize('settings.confirmPin', 'Confirm PIN')}
            errorMessage={localize('settings.pinMismatch', 'PINs do not match')}
            onConfirm={async (pin) => {
              if (pin !== pinFlow.newPin) return false;
              const hash = await hashPin(pin);
              await setStoredPinHash(hostService, hash);
              setPinFlow(null);
              showSuccessToast({ message: localize('settings.pinChanged', 'PIN has been changed') });
              refreshPinState();
              return true;
            }}
            onCancel={() => setPinFlow(null)}
          />
        );
      case 'remove-verify':
        return (
          <PinDialog key='remove-verify'
            title={localize('settings.enterPin', 'Enter PIN')}
            onConfirm={async (pin) => {
              const storedHash = await getStoredPinHash(hostService);
              if (!storedHash) return false;
              const inputHash = await hashPin(pin);
              if (inputHash !== storedHash) return false;
              await clearStoredPinHash(hostService);
              setPinFlow(null);
              showSuccessToast({ message: localize('settings.pinRemoved', 'PIN has been removed') });
              refreshPinState();
              return true;
            }}
            onCancel={() => setPinFlow(null)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <HeaderPage
      header={{ title: localize('settings.pin', 'PIN Lock'), showBack: true }}
    >
      <CellListGroup
        items={[
          ...(hasPin
            ? [
                {
                  label: localize('settings.changePin', 'Change PIN'),
                  onClick: handleChangePin,
                },
                {
                  type: 'action' as const,
                  label: localize('settings.removePin', 'Remove PIN'),
                  danger: true,
                  onClick: handleRemovePin,
                },
              ]
            : [
                {
                  label: localize('settings.setPin', 'Set PIN'),
                  onClick: handleSetPin,
                },
              ]),
        ]}
      />
      {renderPinDialog()}
    </HeaderPage>
  );
}
