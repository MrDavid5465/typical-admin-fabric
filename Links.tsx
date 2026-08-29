import React from 'react';
import { Name, Icon, IconButton } from './lib';
import { Stack, Separator, useLocation, useParams, useNavigate } from './lib';
import { IDispatcher } from '../typical-admin';

interface Props {
  name: Name;
  dispatcher: IDispatcher;
  /** Suppresses this row's Add button when the grid below already
   *  renders one of its own (List's ListControls toolbar, driven by
   *  schemaDefinition.list.buttons.add). Both were showing at once on
   *  every table-view admin. The toolbar one wins — it sits with the
   *  other grid controls, and card view (which has no toolbar) still
   *  relies on the button here. */
  hideAdd?: boolean;
}

const Links: React.FC<Props> = ({ name: _name, dispatcher, hideAdd }) => {
  const { pathname } =  useLocation();
  const { id } = useParams();
  const navigate = useNavigate();
  const urls = {
    edit: new RegExp(`/edit$`),
    new: new RegExp(`/new$`),
    show: new RegExp(`/show$`),
  };

  if (urls.show.test(pathname)) {
    return (
      <Stack
        horizontal
        tokens={{ childrenGap: '0.77em' }}
        verticalAlign={'center'}
      >
        <IconButton onClick={() => navigate(pathname.replace(`/${id}/show`, '/'))}>
          <Icon iconName={'back'} />
        </IconButton>
        {dispatcher.edit && (
          <>
            <Separator vertical />
            <IconButton onClick={() => navigate(pathname.replace('show', 'edit'))}>
              <Icon iconName={'edit'} />
            </IconButton>
          </>
        )}
      </Stack>
    );
  } else if (urls.edit.test(pathname)) {
    return (
      <IconButton onClick={() => navigate(pathname.replace('edit', 'show'))}>
        <Icon iconName={'back'} />
      </IconButton>
    );
  } else if (urls.new.test(pathname)) {
    return (
      <IconButton onClick={() => navigate(pathname.replace('/new', ''))}>
        <Icon iconName={'back'} />
      </IconButton>
    );
  } else {
    return (
      <Stack
        horizontal
        tokens={{ childrenGap: '0.77em' }}
        verticalAlign={'center'}
      >
        {/* A relative navigate("../") here resolves against the nearest
            ancestor <Route>'s own path pattern, not the visible URL — with
            ReactiveAdmin's list mounted as its own nested <Routes> inside
            Denim's app-switcher routing, that resolves to a no-op ("/projects"
            -> "/projects/", same page) instead of actually going back.
            navigate(-1) is real browser history-back, which always does what
            a "back" button should regardless of how deep the route tree is. */}
        <IconButton onClick={() => navigate(-1)}>
          <Icon iconName={'back'} />
        </IconButton>
        {dispatcher.new && !hideAdd && (
          <>
            <Separator vertical />
            <IconButton onClick={() => navigate(`${pathname}/new`)}>
              <Icon iconName={'add'} />
            </IconButton>
          </>
        )}
      </Stack>
    );
  }
};
export default Links;
