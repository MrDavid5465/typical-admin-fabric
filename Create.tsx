import React, { createRef, useState } from "react";
import { Name, DefaultButton, PrimaryButton, Form } from "./lib";
import { useMutation, Stack, Separator } from "./lib";

import Links from "./Links";
import { SchemaDefinition } from "@octant/per-form";

interface Props {
  dispatcher: any;
  match: any;
  history: any;
  name: Name;
  schemaDefinition: SchemaDefinition<any>;
  callBacks?: any;
}

const New: React.FC<Props> = ({
  dispatcher,
  match,
  history,
  name,
  schemaDefinition,
  callBacks
}) => {
  const newRef: React.RefObject<any> = createRef();
  const [isValid, setIsValid] = useState(false);
  const [createItem] = useMutation(dispatcher.create, {
    onCompleted: data => {
      history.push(
        match.url.replace("new", `${data[`add${name.singular}`].id}/show`)
      );
      callBacks && callBacks.new && callBacks.new(data[`add${name.singular}`]);
    },
    refetchQueries: [{ query: dispatcher.list }]
  });

  function handleCreate() {
    newRef.current.isValid &&
      createItem({
        variables: {
          values: newRef.current.submit()
        }
      });
  }
  function handleReset() {
    newRef.current && newRef.current.reset();
  }
  function handleChange() {
    setIsValid(newRef.current.isValid);
  }

  return (
    <Stack>
      <h5>New {name.singular}</h5>
      <Form
        ref={newRef}
        name={"create"}
        form={schemaDefinition}
        onChange={handleChange}
      />
      <Stack horizontal tokens={{ childrenGap: 10 }}>
        <DefaultButton onClick={handleReset}>Reset</DefaultButton>
        <PrimaryButton onClick={handleCreate} disabled={!isValid}>
          Submit
        </PrimaryButton>
      </Stack>
      <Separator />
      <Links match={match} name={name} dispatcher={dispatcher} />
    </Stack>
  );
};

export default New;
