# typical-admin-fabric

The [Fluent UI v8](https://developer.microsoft.com/en-us/fluentui) (`@fluentui/react`)
implementation of [typical-admin](../typical-admin)'s CRUD pattern, with
[per-form](../per-form) for forms. Give it a typiql type's GraphQL documents
and a schema object and it renders a styled list / show / create / edit /
delete screen; override any one slot when you need something custom.

It is meant as the **base of your own component library**: you and your agent
extend it and fix it for your use case (new field types in
`lib/templates/Fabric.tsx`, new list renderers, reusable atoms in
`lib/templates/`). It is a harness for repeatability in the frontend: new
record types cost a backend struct, a dispatcher and a schema, not a
hand-written page. If you want a different look entirely, build your own
variant on typical-admin the same way (see typical-admin's README).

Consumed as source (no build step, no npm package).

## Using with an AI coding agent

Before writing any code with these libraries, read the skills in
`typical-admin-fabric/.claude/skills/`:

- `reactive-admin`: how to build a CRUD screen, the slot contract, live updates
- `form-schema`: every form field type and property (`new`/`edit` schemas), with a validator script
- `list-schema`: list/show column schemas and list components, with a validator script
- `hand-rolled-components`: building a new visual component from Fluent primitives
- `playwright-verify`: driving the running app in headless Chromium to check your work

Skills in a cloned repository are not loaded automatically unless the agent
was started inside that repository, so open the `SKILL.md` files directly.
For the backend, read typiql-rs's `.claude/skills/typiql-api`.
For the app shell around these screens (header, nav, theming, settings), read [denim](../denim)'s `.claude/skills/denim-app-shell`.

## Install

### 1. Clone the three libraries side by side

They import each other through relative paths (`../typical-admin`,
`../per-form`, `../../../per-form`), so keep them as sibling folders:

```
your-app/src/lib/typical-admin/
your-app/src/lib/typical-admin-fabric/
your-app/src/lib/per-form/
```

Get them from:

- file:///var/mnt/Media/david-source/repos/typiql-standins/typical-admin
- file:///var/mnt/Media/david-source/repos/typiql-standins/typical-admin-fabric
- file:///var/mnt/Media/david-source/repos/typiql-standins/per-form
- optional app shell, cloned alongside as `../denim`: https://github.com/MrDavid5465/denim

```sh
cd your-app/src/lib
git clone file:///var/mnt/Media/david-source/repos/typiql-standins/typical-admin
git clone file:///var/mnt/Media/david-source/repos/typiql-standins/typical-admin-fabric
git clone file:///var/mnt/Media/david-source/repos/typiql-standins/per-form
```

### 2. Peer npm packages

Versions known to work together:

```bash
npm i react@^18.3.1 react-dom@^18.3.1 \
  @fluentui/react@^8.125.6 \
  @apollo/client@^4.2.3 graphql@^16.14.2 rxjs@^7.8.2 \
  react-router@^7.17.0 react-router-dom@^7.17.0 \
  match-sorter@^8.3.0 date-fns@^4.4.0
npm i -D typescript@~5.6.2 vite@^6 @vitejs/plugin-react@^4.3.4 \
  @types/react@^18.3.1 @types/react-dom@^18.3.1
```

- `rxjs` is a required peer of Apollo Client 4. `graphql-tag` and
  `@fluentui/react-hooks` come in as dependencies of `@apollo/client` and
  `@fluentui/react`; you don't install them (use `gql` from `@apollo/client`).
- The libraries use `import.meta.env`, so TypeScript needs Vite's client
  types: `"types": ["vite/client"]` in `tsconfig.json` (or a
  `vite-env.d.ts` with `/// <reference types="vite/client" />`).
- They type-check under Vite's default strict `tsconfig`
  (`strict`, `noUnusedLocals`, `noUnusedParameters`).

## Minimal app

A Vite + React + TypeScript app with one CRUD screen for a typiql type:

```rust
// backend (typiql-rs)
#[typiql_type]
pub struct Project {
    #[typiql(key)]
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub priority: Option<i32>,
    pub archived: Option<bool>,
}
```

**`vite.config.ts`**: proxy the GraphQL endpoint so it is same-origin in dev
(no CORS setup on the backend). Adjust the target to wherever your backend
nests `typiql_router` (`router.nest("/typiql", typiql_router(schema, "/typiql/graphql"))`).

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/typiql': 'http://localhost:8000' },
  },
});
```

**`src/apollo.ts`**

```ts
import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

// typiql serves queries, mutations AND subscriptions on one POST endpoint;
// subscriptions arrive as multipart/mixed HTTP streams, which HttpLink
// handles on its own (no WebSocket link needed or supported).
export const client = new ApolloClient({
  link: new HttpLink({
    uri: import.meta.env.VITE_GRAPHQL_URL ?? '/typiql/graphql',
  }),
  cache: new InMemoryCache(),
});
```

**`src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client/react';
import { initializeIcons, createTheme, loadTheme, ThemeProvider } from '@fluentui/react';
import { ConfirmDialogHost } from './lib/typical-admin-fabric/ConfirmDialog';
import { MergedSubscriptionProvider } from './lib/typical-admin/MergedSubscriptions';
import { client } from './apollo';
import App from './App';

