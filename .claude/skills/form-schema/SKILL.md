---
name: form-schema
description: Reference for writing a per-form schema rendered by typical-admin-fabric's Fabric.tsx (the SchemaDefinition passed to Form/FormWrapper, and to ReactiveAdmin's schemaDefinition.new/edit) - every universal field property, the closed catalog of field types Fabric.tsx implements and their extras, properties that silently do nothing, and the defaults that clash with GraphQL types (empty '' values, the number converter, required on 0, dates). Use before writing or reviewing any form schema, and run the bundled validator on it before calling it done.
license: MIT
---

# Writing a per-form schema

A schema is a `SchemaDefinition<T>` (`per-form/types.ts`): a plain object keyed
by field name, each field `{ type: '...', label: '...', ...extras }`. It is
rendered by `typical-admin-fabric/lib/templates/Form.tsx` with
`lib/templates/Fabric.tsx` as the field template, and is what ReactiveAdmin's
`schemaDefinition.new`/`edit` take (see `reactive-admin`).

Fabric.tsx is one `switch (type)` with a fixed set of cases plus a default
text box. That makes the property surface a **closed catalog**: check the
tables below, don't guess, and run the validator. If a field needs something
the catalog can't express and the need is repeatable, add a new `case` to
Fabric.tsx (that is how the library is meant to grow; see `reactive-admin`'s
"extend the schema before adding a component") rather than hand-building a
one-off input on a page.

## Universal properties

