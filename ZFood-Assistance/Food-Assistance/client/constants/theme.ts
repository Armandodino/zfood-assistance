import { Platform } from "react-native";

export const ZFoodColors = {
  primary600: "#16a34a",
  primary900: "#14532d",
  accent: "#f97316",
  white: "#FFFFFF",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray400: "#9CA3AF",
  gray600: "#4B5563",
  gray900: "#111827",
  success: "#16a34a",
  warning: "#f97316",
  error: "#DC2626",
  info: "#3B82F6",
};

export const Colors = {
  light: {
    text: ZFoodColors.gray900,
    textSecondary: ZFoodColors.gray600,
    textMuted: ZFoodColors.gray400,
    buttonText: ZFoodColors.white,
    tabIconDefault: ZFoodColors.gray400,
    tabIconSelected: ZFoodColors.primary600,
    link: ZFoodColors.primary600,
    accent: ZFoodColors.accent,
    backgroundRoot: ZFoodColors.white,
    backgroundDefault: ZFoodColors.gray50,
    backgroundSecondary: ZFoodColors.gray100,
    backgroundTertiary: ZFoodColors.gray200,
    border: ZFoodColors.gray200,
    success: ZFoodColors.success,
    warning: ZFoodColors.warning,
    error: ZFoodColors.error,
  },
  dark: {
    text: "#ECEDEE",
    textSecondary: "#9BA1A6",
    textMuted: "#6B7280",
    buttonText: ZFoodColors.white,
    tabIconDefault: "#9BA1A6",
    tabIconSelected: ZFoodColors.primary600,
    link: "#22c55e",
    accent: ZFoodColors.accent,
    backgroundRoot: "#0f1419",
    backgroundDefault: "#1a1f26",
    backgroundSecondary: "#252b33",
    backgroundTertiary: "#303840",
    border: "#374151",
    success: "#22c55e",
    warning: ZFoodColors.warning,
    error: "#ef4444",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  display: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "800" as const,
    fontFamily: "Poppins_800ExtraBold",
  },
  h1: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "800" as const,
    fontFamily: "Poppins_800ExtraBold",
  },
  h2: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
    fontFamily: "Poppins_600SemiBold",
  },
  h3: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600" as const,
    fontFamily: "Poppins_600SemiBold",
  },
  h4: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600" as const,
    fontFamily: "Poppins_600SemiBold",
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
    fontFamily: "Poppins_400Regular",
  },
  small: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
    fontFamily: "Poppins_400Regular",
  },
  link: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
    fontFamily: "Poppins_400Regular",
  },
};

export const Shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardSmall: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  fab: {
    shadowColor: ZFoodColors.primary600,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "Poppins_400Regular",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "Poppins_400Regular",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "Poppins, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
