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
  useQuery,
  Name,
} from '.';
import {
  IColumn,
  CheckboxVisibility,
  Dropdown,
  Text,
  Modal,
} from 'office-ui-fabric-react';
import { CSVLink } from 'react-csv';
import { DisplaySchema, IDispatcher } from '../../typical-admin';
import Subscriber from '../../typical-admin/Subscriber';
import { Query } from '@apollo/react-components';

interface Props {
  items?: Array<any>;
  dispatcher?: IDispatcher;
  pageControl?: any;
  filters?: IndexableObject;
  setFilters?: (filters: any) => void;
  schema: DisplaySchema<any>;
  onSelect?: (values: any) => void;
  name?: Name;
  csvHeaders?: Array<{ label: string; key: string }>;
  label?: String;
}

const List: React.FC<Props> = ({
  items,
  dispatcher,
  filters,
  setFilters,
  schema,
  onSelect,
  name,
  csvHeaders,
  label,
}) => {
  const [pageControl, setPageControl] = useState<any>({
    start: 0,
    limit: 15,
    orderBy: null,
    orderByDesc: null,
  });
  const [sort, setSort] = useState<IndexableObject>({});
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const style = getStyle();
  function handleSelect(item?: any) {
    onSelect && onSelect(item);
  }
  function setPage(page: number, rows: number) {
    setPageControl({
      ...pageControl,
      limit: rows,
      start: (page - 1) * pageControl.limit,
    });
  }
  function toggleModal() {
    setIsOpen(!isOpen);
  }

  function handleSort(
    _: React.MouseEvent<HTMLElement, MouseEvent>,
    column: IColumn
  ) {
    switch (sort[column.key]) {
      case '':
        setPageControl({
          ...pageControl,
          orderBy: column.key,
          orderByDesc: null,
        });
        setSort({ [column.key]: 'asc' });
        break;
      case 'asc':
        setPageControl({
          ...pageControl,
          orderBy: null,
          orderByDesc: column.key,
        });
        setSort({ [column.key]: 'des' });
        break;
      case 'des':
        setPageControl({
          ...pageControl,
          orderBy: null,
          orderByDesc: null,
        });
        setSort({ [column.key]: '' });
        break;
      default:
        setPageControl({
          ...pageControl,
          orderBy: column.key,
          orderByDesc: null,
        });
        setSort({ [column.key]: 'asc' });
        break;
    }
  }
  function toCSV(schema: DisplaySchema<any>, items: any[]) {
    return items.map((i) => {
      const item = { ...i };
      Object.entries(schema).forEach(([k, v]: any) => {
        item[k] = v.onRender ? v.onRender({ value: i[k], values: i }) : i[k];
      });
      return item;
    });
  }
  console.log(pageControl);
  return (
    <>
      {dispatcher && name ? (
        <Query
          query={dispatcher.list}
          variables={{
            ...filters,
            _start: pageControl.start,
            _limit: pageControl.limit,
            _orderBy: pageControl.orderBy,
            _orderBy_desc: pageControl.orderByDesc,
          }}
        >
          {(getItems: any) => {
            if (getItems.error) {
              return <span>{`error: ${getItems.error}`}</span>;
            }

            if (getItems.loading) {
              return <span>{`loading...`}</span>;
            }
            const queryName = `get${name.plural}`;
            const rows = getItems.data[queryName] || [];
            const pageInfo = getItems.data[`${queryName}PageInfo`] || {};
            return (
              <Stack>
                {dispatcher.subscribe && (
                  <Subscriber
                    document={dispatcher.subscribe}
                    options={{ onSubscriptionData: () => getItems.refetch() }}
                  />
                )}
                {csvHeaders && (
                  <Stack horizontal>
                    <strong>{name.plural}</strong>:{' '}
                    <IconButton onClick={toggleModal}>
                      <Icon iconName={'Download'} />
                    </IconButton>
                    <Modal isOpen={isOpen} onDismiss={toggleModal}>
                      <Stack className={`${style.modalHeader}`}>
                        Download - {name.plural}
                      </Stack>
                      <Stack className={`${style.modalBody}`}>
                        {isOpen && (
                          <Query
                            query={dispatcher.list}
                            variables={{ ...filters }}
                          >
                            {(getAllItems: any) => {
                              if (getAllItems.error) {
                                return (
                                  <span>{`error: ${getItems.error}`}</span>
                                );
                              }

                              if (getAllItems.loading) {
                                return <span>{`loading...`}</span>;
                              }
                              const rows = getAllItems.data[queryName] || [];
                              return (
                                <CSVLink
                                  className={style.link}
                                  headers={csvHeaders}
                                  data={toCSV(schema, rows)}
                                  filename={`${name.plural}.csv`}
                                >
                                  Download File {`${name.plural}.csv`}
                                </CSVLink>
                              );
                            }}
                          </Query>
                        )}
                      </Stack>
                    </Modal>
                  </Stack>
                )}
                <DetailsList
                  onActiveItemChanged={handleSelect}
                  onRenderRow={(props: any, defaultRender: any) => {
                    return handleSelect !== null &&
                      handleSelect !== undefined ? (
                      <div style={{ cursor: 'pointer' }}>
                        {defaultRender(props)}
                      </div>
                    ) : (
                      defaultRender(props)
                    );
                  }}
                  items={rows}
                  checkboxVisibility={CheckboxVisibility.hidden}
                  selectionMode={
                    !handleSelect ? SelectionMode.none : SelectionMode.single
                  }
                  columns={Object.entries(schema)
                    .filter(([k, v]: any) =>
                      v.options?.hidden === undefined ? true : !v.options.hidden
                    )
                    .map(([k, v]: any) => {
                      const col: IColumn = {
                        key: k,
                        name: v.label,
                        minWidth: 100,
                        maxWidth: 200,
                        isMultiline: true,
                        isResizable: true,
                        isFiltered:
                          filters &&
                          filters[k] !== '' &&
                          filters[k] !== undefined,
                        onColumnClick: handleSort,
                        isSorted: sort[k] && sort[k] !== '',
                        isSortedDescending: sort[k] && sort[k] === 'des',
                      };

                      col.onRender = (values) =>
                        v.onRender
                          ? v.onRender({ values, value: values[k] })
                          : values[k];
                      return col;
                    })}
                />
                {pageInfo && pageControl?.limit && (
                  <Stack
                    horizontal
                    horizontalAlign={'end'}
                    verticalAlign={'center'}
                    tokens={{ childrenGap: '0.77em' }}
                  >
                    <Text>Rows</Text>
                    <Dropdown
                      onChange={(_: any, option: any) => {
                        console.log(option);
                        setPage(pageInfo.page, option.key);
                      }}
                      selectedKey={pageControl.limit}
                      options={[
                        { text: '5', value: 5 },
                        { text: '10', value: 10 },
                        { text: '15', value: 15 },
                        { text: '20', value: 20 },
                        { text: '25', value: 25 },
                        { text: '50', value: 50 },
                        { text: '100', value: 100 },
                      ].map(
                        (
                          {
                            text,
                            value: optValue,
                          }: { text: string; value: any },
                          _: number
                        ) => ({ key: optValue, text })
                      )}
                    >
                      {}
                    </Dropdown>
                    <IconButton
                      disabled={pageInfo.page === 1}
                      onClick={() =>
                        setPage(pageInfo.page - 1, pageControl.limit)
                      }
                    >
                      <Icon iconName={'Remove'} />
                    </IconButton>
                    <Text>
                      Page {pageInfo.page} of {pageInfo.totalPages}
                    </Text>
                    <IconButton
                      disabled={pageInfo.page >= pageInfo.totalPages}
                      onClick={() =>
                        setPage(pageInfo.page + 1, pageControl.limit)
                      }
                    >
                      <Icon iconName={'Add'} />
                    </IconButton>
                  </Stack>
                )}
              </Stack>
            );
          }}
        </Query>
      ) : (
        items && (
          <Stack>
            {csvHeaders && (
              <Stack horizontal>
                <strong>{label ? label : name?.plural}</strong>:{' '}
                <CSVLink
                  className={style.link}
                  headers={csvHeaders}
                  data={toCSV(schema, items || [])}
                  filename={`${label ? label : name?.plural}.csv`}
                >
                  <Icon iconName={'Download'} />
                </CSVLink>
              </Stack>
            )}
            <DetailsList
              onActiveItemChanged={handleSelect}
              onRenderRow={(props: any, defaultRender: any) => {
                return handleSelect !== null && handleSelect !== undefined ? (
                  <div style={{ cursor: 'pointer' }}>
                    {defaultRender(props)}
                  </div>
                ) : (
                  defaultRender(props)
                );
              }}
              items={items}
              checkboxVisibility={CheckboxVisibility.hidden}
              selectionMode={
                !handleSelect ? SelectionMode.none : SelectionMode.single
              }
              columns={Object.entries(schema)
                .filter(([k, v]: any) =>
                  v.options?.hidden === undefined ? true : !v.options.hidden
                )
                .map(([k, v]: any) => {
                  const col: IColumn = {
                    key: k,
                    name: v.label,
                    minWidth: 100,
                    maxWidth: 200,
                    isMultiline: true,
                    isResizable: true,
                    isFiltered:
                      filters && filters[k] !== '' && filters[k] !== undefined,
                    onColumnClick: handleSort,
                    isSorted: sort[k] && sort[k] !== '',
                    isSortedDescending: sort[k] && sort[k] === 'des',
                  };

                  col.onRender = (values) =>
                    v.onRender
                      ? v.onRender({ values, value: values[k] })
                      : values[k];
                  return col;
                })}
            />
          </Stack>
        )
      )}
    </>
  );
};
export default List;
