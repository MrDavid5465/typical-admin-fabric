---
name: reactive-admin
description: How to build a CRUD screen on a typiql backend with ReactiveAdmin (typical-admin + typical-admin-fabric) instead of hand-writing CRUD - the dispatcher documents and naming rules, the nested list/new/show/edit router, the components override contract, and live updates over one shared connection (MergedSubscriptionProvider / useMergedSubscription). Use before building any new admin/CRUD screen, before adding a subscription anywhere in the app, and before deciding a slot needs a fully custom component. Composes form-schema and list-schema.
license: MIT
---

# ReactiveAdmin: the base of every CRUD screen

The goal of ReactiveAdmin, `form-schema`, `list-schema` and typiql's backend
codegen together is **never write basic CRUD by hand.** A new record type
should cost a typiql struct, a `dispatcher`, a `name` and a
`schemaDefinition`, not a hand-rolled page.

Principles, in order:

1. **Generated CRUD first.** Start every screen as a plain `<ReactiveAdmin>`
   with no `components` overrides and look at it before customizing.
2. **Extend the schema before adding a component.** If a field or column
   needs something the schema can't express, and the need is repeatable,
   add it to the schema vocabulary (a new `type` in `lib/templates/Fabric.tsx`,
   an `onRender` for a column) rather than writing a one-off component.
3. **A fully custom slot is a call to confirm with the user.** Say what the
   generated slot can't express and why, and let them decide before you
   build it.
4. **Build a custom slot from a copy of the default component it replaces**
   (`typical-admin-fabric/List.tsx`, `Show.tsx`, `Create.tsx`, `Update.tsx`).
   Same props, same data flow, zero wiring changes elsewhere.

Paths below are relative to the folder holding the three side-by-side
libraries (e.g. `src/lib/`).

## The two layers

- `typical-admin/index.tsx` (`Index`, imported as `ReactiveAdmin`) is the
  unstyled routing core and defines the prop contract.
- `typical-admin-fabric/index.tsx` wraps it and supplies Fluent defaults for
  every slot. **Screens import this one**:

```tsx
// typical-admin-fabric/index.tsx, simplified
<ReactiveAdmin  /* = typical-admin's Index */
  components={{
    list: (props) => <List {...props} pageSize={pageSize} />,  // pageSize prop, default 20
    new:  (props) => <Create {...props} />,
    show: (props) => <Show {...props} />,
    edit: (props) => <Update {...props} />,
    ...components,   // the screen's own overrides win
  }}
  {...rest}
/>
```

A screen names only the slots it overrides; the rest fall through to the
Fluent defaults.

## A complete screen

```tsx
import { gql } from '@apollo/client';
import ReactiveAdmin from '../lib/typical-admin-fabric';
import type { ITASchema, IDispatcher } from '../lib/typical-admin';

const FIELDS = 'id name description priority archived';
const dispatcher: IDispatcher = {
  list: gql`query getProjects { getProjects { ${FIELDS} } }`,
  show: gql`query getProject($id: String!) { getProject(id: $id) { ${FIELDS} } }`,
  new: gql`mutation addProject($values: ProjectInput!) { addProject(values: $values) { ${FIELDS} } }`,
  edit: gql`mutation updateProject($id: String!, $update: ProjectInput!) { updateProject(id: $id, update: $update) { ${FIELDS} } }`,
  delete: gql`mutation removeProject($id: String!) { removeProject(id: $id) { id } }`,
  subscribe: gql`subscription projectChanged { projectChanged { operationName value { id } } }`,
  subscribeToOne: gql`subscription projectChanged($id: String) { projectChanged(id: $id) { operationName value { id } } }`,
};
const name = { singular: 'Project', plural: 'Projects' };
const display = {
  name: { label: 'Name' },
  priority: { label: 'Priority', options: { minWidth: 60, maxWidth: 80 } },
  archived: { label: 'Archived', onRender: ({ value }: { value: any }) => (value ? 'Yes' : 'No') },
};
const form = {
  name: { type: 'text', label: 'Name', required: true },
  description: { type: 'text', label: 'Description', multiline: true, defaultNull: null },
  priority: { type: 'number', label: 'Priority', defaultNull: null },
  archived: { type: 'checkbox', label: 'Archived', defaultValue: false },
};
const schemaDefinition: ITASchema = {
  list: { columns: display, buttons: { add: true } },
  show: { ...display, description: { label: 'Description' } },
  new: form,
  edit: form,
};

export default function ProjectsAdmin() {
  return <ReactiveAdmin dispatcher={dispatcher} name={name} schemaDefinition={schemaDefinition} />;
}
```

