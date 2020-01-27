import React from "react";
import ReactiveAdmin, { DisplaySchema } from "../typical-admin";

import Update from "./Update";
import List from "./List";
import Create from "./Create";
import Show from "./Show";
import { SchemaDefinition } from "@octant/per-form";
import { mergeStyleSets, getTheme } from "office-ui-fabric-react";
import stylesJson from "./lib/getStyle";

interface Props {
  dispatcher: { list: any; new?: any; show: any; edit?: any; delete?: any };
  match: any;
  name: any;
  components?: any;
  schemaDefinition: {
    list: DisplaySchema<any>;
    new?: SchemaDefinition<any>;
    show: DisplaySchema<any>;
    edit?: SchemaDefinition<any>;
  };
  callBacks?: {
    new?: (result: any) => void;
    edit?: (result: any) => void;
    delete?: (result: any) => void;
  };
  pageSize?: number;
}

const Index: React.FC<Props> = ({
  dispatcher,
  match,
  name,
  schemaDefinition,
  components,
  callBacks,
  pageSize = 20
}) => {
  return (
    <ReactiveAdmin
      dispatcher={dispatcher}
      match={match}
      name={name}
      callBacks={callBacks}
      components={{
        list: (props: any) => <List {...props} pageSize={pageSize} />,
        add: (props: any) => <Create {...props} />,
        show: (props: any) => <Show {...props} />,
        edit: (props: any) => <Update {...props} />,
        ...components
      }}
      schemaDefinition={schemaDefinition}
    />
  );
};
export const getStyle = () => mergeStyleSets(stylesJson(getTheme()));

export default Index;
