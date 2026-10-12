import { DirectionalHint, ICalloutProps, ResponsiveMode } from '@fluentui/react';

// How every dropdown menu in the app opens: directly under the box that
// opened it, exactly as wide as that box, scrolling past a fixed height.
//
// Left to Fluent's defaults, a menu that didn't fit below its box was moved
// to whichever side had room — beside the box, covering the fields next to
// it — and a ComboBox's menu was sized to its content, so short options
// (one- or two-digit hours and minutes) made a sliver too narrow to read.
// Pinning the direction alone wasn't enough (it was tried on the time fields
// first): a list taller than the space below still had nowhere to go. The
// height cap is what lets "always below" actually hold.
//
// Spread these BEFORE a control's own props, so a caller can still override.
const MENU_CALLOUT_PROPS: ICalloutProps = {
  directionalHint: DirectionalHint.bottomLeftEdge,
  directionalHintFixed: true,
  calloutMaxHeight: 360,
};

// Fluent's Dropdown already matches the menu to its own width unless given a
// dropdownWidth. On a narrow screen (under ~640px) it doesn't open a menu at
// all, but a full-height Panel sliding in from the right edge of the screen,
// detached from the box. Claiming a large screen keeps it a menu everywhere.
export const dropdownMenuProps = { calloutProps: MENU_CALLOUT_PROPS, responsiveMode: ResponsiveMode.large };

// ComboBox sizes its menu to the content unless told otherwise.
export const comboBoxMenuProps = { calloutProps: MENU_CALLOUT_PROPS, useComboBoxAsMenuWidth: true };
