export { default as Form } from "./templates/Form";
export { useMutation, useQuery } from "@apollo/react-hooks";
export {
  PrimaryButton,
  DefaultButton,
  Stack,
  Separator,
  Modal,
  getTheme,
  SelectionMode,
  DetailsList,
  IconButton,
  Icon
} from "office-ui-fabric-react";
export { Link, Route, withRouter } from "react-router-dom";
export { default as List } from "./List";
export interface Name {
  singular: string;
  plural: string;
}
export { getStyle } from "..";
export interface IndexableObject {
  [key: string]: any;
}
