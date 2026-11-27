import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogType,
  DialogFooter,
  PrimaryButton,
  DefaultButton,
  useTheme,
} from '@fluentui/react';

// A Promise-based, in-app replacement for window.confirm(). Native confirm()
// is unreliable on mobile browsers (it can silently never appear, so a delete
// button looks like it does nothing). Call confirmAsync() from any async event
// handler, await the result, and proceed exactly like the old
// `if (!window.confirm(...)) return;` pattern.
//
// Mount <ConfirmDialogHost /> exactly once, near the app root (inside your
// Fluent ThemeProvider). Without it, confirmAsync() falls back to
// window.confirm() rather than letting a destructive action through
// unconfirmed.

export interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  // Red confirm button for destructive actions (delete, remove, etc).
  danger?: boolean;
}

type Opener = (message: string, options?: ConfirmOptions) => Promise<boolean>;

let currentOpener: Opener | null = null;

export function confirmAsync(message: string, options?: ConfirmOptions): Promise<boolean> {
  if (!currentOpener) {
    // ConfirmDialogHost isn't mounted: fall back to the native dialog rather
    // than silently resolving true.
    return Promise.resolve(window.confirm(message));
  }
  return currentOpener(message, options);
}

// Mount exactly once, at the app root. Every confirmAsync() call anywhere in
// the app is served by this single instance.
export const ConfirmDialogHost: React.FC = () => {
  const [pending, setPending] = useState<{ message: string; options?: ConfirmOptions } | null>(null);
  const resolveRef = useRef<((result: boolean) => void) | null>(null);
  const theme = useTheme();

  const open = useCallback((message: string, options?: ConfirmOptions) => {
    return new Promise<boolean>(resolve => {
      resolveRef.current = resolve;
      setPending({ message, options });
    });
  }, []);

  // Registering the singleton is a side effect, so it happens after commit,
  // not during render.
  useEffect(() => {
    currentOpener = open;
    return () => { currentOpener = null; };
  }, [open]);

  const close = (result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setPending(null);
  };

  // Only mount the Dialog (and its Layer) while something is pending. A
  // permanently mounted hidden Dialog keeps its Layer subscribed to theme
  // changes, which conflicts with an app calling loadTheme() during render.
  if (!pending) return null;

  return (
    <Dialog
      hidden={false}
      onDismiss={() => close(false)}
      dialogContentProps={{
        type: DialogType.normal,
        title: pending.options?.title ?? 'Confirm',
        subText: pending.message,
      }}
      modalProps={{ isBlocking: true }}
    >
      <DialogFooter>
        <PrimaryButton
          onClick={() => close(true)}
          text={pending.options?.confirmText ?? 'Delete'}
          styles={pending.options?.danger ? { root: { background: theme.palette.redDark, border: 'none' } } : undefined}
        />
        <DefaultButton onClick={() => close(false)} text={pending.options?.cancelText ?? 'Cancel'} />
      </DialogFooter>
    </Dialog>
  );
};

export default ConfirmDialogHost;
