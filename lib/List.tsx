import React, { useState } from 'react';
import Field from './templates/Fabric';
import {
  getStyle,
  Stack,
  IndexableObject,
  IconButton,
  Icon,
  DetailsList,
  SelectionMode,
} from '.';
import { IColumn, CheckboxVisibility } from 'office-ui-fabric-react';
import matchSorter from 'match-sorter';
import { CSVLink } from 'react-csv';
import { DisplaySchema } from '../../typical-admin';

interface Props {
  items: Array<any>;
  schema: DisplaySchema<any>;
  onSelect?: (values: any) => void;
  name: string;
  csvHeaders?: Array<{ label: string; key: string }>;
  pageSize?: number;
}

const List: React.FC<Props> = ({
  items,
  schema,
  onSelect,
  name,
  csvHeaders,
  pageSize,
}) => {
  const [filters, setFilters] = useState<IndexableObject>({
    name: '',
    program: '',
    location: '',
    category: '',
  });
  const [sort, setSort] = useState<IndexableObject>({});
  var filteredItems = items;
  const style = getStyle();
  const [page, setPage] = useState(0);
  function handleSelect(item?: any) {
    onSelect && onSelect(item);
  }
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
  Object.entries(filters).forEach(([name, value]) => {
    if (value !== '') {
      filteredItems = matchSorter(filteredItems, value, { keys: [name] });
    }
  });
  Object.entries(sort).forEach(([name, value]: any) => {
    if (value !== '' && value !== undefined) {
      filteredItems = filteredItems.sort((a: any, b: any) =>
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
  return (
    <>
      <Stack horizontal tokens={{ childrenGap: '0.77em' }}>
        {Object.entries(schema)
          .filter(([, s]: any) => s.options && s.options.filterable)
          .map(([k, v]: any, i: number) =>
            v.options.options ? (
              <Field
                key={i}
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
        {csvHeaders && (
          <Stack horizontal>
            <strong>{name}</strong>:{' '}
            <CSVLink
              className={style.link}
              headers={csvHeaders}
              data={items || []}
              filename={`${name}.csv`}
            >
              <Icon iconName={'Download'} />
            </CSVLink>
          </Stack>
        )}

        <DetailsList
          onActiveItemChanged={handleSelect}
          items={
            pageSize
              ? filteredItems.slice(page * pageSize, (page + 1) * pageSize)
              : filteredItems
          }
          checkboxVisibility={CheckboxVisibility.hidden}
          selectionMode={
            !handleSelect ? SelectionMode.none : SelectionMode.single
          }
          columns={Object.entries(schema).map(([k, v]: any) => {
            const col: IColumn = {
              key: k,
              name: v.label,
              minWidth: 100,
              maxWidth: 200,
              isMultiline: true,
              isResizable: true,
              isFiltered: filters[k] !== '' && filters[k] !== undefined,
              onColumnClick: handleSort,
              isSorted: sort[k] && sort[k] !== '',
              isSortedDescending: sort[k] && sort[k] === 'des',
            };

            col.onRender = values =>
              v.onRender ? v.onRender({ values, value: values[k] }) : values[k];
            return col;
          })}
        />
        {pageSize && (
          <Stack horizontal horizontalAlign={'end'} verticalAlign={'center'}>
            <IconButton disabled={page === 0} onClick={() => setPage(page - 1)}>
              <Icon iconName={'Remove'} />
            </IconButton>
            <IconButton
              disabled={filteredItems.length - page * pageSize <= pageSize}
              onClick={() => setPage(page + 1)}
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
