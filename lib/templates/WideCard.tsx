import React from 'react';
import { Stack, getTheme } from '@fluentui/react';

interface Props {
  imageUrl?: string;
  imageWidth?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  // Makes the whole card clickable (not just the image) — set by list
  // renderers like WideList to navigate to the item's show route.
  onClick?: () => void;
}

// Wide horizontal sibling of ThumbnailCard (photo-on-top, fixed square
// tile) — same accent-line + shadow shell as FormCard/ThumbnailCard (see
// hand-rolled-components skill), photo on the left instead of above, for
// content that reads as a preview/teaser row (e.g. an article list) rather
// than a compact grid tile. Same `theme.palette.neutralLighter` convention
// as ThumbnailCard for the no-photo-yet case — not a decorative gradient.
const WideCard: React.FC<Props> = ({ imageUrl, imageWidth = 220, children, style, onClick }) => {
  const theme = getTheme();
  return (
    <Stack
      horizontal
      onClick={onClick}
      style={{
        borderTop: `0.25em solid ${theme.palette.themePrimary}`,
        boxShadow:
          'rgba(0, 0, 0, 0.133) 0em 0.22em 0.3em 0em, rgba(0, 0, 0, 0.11) 0em 0.05em 0.10em 0em',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      <div
        style={{
          width: imageWidth,
          flexShrink: 0,
          background: imageUrl
            ? `url(${imageUrl}) center/cover no-repeat`
            : theme.palette.neutralLighter,
        }}
      />
      <Stack style={{ padding: '0.77em 1em', flex: 1, minWidth: 0 }} verticalAlign="center">
        {children}
      </Stack>
    </Stack>
  );
};

export default WideCard;
