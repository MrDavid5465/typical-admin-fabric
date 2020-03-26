import React from 'react';
import { Stack, Name, useQuery } from './lib';
import DetailsList from './lib/List';

import Links from './Links';
import { IDispatcher, DisplaySchema, IComponents } from '../typical-admin';
import Subscriber from '../typical-admin/Subscriber';

interface Props {
  dispatcher: IDispatcher;
  match: any;
  history: any;
  name: Name;
  schemaDefinition: DisplaySchema<any>;
  pageSize?: number;
  components?: IComponents;
}

const List: React.FC<Props> = ({
  dispatcher,
  match,
  history,
  name,
  schemaDefinition,
  pageSize,
  components,
}) => {
  const queryName = `get${name.plural}`;
  const { data: items, error, loading, refetch } = useQuery(dispatcher.list);
  if (error) {
    return <span>{`error: ${error}`}</span>;
  }

  if (loading) {
    return <span>{`loading...`}</span>;
  }
  return (
    <Stack>
      {dispatcher.subscribe && (
        <Subscriber
          document={dispatcher.subscribe}
          options={{ onSubscriptionData: () => refetch() }}
        />
      )}
      <h3>Listing {name.plural}</h3>
      <DetailsList
        pageSize={pageSize}
        name={name.plural}
        schema={schemaDefinition}
        onSelect={item => {
          history.push(`${match.url}/${item.id}/show`, item);
        }}
        items={items[queryName] || []}
      />
      <br />
      {components?.links ? (
        React.createElement(components.links, {
          match,
          name,
          dispatcher,
        })
      ) : (
        <Links match={match} name={name} dispatcher={dispatcher} />
      )}
    </Stack>
  );
};
export default List;
