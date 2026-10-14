import React from 'react';
import { useMutation, Name, PrimaryButton, Stack, useLocation, useNavigate } from './lib';

import Prompt from './Prompt';
import { IDispatcher, ITACallBacks, ITALabels, label, resolveLabels } from '../typical-admin';

interface Props {
  dispatcher: IDispatcher;
  id: any;
  name: Name;
  callBacks?: ITACallBacks;
  labels?: ITALabels;
}

const Delete: React.FC<Props> = ({
  dispatcher,
  id,
  name,
  callBacks,
  labels,
}) => {
  const {pathname} =  useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);

  const [removeItem] = useMutation(dispatcher.delete, {
    onCompleted: (data: any) => {
      navigate(pathname.replace(`/${id}/show`, ''));
      callBacks &&
        callBacks.delete &&
        callBacks.delete(data[`remove${name.singular}`]);
    },
    refetchQueries: [{ query: dispatcher.list }],
  });

  function handleSubmit(response = false) {
    setOpen(!open);
    response && removeItem({ variables: { id } });
  }

  return (
    <Stack>
      <PrimaryButton text="Delete" onClick={() => setOpen(true)} />
      <Prompt
        message={label(resolveLabels(name, labels), 'deletePrompt')}
        isOpen={open}
        toggle={handleSubmit}
      />
    </Stack>
  );
};
export default Delete;