| Property | Default | Behavior |
|---|---|---|
| `type` | required | Picks the Fabric.tsx case **and** the submit converter (`text` trims, `number` parses, `date` makes a `Date`; other types are submitted raw). An unknown `type` silently renders a plain text box. |
| `label` | required | The control's label. (`datetime` prints the literal word "label": library bug.) |
| `required` | `false` | Adds "This field is required", tested as `!!value`: it **rejects `0` and `false`**. No-op on `list` (normalized to `min: 1`). |
| `validations` | `[]` | `{ test(values) => boolean, message: string \| (values) => string }[]`, run with the full form values. |
| `defaultValue` | `''` (`[]` for `list`) | Initial value when `initialValues` has none, or has `null`/`undefined`. |
| `defaultNull` | none | Submitted instead of `''` for an empty field. |
| `converter` | none | `(key, values, defaultNull, dirty) => value`. Replaces the type's converter at submit. Not in the TS `Field` interface but read by `per-form/converter.ts` (allowed by its index signature). |
| `section` / `sectionCollapsed` | none | Groups fields into a collapsible section; set `sectionCollapsed: true` on any field to start it closed. |
| `display` | `true` | **Does nothing.** The field renders regardless. Leave the field out of the schema to hide it. |
| `hint` | none | **Does nothing.** Fabric.tsx discards it. For text boxes use `description` (Fluent's TextField renders it under the box). |

Everything else on a field is passed through `...rest` to the underlying
Fluent control, so native props of that control work: `multiline`, `rows`,
`disabled`, `readOnly`, `placeholder`, `description`, `prefix`, `suffix` on
the text box, and so on. Check which control a type wraps in Fabric.tsx.

## GraphQL gotchas (verified in the source and in a browser)

These are the defaults that break typiql mutations:

1. **Empty is `''`.** Unset fields, and `null`s coming back from the server as
   `initialValues`, become `''` and are submitted as `''`. GraphQL rejects
   `''` for `Int`, `Float`, `Boolean`, `ID`. Put `defaultNull: null` on every
   optional non-string field (and on optional strings if you want `null`, not
   `''`, stored), and `defaultValue: false` on checkboxes.
2. **`number` is a text box with a narrow converter.** `type` is never
   forwarded to the TextField (no spinner, any text accepted), and the
   converter only parses `/^[0-9.]+$/`: `"-3"` is submitted as the string
   `"-3"` (the server rejects it), `"2.5"` as `2.5` even for an `Int`. If
   negatives or integer-only values matter:
   ```ts
   offset: {
     type: 'number', label: 'Offset', defaultNull: null,
     converter: (key: string, values: any, defaultNull: any) =>
       values[key] === '' ? defaultNull : Number(values[key]),
     validations: [{ test: (v) => v.offset === '' || Number.isInteger(Number(v.offset)), message: 'Whole number' }],
   },
   ```
3. **`required` fails on `0`/`false`.** Use a validation where 0 is valid:
   `validations: [{ test: (v) => v.qty !== '' && v.qty != null, message: 'Required' }]`.
4. **`date` gives a JS `Date` at local midnight**, which JSON-serializes as a
   UTC timestamp (`2026-10-13T04:00:00.000Z` in UTC-4). For a calendar-date
   string: `converter: (k, v, dn) => (v[k] ? format(new Date(v[k]), 'yyyy-MM-dd') : dn)`
   (`format` from `date-fns`).
5. **Every schema key is submitted.** The submit value contains all schema
   fields (converted), on edit as well as create. A field you don't want sent
   must not be in the schema.
6. **Field names are plain keys.** `onChange` keeps only the part after the
   last `.`; `address.city` becomes `city`. Use a `list` field for arrays of
   objects.

## Field types (the closed catalog)

| `type` | Required extra | Value | Notes |
|---|---|---|---|
| *(anything else)*, e.g. `text`, `number`, `email`, `textarea` | none | string | Fluent `TextField`. `type: 'password'` is **not masked** (`type` is never forwarded). Use `multiline: true` for a textarea. |
| `checkbox` | none | boolean | Fluent `Checkbox`. Use `defaultValue: false`. |
| `select` | `options: {text, value, disabled?}[]` | option value | Fluent `Dropdown`. `searchable: true` pins a filter box to the top of the menu; see below. |
| `multi-select` | `options` | array of values | `searchable: true` adds the same filter box; selected options stay listed while filtering. Each change is a new array, so a frozen initial value (Apollo's, on an edit page) is fine. |
| `radio` | `options: {text, value}[]` | string | Fluent `ChoiceGroup`. **Bug:** it is never given the current value, so an initial/loaded value isn't shown as selected, and the submitted value is the option key as a string. Prefer `select`. |
| `combobox` | `options` | option value, or free text | Type-ahead: typing opens the menu and narrows it to options containing the text. Choosing an option (or typing its text, ignoring case and surrounding spaces) stores its `value` and the box shows its `text`, so a stored id displays as its name on an edit page. Other text is stored as typed, unless `create` is set. `create?: (text) => Promise<value>`, `createLabel?: string \| (text) => string`; see below. |
| `picker` | `options: {text, value}[]` | array of strings | Add/remove list of chosen options; values must be strings (sorted with `toLowerCase`). |
| `multicheckbox` | `fields: { [key]: Field }` | `{ [key]: boolean }` | A group of nested fields stored as one object. |
| `date` | none | `Date` | Fluent `DatePicker`, text input allowed. See gotcha 4. |
| `datetime` | none | `Date` | Date + hour/minute/AM-PM. `hourOptions?`, `minuteOptions?` (`{text, value}[]`). Label bug above. |
| `timetoday` | none | `Date` (today) | Hour/minute/AM-PM only. |
| `range` / `slider` | none | number | Native range + numeric box. `min` (0), `max` (100), `step` (1). |
| `image-upload` | `uploadFn(dataUrl, filename) => Promise<{id, filename, url}>` | `{id, filename, url}` | `resolveUrl?(value)`, `allowClear?`, `uploadLabel?`, `placeholderText?`. |
| `check` | none | (not an input) | Pass/fail indicator: `check: (value) => 'ok' \| 'fail' \| 'unknown'` (or a fixed status), `okText?`, `failText?`, `unknownText?`, `description?`, `action?: {label, busyLabel?, onClick}`, `actionWhenOk?`. |
| `button` | none | (not an input) | `variant?: 'primary' \| 'danger' \| 'default'`, `onClick`, `buttonStyle?`. The label is the button text. |
| `signature` | none | string | Disabled text box + Sign button that sets the value to the field's `signature` prop. |
| `list` | `itemSchema` | array of row objects | Repeating rows; see below. |
| `custom` | `onRender({ value, onChange, name })` | anything | Escape hatch: you render everything, including label and errors. |
| `gamepad-select` | `gamepadMappings` | mapping id | Leftover from the app this was extracted from; ignore. |

The validator knows this catalog and warns on typos (did-you-mean), missing
required extras, dead properties and the gotchas above.

## Picking from a list: `select` + `searchable`, `combobox`, `combobox` + `create`

| You want | Use |
|---|---|
| Choose from a fixed list, long enough to want a filter | `select` (or `multi-select`) with `searchable: true` |
| Type-ahead where free text is a valid answer (suggestions, not a rule) | `combobox` |
| Pick a related record, or create it on the spot (a tag on a task, a project in quick entry) | `combobox` with `create` |

Don't hand-build a picker for any of these: if one of them falls short,
extend `SearchableDropdown.tsx` / `ComboBoxField.tsx` instead.

**`searchable: true`** (`select`, `multi-select`): a filter box at the top of
the menu narrows it to options whose text or value contains the typed text,
case-insensitively; the box keeps showing the selection. On desktop the
filter takes focus when the menu opens; on a touch screen it doesn't (no
on-screen keyboard until the filter is tapped). With the filter focused:
ArrowDown/ArrowUp move the highlight (the first match is highlighted as
you type), Enter picks it (a `select` closes, a `multi-select` toggles it and
stays open), Escape closes, Tab closes and moves on.

**`combobox`**: the value is the chosen option's `value` (stored as the
key, shown as the `text`). Text that matches no option:

