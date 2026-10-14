---
name: hand-rolled-components
description: How to build a new visual component (a card, panel, status strip or similar shell) in an app built on typical-admin-fabric when no Fabric.tsx field type, list renderer or stock Fluent component fits - build it from Fluent v8 primitives and theme tokens, reuse the atoms in typical-admin-fabric/lib/templates, and put new reusable atoms there. Use before hand-rolling any component with inline styles.
license: MIT
---

# Hand-rolling a component

Apps on these libraries are built from `@fluentui/react` (v8) plus
typical-admin-fabric. There is no separate design system and no Fluent
"Card" package (`@fluentui/react-cards` and Fluent v9 are not used). So a
shell with no matching field type or Fluent component has to be hand-rolled,
but "hand-rolled" doesn't mean inventing arbitrary CSS.

First check you need one: a new field input belongs in
`lib/templates/Fabric.tsx` as a new `type` (see `form-schema`), a new way of
listing records is a list renderer (see `list-schema`), and a whole custom
admin slot is a decision for the user (see `reactive-admin`).

## Reuse the atoms that exist

Look in `typical-admin-fabric/lib/templates/` before writing a style value:

| Atom | What it is |
|---|---|
| `FormCard` | Card shell: a `0.25em` `themePrimary` top border, `0.77em` padding, a soft two-layer shadow. Wrap any content. |
| `ThumbnailCard` | Fixed-size tile: header row (title + `actions`), image or custom content below, `onThumbnailClick`. |
| `WideCard` | Horizontal card: image left, children right, whole card clickable. Same accent + shadow as `FormCard`. |
| `CheckField` | Pass/fail/unknown status row with an optional remedy button. |
| `SearchableSelect`, `SearchableMultiSelect`, `ListField` | Inputs behind the searchable `select` / `multi-select` and the `list` field types. Both searchable ones are thin wrappers over `SearchableDropdown` (a Dropdown with a filter box pinned to its menu, keyboard highlight, desktop-only autofocus). |
| `ComboBoxField` | Input behind the `combobox` field type: type-ahead that filters the menu, stores option keys while showing their text, optional pick-or-create (`create`). |
| `optionSearch.ts` | `normalizeText` / `optionMatches` / `findOptionByText`: the one definition of "matches what was typed" (trimmed, case-insensitive). |
| `menuCallout.ts` | `dropdownMenuProps` / `comboBoxMenuProps`: open menus directly under their box. Spread them first on any new `Dropdown`/`ComboBox`. |

`FormCard`, `ThumbnailCard` and `WideCard` are exported from
`typical-admin-fabric/lib` (`import { FormCard } from '../lib/typical-admin-fabric/lib'`).
If something close exists, use it, extend it, or copy its shape.

If nothing fits, design the new thing from the same vocabulary: the
`0.25em` accent border, the shadow recipe
(`rgba(0,0,0,0.133) 0 0.22em 0.3em 0, rgba(0,0,0,0.11) 0 0.05em 0.1em 0`),
spacing like `0.77em` and `childrenGap: '0.77em'`, rather than new numbers.

## Build from Fluent primitives, theme-aware

- Structure with `Stack` (and `Separator`), not raw `<div>` soup.
- Take every color from the theme: `theme.palette.themePrimary`,
  `theme.palette.neutralLighter`, `theme.palette.redDark`,
  `theme.semanticColors.bodyText`, `theme.semanticColors.errorText`, ...
  **Never a hard-coded hex/rgb color**; that is what keeps a component right
  in light and dark themes. A neutral black-alpha shadow is the accepted
  exception.
- Get the theme the way the rest of the library does. Library components call
  `getTheme()` (the global theme set by `loadTheme`), so use `getTheme()` for
  consistency; `useTheme()` also works when the app wraps its tree in
  `ThemeProvider` with the same theme (the README's setup does both).
- Use real Fluent controls for anything interactive (`IconButton`,
  `DefaultButton`, `PrimaryButton`, `Dropdown`, `Checkbox`, `TextField`), not
  styled `<button>`/`<input>`. For an icon button whose icon or color changes
  with state, render `<Icon iconName=".." />` as a child rather than
  `iconProps`. For a destructive action, `theme.palette.redDark` (as
  `ConfirmDialog` and `ListControls` do).
- Confirm destructive actions with `confirmAsync()` from
  `typical-admin-fabric/ConfirmDialog`, not `window.confirm`.

```tsx
import { Stack, Icon, getTheme } from '@fluentui/react';
import { FormCard } from '../lib/typical-admin-fabric/lib';

export function TaskStatusStrip({ open, done }: { open: number; done: number }) {
  const theme = getTheme();
  return (
    <FormCard>
      <Stack horizontal tokens={{ childrenGap: '0.77em' }} verticalAlign="center">
        <Icon iconName="CheckMark" style={{ color: theme.palette.themePrimary }} />
        <span style={{ color: theme.semanticColors.bodyText }}>{open} open</span>
        <span style={{ color: theme.palette.neutralSecondary }}>{done} done</span>
      </Stack>
    </FormCard>
  );
}
```

## Where it belongs

- **Generic** (not tied to one record type's data): put it in
  `typical-admin-fabric/lib/templates/` and export it from
  `typical-admin-fabric/lib/index.ts`, next to `FormCard`/`ThumbnailCard`.
  This library is meant to be extended this way: it is the base of your own
  component library, so improving it is the expected path.
- **One-off** (tied to one feature's data shape): keep it in that feature's
  folder in the app. Don't generalize something nothing else will use.

Do this when prototyping too: it is tempting to eyeball a box with inline
styles and fix it later. Check the atoms, theme every color, and place it
correctly the first time.

## Check it

Look at it in the running app with `playwright-verify` (screenshot it in both
your light and dark themes if the app has both).
