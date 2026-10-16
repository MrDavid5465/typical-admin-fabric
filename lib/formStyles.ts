// Form styles for the current theme: field feedback (error, hint), the
// horizontal label/field pair, and a destructive button. Fabric.tsx's field
// feedback uses them; denim-fabric's getStyle() includes them under the
// same names, so `getStyle().error` keeps working there.
import { getTheme, mergeStyleSets } from '@fluentui/react';
import type { IStyle, ITheme } from '@fluentui/react';

export interface FormStyles {
  /** The feedback line under a field (space kept even when empty). */
  errors: IStyle;
  /** Feedback text once the field is dirty and invalid. */
  error: IStyle;
  /** Feedback text before the field is touched. */
  hint: IStyle;
  /** A label to the left of its field. */
  labelHorizontal: IStyle;
  /** The field next to a horizontal label. */
  fieldHorizontal: IStyle;
  /** A destructive (delete) button, red in light and dark themes. */
  dangerButton: IStyle;
}

export const formStyles = (theme: ITheme): FormStyles => ({
  labelHorizontal: {
    paddingRight: '0.77em',
  },
  fieldHorizontal: {
    minWidth: '23.1em',
  },
  dangerButton: {
    background: theme.isInverted ? theme.palette.redDark : theme.palette.red,
    color: theme.isInverted ? theme.semanticColors.buttonText : theme.semanticColors.primaryButtonText,
    selectors: {
      ':hover': {
        background: theme.isInverted ? theme.palette.redDark : theme.palette.red,
        color: theme.isInverted
          ? theme.semanticColors.buttonTextHovered
          : theme.semanticColors.primaryButtonBackgroundHovered,
      },
    },
  },
  errors: {
    minHeight: '1.32em',
    fontSize: '0.8em',
    marginBottom: '0.5em',
  },
  error: { color: theme.semanticColors.errorText },
  hint: { color: theme.palette.themePrimary },
});

/** The form styles as class names, for the current theme. */
export const getFormStyle = () => mergeStyleSets(formStyles(getTheme()));

export default formStyles;
