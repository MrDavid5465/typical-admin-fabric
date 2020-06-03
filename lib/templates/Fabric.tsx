import React, { ReactElement, useState } from 'react';
import { withConditionalRender } from '@octant/per-form';
import {
  Stack,
  Checkbox,
  TextField,
  Label,
  Icon,
  IconButton,
  ComboBox,
  ChoiceGroup,
  Dropdown,
  getTheme,
  mergeStyleSets,
  DatePicker,
  PrimaryButton,
} from 'office-ui-fabric-react';
import { format, parseISO } from 'date-fns';
interface IndexableObject {
  [key: string]: any;
}
const getStyle = () => {
  const theme = getTheme();
  return mergeStyleSets({
    errors: {
      minHeight: '1.32em',
      fontSize: '0.8em',
      marginBottom: '0.5em',
    },
    error: { color: theme.semanticColors.errorText },
    hint: { color: theme.palette.themePrimary },
  });
};
const Feedback = withConditionalRender(
  ({ errors, dirty }: { errors: string[]; dirty?: boolean }) => {
    const style = getStyle();
    return (
      <Stack className={`${dirty ? style.error : style.hint}`}>
        {errors && errors[0]}
      </Stack>
    );
  }
);

export default function Raw(props: any): ReactElement {
  const {
    dirty,
    errors,
    label,
    name,
    onChange,
    onFocus,
    touched,
    type,
    value,
    placeholder,
    hint,
    parent,
    options: o,
    ...rest
  }: any = props;
  const [option, setOption] = useState({ index: -1, value: '' });
  const options = props.options ? props.options : [];
  const isValid: boolean = errors ? errors.length === 0 : true;
  const isDirty: boolean = dirty ? dirty : false;
  const isTouched: boolean = touched ? touched : false;
  const style = getStyle();

  function handleChange(e: any) {
    const { value } = e.target;
    onChange(name, value);
  }
  function handleMultiSelect(e: any, option: any) {
    var newValue = value;
    if (newValue === undefined || newValue === null || newValue === '') {
      newValue = [];
    }
    if (option.selected) {
      newValue.push(option.key);
      onChange(name, newValue);
    } else {
      console.log(
        'remove',
        newValue.filter((v: any) => v !== option.key)
      );
      onChange(
        name,
        newValue.filter((v: any) => v !== option.key)
      );
    }
  }
  function sign() {
    onChange(name, rest.signature);
  }
  function handleCheck(e: any) {
    const { checked } = e.target;
    onChange(name, checked);
  }

  function handleFocus(_: any) {
    onFocus && onFocus(name);
  }
  function handleSelect(_: any, option: any) {
    option !== undefined && onChange(name, option.key);
  }
  function handleSelectDate(date: Date | null | undefined) {
    date && onChange(name, new Date(format(date, "yyyy-MM-dd'T'00:00:00")));
  }

  function handleOptionChange(_: any, option: any) {
    setOption({ index: option.key, value: option.value });
  }
  function handleAdd() {
    onChange(
      name,
      [
        ...value,
        options.find((o: any) => option.value === o.value)?.value,
      ].sort((a, b) => (a.toLowerCase() > b.toLowerCase() ? 1 : -1))
    );
    setOption({ index: -1, value: '' });
  }
  function handleRemove(e: any) {
    const target: IndexableObject = e.currentTarget;
    onChange(
      name,
      value
        .filter((v: any) => v !== target.id)
        .sort((a: any, b: any) => (a.toLowerCase() > b.toLowerCase() ? 1 : -1))
    );
    setOption({ index: -1, value: '' });
  }
  function parseDate(val: any) {
    return (val && typeof val === 'string' ? parseISO(val) : val) || new Date();
  }
  function handleTimeChange(
    hour: number,
    minute: number,
    date: Date | null | string = new Date()
  ) {
    var newDate: Date;
    if (date === null || typeof date === 'string') {
      newDate = new Date();
    } else {
      newDate = date;
    }
    hour !== -1
      ? onChange(
          name,
          new Date(
            newDate.getFullYear(),
            newDate.getMonth(),
            newDate.getDate(),
            hour,
            minute,
            0
          )
        )
      : onChange(name, '');
  }

  function choose() {
    var i;
    const hours = [];
    const minutes = [];
    var hour: number;
    var minute: number;
    var ampm: string;
    switch (type) {
      case 'checkbox':
        return (
          <Stack className={rest.className}>
            <Checkbox
              label={label}
              checked={value}
              name={name}
              onChange={handleCheck}
              onFocus={handleFocus}
              {...rest}
            />
            <Stack className={style.errors}>
              <Feedback
                and={[!isValid, isTouched]}
                errors={errors}
                dirty={isDirty}
              />
            </Stack>
          </Stack>
        );
      case 'multicheckbox':
        return (
          <Stack horizontal wrap tokens={{ childrenGap: '0.77em' }}>
            {Object.entries(rest.fields).map(([k, f]: any) => (
              <Stack key={k} style={{ minWidth: '24em' }}>
                <Raw
                  name={k}
                  onChange={(subname: string, subvalue: any) =>
                    onChange(name, { ...value, [subname]: subvalue })
                  }
                  value={value[k]}
                  onFocus={handleFocus}
                  {...f}
                />
              </Stack>
            ))}
          </Stack>
        );
      case 'radio':
        return (
          <Stack className={rest.className}>
            <ChoiceGroup
              label={label}
              onChange={handleChange}
              options={options.map(
                (
                  { text, value: optValue }: { text: string; value: any },
                  _: number
                ) => ({ key: optValue, text })
              )}
              {...rest}
            />
            <Stack className={style.errors}>
              <Feedback
                and={[!isValid, isTouched]}
                errors={errors}
                dirty={isDirty}
              />
            </Stack>
          </Stack>
        );
      case 'select':
        return (
          <Stack className={rest.className}>
            <Dropdown
              label={label}
              onChange={handleSelect}
              onFocus={handleFocus}
              selectedKey={value}
              options={options.map(
                (
                  { text, value: optValue }: { text: string; value: any },
                  _: number
                ) => ({ key: optValue, text })
              )}
              {...rest}
            >
              {}
            </Dropdown>
            <Stack className={style.errors}>
              <Feedback
                and={[!isValid, isTouched]}
                errors={errors}
                dirty={isDirty}
              />
            </Stack>
          </Stack>
        );
      case 'multi-select':
        return (
          <Stack className={rest.className}>
            <Dropdown
              label={label}
              multiSelect
              onChange={handleMultiSelect}
              onFocus={handleFocus}
              selectedKeys={value}
              options={options.map(
                (
                  { text, value: optValue }: { text: string; value: any },
                  _: number
                ) => ({ key: optValue, text })
              )}
              {...rest}
            >
              {}
            </Dropdown>
            <Stack className={style.errors}>
              <Feedback
                and={[!isValid, isTouched]}
                errors={errors}
                dirty={isDirty}
              />
            </Stack>
          </Stack>
        );
      case 'picker':
        return (
          <Stack className={rest.className}>
            <Stack>
              <Label>{label}</Label>
              {value &&
                value.map((r: any, i: number) => (
                  <Stack
                    key={i}
                    horizontal
                    horizontalAlign={'space-between'}
                    verticalAlign={'center'}
                  >
                    {options.find((o: any) => o.value === r)?.text}
                    <IconButton id={r} onClick={handleRemove}>
                      <Icon iconName={'Remove'}></Icon>
                    </IconButton>
                  </Stack>
                ))}
            </Stack>
            <Stack horizontal>
              <ComboBox
                allowFreeform
                autoComplete={'on'}
                selectedKey={option.index}
                onChange={handleOptionChange}
                onFocus={handleFocus}
                placeholder={placeholder}
                options={options
                  .filter((o: any) => !value.includes(o.value))
                  .map(
                    (
                      { text, value: optValue }: { text: string; value: any },
                      i: number
                    ) => ({ key: i, text, value: optValue })
                  )}
                {...rest}
              />
              <IconButton disabled={option.value === ''} onClick={handleAdd}>
                <Icon iconName={'Add'}></Icon>
              </IconButton>
            </Stack>
            <Stack className={style.errors}>
              <Feedback
                and={[!isValid, isTouched]}
                errors={errors}
                dirty={isDirty}
              />
            </Stack>
          </Stack>
        );
      case 'date':
        return (
          <Stack className={rest.className}>
            <DatePicker
              label={label}
              onSelectDate={handleSelectDate}
              formatDate={(val: any) => format(parseDate(val), 'yyyy-MM-dd')}
              value={
                new Date(value).toDateString() ===
                  new Date('3000-01-01').toDateString() || value === ''
                  ? undefined
                  : parseDate(value)
              }
              onFocus={handleFocus}
              placeholder={placeholder}
              allowTextInput={true}
              {...rest}
            />
            <Stack className={style.errors}>
              <Feedback
                and={[!isValid, isTouched]}
                errors={errors}
                dirty={isDirty}
              />
            </Stack>
          </Stack>
        );
      case 'datetime':
        for (i = 0; i < 60; i++) {
          i === 0 && hours.push({ key: i, text: '12' });
          i > 0 && i < 12 && hours.push({ key: i, text: `${i}` });
          i < 10
            ? minutes.push({ key: i, text: `0${i}` })
            : minutes.push({ key: i, text: `${i}` });
        }
        hour = value ? new Date(value).getHours() % 12 : -1;
        minute = value ? new Date(value).getMinutes() : 0;
        ampm = value ? (new Date(value).getHours() < 12 ? 'AM' : 'PM') : 'AM';
        return (
          <Stack className={rest.className}>
            <Label>label</Label>
            <Stack horizontal tokens={{ childrenGap: '0.77em' }}>
              <DatePicker
                onSelectDate={(date: Date | null | undefined) =>
                  handleTimeChange(hour, minute, date)
                }
                formatDate={(val: any) => format(parseDate(val), 'yyyy-MM-dd')}
                value={
                  new Date(value).toDateString() ===
                    new Date('3000-01-01').toDateString() || value === ''
                    ? undefined
                    : parseDate(value)
                }
                onFocus={handleFocus}
                placeholder={placeholder}
                allowTextInput={true}
                {...rest}
              />
              <ComboBox
                selectedKey={hour}
                options={[
                  { key: -1, text: '' },
                  ...(rest.hourOptions?.length > 0
                    ? rest.hourOptions
                        .map((o: any) => ({
                          key: o.value,
                          text: o.text,
                        }))
                        .sort((a: any, b: any) =>
                          parseInt(a.text) > parseInt(b.text) ? 1 : -1
                        )
                    : hours.sort((a, b) =>
                        parseInt(a.text) > parseInt(b.text) ? 1 : -1
                      )),
                ]}
                allowFreeform
                disabled={rest.disabled}
                autoComplete={'on'}
                onChange={(_: any, option: any) => {
                  ampm === 'AM'
                    ? handleTimeChange(option.key, minute, value)
                    : handleTimeChange(option.key + 12, minute, value);
                }}
              />
              <ComboBox
                selectedKey={minute}
                options={
                  rest.minuteOptions?.length > 0
                    ? rest.minuteOptions
                        .map((o: any) => ({
                          key: o.value,
                          text: o.text,
                        }))
                        .sort((a: any, b: any) =>
                          parseInt(a.text) > parseInt(b.text) ? 1 : -1
                        )
                    : minutes.sort((a: any, b: any) =>
                        parseInt(a.text) > parseInt(b.text) ? 1 : -1
                      )
                }
                allowFreeform
                disabled={rest.disabled}
                autoComplete={'on'}
                onChange={(_: any, option: any) =>
                  handleTimeChange(hour !== -1 ? hour : 0, option.key, value)
                }
              />
              <ComboBox
                selectedKey={ampm}
                options={[
                  { key: 'AM', text: 'AM' },
                  { key: 'PM', text: 'PM' },
                ]}
                disabled={rest && rest.disabled}
                onChange={(_: any, option: any) => {
                  option.key === 'AM'
                    ? handleTimeChange(hour !== -1 ? hour : 0, minute, value)
                    : handleTimeChange(
                        (hour !== -1 ? hour : 0) + 12,
                        minute,
                        value
                      );
                }}
              />
            </Stack>
            <Stack className={style.errors}>
              <Feedback
                and={[!isValid, isTouched]}
                errors={errors}
                dirty={isDirty}
              />
            </Stack>
          </Stack>
        );
      case 'combobox':
        return (
          <Stack>
            <ComboBox
              label={label}
              allowFreeform
              autoComplete={'on'}
              selectedKey={value}
              onChange={handleSelect}
              onFocus={handleFocus}
              placeholder={placeholder}
              options={options.map(
                (
                  { text, value: optValue }: { text: string; value: any },
                  _: number
                ) => ({ key: optValue, text, value: optValue })
              )}
              {...rest}
            />
            <Stack className={style.errors}>
              <Feedback
                and={[!isValid, isTouched]}
                errors={errors}
                dirty={isDirty}
              />
            </Stack>
          </Stack>
        );
      case 'timetoday':
        for (i = 0; i < 60; i++) {
          i === 0 && hours.push({ key: i, text: '12' });
          i > 0 && i < 12 && hours.push({ key: i, text: `${i}` });
          i < 10
            ? minutes.push({ key: i, text: `0${i}` })
            : minutes.push({ key: i, text: `${i}` });
        }
        hour = value ? new Date(value).getHours() % 12 : -1;
        minute = value ? new Date(value).getMinutes() : 0;
        ampm = value ? (new Date(value).getHours() < 12 ? 'AM' : 'PM') : 'AM';
        return (
          <Stack>
            <Label>{label}</Label>
            <Stack horizontal tokens={{ childrenGap: '0.77em' }}>
              <ComboBox
                selectedKey={hour}
                options={[
                  { key: -1, text: '' },
                  ...(rest.hourOptions?.length > 0
                    ? rest.hourOptions
                        .map((o: any) => ({
                          key: o.value,
                          text: o.text,
                        }))
                        .sort((a: any, b: any) =>
                          parseInt(a.text) > parseInt(b.text) ? 1 : -1
                        )
                    : hours.sort((a, b) =>
                        parseInt(a.text) > parseInt(b.text) ? 1 : -1
                      )),
                ]}
                allowFreeform
                disabled={rest.disabled}
                autoComplete={'on'}
                onChange={(_: any, option: any) => {
                  ampm === 'AM'
                    ? handleTimeChange(option.key, minute)
                    : handleTimeChange(option.key + 12, minute);
                }}
              />
              <ComboBox
                selectedKey={minute}
                options={
                  rest.minuteOptions?.length > 0
                    ? rest.minuteOptions
                        .map((o: any) => ({
                          key: o.value,
                          text: o.text,
                        }))
                        .sort((a: any, b: any) =>
                          parseInt(a.text) > parseInt(b.text) ? 1 : -1
                        )
                    : minutes.sort((a: any, b: any) =>
                        parseInt(a.text) > parseInt(b.text) ? 1 : -1
                      )
                }
                allowFreeform
                disabled={rest.disabled}
                autoComplete={'on'}
                onChange={(_: any, option: any) =>
                  handleTimeChange(hour !== -1 ? hour : 0, option.key)
                }
              />
              <ComboBox
                selectedKey={ampm}
                options={[
                  { key: 'AM', text: 'AM' },
                  { key: 'PM', text: 'PM' },
                ]}
                disabled={rest && rest.disabled}
                onChange={(_: any, option: any) => {
                  option.key === 'AM'
                    ? handleTimeChange(hour !== -1 ? hour : 0, minute)
                    : handleTimeChange((hour !== -1 ? hour : 0) + 12, minute);
                }}
              />
            </Stack>
            <Stack className={style.errors}>
              <Feedback
                and={[!isValid, isTouched]}
                errors={errors}
                dirty={isDirty}
              />
            </Stack>
          </Stack>
        );
      case 'signature':
        return (
          <Stack className={rest.className}>
            <Label>{label}</Label>
            <Stack horizontal tokens={{ childrenGap: '0.77em' }}>
              <TextField
                disabled={true}
                name={name}
                onChange={handleChange}
                onFocus={handleFocus}
                value={value}
                {...rest}
              />
              <PrimaryButton onClick={sign}>Sign</PrimaryButton>
            </Stack>
          </Stack>
        );
      default:
        return (
          <Stack className={rest.className}>
            <TextField
              label={label}
              name={name}
              onChange={handleChange}
              onFocus={handleFocus}
              value={value}
              {...rest}
            />
            <Stack className={style.errors}>
              <Feedback
                and={[!isValid, isTouched]}
                errors={errors}
                dirty={isDirty}
              />
            </Stack>
          </Stack>
        );
    }
  }
  return choose();
}