Mount it under a route **ending in `/*`**:
`<Route path="/projects/*" element={<ProjectsAdmin />} />`. ReactiveAdmin
renders its own nested `<Routes>` below that point. App setup (Apollo client,
router, Fluent icons/theme, `ConfirmDialogHost`, `MergedSubscriptionProvider`)
is in typical-admin-fabric's README.

## Naming rules (the most common failure)

The default components read results and send variables by fixed names built
from `name`:

| Slot | Reads result field | Sends variables |
|---|---|---|
| `list` | `get${name.plural}` | none |
| `show` / `edit` (load) | `get${name.singular}` | `{ id }` |
| `new` | `add${name.singular}` (`.id` used to navigate to show) | `{ values }` |
| `edit` (save) | (navigates to show) | `{ id, update }` |
| `delete` | `remove${name.singular}` | `{ id }` |

So in your documents the **variables must be named `$id`, `$values`, `$update`**,
and the root fields must be the typiql-generated names. typiql generates, for
`struct Project`: `getProject`, `getProjects`, `addProject(values:)`,
`updateProject(id:, update:)`, `removeProject(id:)`, `projectChanged(id:)`.
Its plural is the snake_case name plus `es` after s/x/z, `ies` in place of
a final `y` not preceded by a/e/o, else `s`: `Category` -> `getCategories`, `Box` -> `getBoxes`,
`Person` -> `getPersons`. `name.plural` must be **that stem**.

`name.singular` and `name.plural` are also the page headings ("Showing
Project", "Listing Projects", "Edit Project"). There is no separate display
label. If the generated name reads badly as a heading, either accept it or
override the slot. For the list only, `List`/`CardList`/`WideList`/
`SwitchableList` accept `queryResultKey` to read a different result field:

```tsx
components={{ list: (p: any) => <List {...p} queryResultKey="getPersons" /> }}
```

In dev, the Fluent `List`/`CardList` log a `console.error` naming the
available fields when `get${plural}` is missing, instead of silently showing
an empty list.

## The dispatcher slots and routes

```ts
interface IDispatcher {
  list: any; show: any; new?: any; edit?: any; delete?: any;
  subscribe?: any; subscribeToOne?: any;   // gql documents
}
```

| Route (relative) | Slot | Rendered when |
|---|---|---|
| `/*` | `list` | always (wildcard, so a custom list can nest its own `<Routes>`) |
| `/new` | `new` | `dispatcher.new` **and** `schemaDefinition.new` |
| `/:id/show` | `show` | always |
| `/:id/edit` | `edit` | `dispatcher.edit` **and** `schemaDefinition.edit` |

- Omit both `dispatcher.edit` and `schemaDefinition.edit` for read-only
  records: no edit route, no edit button.
- The add buttons check only `dispatcher.new`; if `schemaDefinition.new` is
  missing they navigate to `/new`, which then renders the list again. Set both.
- `delete` is not a route. Fluent `Show` renders a Delete button (with a
  Yes/No modal) when `dispatcher.delete` is set, and the Fluent `List` and
  `CardList` add a per-row/per-card delete (using `confirmAsync`, so mount
  `<ConfirmDialogHost />`).
- `schemaDefinition.list.buttons.add: true` puts an Add button in the grid
  toolbar (table view) and hides the header's duplicate.

## `schemaDefinition: ITASchema`

```ts
interface ITASchema {
  list: { columns: DisplaySchema<T>; buttons?: { add?: boolean } };  // list-schema
  show: DisplaySchema<T>;                                            // list-schema's field shape
  new?: SchemaDefinition<T>;                                         // form-schema
  edit?: SchemaDefinition<T>;                                        // form-schema
}
```

`list`/`show` are display-only (`{ label, onRender?, options? }`); `new`/
`edit` are per-form schemas (`{ type, label, ... }`). Author them with those
skills. The same per-form schema object usually serves `new` and `edit`.

## The override contract

Every slot, default or overridden, receives exactly the same props:
`{ dispatcher, name, schemaDefinition: <that slot's part>, callBacks, components }`.
`components` recognizes `list`, `new`, `show`, `edit`, `delete`, `links`
(`links` replaces the back/edit/add row; `delete` replaces the delete control
inside `Show`).

The cheapest customizations, in order:

1. **A prop on a default:** `components={{ list: (p: any) => <List {...p} columnSelectable storageKey="projects" /> }}`.
2. **A different stock renderer:** `CardList` (thumbnail grid), `WideList`
   (image + text rows), `SwitchableList` (table/card toggle), e.g.
   `components={{ list: (p: any) => <SwitchableList {...p} titleField="name" thumbnailField="cover" /> }}`.
   See `list-schema`.
3. **Schema-driven fields inside a custom page shell:** a copy of `Create.tsx`
   or `Update.tsx` that keeps the `Form` and changes the page around it (say,
   options loaded from another query, or navigation after save). Default to
   this middle ground before a from-scratch component.
4. **A fully custom slot:** confirm with the user first (principle 3), then
   start from a copy of the default.

`callBacks` (`new`, `edit`, `delete`) run after the mutation completes. Note
the Fluent `Update` passes `data['add' + singular]` to `callBacks.edit`, which
is `undefined` for an update (library bug).

## Live updates: one shared connection

`dispatcher.subscribe` makes list/show/edit refetch on any change event;
`dispatcher.subscribeToOne` (variables `{ id }`) narrows show/edit to their
own record. Point them at typiql's generated `<type>Changed(id:)`.

**The problem.** typiql streams subscriptions as long-lived multipart HTTP
responses: one open HTTP connection per active subscription. Browsers allow
about 6 HTTP/1.1 connections per origin, shared across all tabs. If every
mounted list/show/edit/widget subscribes on its own, a few of them (or a few
tabs) exhaust the pool and every later request, mutations included, queues
and looks hung.

**The recommended setup**: mount `MergedSubscriptionProvider` (from
`typical-admin/MergedSubscriptions.tsx`) once inside `ApolloProvider`. Then:

- typical-admin's `Subscriber` (used for `dispatcher.subscribe` /
  `subscribeToOne`) registers with the service automatically;
