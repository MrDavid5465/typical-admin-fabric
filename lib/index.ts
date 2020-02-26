import { getTheme, mergeStyleSets } from 'office-ui-fabric-react';
import stylesJson from './getStyle';

export { default as Form } from './templates/Form';
export { useMutation, useQuery } from '@apollo/react-hooks';
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
  Icon,
} from 'office-ui-fabric-react';
export { Link, Route, withRouter } from 'react-router-dom';
// export { default as List } from './List';
export interface Name {
  singular: string;
  plural: string;
}
export interface IndexableObject {
  [key: string]: any;
}
export const getStyle = () => mergeStyleSets(stylesJson(getTheme()));
