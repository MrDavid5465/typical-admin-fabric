import React from "react";
import { useMutation, Name, PrimaryButton, Stack } from "./lib";

import Prompt from "./Prompt";
import { IDispatcher, ITACallBacks } from "../typical-admin";

interface Props {
  dispatcher: IDispatcher;
  history: any;
  match: any;
  id: any;
  name: Name;
  callBacks?: ITACallBacks;
}

const Delete: React.FC<Props> = ({
  dispatcher,
  history,
  match,
  id,
  name,
  callBacks
}) => {
  const [open, setOpen] = React.useState(false);

  const [removeItem] = useMutation(dispatcher.delete, {
    onCompleted: data => {
      history.push(match.url.replace(`/${id}/show`, ""));
      callBacks &&
        callBacks.delete &&
        callBacks.delete(data[`remove${name.singular}`]);
    },
    refetchQueries: [{ query: dispatcher.list }]
  });

  function handleSubmit(response = false) {
    setOpen(!open);
    response && removeItem({ variables: { id } });
  }

  return (
    <Stack>
      <PrimaryButton text="Delete" onClick={() => setOpen(true)} />
      <Prompt
        message={`Are you sure you'd like to delete this ${name.singular}?`}
        isOpen={open}
        toggle={handleSubmit}
      />
    </Stack>
  );
};
export default Delete;
