import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import {
  Dropdown,
  DropdownMenuItemType,
  IDropdown,
  IDropdownOption,
  ISearchBox,
  SearchBox,
  getTheme,
  mergeStyles,
} from '@fluentui/react';
import { dropdownMenuProps } from './menuCallout';
import { normalizeText, optionMatches } from './optionSearch';

type Key = string | number;

export interface SearchableDropdownProps {
  label?: string;
  options: IDropdownOption[];
  multiSelect?: boolean;
  /** Single select: the selected key ('' / null / undefined for none). */
  selectedKey?: Key | null;
  /** Multi select: the selected keys. */
  selectedKeys?: Key[];
  /** Single select: the picked option. Multi select: the toggled option with
   *  `selected` already flipped, the same shape a multiSelect Dropdown's
   *  onChange gives. */
  onPick: (option: IDropdownOption) => void;
  onFocus?: () => void;
  placeholder?: string;
  [key: string]: any;
}

// Height of the pinned filter row (8px padding, 32px box, 8px padding, 1px
// border), so an option scrolled into view isn't left underneath it.
const FILTER_ROW_HEIGHT = 49;
const FILTER_CLASS = 'searchable-dropdown-filter';

// Touch screens get no autofocus on the filter: focusing it there pops up the
// on-screen keyboard over the list the moment the menu opens, before anyone
// has decided to search rather than scroll.
const coarsePointer = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

const isNormal = (o: IDropdownOption) =>
  o.itemType === undefined || o.itemType === DropdownMenuItemType.Normal;
// What the arrow keys and Enter can land on.
const isNavigable = (o: IDropdownOption) => isNormal(o) && !o.hidden && !o.disabled;

interface FilterBoxProps {
  value: string;
  onChange: (v: string) => void;
  onFocusChange: (focused: boolean) => void;
}

