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
import { IDispatcher, ITACallBacks } from "../typical-admin";
import { SchemaDefinition } from "@octant/per-form";
import { getStyle } from "../denim";

interface Props {
  dispatcher: IDispatcher;
  history: any;
  match: any;
  name: Name;
  schemaDefinition: SchemaDefinition<any>;
  callBacks?: ITACallBacks;
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

  const { data, error, loading } = useQuery(dispatcher.show, {
    variables: { id }
  });
  const initialValues = !loading && !error && data[queryName];

  const [updateItem] = useMutation(dispatcher.edit, {
    onCompleted: data => {
      history.push(match.url.replace("edit", "show"));
      callBacks &&
        callBacks.edit &&
        callBacks.edit(data[`add${name.singular}`]);
    },
    refetchQueries: [
      { query: dispatcher.show, variables: { id } },
      { query: dispatcher.list }
    ]
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
      <Stack className={style.md}>
        <Form
          ref={editRef}
          name={"update"}
          form={schemaDefinition}
          initialValues={initialValues}
          onChange={handleChange}
        />
        <Stack horizontal tokens={{ childrenGap: "0.77em" }}>
          <PrimaryButton onClick={handleSubmit} disabled={!isValid}>
            Submit
          </PrimaryButton>
          <DefaultButton onClick={handleReset}>Reset</DefaultButton>
        </Stack>
      </Stack>
      <Separator />
      <Links match={match} name={name} dispatcher={dispatcher} />
    </Stack>
  );
};
export default Update;
