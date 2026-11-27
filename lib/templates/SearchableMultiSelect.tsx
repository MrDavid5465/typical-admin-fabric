import { IDropdownOption } from '@fluentui/react';
import SearchableDropdown from './SearchableDropdown';

interface Props {
  label?: string;
  options: IDropdownOption[];
  selectedKeys: string[] | number[];
  // Called with the toggled option, `selected` already flipped — the same
  // shape a multiSelect Dropdown's onChange gives, so Fabric.tsx's existing
  // handleMultiSelect serves both.
  onToggle: (option: IDropdownOption) => void;
  onFocus?: () => void;
  placeholder?: string;
  [key: string]: any;
}

// `multi-select` with `searchable: true` in a schema. The filter box, its
// focus rules and its keyboard handling live in SearchableDropdown, shared
// with the single `select`.
const SearchableMultiSelect = ({ selectedKeys, onToggle, ...rest }: Props) => (
  <SearchableDropdown
    {...rest}
    multiSelect
    selectedKeys={selectedKeys as (string | number)[]}
    onPick={onToggle}
  />
);

export default SearchableMultiSelect;
