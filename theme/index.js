// theme/index.js
import { MD3LightTheme } from "react-native-paper";
import { PALETTE, TOKENS } from "./tokens";

export const theme = {
  ...MD3LightTheme,

  roundness: TOKENS.radius.card,

  colors: {
    ...MD3LightTheme.colors,

    // ✅ cores do manual
    primary: PALETTE.primary,
    secondary: PALETTE.accent,
    tertiary: PALETTE.tintBlue,

    background: PALETTE.background,
    surface: PALETTE.white,
    surfaceVariant: PALETTE.surfaceNeutral,

    onSurface: PALETTE.text,
    onSurfaceVariant: PALETTE.text2,

    outline: PALETTE.outline,
    outlineVariant: PALETTE.divider,

    error: PALETTE.error,

    // containers (pra ficar bem no padrão do manual)
    primaryContainer: PALETTE.tintBlue,
    onPrimaryContainer: PALETTE.primaryDark,

    secondaryContainer: PALETTE.backgroundAlt,
    onSecondaryContainer: PALETTE.text,

    errorContainer: "#FEEDEC",
    onErrorContainer: PALETTE.error,
  },

  // ✅ tokens globais acessíveis em qualquer tela: theme.custom.radius.card etc
  custom: {
    tokens: TOKENS,
    radius: TOKENS.radius,
    spacing: TOKENS.spacing,
    border: TOKENS.border,
    size: TOKENS.size,
    palette: PALETTE,
  },
};