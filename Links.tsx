import React from 'react';
import { Name, Icon, IconButton } from './lib';
import { Stack, Separator, useLocation, useParams, useNavigate } from './lib';
import { IDispatcher, ITALabels, label, resolveLabels } from '../typical-admin';
import { touchIconButtonStyles } from './lib/touch';

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
  /** Suppresses the back button, for a container that already provides one
   *  (denim-fabric's master-detail on a phone, whose back bar leads to the
   *  same place). Edit and Add stay. */
  hideBack?: boolean;
  /** Display text (accessible names of the buttons); see typical-admin's labels.ts. */
  labels?: ITALabels;
}

const Links: React.FC<Props> = ({ name, dispatcher, hideAdd, hideBack, labels }) => {
  const { pathname } =  useLocation();
  const { id } = useParams();
  const navigate = useNavigate();
  const l = resolveLabels(name, labels);
  const urls = {
    edit: new RegExp(`/edit$`),
    new: new RegExp(`/new$`),
    show: new RegExp(`/show$`),
  };
  const back = (onClick: () => void) =>
    hideBack ? null : (
      <IconButton onClick={onClick} ariaLabel={label(l, 'back')} styles={touchIconButtonStyles}>
        <Icon iconName={'back'} />
      </IconButton>
    );

  if (urls.show.test(pathname)) {
    return (
      <Stack
        horizontal
        tokens={{ childrenGap: '0.77em' }}
        verticalAlign={'center'}
      >
        {back(() => navigate(pathname.replace(`/${id}/show`, '/')))}
        {dispatcher.edit && (
          <>
            {!hideBack && <Separator vertical />}
            <IconButton
              onClick={() => navigate(pathname.replace('show', 'edit'))}
              ariaLabel={label(l, 'edit')}
              styles={touchIconButtonStyles}
            >
              <Icon iconName={'edit'} />
            </IconButton>
          </>
        )}
      </Stack>
    );
  } else if (urls.edit.test(pathname)) {
    return back(() => navigate(pathname.replace('edit', 'show')));
  } else if (urls.new.test(pathname)) {
    return back(() => navigate(pathname.replace('/new', '')));
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
        {back(() => navigate(-1))}
        {dispatcher.new && !hideAdd && (
          <>
            {!hideBack && <Separator vertical />}
            <IconButton
              onClick={() => navigate(`${pathname}/new`)}
              ariaLabel={label(l, 'add')}
              styles={touchIconButtonStyles}
            >
              <Icon iconName={'add'} />
            </IconButton>
          </>
        )}
      </Stack>
    );
  }
};
export default Links;
