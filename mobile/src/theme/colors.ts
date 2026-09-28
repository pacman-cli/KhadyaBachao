export const colors = {
  primary: '#0B7A3E',
  primaryDark: '#085C2E',
  primaryLight: '#DCFCE7',

  secondary: '#2563EB',
  secondaryLight: '#EFF6FF',

  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',

  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  // Darkened from #94A3B8: placeholders must clear WCAG AA (4.5:1) on white —
  // format hints like phone/OTP formats were nearly invisible in sunlight.
  textLight: '#6B7280',

  border: '#E2E8F0',
  borderDark: '#CBD5E1',

  // Darkened from #16A34A / #D97706: status text at 11-15px on the light
  // backgrounds below was ~3:1 (AA needs 4.5:1 at those sizes).
  success: '#15803D',
  successLight: '#F0FDF4',

  warning: '#B45309',
  warningLight: '#FFFBEB',

  error: '#DC2626',
  errorLight: '#FEF2F2',

  foodTypes: {
    COOKED: {bg: '#FFEDD5', text: '#C2410C', border: '#FED7AA'},
    PACKAGED: {bg: '#DBEAFE', text: '#1D4ED8', border: '#BFDBFE'},
    RAW: {bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0'},
  },

  status: {
    ACTIVE: {bg: '#DCFCE7', text: '#15803D'},
    AVAILABLE: {bg: '#DCFCE7', text: '#15803D'},
    CLAIMED: {bg: '#FEF3C7', text: '#B45309'},
    COMPLETED: {bg: '#E0E7FF', text: '#4338CA'},
    EXPIRED: {bg: '#F1F5F9', text: '#64748B'},
    REJECTED: {bg: '#FEE2E2', text: '#B91C1C'},
    CANCELLED: {bg: '#FEE2E2', text: '#B91C1C'},
  },
};
