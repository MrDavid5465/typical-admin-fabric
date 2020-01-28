import { IStyle } from "@uifabric/styling";
import { ITheme, FontSizes, FontWeights } from "office-ui-fabric-react";

export interface Style {
  link: IStyle;
  modalHeader: IStyle;
  modalBody: IStyle;
  sm: IStyle;
  md: IStyle;
  lg: IStyle;
  xLg: IStyle;
  xxLg: IStyle;
  xxxLg: IStyle;
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
    md: {
      width: "100%",
      selectors: {
        "@media (min-width: 479px)": {
          maxWidth: 479
        },
        "@media (min-width: 639px)": {
          maxWidth: 639
        }
      }
    },
    lg: {
      width: "100%",
      selectors: {
        "@media (min-width: 479px)": {
          maxWidth: 479
        },
        "@media (min-width: 639px)": {
          maxWidth: 639
        },
        "@media (min-width: 1023px)": {
          maxWidth: 1023
        }
      }
    },
    xLg: {
      width: "100%",
      selectors: {
        "@media (min-width: 479px)": {
          maxWidth: 479
        },
        "@media (min-width: 639px)": {
          maxWidth: 639
        },
        "@media (min-width: 1023px)": {
          maxWidth: 1023
        },
        "@media (min-width: 1365px)": {
          maxWidth: 1365
        }
      }
    },
    xxLg: {
      width: "100%",
      selectors: {
        "@media (min-width: 479px)": {
          maxWidth: 479
        },
        "@media (min-width: 639px)": {
          maxWidth: 639
        },
        "@media (min-width: 1023px)": {
          maxWidth: 1023
        },
        "@media (min-width: 1365px)": {
          maxWidth: 1365
        }
      }
    },
    xxxLg: {
      width: "100%"
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
