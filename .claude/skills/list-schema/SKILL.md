---
name: list-schema
description: Reference for writing list/grid and show schemas in typical-admin-fabric (the DisplaySchema used by ReactiveAdmin's schemaDefinition.list.columns and schemaDefinition.show, and by List/CardList/WideList/SwitchableList) - every DisplayField property, which options are live or broken, and the props of each list component (queryResultKey, idField, column picker, toolbar and row buttons, card fields). Use before writing or reviewing a `columns: {...}` or `show: {...}` definition or a list component call site, and run the bundled validator.
license: MIT
---

# Writing a list / show schema

A display schema is a `DisplaySchema<T>` (`typical-admin/index.tsx`): an
object keyed by field name, each entry a `DisplayField`. It is used for
ReactiveAdmin's `schemaDefinition.list.columns` (the grid) and
`schemaDefinition.show` (the read-only detail page), and by every list
renderer in typical-admin-fabric.

It shares only two things with a per-form schema (see `form-schema`): it is
keyed by field name and each entry has a `label`. A display field has no
`type` (there is no input), a form field has no `onRender`.

## `DisplayField`

| Property | Required | Behavior |
|---|---|---|
| `label` | yes | Column header (grid), bold label (show page). |
| `onRender` | no | `({ value, values }) => ReactNode`: `value` is this field's raw value, `values` the whole record. Use it for formatting (booleans, dates, counts, links, small images). Without it the raw value is printed, so objects and booleans render badly. |
| `options` | no | Grid-only settings, below. |

A key may be a field that isn't on the record (a computed column): `value`
is `undefined` and `onRender` builds the cell from `values`. The keys you list
must be selected by the `list`/`show` GraphQL documents.

### `options` (grid only; ignored on the show page)

| Key | Status | Effect |
|---|---|---|
| `minWidth`, `maxWidth` | live | Column width bounds in px (defaults 100 / 200). |
| `filterable: true` | live | A text filter input above the grid for this column (fuzzy match via `match-sorter`, client-side over the loaded rows). |
| `options: {text, value}[]` (with `filterable`) | live | Makes that filter a dropdown instead of a text box. Note the nesting: `options.options`. |
| `filterType: 'dateRange'` (with `filterable`) | **broken** | Renders start/end inputs, but they remount on every keystroke (focus is lost after each character), and compare as strings. Don't use it. |

Sorting: clicking a column header sorts by the raw value. **Bug:** with no
filter active this sorts Apollo's frozen result array in place and throws in
dev (`Cannot assign to read only property '0'`), crashing the list.

```ts
const taskColumns = {
  title: { label: 'Title', options: { filterable: true, minWidth: 200, maxWidth: 400 } },
  status: {
    label: 'Status',
    options: { filterable: true, options: [{ text: 'Open', value: 'open' }, { text: 'Done', value: 'done' }] },
  },
  done: { label: 'Done', onRender: ({ value }: any) => (value ? 'Yes' : 'No') },
  subtasks: { label: 'Subtasks', onRender: ({ values }: any) => values.subtasks?.length ?? 0 },
};
```

## The enclosing shapes

```ts
interface ListSchema<T> { columns: DisplaySchema<T>; buttons?: { add?: boolean } }
interface ITASchema {
  list: ListSchema<any>;
  show: DisplaySchema<any>;
  new?: SchemaDefinition<any>;   // per-form, see form-schema
  edit?: SchemaDefinition<any>;  // per-form, see form-schema
}
```

`buttons.add: true` adds an Add button to the grid toolbar (only when
`dispatcher.new` exists) and hides the header's duplicate. `show` is usually
the list columns plus the fields too long for a grid:
`show: { ...taskColumns, notes: { label: 'Notes' } }`.

## List components (the `list` slot)

All of these take ReactiveAdmin's slot props (`dispatcher`, `name`,
`schemaDefinition`, `components`) plus their own. Pass extra props by
wrapping: `components={{ list: (p: any) => <CardList {...p} schemaDefinition={p.schemaDefinition.columns} titleField="title" /> }}`.