initializeIcons();
const theme = createTheme({ palette: { themePrimary: '#0f6cbd' } });
loadTheme(theme); // the library's components read the global theme (getTheme())

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <ThemeProvider theme={theme}>
        {/* Merges every mounted live subscription (ReactiveAdmin's
            dispatcher.subscribe/subscribeToOne, useMergedSubscription) into
            ONE subscription over one connection. */}
        <MergedSubscriptionProvider>
          <BrowserRouter>
            <App />
            <ConfirmDialogHost />
          </BrowserRouter>
        </MergedSubscriptionProvider>
      </ThemeProvider>
    </ApolloProvider>
  </React.StrictMode>,
);
```

- `initializeIcons()` registers Fluent's icon font, loaded from Microsoft's
  CDN by default. For an offline app, self-host the font files and pass
  their base URL: `initializeIcons('/fonts/')`.
- The components call `getTheme()`, the **global** theme, so `loadTheme()` is
  what re-themes them. `ThemeProvider` themes Fluent controls and anything
  using `useTheme()`. Use both, with the same theme.
- `<ConfirmDialogHost />` serves `confirmAsync()`, the in-app confirm dialog
  the list delete buttons use. Without it they fall back to `window.confirm`.

**`src/App.tsx`**: your own shell and router. Nothing here is provided by the
libraries; keep it as small or as rich as you like.

```tsx
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { Stack } from '@fluentui/react';
import ProjectsAdmin from './admin/ProjectsAdmin';

export default function App() {
  return (
    <Stack tokens={{ childrenGap: 16, padding: 16 }}>
      <Stack horizontal tokens={{ childrenGap: 16 }}>
        <Link to="/projects">Projects</Link>
      </Stack>
      <Routes>
        {/* The trailing /* is required: ReactiveAdmin renders its own nested
            <Routes> (list, new, :id/show, :id/edit) under this mount point. */}
        <Route path="/projects/*" element={<ProjectsAdmin />} />
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </Stack>
  );
}
```

**`src/admin/ProjectsAdmin.tsx`**: the whole CRUD screen.

```tsx
import { gql } from '@apollo/client';
import ReactiveAdmin from '../lib/typical-admin-fabric';
import type { ITASchema, IDispatcher } from '../lib/typical-admin';

const FIELDS = 'id name description priority archived';

const dispatcher: IDispatcher = {
  // Result fields must be get<plural> / get<singular> / add<singular> /
  // update<singular> / remove<singular>; variables must be named $id,
  // $values (add) and $update (update).
  list: gql`query getProjects { getProjects { ${FIELDS} } }`,
  show: gql`query getProject($id: String!) { getProject(id: $id) { ${FIELDS} } }`,
  new: gql`mutation addProject($values: ProjectInput!) { addProject(values: $values) { ${FIELDS} } }`,
  edit: gql`mutation updateProject($id: String!, $update: ProjectInput!) { updateProject(id: $id, update: $update) { ${FIELDS} } }`,
  delete: gql`mutation removeProject($id: String!) { removeProject(id: $id) { id } }`,
  // Live updates, shared over one connection by MergedSubscriptionProvider.
  subscribe: gql`subscription projectChanged { projectChanged { operationName value { id } } }`,
  subscribeToOne: gql`subscription projectChanged($id: String) { projectChanged(id: $id) { operationName value { id } } }`,
};

// singular/plural are BOTH the GraphQL name stems and the page headings.
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

Why the form fields look like that (all verified against the source):

- `defaultNull: null` on optional fields: per-form seeds an unset field (and a
  `null` coming back from the server) as `''`, and submits `''` unless
  `defaultNull` says otherwise. GraphQL rejects `''` for `Int`, `Float`,
  `Boolean` and `ID`.
- `defaultValue: false` on the checkbox: same problem, `''` is not a Boolean.
- `type: 'number'` is a plain text box whose submit converter only parses
  `[0-9.]`: negative numbers are sent as strings and rejected by the server.
  See the `form-schema` skill for the workaround.
- `multiline: true` is passed straight through to Fluent's `TextField`.

This exact example type-checks with the packages above and was driven in
Chromium against a typiql-shaped endpoint (list, show, create, edit, delete,
live refetch).

## What's in here

| File | What it is |
|---|---|
| `index.tsx` | `ReactiveAdmin` with Fluent defaults for every slot (`pageSize` prop, default 20) |
| `List.tsx` | default list: Fluent `DetailsList`, row click opens show, per-row delete when `dispatcher.delete` |
| `CardList.tsx`, `WideList.tsx`, `SwitchableList.tsx` | alternative `list` slots: thumbnail cards, wide cards, table/card toggle |
| `Show.tsx`, `Create.tsx`, `Update.tsx`, `Delete.tsx`, `Links.tsx`, `Prompt.tsx` | default slots and their pieces |
| `ConfirmDialog.tsx` | `confirmAsync()` + `<ConfirmDialogHost />` |
| `lib/List.tsx` | the schema-driven `DetailsList` wrapper (sorting, filters, column picker, toolbar/row buttons) |
| `lib/templates/Fabric.tsx` | per-form field template: maps each field `type` to a Fluent control |
| `lib/templates/Form.tsx` | `Form`: per-form + Fabric.tsx, with an imperative ref (`isValid`, `submit()`, `reset()`) |
| `lib/templates/*Card.tsx`, `CheckField.tsx`, `ListField.tsx`, `SearchableMultiSelect.tsx` | reusable atoms |

## License

MIT, see `LICENSE`.
