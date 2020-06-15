import React from 'react';
import { Link, Name, Icon, IconButton } from './lib';
import { Stack, Separator } from './lib';
import { IDispatcher } from '../typical-admin';

interface Props {
  match: any;
  name: Name;
  dispatcher: IDispatcher;
}

const Links: React.FC<Props> = ({ match, name, dispatcher }) => {
  const urls = {
    edit: new RegExp(`/edit$`),
    new: new RegExp(`/new$`),
    root: new RegExp(``),
    show: new RegExp(`/show$`),
  };

  if (urls.show.test(match.url)) {
    return (
      <Stack
        horizontal
        tokens={{ childrenGap: '0.77em' }}
        verticalAlign={'center'}
      >
        <Link
          component={({ navigate }: any) => (
            <IconButton onClick={navigate}>
              <Icon iconName={'back'} />
            </IconButton>
          )}
          to={`${match.url.replace(`/${match.params.id}/show`, '')}`}
        />
        {dispatcher.edit && (
          <>
            <Separator vertical />
            <Link
              component={({ navigate }: any) => (
                <IconButton onClick={navigate}>
                  <Icon iconName={'edit'} />
                </IconButton>
              )}
              to={`${match.url.replace('show', 'edit')}`}
            />
          </>
        )}
      </Stack>
    );
  } else if (urls.edit.test(match.url)) {
    return (
      <Link
        component={({ navigate }: any) => (
          <IconButton onClick={navigate}>
            <Icon iconName={'back'} />
          </IconButton>
        )}
        to={`${match.url.replace('edit', 'show')}`}
      />
    );
  } else if (urls.new.test(match.url)) {
    return (
      <Link
        component={({ navigate }: any) => (
          <IconButton onClick={navigate}>
            <Icon iconName={'back'} />
          </IconButton>
        )}
        to={`${match.url.replace(`/new`, '')}`}
      />
    );
  } else if (urls.root.test(match.url)) {
    return (
      <Stack
        horizontal
        tokens={{ childrenGap: '0.77em' }}
        verticalAlign={'center'}
      >
        <Link
          component={({ navigate }: any) => (
            <IconButton onClick={navigate}>
              <Icon iconName={'back'} />
            </IconButton>
          )}
          to={`${match.url.replace(match.url, '')}`}
        />
        {dispatcher.new && (
          <>
            <Separator vertical />
            <Link
              component={({ navigate }: any) => (
                <IconButton onClick={navigate}>
                  <Icon iconName={'add'} />
                </IconButton>
              )}
              to={`${match.url}/new`}
            />
          </>
        )}
      </Stack>
    );
  } else {
    return null;
  }
};
export default Links;