| Component | `schemaDefinition` it expects | Use |
|---|---|---|
| `List` (default) | `ListSchema` (`{ columns, buttons }`) | Table. Row click opens show; per-row delete column when `dispatcher.delete`. |
| `SwitchableList` | `ListSchema` | Table/card toggle, remembered per `name.plural` in localStorage. |
| `CardList` | `DisplaySchema` (pass `p.schemaDefinition.columns`) | Thumbnail card grid, edit/delete buttons per card. |
| `WideList` | `DisplaySchema` (pass `p.schemaDefinition.columns`) | Stacked wide cards: image left, title/secondary text right. |

Note the difference: `CardList`/`WideList` take the column map directly,
while the slot receives `{ columns, buttons }`. Pass
`schemaDefinition={p.schemaDefinition.columns}` when using them as the slot
(`SwitchableList` does this for you).

Shared props:

- `queryResultKey`: result field to read instead of `get${name.plural}`.
- `idField`: record field used in the show/edit URL (default `id`). Delete
  always uses `item.id`.
- `hideHeader`: drop the "Listing X" heading and nav row.
- `pageSize`: client-side paging (`List` defaults to 20 via ReactiveAdmin's
  `pageSize` prop).

`List` / `SwitchableList` (table view):

- `columnSelectable`: a "Columns" picker (itself a per-form checkbox `Form`);
  `storageKey` (where the hidden set is saved, default `name.plural`; pass an
  explicit one), `columnVisibilityStore` (swap localStorage for another
  store: `{ readHidden(key), writeHidden(key, set) }`), `alwaysVisibleColumns`.

`CardList` / `SwitchableList` (card view):

- `titleField` (required), `thumbnailField` (an image URL; omit for
  text-only cards), `cardWidth` (280), `thumbnailHeight` (175),
  `thumbnailFit: 'cover' | 'contain'`, `cardActions(item)` (extra buttons on
  each card; stop propagation yourself), `CardList` only: `basePath` (route
  prefix when the list is embedded on another page), `defaultView` on
  `SwitchableList`.
- `title`/`thumbnailUrl` go through that column's `onRender`, so a column can
  turn a stored filename into a URL. In table view the same `onRender` result
  is printed as text, so return an `<img>` if it must look right in both.

`WideList`: `titleField` (required), `secondaryField`, `thumbnailField`.

### Toolbar and row buttons: only on `lib/List`

The lower-level grid `lib/List.tsx` (exported as `List` from
`typical-admin-fabric/lib`) also takes `customButtons`
(`{ key, label, icon, onClick, disabled?, danger? }[]`, grid-level) and
`rowButtons` (`{ key, label, icon, onClick(item), disabled?(item), danger? }[]`,
acting on the click-selected row), plus `items`, `schema`, `onSelect`,
`name`, `onAdd`. The ReactiveAdmin `List` slot does **not** forward these, and
it navigates to the show page on row click, so `rowButtons` only make sense in
your own list built on `lib/List` (copy `List.tsx` and pass them through).

## Run the validator before calling a list schema done

From the app root:

```bash
node src/lib/typical-admin-fabric/.claude/skills/list-schema/scripts/validate-list-schema.cjs path/to/file.tsx
# no args: scans ./src, skipping the three library folders and node_modules
node src/lib/typical-admin-fabric/.claude/skills/list-schema/scripts/validate-list-schema.cjs
```

It uses the TypeScript compiler API and finds display schemas two ways: a
variable typed `DisplaySchema<...>`, and any `columns:` property (resolving a
same-file identifier like `columns: taskColumns`). For each field it reports
a missing `label` (skipped when the entry has a spread), unknown keys (with
did-you-mean; `DisplayField` has no index signature but an untyped
intermediate const hides typos from `tsc`), unknown `options.*` keys, and the
broken `filterType`. Entries built by helper calls are skipped. Only ERRORs
make it exit non-zero. It does not check `show:` schemas; give those a
`DisplaySchema<...>` type annotation if you want them checked.
