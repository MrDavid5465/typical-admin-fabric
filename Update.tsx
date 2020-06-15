import React, { createRef, useState } from 'react';
import {
  Name,
  Stack,
  Separator,
  DefaultButton,
  PrimaryButton,
  Form,
} from './lib';
import { useMutation, useQuery } from './lib';

import Links from './Links';
import { IDispatcher, ITACallBacks, IComponents } from '../typical-admin';
import { SchemaDefinition } from '@octant/per-form';
import { getStyle } from './lib';
import Subscriber from '../typical-admin/Subscriber';

interface Props {
  dispatcher: IDispatcher;
  history: any;
  match: any;
  name: Name;
  schemaDefinition: SchemaDefinition<any>;
  callBacks?: ITACallBacks;
  components?: IComponents;
}

const Update: React.FC<Props> = ({
  dispatcher,
  history,
  match,
  name,
  schemaDefinition,
  callBacks,
  components,
}) => {
  const id = match.params.id;
  const [isValid, setIsValid] = useState(false);
  const queryName = `get${name.singular}`;

  const { data, error, loading, refetch } = useQuery(dispatcher.show, {
    variables: { id },
  });
  const initialValues = !loading && !error && data[queryName];

  const [updateItem] = useMutation(dispatcher.edit, {
    onCompleted: (data) => {
      history.push(match.url.replace('edit', 'show'));
      callBacks &&
        callBacks.edit &&
        callBacks.edit(data[`add${name.singular}`]);
    },
    refetchQueries: [
      { query: dispatcher.show, variables: { id } },
      { query: dispatcher.list },
    ],
  });
  const editRef: React.RefObject<any> = createRef();
  const style = getStyle();
  function handleReset() {
    editRef.current.reset();
  }

  if (error) {
    return <span>{`error: ${error}`}</span>;
  }

  if (loading) {
    return <span>{`loading...`}</span>;
  }

  function handleSubmit() {
    editRef.current.isValid &&
      updateItem({
        variables: {
          id,
          update: editRef.current.submit(),
        },
      });
  }
  function handleChange() {
    setIsValid(editRef.current.isValid);
  }

  return (
    <Stack>
      {(dispatcher.subscribe || dispatcher.subscribeToOne) && (
        <Subscriber
          document={dispatcher.subscribeToOne || dispatcher.subscribe}
          options={{
            variables:
              (dispatcher.subscribeToOne !== undefined && { id }) || {},
            onSubscriptionData: () => refetch(),
          }}
        />
      )}
      <Stack
        horizontal
        horizontalAlign={'space-evenly'}
        verticalAlign={'center'}
      >
        <h4>Edit {name.singular}</h4>
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
      <Stack className={style.md}>
        <Form
          ref={editRef}
          name={'update'}
          form={schemaDefinition}
          initialValues={initialValues}
          onChange={handleChange}
        />
        <Stack horizontal tokens={{ childrenGap: '0.77em' }}>
          <PrimaryButton onClick={handleSubmit} disabled={!isValid}>
            Submit
          </PrimaryButton>
          <DefaultButton onClick={handleReset}>Reset</DefaultButton>
        </Stack>
      </Stack>
      <Separator />
    </Stack>
  );
};
export default Update;
