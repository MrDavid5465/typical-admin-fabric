import React, { useEffect, useMemo, useRef, useState } from 'react';
import Field from './templates/Fabric';
import {
  getStyle,
  Stack,
  IndexableObject,
  DetailsList,
  SelectionMode,
  IconButton,
  Icon,
} from '.';
import ListControls, { ListButtonConfig, RowButtonConfig } from './ListControls';
import { ColumnVisibilityStore, localStorageColumnVisibilityStore } from './columnVisibilityStore';
import { IColumn, CheckboxVisibility, Selection, mergeStyles } from '@fluentui/react';
import { COARSE_POINTER, TOUCH_TARGET, touchIconButtonStyles } from './touch';
import { matchSorter } from 'match-sorter';
// import { CSVLink } from 'react-csv';
import { DisplaySchema } from '../../typical-admin';

interface Props {
  items: Array<any>;
  schema: DisplaySchema<any>;
  onSelect?: (values: any) => void;
  name: string;
  csvHeaders?: Array<{ label: string; key: string }>;
  pageSize?: number;
  // Opts in to a "Columns" picker (checkbox Form, one checkbox per schema
  // key) letting the user hide/show columns — off by default so every
  // existing caller renders exactly as before.
  columnSelectable?: boolean;
  // Namespace for the saved hidden-column set; only read/used when
  // columnSelectable is true. Falls back to `name`, but callers should pass
  // an explicit key since `name` isn't guaranteed unique across every List
  // instance in the app.
  storageKey?: string;
  // Where the hidden-column set is persisted — defaults to localStorage.
  // Swap in a different implementation (e.g. a backend-backed one) without
  // touching any of the selection/filtering logic below.
  columnVisibilityStore?: ColumnVisibilityStore;
  // Schema keys that can never be hidden (e.g. an identity column).
  alwaysVisibleColumns?: string[];
  // Renders a grid-level "Add" control (see ListControls) when provided —
  // undefined means the caller's schema didn't opt in (ListSchema.buttons.add),
  // so nothing renders. The wrapper List.tsx computes this from dispatcher.new
  // + navigate; this component just renders whatever it's handed.
  onAdd?: () => void;
  // Arbitrary grid-level actions beyond add/columns (see ListControls).
  customButtons?: ListButtonConfig[];
  // Row action buttons (Edit/Load/Delete, etc.) — declarative replacement
  // for callers hand-writing their own `actions` DisplayField with inline
  // IconButton JSX. Rendered in the grid's own toolbar (alongside
  // Add/Columns), enabled only once a row is selected via the grid's
  // existing click-to-select mechanism (DetailsList's onActiveItemChanged,
  // already wired below), and act on that selected row — not inline in
  // each row.
  rowButtons?: RowButtonConfig[];
  // Calls onSelect on a row click or tap, or Enter on a focused row (a
  // double-click calls it again for the same row), instead of whenever the
  // active row changes. The default fires only when a *different* row
  // becomes active, so a list that stays on screen next to its detail
  // (denim-fabric's AdminMasterDetail) couldn't reopen the row it had just
  // closed. Off by default: arrow keys keep opening rows as before.
  selectOnClick?: boolean;
  // Highlights the row whose key is this value; null highlights none. When
  // it changes (a deep link, Back, a new record) the list turns to the page
  // holding that row and scrolls it into view. Leave undefined for the
  // default, uncontrolled selection. For a selection that lives elsewhere,
  // e.g. in the URL of a detail pane.
  selectedKey?: string | null;
  // Which item field is the row key for selectedKey. Default 'id'.
  keyField?: string;
}

// Room above the grid for the ListControls toolbar: its buttons grow to 44px
// on touch screens (see ./touch).
const toolbarSpace = mergeStyles({
  paddingTop: 36,
  selectors: { [COARSE_POINTER]: { paddingTop: TOUCH_TARGET + 4 } },
});

