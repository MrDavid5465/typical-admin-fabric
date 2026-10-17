import React, { useState } from 'react';
import { mergeStyles } from '@fluentui/react';
import { Stack, IconButton, Icon, getTheme, ThumbnailCard, useQuery, useMutation, useNavigate, useLocation } from './lib';
import { THUMBNAIL_CARD_WIDTH } from './lib/templates/ThumbnailCard';
import Links from './Links';
import { IDispatcher, DisplaySchema, IComponents, Name, ITALabels, ResolvedLabels, label, resolveLabels } from '../typical-admin';
import Subscriber from '../typical-admin/Subscriber';
import { confirmAsync } from './ConfirmDialog';

interface Props {
  dispatcher: IDispatcher;
  name: Name;
  schemaDefinition: DisplaySchema<any>;
  components?: IComponents;
  pageSize?: number;
  // Schema key rendered as each card's title (through the field's onRender,
  // same as the DetailsList-based default List, if one is defined).
  titleField: string;
  // Schema key holding an image URL for the card thumbnail. Omit for
  // text-only cards (title + actions, no image). Also runs through the
  // field's onRender if defined, same as titleField — lets a schema build a
  // full URL out of a bare filename.
  thumbnailField?: string;
  cardWidth?: number;
  thumbnailHeight?: number;
  // Passed straight through to ThumbnailCard — see its own doc comment.
  thumbnailFit?: 'cover' | 'contain';
  // Overrides the query's result field — defaults to `get${name.plural}`.
  // Needed when the display-plural label doesn't match the actual resolver name.
  queryResultKey?: string;
  // Route prefix for a card's show/edit links. Defaults to the current
  // pathname, which is correct when CardList IS the list screen for that
  // route (`/telemetryadmin/cars` -> `/telemetryadmin/cars/:id/show`). It is
  // NOT correct when CardList is embedded on some other page — the admin
  // home embeds two of them, where the default produced
  // `/telemetryadmin/:id/show` and every card 404'd. Such callers pass the
  // real collection route explicitly.
  basePath?: string;
  // Suppresses the built-in "Listing X" heading + Links row, for callers
  // embedding CardList inline with their own section heading instead of
  // through full ReactiveAdmin routing.
  hideHeader?: boolean;
  // Which item field goes into the show/edit-route URLs — defaults to 'id'.
  // Some records (e.g. dashboards) are keyed by a human-readable name
  // elsewhere in the app; this lets the URL match that convention. Never
  // affects the delete mutation, which always uses the real item.id.
  idField?: string;
  // Extra per-card controls, rendered in the header row to the left of the
  // built-in edit/delete buttons — i.e. above the thumbnail.
  //
  // Exists because the built-in actions are fixed (edit, delete) while some
  // collections need a per-item control that only makes sense for them, such
  // as marking one car as the favourite. Callers get the whole item so the
  // control can reflect that row's own state, and are responsible for
  // stopping propagation if their control shouldn't also trigger the card's
  // navigation.
  cardActions?: (item: any) => React.ReactNode;
  // Display text (heading, delete button); see typical-admin's labels.ts.
  labels?: ITALabels;
}

const CARD_GAP = 16;

