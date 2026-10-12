import { useEffect, useRef, useState } from 'react';
import { Dropdown, IDropdownOption, ISearchBox, SearchBox, getTheme } from '@fluentui/react';
import { dropdownMenuProps } from './menuCallout';

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

// Touch screens get no autofocus on the filter: focusing it there pops up the
// on-screen keyboard over the list the moment the menu opens, before anyone
// has decided to search rather than scroll.
const coarsePointer = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

// Focuses the filter when the menu opens. Not `autoFocus`: the Dropdown moves
// focus onto its own list once the menu has been positioned, which lands
// after mount, so the keystrokes meant for the filter went to the list's
// type-ahead instead — and could toggle a selection. Re-taking focus over the
// first few frames wins that race; it stops as soon as the filter has it.
const FilterBox = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const ref = useRef<ISearchBox>(null);
  useEffect(() => {
    if (coarsePointer()) return;
    const timers = [0, 50, 150, 300].map(ms => setTimeout(() => {
      const input = document.activeElement as HTMLElement | null;
      if (!input?.closest?.('.searchable-multiselect-filter')) ref.current?.focus();
    }, ms));
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <SearchBox
      componentRef={ref}
      className="searchable-multiselect-filter"
      placeholder="Filter"
      value={value}
      onChange={(_, v) => onChange(v ?? '')}
    />
  );
};

// `multi-select` with `searchable: true` in a schema. A plain multiSelect
// Dropdown, with a filter box pinned to the top of its menu.
//
// The filter lives in the menu rather than in the box itself (a ComboBox,
// which this first was) for two reasons: the box keeps showing what's
// selected instead of being overwritten by whatever's typed, and the menu
// opens on a tap like every other dropdown — the ComboBox let you type on a
// phone without ever opening its list, so the results were invisible.
//
// Typing narrows the list to options whose text or key contains it,
// case-insensitively. Selected options always stay listed, so one can be
// deselected without clearing the search — and so the box, which builds its
// text from the options it's given, never drops a selection while filtering.
const SearchableMultiSelect = ({ label, options, selectedKeys, onToggle, onFocus, placeholder, ...rest }: Props) => {
  const theme = getTheme();
  const [filter, setFilter] = useState('');
  const query = filter.trim().toLowerCase();
  const selected = selectedKeys as (string | number)[];
  const shown = query
    ? options.filter(o =>
        selected.includes(o.key) ||
        o.text.toLowerCase().includes(query) ||
        String(o.key).toLowerCase().includes(query))
    : options;

  return (
    <Dropdown
      {...dropdownMenuProps}
      label={label}
      multiSelect
      placeholder={placeholder}
      options={shown}
      selectedKeys={selectedKeys}
      onChange={(_, option) => { if (option) onToggle(option); }}
      onDismiss={() => setFilter('')}
      onFocus={onFocus}
      onRenderList={(listProps, defaultRender) => (
        <>
          <div
            style={{
              position: 'sticky', top: 0, zIndex: 1, padding: 8,
              background: theme.semanticColors.bodyBackground,
              borderBottom: `1px solid ${theme.semanticColors.bodyDivider}`,
            }}
            // The menu's own key handling (arrow keys, typeahead, space to
            // toggle) would otherwise act on keystrokes meant for the filter.
            onKeyDown={e => e.stopPropagation()}
          >
            <FilterBox value={filter} onChange={setFilter} />
          </div>
          {shown.length === 0
            ? <div style={{ padding: '8px 12px', opacity: 0.65 }}>No matches</div>
            : defaultRender?.(listProps)}
        </>
      )}
      {...rest}
    />
  );
};

export default SearchableMultiSelect;
