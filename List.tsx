import React from "react";
import { Stack, Name, useQuery, List as DetailsList } from "./lib";
import Links from "./Links";

interface Props {
  dispatcher: any;
  match: any;
  history: any;
  name: Name;
  schemaDefinition: any;
  pageSize?: number;
}

const List: React.FC<Props> = ({
  dispatcher,
  match,
  history,
  name,
  schemaDefinition,
  pageSize
}) => {
  const queryName = `get${name.plural}`;
  const { data: items, error, loading } = useQuery(dispatcher.list);
  if (error) {
    return <span>{`error: ${error}`}</span>;
  }

  if (loading) {
    return <span>{`loading...`}</span>;
  }
  return (
    <Stack>
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
      <Links match={match} name={name} dispatcher={dispatcher} />
    </Stack>
  );
};
export default List;
