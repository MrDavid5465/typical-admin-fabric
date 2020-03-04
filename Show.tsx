import React from 'react';
import Links from './Links';
import Delete from './Delete';
import { useQuery, Stack, Separator, Name } from './lib';
import {
  IDispatcher,
  ITACallBacks,
  DisplaySchema,
  IComponents,
} from '../typical-admin';

interface Props {
  dispatcher: IDispatcher;
  history: any;
  match: any;
  name: Name;
  schemaDefinition: DisplaySchema<any>;
  callBacks?: ITACallBacks;
  components?: IComponents;
}

const Show: React.FC<Props> = ({
  dispatcher,
  history,
  match,
  name,
  schemaDefinition,
  callBacks,
  components,
}) => {
  const id = match.params.id;
  const queryName = `get${name.singular}`;
  const { data, error, loading } = useQuery(dispatcher.show, {
    variables: { id },
  });

  if (error) {
    return <span>{`error: ${error}`}</span>;
  }

  if (loading) {
    return <span>{`loading...`}</span>;
  }

  return (
    <Stack>
      <h4>Showing {name.singular}</h4>
      {Object.entries(schemaDefinition).map(([k, v]: any) => {
        return (
          <p key={k}>
            <strong>{v.label}</strong>:{' '}
            {v.onRender
              ? v.onRender({
                  value: data[queryName][k],
                  values: data[queryName],
                })
              : data[queryName][k]}
          </p>
        );
      })}
      <Stack horizontal>
        {dispatcher.delete &&
          (components?.delete ? (
            React.createElement(components.delete, {
              id,
              name,
              match,
              history,
              dispatcher,
              callBacks,
            })
          ) : (
            <Delete
              history={history}
              id={id}
              name={name}
              match={match}
              dispatcher={dispatcher}
              callBacks={callBacks}
            />
          ))}
      </Stack>
      <Separator />
      {components?.links ? (
        React.createElement(components.links, {
          match,
          name,
          dispatcher,
          item: data[queryName],
        })
      ) : (
        <Links match={match} name={name} dispatcher={dispatcher} />
      )}
    </Stack>
  );
};
export default Show;