- without `create`: is the value, as typed. Fine for a free-text field with
  suggestions; wrong for a field that stores an id.
- with `create`: is never stored. The menu offers `Create "<text>"` (label
  from `createLabel`: a verb like `'New tag'`, or `(text) => string` for the
  whole label). Choosing it, or Enter while it is the highlighted row,
  awaits `create(trimmedText)`, adds the new option to the list at once and
  selects the key it resolved with. If `create` throws or rejects, its
  message is shown under the field and the typed text kept (Enter retries).
  Leaving the field without choosing keeps the text in the box, empties the
  value and says it wasn't saved; it never creates on blur. Text matching an
  existing option ignoring case and surrounding spaces selects that option
  instead, so `"groceries "` never makes a second `Groceries`.

`create` with a typiql `add<Singular>` mutation, in a component that also
loads the options (see the next section for why the schema is built there):

```tsx
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';

const GET_PROJECTS = gql`query getProjects { getProjects { id name } }`;
const ADD_PROJECT = gql`mutation addProject($values: ProjectInput!) { addProject(values: $values) { id name } }`;

function QuickTask() {
  const { data } = useQuery<any>(GET_PROJECTS);
  const [addProject] = useMutation<any>(ADD_PROJECT, { refetchQueries: ['getProjects'] });
  if (!data) return null;
  const form: SchemaDefinition<any> = {
    title: { type: 'text', label: 'Task', required: true },
    projectId: {
      type: 'combobox', label: 'Project', defaultNull: null,
      options: data.getProjects.map((p: any) => ({ text: p.name, value: p.id })),
      create: async (name: string) => {
        const { data: added } = await addProject({ variables: { values: { name } } });
        if (!added) throw new Error('The project was not created.');
        return added.addProject.id; // the key the field stores
      },
      createLabel: 'New project',
    },
  };
  return <Form name="task" form={form} />;
}
```

Apollo rejects on a GraphQL error by default, so a server-side failure
shows under the field with no extra code. Don't `key` the Form on the
options query here: the refetch after a create would remount it and drop
what has been typed in the other fields.

## Options that depend on data

`select`/`multi-select`/`radio`/`picker`/`combobox` need `options` in the
schema. When they come from data (another query), build the schema where the
data is: in the component, or with a function that takes the data and
returns the schema:

