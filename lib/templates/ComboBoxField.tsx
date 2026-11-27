import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { ComboBox, IComboBox, IComboBoxOption, Icon, getTheme, mergeStyles } from '@fluentui/react';
import { comboBoxMenuProps } from './menuCallout';
import { findOptionByText, normalizeText, optionMatches } from './optionSearch';

type Key = string | number;

export interface ComboBoxFieldOption {
  key: Key;
  text: string;
}

export interface ComboBoxFieldProps {
  label?: string;
  options: ComboBoxFieldOption[];
  value: any;
  onChange: (value: any) => void;
  onFocus?: () => void;
  placeholder?: string;
  /** Makes the field pick-or-create: typed text that matches no option is
   *  offered as a new option, and choosing it calls this with the trimmed
   *  text. Resolve with the new record's key; reject to show the error. */
  create?: (text: string) => Promise<Key> | Key;
  /** The create row's label: a verb (default 'Create', shown as
   *  `Create "text"`), or a function of the text for the whole label. */
  createLabel?: string | ((text: string) => string);
  [key: string]: any;
}

const errorMessageOf = (e: unknown) =>
  e instanceof Error && e.message ? e.message
    : typeof e === 'string' && e ? e
      : 'Could not create it.';

// The `combobox` field type: type-ahead over a list of options, with free
// text, and optionally creating a new option from the typed text.
//
// The stored value is an option's KEY when an option is chosen (typed text
// that matches an option's text, ignoring case and surrounding spaces,
// counts as choosing it), so the box shows that option's text and an edit
// page shows the right name for a stored id. Text that matches no option:
//  - without `create`, is the value, as typed (a free-text field with
//    suggestions);
//  - with `create`, is never stored as the value — the field holds keys
//    only. The menu offers `Create "text"`; choosing it, or Enter while it's
//    the highlighted row, awaits `create(text)`, adds the new option here at
//    once (before the parent's options catch up) and selects its key. A
//    failure is shown under the field and the typed text kept, to retry.
//    Leaving the field without choosing keeps the text in the box, empties
//    the value and says the text wasn't saved.
//
// Typing opens the menu and narrows it to options containing the text
// (Fluent's ComboBox does neither: it only autocompletes the first prefix
// match, and on a phone the list never opened at all, so nothing typed
// showed any results).
const ComboBoxField = ({
  label,
  options,
  value,
  onChange,
  onFocus,
  placeholder,
  create,
  createLabel = 'Create',
  ...rest
}: ComboBoxFieldProps) => {
  const theme = getTheme();
  const comboRef = useRef<IComboBox>(null);
  const mounted = useRef(true);
  // Set in the effect as well: StrictMode's dev-only unmount/remount would
  // otherwise leave it false, and every create would be dropped.
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Options `create` made, shown straight away rather than after the parent
  // refetches. Once the parent's options carry the same key, theirs win.
  const [created, setCreated] = useState<ComboBoxFieldOption[]>([]);
  // What's been typed since the menu last opened; null when nothing has.
  const [typed, setTyped] = useState<string | null>(null);
  // Text shown in the box that isn't the value: a create in flight, a create
  // that failed, or text left in the box without choosing.
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  // Whether Fluent has an option highlighted (arrow keys, hover, or its
  // autocomplete) — if so, Enter is about that option, not about creating.
  const [optionPending, setOptionPending] = useState(false);
  const menuOpen = useRef(false);
  const enterPressed = useRef(false);

  const all: ComboBoxFieldOption[] = [
    ...options,
    ...created.filter(c => !options.some(o => String(o.key) === String(c.key))),
  ];
  const hasValue = value !== '' && value !== null && value !== undefined;
  const current = hasValue
    ? all.find(o => o.key === value) ?? all.find(o => String(o.key) === String(value))
    : undefined;
  const text = draft ?? (current ? current.text : hasValue ? String(value) : '');

  const query = normalizeText(typed ?? '');
  // `data` repeats `hidden` because ComboBox memoizes each option on its
  // text, index, selection and data only: a change to `hidden` alone never
  // re-renders the option, so it stayed visible.
  const shown: IComboBoxOption[] = all.map(o => {
    const hidden = !!query && !optionMatches(o, query);
    return { ...o, hidden, data: hidden };
  });
  const anyShown = shown.some(o => !o.hidden);

  const createText = (typed ?? draft ?? '').trim();
  const canCreate = !!create && !!createText && !findOptionByText(all, createText);
  const createRowLabel = (t: string) =>
    typeof createLabel === 'function' ? createLabel(t) : `${createLabel} "${t}"`;

  const choose = (key: Key) => {
    setDraft(null);
    setError(undefined);
    onChange(key);
  };

  const runCreate = async (raw: string) => {
    const t = raw.trim();
    if (!create || !t || busyRef.current) return;
    const existing = findOptionByText(all, t);
    if (existing) { choose(existing.key); return; }
    busyRef.current = true;
    setBusy(true);
    setDraft(t);
    setError(undefined);
    try {
      const key = await create(t);
      if (key === undefined || key === null || key === '') {
        throw new Error('create() resolved without a key for the new option.');
      }
      if (!mounted.current) return;
      setCreated(c => [...c, { key, text: t }]);
      choose(key);
    } catch (e) {
      if (mounted.current) setError(errorMessageOf(e));
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  // Fluent commits typed text that matches no option as `freeformValue`, on
  // Enter and on blur alike.
  const commitText = (raw: string) => {
    const match = findOptionByText(all, raw);
    if (match) { choose(match.key); return; }
    if (!create || !raw.trim()) {
      setDraft(null);
      setError(undefined);
      // With `create` the value is a key or nothing, never typed text.
      onChange(create ? '' : raw);
      return;
    }
    if (enterPressed.current) { void runCreate(raw); return; }
    // Left the field without choosing. Keep the text so it isn't lost, but
    // don't store it as if it were a key.
    setDraft(raw);
    if (!busyRef.current) setError(`Not saved: choose ${createRowLabel(raw.trim())} to add it.`);
    if (hasValue) onChange('');
  };

  const createNow = () => {
    comboRef.current?.dismissMenu();
    void runCreate(createText);
  };

  const onKeyDownCapture = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter') return;
    enterPressed.current = true;
    setTimeout(() => { enterPressed.current = false; }, 0);
    // The create row is the highlighted one: handle Enter here, before
    // Fluent, which would otherwise only toggle the menu when nothing new
    // was typed (a failed create's text, kept in the box).
    if (canCreate && !optionPending) {
      e.preventDefault();
      e.stopPropagation();
      createNow();
    }
  };

  const rowClass = mergeStyles({
    display: 'flex', alignItems: 'center', gap: 8,
    minHeight: 36, padding: '0 8px', cursor: 'pointer',
    color: theme.semanticColors.menuItemText,
    borderTop: anyShown ? `1px solid ${theme.semanticColors.bodyDivider}` : undefined,
    background: optionPending ? undefined : theme.semanticColors.menuItemBackgroundHovered,
    selectors: { ':hover': { background: theme.semanticColors.menuItemBackgroundHovered } },
  });

  return (
    <div onKeyDownCapture={onKeyDownCapture}>
      <ComboBox
        {...comboBoxMenuProps}
        componentRef={comboRef}
        label={label}
        allowFreeform
        autoComplete="on"
        text={text}
        selectedKey={current ? current.key : null}
        options={shown}
        placeholder={placeholder}
        onFocus={onFocus}
        onChange={(_, option, _index, freeformValue) => {
          if (option) choose(option.key);
          else if (freeformValue !== undefined) commitText(freeformValue);
        }}
        onInputValueChange={t => {
          setTyped(t);
          setError(undefined);
          if (!menuOpen.current) comboRef.current?.focus(true);
        }}
        onPendingValueChanged={option => setOptionPending(!!option)}
        onMenuOpen={() => { menuOpen.current = true; }}
        onMenuDismissed={() => {
          menuOpen.current = false;
          setTyped(null);
          setOptionPending(false);
        }}
        onRenderLowerContent={() =>
          canCreate ? (
            <div
              role="option"
              aria-selected={!optionPending}
              className={rowClass}
              // Keep focus in the input: a blur would commit the typed text
              // first, as if the field had been left.
              onMouseDown={e => e.preventDefault()}
              onClick={createNow}
            >
              <Icon iconName="Add" />
              <span>{createRowLabel(createText)}</span>
            </div>
          ) : query && !anyShown ? (
            <div style={{ padding: '8px 12px', opacity: 0.65 }}>No matches</div>
          ) : null
        }
        errorMessage={error}
        {...rest}
      />
      {busy && (
        <div style={{ fontSize: '0.8em', color: theme.palette.themePrimary, marginTop: 4 }}>
          {`Creating "${draft ?? ''}"…`}
        </div>
      )}
    </div>
  );
};

export default ComboBoxField;
