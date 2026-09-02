import React, { useState } from 'react';
import { Stack, Label, Icon, DefaultButton, getTheme } from '@fluentui/react';

/// Whether the thing being checked is satisfied.
///
/// `unknown` is a distinct state rather than a falsy `ok`, because "we
/// haven't heard back yet" and "this is broken" should not look the same —
/// showing a red cross during a first poll reads as a fault the user then
/// tries to fix.
export type CheckStatus = 'ok' | 'fail' | 'unknown';

export interface CheckAction {
  label: string;
  /// Shown while `onClick` is in flight.
  busyLabel?: string;
  /// Returning a string shows it as a result message below the row —
  /// typically what was copied, or what to do next.
  onClick: () => string | void | Promise<string | void>;
}

export interface CheckFieldProps {
  label?: string;
  status: CheckStatus;
  /// Status text per state. The defaults are deliberately bland; a caller
  /// that says what specifically is wrong ("No access to /dev/uinput") is
  /// far more useful than a generic failure.
  okText?: string;
  failText?: string;
  unknownText?: string;
  /// Longer explanation shown above the status row.
  description?: React.ReactNode;
  /// Offered only when the check isn't already satisfied — there's nothing
  /// to fix when it passes, and a live button invites pointless clicking.
  action?: CheckAction;
  /// Shown when the check passes, for actions that remain useful anyway
  /// (re-copying a value, say).
  actionWhenOk?: boolean;
}

/// A pass/fail indicator with an optional one-click remedy.
///
/// Generalises a pattern this app had grown several hand-rolled copies of —
/// the virtual-gamepad udev rule, the Huenicorn install gate, the service
/// status rows — each with its own colours, its own spinner handling and its
/// own idea of what "unknown" looks like. The differences between them were
/// accidental rather than meaningful.
///
/// State lives here rather than in the field-type switch that renders it, so
/// using this doesn't add hooks to a component that renders every other field
/// type as well.
const CheckField: React.FC<CheckFieldProps> = ({
  label,
  status,
  okText = 'OK',
  failText = 'Not configured',
  unknownText = 'Checking…',
  description,
  action,
  actionWhenOk = false,
}) => {
  const theme = getTheme();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const color =
    status === 'ok' ? theme.palette.green
    : status === 'fail' ? theme.palette.redDark
    : theme.palette.neutralSecondary;

  const icon = status === 'ok' ? 'CheckMark' : status === 'fail' ? 'Cancel' : 'Sync';
  const text = status === 'ok' ? okText : status === 'fail' ? failText : unknownText;

  // Not offered while the answer is still unknown: acting on a check that
  // hasn't resolved is how you end up "fixing" something that was fine.
  const showAction = !!action && status !== 'unknown' && (status !== 'ok' || actionWhenOk);

  const run = async () => {
    if (!action) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await action.onClick();
      if (typeof result === 'string') setMessage(result);
    } catch (e: any) {
      setMessage(e?.message ?? 'Failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack tokens={{ childrenGap: 4 }} style={{ marginBottom: 8 }}>
      {label && <Label>{label}</Label>}
      {description && (
        <span style={{ fontSize: '0.8em', opacity: 0.75 }}>{description}</span>
      )}
      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 10 }}>
        <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 5 }}>
          <Icon iconName={icon} style={{ color, fontSize: 12 }} />
          <span style={{ fontSize: '0.8em', color }}>{text}</span>
        </Stack>
        {showAction && (
          <DefaultButton onClick={run} disabled={busy}>
            {busy ? (action!.busyLabel ?? 'Working…') : action!.label}
          </DefaultButton>
        )}
      </Stack>
      {message && (
        <span style={{ fontSize: '0.78em', opacity: 0.75 }}>{message}</span>
      )}
    </Stack>
  );
};

export default CheckField;