- any other component subscribes with
  `useMergedSubscription(document, { variables, onData, onError, skip })`,
  declaring its own document scoped to its own concern. `onData` receives
  `{ taskChanged: {...} }`, shaped as if it had subscribed alone. Without a
  provider the hook falls back to its own connection;
- non-React code: `service.register(document, variables, handler) => unregister`.

The service merges every registered document into ONE subscription operation
(unique alias per root field, `$id` -> `$s3_id` variable namespacing,
fragments carried over and renamed on collision, identical registrations
deduplicated) and routes each event back by alias. It works because
async-graphql, typiql's server, streams every root field of a subscription
operation separately. **Rules that follow from that:**

- Put only plain fields at the root of a subscription document. Root-level
  fragments are ignored by the server; the merger inlines them, and rejects
  ones with `@include`/`@skip`.
- The merged operation has several root fields, which the GraphQL spec forbids
  but async-graphql allows. Don't point the service at a spec-strict server.
- Resubscribes are debounced (30 ms) and removals delayed (1 s), so mounting
  many components, or a list flashing "loading..." during refetch, costs at
  most one resubscribe. A resubscribe overlaps old and new for 1.5 s and
  delivers duplicated events once. A dropped stream reconnects after 2 s;
  events during the outage are lost.

Without the provider, each `Subscriber` opens its own connection. Keep
`subscribe` off screens that don't need live data: mutations made in this tab
already refetch the list/show queries (`refetchQueries`).

## Known library bugs to work around (don't "fix" them unasked)

- Clicking a column header in the Fluent `List` (sorting) with no filter
  active throws `Cannot assign to read only property '0'` in dev, because it
  sorts Apollo's frozen result array in place. The list crashes.
- A failed mutation (e.g. a GraphQL type error) shows nothing in the UI; the
  form just stays put. Check the network response (the `playwright-verify`
  driver prints GraphQL errors).
- Each live event makes a default list re-render through "loading...", which
  unmounts and remounts the grid (resets paging/scroll).
- Fluent `Create`/`Update` pass the raw schema as `fieldProps`, so
  per-form's own keys (`required`, `defaultValue`, `validations`, `section`)
  reach the Fluent control too. `required: true` adds Fluent's asterisk;
  `defaultValue` reaches the control alongside `value`.
- typical-admin's own unstyled `Update.tsx` (react-router v5 props), `List.tsx`
  (ignores column `onRender`) and `Links.tsx` (reads `state.params.id`) are
  broken; the Fluent layer replaces all three.

## Verify

Run the app and drive it with the `playwright-verify` skill: open the list,
a show page, create, edit and delete a disposable record, and read the
printed GraphQL errors and console errors.
