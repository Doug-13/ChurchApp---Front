// theme/tokens.js

export const PALETTE = {
  // Manual (Hexitime)
  primary: "#1CA7D1",
  primaryDark: "#177E9C",
  accent: "#46BCB1",
  tintBlue: "#E3F7FC",

  error: "#F95F5C",

  text: "#333F42",
  text2: "#707D80",

  outline: "#99ABB0",
  divider: "#DFE1E1",

  surfaceNeutral: "#F1F1F1",
  background: "#F5F7FB",
  backgroundAlt: "#F7FEFE",
  white: "#FFFFFF",
};

export const TOKENS = {
  radius: {
    card: 16,
    sheet: 22,
    field: 14,
    pill: 999,
  },
  spacing: {
    screen: 16,
    sectionTop: 18,
    sectionBottom: 10,
    gap: 12,
    gapSm: 10,
    gapXs: 8,
  },
  border: { width: 1 },
  size: {
    buttonH: 52,
    buttonHSm: 44,
    inputH: 56,
  },
};

// helper opcional (alpha em hex: "14" = ~8%)
export function withAlpha(hex, alphaHex = "14") {
  const h = String(hex || "").trim();
  if (!h) return hex;
  if (h.startsWith("#") && h.length === 7) return `${h}${alphaHex}`;
  return h;
}