// Focuses the filter when the menu opens. Not `autoFocus`: the Dropdown moves
// focus onto its own list once the menu has been positioned, which lands
// after mount, so the keystrokes meant for the filter went to the list's
// type-ahead instead — and could change the selection. Re-taking focus over
// the first few frames wins that race; it stops as soon as the filter has it.
const FilterBox = ({ value, onChange, onFocusChange }: FilterBoxProps) => {
  const ref = useRef<ISearchBox>(null);
  // On a touch screen the filter starts outside the list's FocusZone: when
  // the menu opens, the Dropdown focuses the zone's first focusable element,
  // which was this box, so the keyboard popped up after all. Out of the
  // zone, the first option takes that focus instead. A box marked that way
  // also ignores taps, so the first touch on it puts it back.
  const [inZone, setInZone] = useState(() => !coarsePointer());
  useEffect(() => {
    if (coarsePointer()) return;
    const timers = [0, 50, 150, 300].map(ms => setTimeout(() => {
      const input = document.activeElement as HTMLElement | null;
      if (!input?.closest?.(`.${FILTER_CLASS}`)) ref.current?.focus();
    }, ms));
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div onPointerDownCapture={() => setInZone(true)}>
      <SearchBox
        componentRef={ref}
        className={FILTER_CLASS}
        data-is-focusable={inZone ? undefined : false}
        placeholder="Filter"
        value={value}
        onChange={(_, v) => onChange(v ?? '')}
        // SearchBox's own Escape clears the text and swallows the key. Here
        // Escape closes the menu (handled by the row around the box), and the
        // filter is cleared on close anyway.
        onEscape={ev => ev.preventDefault()}
        onFocus={() => onFocusChange(true)}
        onBlur={() => onFocusChange(false)}
      />
    </div>
  );
};

// The `searchable: true` variant of `select` and `multi-select`: a plain
// Fluent Dropdown, with a filter box pinned to the top of its menu.
//
// The filter lives in the menu rather than in the box itself (a ComboBox,
// which the multi-select first was) for two reasons: the box keeps showing
// what's selected instead of being overwritten by whatever's typed, and the
// menu opens on a tap like every other dropdown — the ComboBox let you type
// on a phone without ever opening its list, so the results were invisible.
//
// Typing narrows the list to options whose text or key contains it,
// case-insensitively. Non-matches are marked `hidden` rather than removed,
// and the selection is never hidden by the multi-select: the box builds its
// text from the options it's given, so a removed selection would vanish from
// the box while filtering. (The single select hides a non-matching selection
// from the list — it can't be deselected anyway — but it stays in the
// options, so the box still shows it.) A multi-select keeps its selected
// options listed so one can be deselected without clearing the search.
//
// Keyboard, with the filter focused: ArrowDown/ArrowUp move a highlight
// through the matches (wrapping), Enter picks the highlighted one (a single
// select closes; a multi-select toggles it and stays open), Escape closes
// and returns focus to the box, Tab closes and moves on as Fluent's own
// Dropdown does. The first match is highlighted as soon as you type, so
// "type, Enter" picks it. The highlight follows the mouse, so there is only
// ever one row that Enter would pick, and it's only drawn while the filter
// has focus: on a touch screen, where the filter isn't focused until tapped,
// there's nothing for Enter to act on.
const SearchableDropdown = ({
  label,
  options,
  multiSelect,
  selectedKey,
  selectedKeys,
  onPick,
  onFocus,
  placeholder,
  ...rest
}: SearchableDropdownProps) => {
  const theme = getTheme();
  const dropdownRef = useRef<IDropdown>(null);
  const [filter, setFilter] = useState('');
  const [active, setActive] = useState<Key | undefined>();
  const [filterFocused, setFilterFocused] = useState(false);
  const activeEl = useRef<HTMLDivElement | null>(null);
  const scrollToActive = useRef(false);

  const query = normalizeText(filter);
  const selected: Key[] = multiSelect
    ? selectedKeys ?? []
    : selectedKey === undefined || selectedKey === null || selectedKey === '' ? [] : [selectedKey];
  const isSelected = (key: Key) => selected.includes(key);

  const shown = query
    ? options.map(o =>
        optionMatches(o, query, true) || (multiSelect && isSelected(o.key)) ? o : { ...o, hidden: true })
    : options;
  const navigable = shown.filter(isNavigable);

  // The highlight falls back to the first match whenever the remembered one
  // is filtered out, so it's always on something Enter can pick. With no
  // filter, a single select starts on its current selection.
  // A multi-select's selections stay listed when they don't match; they can
  // be arrowed to, but the highlight starts on an actual match.
  const fallback = query
    ? navigable.find(o => optionMatches(o, query, true)) ?? navigable[0]
    : (!multiSelect ? navigable.find(o => isSelected(o.key)) : undefined) ?? navigable[0];
  const activeKey = navigable.some(o => o.key === active) ? active : fallback?.key;

  useEffect(() => {
    if (!scrollToActive.current) return;
    scrollToActive.current = false;
    activeEl.current?.scrollIntoView({ block: 'nearest' });
  }, [activeKey, query]);

  const changeFilter = (v: string) => {
    setFilter(v);
    setActive(undefined);
    scrollToActive.current = true;
  };

  const close = () => {
    dropdownRef.current?.dismissMenu();
    dropdownRef.current?.focus(false);
  };

  const pick = (option: IDropdownOption) => {
    if (multiSelect) {
      onPick({ ...option, selected: !isSelected(option.key) });
    } else {
      onPick(option);
      close();
    }
  };

  const move = (step: 1 | -1) => {
    if (navigable.length === 0) return;
    const i = navigable.findIndex(o => o.key === activeKey);
    const next = i === -1
      ? (step === 1 ? 0 : navigable.length - 1)
      : (i + step + navigable.length) % navigable.length;
    scrollToActive.current = true;
    setActive(navigable[next].key);
  };

  const onFilterKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        e.preventDefault();
        move(e.key === 'ArrowDown' ? 1 : -1);
        break;
      case 'Enter': {
        e.preventDefault();
        const option = navigable.find(o => o.key === activeKey);
        if (option) pick(option);
        break;
      }
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        // Let the Dropdown's own list handler see it: it closes the menu and
        // moves focus to the field after (or, with Shift, before) the box.
        return;
    }
    // Everything else stays in the filter: the menu's own key handling
    // (arrow keys, type-ahead, Space to toggle) would otherwise act on
    // keystrokes meant for it.
    e.stopPropagation();
  };

  const activeClass = mergeStyles({
    selectors: {
      '& .ms-Dropdown-item': {
        outline: `1px solid ${theme.palette.neutralSecondary}`,
        outlineOffset: '-1px',
      },
    },
    // Shows through the (transparent) unselected item; a selected item keeps
    // its own background, so the outline is what marks it.
    background: theme.semanticColors.menuItemBackgroundHovered,
  });

  return (
    <Dropdown
      {...dropdownMenuProps}
      componentRef={dropdownRef}
      label={label}
      multiSelect={multiSelect}
      placeholder={placeholder}
      options={shown}
      {...(multiSelect
        ? { selectedKeys: selected as string[] }
        : { selectedKey: selected[0] ?? null })}
      onChange={(_, option) => { if (option) onPick(option); }}
      onDismiss={() => { setFilter(''); setActive(undefined); }}
      onFocus={onFocus}
      onRenderItem={(item, defaultRender) => {
        const rendered = defaultRender?.(item) ?? null;
        if (!item || !isNavigable(item)) return rendered;
        const isActive = filterFocused && item.key === activeKey;
        return (
          <div
            key={item.key}
            ref={isActive ? activeEl : undefined}
            className={isActive ? activeClass : undefined}
            style={{ scrollMarginTop: FILTER_ROW_HEIGHT }}
            // Not onMouseEnter: scrolling the list under a still pointer
            // would steal the highlight from the keyboard.
            onMouseMove={() => { if (item.key !== activeKey) setActive(item.key); }}
          >
            {rendered}
          </div>
        );
      }}
      onRenderList={(listProps, defaultRender) => (
        <>
          <div
            style={{
              position: 'sticky', top: 0, zIndex: 1, padding: 8,
              background: theme.semanticColors.bodyBackground,
              borderBottom: `1px solid ${theme.semanticColors.bodyDivider}`,
            }}
            onKeyDown={onFilterKeyDown}
          >
            <FilterBox value={filter} onChange={changeFilter} onFocusChange={setFilterFocused} />
          </div>
          {shown.some(o => isNormal(o) && !o.hidden)
            ? defaultRender?.(listProps)
            : <div style={{ padding: '8px 12px', opacity: 0.65 }}>No matches</div>}
        </>
      )}
      {...rest}
    />
  );
};

export default SearchableDropdown;
