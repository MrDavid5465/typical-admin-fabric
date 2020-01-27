import React, { createRef, useState } from "react";
import {
  Name,
  Stack,
  Separator,
  DefaultButton,
  PrimaryButton,
  Form
} from "./lib";
import { useMutation, useQuery } from "./lib";

import Links from "./Links";

interface Props {
  dispatcher: any;
  history: any;
  match: any;
  name: Name;
  schemaDefinition: any;
  callBacks?: any;
}

const Update: React.FC<Props> = ({
  dispatcher,
  history,
  match,
  name,
  schemaDefinition,
  callBacks
}) => {
  const id = match.params.id;
  const [isValid, setIsValid] = useState(false);
  const queryName = `get${name.singular}`;

  const { data, error, loading } = useQuery(dispatcher.get, {
    variables: { id }
  });
  const initialValues = !loading && !error && data[queryName];

  const [updateItem] = useMutation(dispatcher.update, {
    onCompleted: data => {
      history.push(match.url.pathname.replace("edit", "show"));
      callBacks &&
        callBacks.edit &&
        callBacks.edit(data[`add${name.singular}`]);
    },
    refetchQueries: [
      { query: dispatcher.get, variables: { id } },
      { query: dispatcher.list }
    ]
  });
  const editRef: React.RefObject<any> = createRef();

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
          update: editRef.current.submit()
        }
      });
  }
  function handleChange() {
    setIsValid(editRef.current.isValid);
  }

  return (
    <Stack>
      <h4>Edit {name.singular}</h4>
      <Form
        ref={editRef}
        name={"update"}
        form={schemaDefinition}
        initialValues={initialValues}
        onChange={handleChange}
      />
      <Stack horizontal tokens={{ childrenGap: 10 }}>
        <DefaultButton onClick={handleReset}>Reset</DefaultButton>
        <PrimaryButton onClick={handleSubmit} disabled={!isValid}>
          Submit
        </PrimaryButton>
      </Stack>
      <Separator />
      <Links match={match} name={name} dispatcher={dispatcher} />
    </Stack>
  );
};
export default Update;