```ts
export const taskSchema = (projects: { id: string; name: string }[]): SchemaDefinition<any> => ({
  title: { type: 'text', label: 'Title', required: true },
  projectId: {
    type: 'select', label: 'Project', defaultNull: null,
    options: projects.map((p) => ({ text: p.name, value: p.id })),
  },
});
```

Rules: keep plain-object schemas plain unless they need data; a schema
function never fetches (the component resolves the data, then calls it);
and remember per-form seeds values once at mount, so render the form after
the data has loaded (or key it on the data). Inside ReactiveAdmin, a schema
needing query data is the classic reason for a custom `new`/`edit` slot that
copies `Create.tsx`/`Update.tsx`, loads the options and passes the built
schema to `Form` (see `reactive-admin`).

## `list`: repeating rows

A field whose value is an array of row objects. Each row is its own nested
`useForm` over `itemSchema`, so row fields are ordinary top-level keys.

- **`itemSchema`** (required): a `SchemaDefinition`, or
  `({ row, index, rows }) => SchemaDefinition` when a row's field config
  depends on its own data or its siblings (e.g. exclude options already used
  by other rows). A function must return the **same key set** every call:
  `useForm` seeds values once, so a key added later never gets a value
  (asserted in dev).
- `rowKey(row, index)`: stable identity. Supply a real id whenever rows can
  be removed or reordered, or removing row 0 appears to edit row 1.
- `min` / `max`: row-count validation (use `min: 1`, not `required`).
- `newRow` (seed for added rows; required unless `fixed`), `fixed` (no
  add/remove UI), `rowLabel`, `singular`, `addLabel`, `removeLabel`,
  `emptyText`, `horizontal`, `rowStyle`.
- `deriveRow({ row, index, rows, field, value })`: patch other fields of the
  same row when one changes.
- `onRowCommit(ev)`: `{ kind: 'add' | 'remove' | 'update', index, row, rows, changed? }`,
  for issuing one mutation per row instead of saving the whole array.
- `deferWhileDragging` (default true): slider drags commit on release; the
  drag hooks are injected automatically, don't wire `onActivate`/`onDeactivate`.
- `converters`: per-row submit converters.

You don't write validations for a list: per-row errors are derived from
`itemSchema` and surfaced at the list's key (`Row 2: Title - This field is required`).
`useRowCommit` (`per-form/useRowCommit.ts`) is the same commit primitive for
row editors that can't be a `list`.

## Using a schema outside ReactiveAdmin

```tsx
import { useRef } from 'react';
import { Form } from '../lib/typical-admin-fabric/lib';
import type { IFormRef } from '../lib/typical-admin-fabric/lib/templates/Form';

const ref = useRef<IFormRef>(null);
<Form ref={ref} name="task" form={taskSchema} initialValues={task} />
// ref.current.isValid, ref.current.submit() (converted values), ref.current.reset()
```

`onChange(name, { raw, clean, isValid, errors })` fires on every change.

Next to a form, two pieces in this library are often useful:
`lib/templates/Photo/` (`Photo`, a standalone image picker and cropper that
hands a base64 PNG to `submit`; prefer the `image-upload` field type inside
a schema) and `lib/formStyles.ts` (`getFormStyle()`: the `error`, `hint`,
`errors`, `labelHorizontal`, `fieldHorizontal` and `dangerButton` classes
the field template itself uses).

## Run the validator before calling a schema done

From the app root (so `typescript` resolves from its `node_modules`):

```bash
node src/lib/typical-admin-fabric/.claude/skills/form-schema/scripts/validate-schema.cjs path/to/file.tsx
# no args: scans ./src, skipping the three library folders and node_modules
node src/lib/typical-admin-fabric/.claude/skills/form-schema/scripts/validate-schema.cjs
```

It parses with the TypeScript compiler API and checks every object literal
with both `type` and `label` (not inside an array): unknown types,
missing required extras, dead `display`/`hint`, `required` on number/checkbox,
`password`, and NOTEs for the number/date/empty-value traps. Only ERRORs make
it exit non-zero. If an unrelated app object has `type` and `label`, skip
objects carrying a marker key with `SCHEMA_IGNORE_MARKERS=icon,kind`.
