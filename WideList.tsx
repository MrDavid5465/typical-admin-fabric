import React from 'react';
import { Stack, useQuery, useNavigate, useLocation, WideCard } from './lib';
import Links from './Links';
import { IDispatcher, DisplaySchema, IComponents, Name } from '../typical-admin';
import Subscriber from '../typical-admin/Subscriber';

interface Props {
  dispatcher: IDispatcher;
  name: Name;
  schemaDefinition: DisplaySchema<any>;
  components?: IComponents;
  // Overrides the query's result field — defaults to `get${name.plural}`.
  // Mirrors CardList's same-named prop.
  queryResultKey?: string;
  // Suppresses the built-in "Listing X" heading + Links row.
  hideHeader?: boolean;
  // Which item field goes into the show-route URL — defaults to 'id'.
  idField?: string;
  // Schema key rendered as each card's title (through the field's onRender,
  // same as CardList's titleField).
  titleField: string;
  // Schema key rendered as each card's secondary text, below the title.
  // Omit for a title-only card.
  secondaryField?: string;
  // Schema key holding an image URL for the card's photo. Omit for a
  // text-only card.
  thumbnailField?: string;
}

// Drop-in for ReactiveAdmin's `list` slot (same contract as List.tsx/
// CardList.tsx), rendering a vertical stack of WideCards — photo left,
// title/secondary text right — instead of a table or a grid of square
// thumbnails. Built from a copy of CardList's query/subscribe/Links-header
// handling; card body matches the original ProjectCard.tsx markup this
// replaces.
const WideList: React.FC<Props> = ({
  dispatcher,
  name,
  schemaDefinition,
  components,
  queryResultKey,
  hideHeader,
  idField,
  titleField,
  secondaryField,
  thumbnailField,
}) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryName = queryResultKey ?? `get${name.plural}`;
  const { data, error, loading, refetch }: { data?: any; error?: any; loading?: boolean; refetch?: () => void } =
    useQuery(dispatcher.list);

  if (error) {
    return <span>{`error: ${error}`}</span>;
  }
  if (loading) {
    return <span>{`loading...`}</span>;
  }

  const items: any[] = data?.[queryName] ?? [];
  const titleSchema = (schemaDefinition as any)[titleField];
  const secondarySchema = secondaryField ? (schemaDefinition as any)[secondaryField] : undefined;
  const thumbnailSchema = thumbnailField ? (schemaDefinition as any)[thumbnailField] : undefined;

  return (
    <Stack tokens={{ childrenGap: '1.25em' }}>
      {dispatcher.subscribe && (
        <Subscriber
          document={dispatcher.subscribe}
          options={{ onSubscriptionData: () => refetch && refetch() }}
        />
      )}
      {!hideHeader && (
        <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
          <h3>Listing {name.plural}</h3>
          {components?.links ? (
            React.createElement(components.links, { name, dispatcher })
          ) : (
            <Links name={name} dispatcher={dispatcher} />
          )}
        </Stack>
      )}

      {items.map((item) => {
        const title = titleSchema?.onRender
          ? titleSchema.onRender({ value: item[titleField], values: item })
          : item[titleField];
        const secondary = secondaryField
          ? secondarySchema?.onRender
            ? secondarySchema.onRender({ value: item[secondaryField], values: item })
            : item[secondaryField]
          : undefined;
        const thumbnailUrl = thumbnailField
          ? thumbnailSchema?.onRender
            ? thumbnailSchema.onRender({ value: item[thumbnailField], values: item })
            : item[thumbnailField]
          : undefined;
        const routeId = item[idField ?? 'id'];
        return (
          <WideCard
            key={routeId}
            imageUrl={thumbnailUrl ?? undefined}
            onClick={() => navigate(`${pathname}/${routeId}/show`)}
          >
            <h3 style={{ margin: '0 0 0.4em 0', fontSize: '1.25em' }}>{title}</h3>
            {secondary && <p style={{ margin: 0, opacity: 0.8, lineHeight: 1.5 }}>{secondary}</p>}
          </WideCard>
        );
      })}

      {items.length === 0 && (
        <span style={{ opacity: 0.6, padding: '1em 0' }}>No {name.plural.toLowerCase()} yet.</span>
      )}
    </Stack>
  );
};

export default WideList;