// The card grid: as many columns of at least `cardWidth` as fit the grid's
// own width (minimum one), then stretched evenly so each row spans it —
// the same column count a fixed-width wrap gives, without the leftover strip
// on the right. auto-fill keeps empty tracks, so a short last row keeps the
// full rows' card width. Sized by the container, not the window, so a list
// in a narrow pane behaves like one on a narrow screen; on a phone it's one
// full-width column. min(..., 100%) lets that one column shrink below
// cardWidth instead of overflowing.
const gridClass = (cardWidth: number) => mergeStyles({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(min(${cardWidth}px, 100%), 1fr))`,
  gap: CARD_GAP,
});

// Only mounted when dispatcher.delete exists — useMutation must never be
// called with an undefined document, so the mutation lives in a component
// that's conditionally *rendered*, not conditionally *invoked*, mirroring how
// Show.tsx only ever mounts the standalone Delete.tsx when dispatcher.delete
// is set rather than guarding a hook call inline.
const CardDeleteButton: React.FC<{ dispatcher: IDispatcher; labels: ResolvedLabels; item: any }> = ({ dispatcher, labels, item }) => {
  const [removeItem] = useMutation(dispatcher.delete, {
    refetchQueries: [{ query: dispatcher.list }],
  });
  return (
    <IconButton
      iconProps={{ iconName: 'Delete' }}
      title={label(labels, 'deleteTitle')}
      onClick={async (e) => {
        e.stopPropagation();
        if (!(await confirmAsync(label(labels, 'deleteConfirm'), { danger: true }))) return;
        removeItem({ variables: { id: item.id } });
      }}
    />
  );
};

// Drop-in replacement for the DetailsList-based default List — same
// ReactiveAdmin contract (dispatcher/name/schemaDefinition/components), same
// query + live-subscription + Links header, but renders items as a card grid
// (via the shared ThumbnailCard) instead of a table. Pass as
// components={{ list: (props) => <CardList {...props} titleField="name" thumbnailField="thumbnail" /> }}.
const CardList: React.FC<Props> = ({
  dispatcher,
  name,
  schemaDefinition,
  components,
  pageSize,
  titleField,
  thumbnailField,
  cardWidth,
  thumbnailHeight,
  thumbnailFit,
  queryResultKey,
  hideHeader,
  idField,
  basePath,
  cardActions,
  labels,
}) => {
  const theme = getTheme();
  const l = resolveLabels(name, labels);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const routeBase = basePath ?? pathname;
  const [page, setPage] = useState(0);
  const queryName = queryResultKey ?? `get${name.plural}`;
  const { data, error, loading, refetch }: { data?: any; error?: any; loading?: boolean; refetch?: () => void } =
    useQuery(dispatcher.list);

  if (error) {
    return <span>{`error: ${error}`}</span>;
  }
  // Only before the first result, as in List: Apollo Client 4 sets
  // `loading` during a refetch too (a live event, a save elsewhere), and
  // returning here then unmounted every card and rebuilt the grid, its
  // thumbnails reloading, on each one.
  if (loading && !data) {
    return <span>{`loading...`}</span>;
  }

  // See List.tsx's identical guard — the `get${name.plural}` default renders
  // a convincing empty list when it doesn't match the real resolver name.
  if (import.meta.env?.DEV && data && data[queryName] === undefined) {
    const available = Object.keys(data).filter(k => !k.startsWith('__'));
    // eslint-disable-next-line no-console
    console.error(
      `[typical-admin] CardList for "${name.plural}" read no field "${queryName}" off the query result. ` +
      `Available: ${available.join(', ') || '(none)'}. ` +
      `Pass queryResultKey="${available[0] ?? '...'}" — the list is rendering empty, not failing.`,
    );
  }

  const items: any[] = data?.[queryName] ?? [];
  const pageItems = pageSize ? items.slice(page * pageSize, (page + 1) * pageSize) : items;
  const titleSchema = (schemaDefinition as any)[titleField];
  const thumbnailSchema = thumbnailField ? (schemaDefinition as any)[thumbnailField] : undefined;

  return (
    <Stack>
      {dispatcher.subscribe && (
        <Subscriber
          document={dispatcher.subscribe}
          options={{ onData: () => refetch && refetch() }}
        />
      )}
      {!hideHeader && (
        <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
          <h3>{label(l, 'listHeading')}</h3>
          {components?.links ? (
            React.createElement(components.links, { name, dispatcher, labels })
          ) : (
            <Links name={name} dispatcher={dispatcher} labels={labels} />
          )}
        </Stack>
      )}

      <div className={gridClass(cardWidth ?? THUMBNAIL_CARD_WIDTH)}>
        {pageItems.map((item) => {
          const title = titleSchema?.onRender
            ? titleSchema.onRender({ value: item[titleField], values: item })
            : item[titleField];
          const thumbnailUrl = thumbnailField
            ? (thumbnailSchema?.onRender
                ? thumbnailSchema.onRender({ value: item[thumbnailField], values: item })
                : item[thumbnailField])
            : undefined;
          const routeId = item[idField ?? 'id'];
          return (
            <ThumbnailCard
              key={item.id}
              width={cardWidth}
              thumbnailHeight={thumbnailHeight}
              fit={thumbnailFit}
              fluid
              title={String(title ?? '')}
              thumbnailUrl={thumbnailUrl}
              onThumbnailClick={() => navigate(`${routeBase}/${routeId}/show`)}
              actions={
                (cardActions || dispatcher.edit || dispatcher.delete) ? (
                  <>
                    {cardActions?.(item)}
                    {dispatcher.edit && (
                      <IconButton
                        iconProps={{ iconName: 'Settings' }}
                        title={`Edit ${l.singular}`}
                        onClick={(e) => { e.stopPropagation(); navigate(`${routeBase}/${routeId}/edit`); }}
                      />
                    )}
                    {dispatcher.delete && <CardDeleteButton dispatcher={dispatcher} labels={l} item={item} />}
                  </>
                ) : undefined
              }
            />
          );
        })}
      </div>

      {pageItems.length === 0 && (
        <span style={{ opacity: 0.6, padding: '1em 0' }}>No {l.plural.toLowerCase()} yet.</span>
      )}

      {pageSize && items.length > pageSize && (
        <Stack horizontal horizontalAlign="end" verticalAlign="center" style={{ marginTop: '0.5em' }}>
          <IconButton disabled={page === 0} onClick={() => setPage(page - 1)}>
            <Icon iconName="Remove" />
          </IconButton>
          <IconButton
            disabled={items.length - page * pageSize <= pageSize}
            onClick={() => setPage(page + 1)}
          >
            <Icon iconName="Add" />
          </IconButton>
          <span style={{ color: theme.palette.neutralSecondary, fontSize: '0.85em' }}>
            Page {page + 1} of{' '}
            {items.length % pageSize ? Math.floor(items.length / pageSize) + 1 : Math.floor(items.length / pageSize)}
          </span>
        </Stack>
      )}
    </Stack>
  );
};

export default CardList;
