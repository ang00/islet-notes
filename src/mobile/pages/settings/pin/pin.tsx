import { hashPin } from '@/base/crypto/pin';
import { localize } from '@/nls';
import { CellListGroup } from '@/mobile/components/CellList';
import { HeaderPage } from '@/mobile/components/layout/HeaderPage';
import { useDialog } from '@/mobile/overlay/dialog/useDialog';
import { useTextInputDialog } from '@/mobile/overlay/textInputDialog/useTextInputDialog';
import { useSuccessToast } from '@/mobile/overlay/successToast/useSuccessToast';
import { useService } from '@/hooks/use-service';
import { IHostService } from '@/services/native/common/hostService';
import React, { useEffect, useState } from 'react';

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

export function SettingsPinPage() {
  const hostService = useService(IHostService);
  const showTextInputDialog = useTextInputDialog();
  const showDialog = useDialog();
  const showSuccessToast = useSuccessToast();
  const [hasPin, setHasPin] = useState(false);

  useEffect(() => {
    getStoredPinHash(hostService).then((hash) => setHasPin(!!hash));
  }, [hostService]);

  const refreshPinState = () => {
    getStoredPinHash(hostService).then((hash) => setHasPin(!!hash));
  };

  const verifyPin = async (): Promise<string | null> => {
    const storedHash = await getStoredPinHash(hostService);
    if (!storedHash) return null;
    return new Promise((resolve) => {
      showTextInputDialog({
        title: localize('settings.enterPin', 'Enter current PIN'),
        value: '',
        placeholder: localize('settings.enterPin', 'Enter current PIN'),
        saveLabel: localize('common.confirm', 'Confirm'),
        cancelLabel: localize('common.cancel', 'Cancel'),
        onSave: async (value) => {
          const inputHash = await hashPin(value.trim());
          if (inputHash === storedHash) {
            resolve(value.trim());
          } else {
            showDialog({
              message: localize('settings.pinWrong', 'Wrong PIN'),
              confirmLabel: localize('common.ok', 'OK'),
              cancelLabel: localize('common.cancel', 'Cancel'),
              onConfirm: () => resolve(null),
            });
          }
        },
      });
    });
  };

  const handleSetPin = () => {
    showTextInputDialog({
      title: localize('settings.enterNewPin', 'Set a 4-digit PIN'),
      value: '',
      placeholder: localize('settings.enterNewPin', 'Enter 4 digits'),
      saveLabel: localize('common.next', 'Next'),
      cancelLabel: localize('common.cancel', 'Cancel'),
      onSave: async (value) => {
        const pin = value.trim();
        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
          showDialog({
            message: localize('settings.pinInvalid', 'PIN must be 4 digits'),
            confirmLabel: localize('common.ok', 'OK'),
            cancelLabel: localize('common.cancel', 'Cancel'),
            onConfirm: () => {},
          });
          return;
        }
        showTextInputDialog({
          title: localize('settings.confirmPin', 'Confirm PIN'),
          value: '',
          placeholder: localize('settings.confirmPin', 'Enter again'),
          saveLabel: localize('common.save', 'Save'),
          cancelLabel: localize('common.cancel', 'Cancel'),
          onSave: async (confirmValue) => {
            if (confirmValue.trim() !== pin) {
              showDialog({
                message: localize('settings.pinMismatch', 'PINs do not match'),
                confirmLabel: localize('common.ok', 'OK'),
                cancelLabel: localize('common.cancel', 'Cancel'),
                onConfirm: () => {},
              });
              return;
            }
            const hash = await hashPin(pin);
            await setStoredPinHash(hostService, hash);
            showSuccessToast({ message: localize('settings.pinSet', 'PIN has been set') });
            refreshPinState();
          },
        });
      },
    });
  };

  const handleChangePin = async () => {
    const oldPin = await verifyPin();
    if (!oldPin) return;
    showTextInputDialog({
      title: localize('settings.enterNewPin', 'Enter new 4-digit PIN'),
      value: '',
      placeholder: localize('settings.enterNewPin', 'Enter 4 digits'),
      saveLabel: localize('common.next', 'Next'),
      cancelLabel: localize('common.cancel', 'Cancel'),
      onSave: async (value) => {
        const newPin = value.trim();
        if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
          showDialog({
            message: localize('settings.pinInvalid', 'PIN must be 4 digits'),
            confirmLabel: localize('common.ok', 'OK'),
            cancelLabel: localize('common.cancel', 'Cancel'),
            onConfirm: () => {},
          });
          return;
        }
        showTextInputDialog({
          title: localize('settings.confirmPin', 'Confirm PIN'),
          value: '',
          placeholder: localize('settings.confirmPin', 'Enter again'),
          saveLabel: localize('common.save', 'Save'),
          cancelLabel: localize('common.cancel', 'Cancel'),
          onSave: async (confirmValue) => {
            if (confirmValue.trim() !== newPin) {
              showDialog({
                message: localize('settings.pinMismatch', 'PINs do not match'),
                confirmLabel: localize('common.ok', 'OK'),
                cancelLabel: localize('common.cancel', 'Cancel'),
                onConfirm: () => {},
              });
              return;
            }
            const hash = await hashPin(newPin);
            await setStoredPinHash(hostService, hash);
            showSuccessToast({ message: localize('settings.pinChanged', 'PIN has been changed') });
            refreshPinState();
          },
        });
      },
    });
  };

  const handleRemovePin = () => {
    showDialog({
      message: localize('settings.removePinConfirm', 'Remove PIN? Locked notebooks will no longer be protected.'),
      confirmLabel: localize('common.delete', 'Remove'),
      cancelLabel: localize('common.cancel', 'Cancel'),
      onConfirm: async () => {
        const oldPin = await verifyPin();
        if (!oldPin) return;
        await clearStoredPinHash(hostService);
        showSuccessToast({ message: localize('settings.pinRemoved', 'PIN has been removed') });
        refreshPinState();
      },
    });
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
    </HeaderPage>
  );
}
