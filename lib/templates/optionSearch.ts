// Text matching shared by the searchable dropdowns and the combobox, so
// "does this option match what was typed" means the same thing everywhere.

export interface TextOption {
  key: string | number;
  text: string;
}

// Trimmed and lower-cased: "  Groceries " and "groceries" are the same
// answer to "which option is this".
export const normalizeText = (s: string) => s.trim().toLowerCase();

// Whether an option belongs in a list narrowed by `query` (already
// normalized). The searchable dropdowns also match on the key (a code or a
// short id is sometimes what people know an option by); the combobox
// doesn't, since its keys are often UUIDs and every letter of hex would
// match half the list.
export const optionMatches = (option: TextOption, query: string, matchKey = false) =>
  option.text.toLowerCase().includes(query) ||
  (matchKey && String(option.key).toLowerCase().includes(query));

// The option whose whole text is `text`, ignoring case and surrounding
// spaces. This is what stops "groceries " from creating a second
// "Groceries".
export function findOptionByText<T extends TextOption>(options: T[], text: string): T | undefined {
  const wanted = normalizeText(text);
  return wanted ? options.find(o => normalizeText(o.text) === wanted) : undefined;
}