const List: React.FC<Props> = ({
  items,
  schema,
  onSelect,
  name,
  csvHeaders: _csvHeaders,
  pageSize,
  columnSelectable,
  storageKey,
  columnVisibilityStore = localStorageColumnVisibilityStore,
  alwaysVisibleColumns,
  onAdd,
  customButtons,
  rowButtons,
  selectOnClick,
  selectedKey,
  keyField = 'id',
}) => {
  const [filters, setFilters] = useState<IndexableObject>({});
  const [sort, setSort] = useState<IndexableObject>({});
  let filteredItems = items;
  const style = getStyle();
  const [page, setPage] = useState(0);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const resolvedStorageKey = storageKey ?? name;
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(
    () => (columnSelectable ? columnVisibilityStore.readHidden(resolvedStorageKey) : new Set())
  );
  const pickableKeys = Object.keys(schema).filter(k => !(alwaysVisibleColumns ?? []).includes(k));
  const visibleCount = pickableKeys.filter(k => !hiddenColumns.has(k)).length + (alwaysVisibleColumns?.length ?? 0);
  const totalCount = Object.keys(schema).length;
  const columnSelectSchema = pickableKeys.reduce((acc, k) => {
    acc[k] = { type: 'checkbox', label: (schema as any)[k].label };
    return acc;
  }, {} as Record<string, any>);
  function handleSelect(item?: any) {
    if (rowButtons?.length) setSelectedItem(item ?? null);
    !selectOnClick && onSelect && onSelect(item);
  }
  // A Selection of our own only when the highlight is controlled
  // (selectedKey), so every other list keeps Fluent's default behaviour.
  const controlled = selectedKey !== undefined;
  const selection = useMemo(
    () => new Selection({ getKey: (item: any) => String(item?.[keyField] ?? ''), selectionMode: SelectionMode.single }),
    [keyField],
  );
  const gridRef = useRef<HTMLDivElement>(null);
  const [, setSelectionVersion] = useState(0);
  // Row buttons act on whichever row is currently selected — clearing the
  // selection after acting avoids a stale reference to a since-mutated (or
  // deleted) row still being the target of the next click.
  const selectionButtons: ListButtonConfig[] = (rowButtons ?? []).map(btn => ({
    key: btn.key,
    label: btn.label,
    icon: btn.icon,
    danger: btn.danger,
    disabled: !selectedItem || !!btn.disabled?.(selectedItem),
    onClick: () => {
      if (!selectedItem) return;
      btn.onClick(selectedItem);
      setSelectedItem(null);
    },
  }));
  function handleChange(name: string, value: any) {
    setPage(0);
    setFilters({ ...filters, [name]: value });
  }
  function handleSort(
    _: React.MouseEvent<HTMLElement, MouseEvent>,
    column: IColumn
  ) {
    switch (sort[column.key]) {
      case '':
        setSort({ [column.key]: 'asc' });
        break;
      case 'asc':
        setSort({ [column.key]: 'des' });
        break;
      case 'des':
        setSort({ [column.key]: '' });
        break;
      default:
        setSort({ [column.key]: 'asc' });
        break;
    }
  }
  // Only referenced by the commented-out CSV export block below — commented
  // out alongside it (rather than deleted) to keep it available if that's
  // reactivated; a live-but-unreferenced function fails `tsc --noEmit`.
  // function toCSV(schema: DisplaySchema<any>, items: any[]) {
  //   return items.map((i) => {
  //     const item = { ...i };
  //     Object.entries(schema).forEach(([k, v]: any) => {
  //       item[k] = v.onRender ? v.onRender({ value: i[k], values: i }) : i[k];
  //     });
  //     return item;
  //   });
  // }
  Object.entries(filters).forEach(([name, value]) => {
    if (value !== '' && !(name.includes('_gt') || name.includes('_lt'))) {
      filteredItems = matchSorter(filteredItems, value, { keys: [name] });
    } else if (name.includes('_gt') || name.includes('_lt')) {
      filteredItems = filteredItems.filter((i) => {
        const itemValue = i[name.split('_')[0]];
        return name.split('_')[1] === 'gt'
          ? itemValue >= value
          : itemValue < value;
      });
    }
  });
  Object.entries(sort).forEach(([name, value]: any) => {
    if (value !== '' && value !== undefined) {
      // A copy: the items may be Apollo's frozen result array.
      filteredItems = [...filteredItems].sort((a: any, b: any) =>
        value === 'asc'
          ? a[name] > b[name]
            ? 1
            : -1
          : a[name] < b[name]
          ? 1
          : -1
      );
    }
  });
  const pageItems = pageSize
    ? filteredItems.slice(page * pageSize, (page + 1) * pageSize)
    : filteredItems;
  const selectedIndex = controlled && selectedKey !== null
    ? pageItems.findIndex((i: any) => String(i?.[keyField]) === String(selectedKey))
    : -1;
  // Re-applied after every render: DetailsList re-seeds the selection's items
  // whenever it gets a new page of them.
  useEffect(() => {
    if (!controlled) return;
    const key = selectedIndex >= 0 ? String(selectedKey) : null;
    const current = selection.getSelection()[0];
    const currentKey = current ? String((current as any)[keyField]) : null;
    if (currentKey === key) return;
    selection.setAllSelected(false);
    if (key !== null) selection.setKeySelected(key, true, false);
    // Re-render so the rows pick it up: under React's StrictMode they can
    // miss the selection's change event. Only on a real change, so a key the
    // selection doesn't know can't loop.
    const after = selection.getSelection()[0];
    if ((after ? String((after as any)[keyField]) : null) !== currentKey) setSelectionVersion(v => v + 1);
  });
  // When the selection changes, show it: turn to its page, then scroll its
  // row into view. Kept pending until the row exists (a just-created record
  // arrives with the list's refetch). Paging by hand doesn't move it.
  const revealKey = useRef<string | null>(null);
  useEffect(() => {
    revealKey.current = selectedKey ?? null;
  }, [selectedKey]);
  useEffect(() => {
    const key = revealKey.current;
    if (!controlled || key === null) return;
    const index = filteredItems.findIndex((i: any) => String(i?.[keyField]) === key);
    if (index < 0) return;
    const target = pageSize ? Math.floor(index / pageSize) : 0;
    if (target !== page) {
      setPage(target);
      return;
    }
    revealKey.current = null;
    // Fluent renders rows past the first few a frame or two later.
    const selector = `.ms-DetailsRow[data-item-index="${index - target * (pageSize ?? 0)}"]`;
    let frame = 0;
    let tries = 10;
    const reveal = () => {
      const row = gridRef.current?.querySelector(selector);
      if (row) row.scrollIntoView({ block: 'nearest' });
      else if (--tries > 0) frame = requestAnimationFrame(reveal);
    };
    reveal();
    return () => cancelAnimationFrame(frame);
  });
  return (
    <>
      <Stack horizontal tokens={{ childrenGap: '0.77em' }}>
        {Object.entries(schema)
          .filter(([, s]: any) => s.options && s.options.filterable)
          .map(([k, v]: any, i: number) =>
            v.options.options ? (
              <Field
                key={`${i}`}
                className={style.sm}
                label={v.label}
                errors={[]}
                type={'select'}
                onChange={handleChange}
                name={k}
                value={filters[k]}
                options={v.options.options.map((p: any) => ({
                  text: p.text || '',
                  value: p.value || '',
                }))}
              />
            ) : v.options.filterType && v.options.filterType === 'dateRange' ? (
              React.createElement(
                () => (
                  <>
                    <Field
                      key={`${i}_gt`}
                      className={style.sm}
                      label={`${v.label} start`}
                      errors={[]}
                      type={'text'}
                      onChange={handleChange}
                      name={`${k}_gt`}
                      value={filters[`${k}_gt`]}
                    />
                    <Field
                      key={`${i}_lt`}
                      className={style.sm}
                      label={`${v.label} end`}
                      errors={[]}
                      type={'text'}
                      onChange={handleChange}
                      name={`${k}_lt`}
                      value={filters[`${k}_lt`]}
                    />
                  </>
                ),
                { key: i }
              )
            ) : (
              <Field
                key={i}
                className={style.sm}
                label={v.label}
                errors={[]}
                type={'text'}
                onChange={handleChange}
                name={k}
                value={filters[k]}
              />
            )
          )}
      </Stack>
      <Stack>
        {/* {csvHeaders && (
          <Stack horizontal>
            <strong>{name}</strong>:{' '}
            <CSVLink
              className={style.link}
              headers={csvHeaders}
              data={toCSV(schema, filteredItems)}
              filename={`${name}.csv`}
            >
              <Icon iconName={'Download'} />
            </CSVLink>
          </Stack>
        )} */}

        <div
          ref={gridRef}
          style={{ position: 'relative' }}
          className={(columnSelectable || onAdd || customButtons?.length || rowButtons?.length) ? toolbarSpace : undefined}
        >
          <ListControls
            columnSelectable={columnSelectable}
            visibleCount={visibleCount}
            totalCount={totalCount}
            columnSelectSchema={columnSelectSchema}
            initialValues={Object.fromEntries(pickableKeys.map(k => [k, !hiddenColumns.has(k)]))}
            pickableKeys={pickableKeys}
            onColumnsChange={(nextHidden) => {
              setHiddenColumns(nextHidden);
              columnVisibilityStore.writeHidden(resolvedStorageKey, nextHidden);
            }}
            onAdd={onAdd}
            customButtons={[...(customButtons ?? []), ...selectionButtons]}
          />
          <DetailsList
            onActiveItemChanged={handleSelect}
            {...(controlled ? { selection, setKey: 'list' } : {})}
            // Enter on a focused row (and double-click) with selectOnClick.
            onItemInvoked={selectOnClick ? (item?: any) => onSelect?.(item) : undefined}
            onRenderRow={(props: any, defaultRender: any) => {
              return handleSelect !== null && handleSelect !== undefined ? (
                <div
                  style={{ cursor: 'pointer' }}
                  onClick={selectOnClick ? () => onSelect?.(props.item) : undefined}
                >
                  {defaultRender(props)}
                </div>
              ) : (
                defaultRender(props)
              );
            }}
            items={pageItems}
            checkboxVisibility={CheckboxVisibility.hidden}
            selectionMode={
              !handleSelect ? SelectionMode.none : SelectionMode.single
            }
            columns={Object.entries(schema)
              .filter(([k]) => !columnSelectable || (alwaysVisibleColumns ?? []).includes(k) || !hiddenColumns.has(k))
              .map(([k, v]: any) => {
                const col: IColumn = {
                  key: k,
                  name: v.label,
                  minWidth: v.options?.minWidth ?? 100,
                  maxWidth: v.options?.maxWidth ?? 200,
                  isMultiline: true,
                  isResizable: true,
                  isFiltered: filters[k] !== '' && filters[k] !== undefined,
                  onColumnClick: handleSort,
                  isSorted: sort[k] && sort[k] !== '',
                  isSortedDescending: sort[k] && sort[k] === 'des',
                };

                col.onRender = (values) =>
                  v.onRender ? v.onRender({ values, value: values[k] }) : values[k];
                return col;
              })}
          />
        </div>
        {pageSize && (
          <Stack horizontal horizontalAlign={'end'} verticalAlign={'center'}>
            <IconButton
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              ariaLabel="Previous page"
              styles={touchIconButtonStyles}
            >
              <Icon iconName={'Remove'} />
            </IconButton>
            <IconButton
              disabled={filteredItems.length - page * pageSize <= pageSize}
              onClick={() => setPage(page + 1)}
              ariaLabel="Next page"
              styles={touchIconButtonStyles}
            >
              <Icon iconName={'Add'} />
            </IconButton>
            Page {page + 1} of{' '}
            {filteredItems.length % pageSize
              ? Math.floor(filteredItems.length / pageSize) + 1
              : Math.floor(filteredItems.length / pageSize)}
          </Stack>
        )}
      </Stack>
    </>
  );
};
export default List;
