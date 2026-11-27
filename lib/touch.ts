// Touch targets. Fluent's IconButton is 32px square, comfortable for a mouse
// but under the 44px a finger needs. These styles grow it to 44px only where
// the main pointer is coarse (a phone, a touchscreen), so desktop layouts
// keep their density.
import type { IButtonStyles } from '@fluentui/react';

/** Minimum touch target in px. */
export const TOUCH_TARGET = 44;

/** Media query for a coarse main pointer (a finger rather than a mouse). */
export const COARSE_POINTER = '@media (pointer: coarse)';

/** Pass as `styles` to an IconButton: 44px square on touch screens. */
export const touchIconButtonStyles: IButtonStyles = {
  root: { selectors: { [COARSE_POINTER]: { width: TOUCH_TARGET, height: TOUCH_TARGET } } },
};
