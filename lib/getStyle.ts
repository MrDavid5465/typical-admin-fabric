import { IStyle } from "@uifabric/styling";
import { ITheme, FontSizes, FontWeights } from "office-ui-fabric-react";

export interface Style {
  link: IStyle;
  modalHeader: IStyle;
  modalBody: IStyle;
  sm: IStyle;
}

const style = (theme: ITheme) =>
  ({
    sm: {
      width: "100%",
      selectors: {
        "@media (min-width: 479px)": {
          maxWidth: 479
        }
      }
    },
    link: {
      color: theme.semanticColors.link,
      textDecoration: "none",
      selectors: {
        ":hover": {
          color: theme.semanticColors.linkHovered,
          textDecoration: "underline"
        }
      }
    },
    modalHeader: {
      borderTop: `4px solid ${theme.palette.themePrimary}`,
      color: theme.palette.neutralPrimary,
      display: "flex",
      fontSize: FontSizes.xLarge,
      alignItems: "center",
      fontWeight: parseInt(FontWeights.semibold.toString()),
      padding: "12px 12px 14px 24px"
    },
    modalBody: { padding: "0 24px 24px 24px" }
  } as Style);

export default style;
