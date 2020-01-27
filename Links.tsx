import React from "react";
import { Link, Name } from "./lib";
import { getStyle, Stack, Separator } from "./lib";

interface Props {
  match: any;
  name: Name;
  dispatcher: any;
}

const Links: React.FC<Props> = ({ match, name, dispatcher }) => {
  const urls = {
    edit: new RegExp(`/edit$`),
    new: new RegExp(`/new$`),
    root: new RegExp(`/${name.plural.toLowerCase()}$`),
    show: new RegExp(`/show$`)
  };
  const style = getStyle();

  if (urls.show.test(match.url)) {
    return (
      <Stack horizontal tokens={{ childrenGap: 10 }}>
        {dispatcher.update && (
          <>
            <Link
              className={style.link}
              to={`${match.url.replace("show", "edit")}`}
            >
              Edit
            </Link>
            <Separator vertical />
          </>
        )}
        <Link
          className={style.link}
          to={`${match.url.replace(`/${match.params.id}/show`, "")}`}
        >
          Back
        </Link>
      </Stack>
    );
  } else if (urls.edit.test(match.url)) {
    return (
      <Link className={style.link} to={`${match.url.replace("edit", "show")}`}>
        Back
      </Link>
    );
  } else if (urls.new.test(match.url)) {
    return (
      <Link className={style.link} to={`${match.url.replace(`/new`, "")}`}>
        Back
      </Link>
    );
  } else if (urls.root.test(match.url)) {
    return (
      <Stack horizontal tokens={{ childrenGap: 10 }}>
        {dispatcher.create && (
          <>
            <Link className={style.link} to={`${match.url}/new`}>
              New
            </Link>
            <Separator vertical />
          </>
        )}
        <Link className={style.link} to={`${match.url.replace(match.url, "")}`}>
          Back
        </Link>
      </Stack>
    );
  } else {
    return null;
  }
};
export default Links;
