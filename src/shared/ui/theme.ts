/** Design tokens. Screens use these, never loose colors or sizes. */
export const colors = {
  brand: '#FEC900',
  brandDark: '#343434',
  brandDarker: '#202020',
  brandLight: '#f1f1f1',
  brandAction: '#1A76FF',
  brandText: '#1B1B1B',
  background: '#FFFFFF',
  buttonLight: '#F9F9F9',
  inputFill: '#F2F2F2',
  surface: '#f1f1f1',
  text: '#1B1B1B',
  textMuted: '#6B6B70',
  border: '#D9D9DE',
  danger: '#ED0000',
  dangerSurface: '#FDECEC',
  warning: '#FFA500',
  warningSurface: '#FFC871',
  success: '#25BC49',
  error: '#ED0000',
  info: '#0000FF',
  overlay: 'rgba(0,0,0,0.5)',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const radius = { sm: 6, md: 8, lg: 12, xl: 16, xxl: 24 } as const;

/** iOS Dynamic Type at the default Large size. Sizes are points. */
export const type = {
  small: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' },
  header: { fontSize: 20, lineHeight: 25, fontWeight: '600' },
  large: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
} as const;
