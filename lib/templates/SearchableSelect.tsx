import { IDropdownOption } from '@fluentui/react';
import SearchableDropdown from './SearchableDropdown';

interface Props {
  label?: string;
  options: IDropdownOption[];
  selectedKey: string | number | null | undefined;
  onSelect: (option: IDropdownOption) => void;
  onFocus?: () => void;
  placeholder?: string;
  [key: string]: any;
}

// `select` with `searchable: true` in a schema: a single-select Dropdown with
// the same filter box as the searchable multi-select (see
// SearchableDropdown). Enter picks the highlighted match and closes.
const SearchableSelect = ({ selectedKey, onSelect, ...rest }: Props) => (
  <SearchableDropdown {...rest} selectedKey={selectedKey} onPick={onSelect} />
);

export default SearchableSelect;
