import React, { ReactElement, useState } from "react";
import { withConditionalRender } from "@octant/per-form";
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
  DatePicker
} from "office-ui-fabric-react";
import { format } from "date-fns";
interface IndexableObject {
  [key: string]: any;
}
const getStyle = () => {
  const theme = getTheme();
  return mergeStyleSets({
    errors: {
      minHeight: "1.32em",
      fontSize: "0.8em",
      marginBottom: "0.5em"
    },
    error: { color: theme.semanticColors.errorText },
    hint: { color: theme.palette.themePrimary }
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
  const [option, setOption] = useState({ index: -1, value: "" });
  const options = props.options ? props.options : [];
  const isValid: boolean = errors ? errors.length === 0 : true;
  const isDirty: boolean = dirty ? dirty : false;
  const isTouched: boolean = touched ? touched : false;
  const style = getStyle();

  function handleChange(e: any) {
    const { value } = e.target;
    onChange(name, value);
  }

  function handleCheck(e: any) {
    const { checked } = e.target;
    onChange(name, checked);
  }

  function handleFocus(e: any) {
    onFocus && onFocus(name);
  }
  function handleSelect(e: any, option: any) {
    option !== undefined && onChange(name, option.key);
  }
  function handleSelectDate(date: Date | null | undefined) {
    (date &&
      date.getHours() !== 0 &&
      date.setHours(date.getHours() + date.getTimezoneOffset() / 60)) ||
      new Date();
    onChange(name, (date && new Date(date.toLocaleString())) || "");
  }

  function handleOptionChange(e: any, option: any) {
    setOption({ index: option.key, value: option.value });
  }
  function handleAdd() {
    onChange(
      name,
      [
        ...value,
        options.find((o: any) => option.value === o.value)?.value
      ].sort((a, b) => (a.toLowerCase() > b.toLowerCase() ? 1 : -1))
    );
    setOption({ index: -1, value: "" });
  }
  function handleRemove(e: any) {
    const target: IndexableObject = e.currentTarget;
    onChange(
      name,
      value
        .filter((v: any) => v !== target.id)
        .sort((a: any, b: any) => (a.toLowerCase() > b.toLowerCase() ? 1 : -1))
    );
    setOption({ index: -1, value: "" });
  }

  function choose() {
    switch (type) {
      case "checkbox":
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
      case "radio":
        return (
          <Stack className={rest.className}>
            <ChoiceGroup
              label={label}
              onChange={handleChange}
              options={options.map(
                (
                  { text, value: optValue }: { text: string; value: any },
                  i: number
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
      case "select":
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
                  i: number
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
      case "multi-select":
        return (
          <Stack className={rest.className}>
            <Dropdown
              label={label}
              multiSelect
              onChange={handleChange}
              onFocus={handleFocus}
              selectedKeys={value}
              options={options.map(
                (
                  { text, value: optValue }: { text: string; value: any },
                  i: number
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
      case "picker":
        return (
          <Stack className={rest.className}>
            <Stack>
              <Label>{label}</Label>
              {value &&
                value.map((r: any, i: number) => (
                  <Stack
                    key={i}
                    horizontal
                    horizontalAlign={"space-between"}
                    verticalAlign={"center"}
                  >
                    {options.find((o: any) => o.value === r)?.text}
                    <IconButton id={r} onClick={handleRemove}>
                      <Icon iconName={"Remove"}></Icon>
                    </IconButton>
                  </Stack>
                ))}
            </Stack>
            <Stack horizontal>
              <ComboBox
                allowFreeform
                autoComplete={"on"}
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
              <IconButton disabled={option.value === ""} onClick={handleAdd}>
                <Icon iconName={"Add"}></Icon>
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
      case "date":
        return (
          <Stack className={rest.className}>
            <DatePicker
              label={label}
              onSelectDate={handleSelectDate}
              formatDate={(value: any) =>
                format(new Date(value || new Date()), "yyyy-MM-dd")
              }
              value={value === "" ? undefined : new Date(value || new Date())}
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
      case "combobox":
        return (
          <Stack>
            <ComboBox
              label={label}
              allowFreeform
              autoComplete={"on"}
              selectedKey={value}
              onChange={handleSelect}
              onFocus={handleFocus}
              placeholder={placeholder}
              options={options.map(
                (
                  { text, value: optValue }: { text: string; value: any },
                  i: number
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
