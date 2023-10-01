import React, { useState } from 'react';
import { Stack, Name, useQuery, IndexableObject, getStyle } from './lib';
import DetailsList from './lib/List';
import Field from './lib/templates/Fabric';
import Links from './Links';
import { IDispatcher, DisplaySchema, IComponents } from '../typical-admin';
import Subscriber from '../typical-admin/Subscriber';

interface Props {
  dispatcher: IDispatcher;
  match: any;
  history: any;
  name: Name;
  schemaDefinition: DisplaySchema<any>;
  pageSize?: number;
  components?: IComponents;
}

const List: React.FC<Props> = ({
  dispatcher,
  match,
  history,
  name,
  schemaDefinition,
  components,
}) => {
  const [filters, setFilters] = useState<IndexableObject>({});
  function handleChange(name: string, value: any) {
    setFilters({ ...filters, [name]: value });
  }
  const style = getStyle();
  return (
    <Stack>
      <Stack
        horizontal
        horizontalAlign={'space-between'}
        verticalAlign={'center'}
      >
        <h3>Listing {name.plural}</h3>
        {components?.links ? (
          React.createElement(components.links, {
            match,
            name,
            dispatcher,
          })
        ) : (
          <Links match={match} name={name} dispatcher={dispatcher} />
        )}
      </Stack>
      <Stack horizontal tokens={{ childrenGap: '0.77em' }}>
        {filters &&
          Object.entries(schemaDefinition)
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
              ) : v.options.filterType &&
                v.options.filterType === 'dateRange' ? (
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
      <DetailsList
        dispatcher={dispatcher}
        filters={filters}
        setFilters={setFilters}
        name={name}
        schema={schemaDefinition}
        onSelect={(item) => {
          history.push(`${match.url}/${item.id}/show`, item);
        }}
      />
      <br />
    </Stack>
  );
};
export default List;
