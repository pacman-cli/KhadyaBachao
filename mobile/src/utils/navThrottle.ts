/**
 * Guards against double-tap navigation pushing duplicate screens onto the
 * stack (a rapid second tap fires before the first transition completes).
 *
 * Usage in a screen's onPress:
 *   onPress={() => canNavigate() && navigation.navigate('ListingDetail', {...})}
 */
let lastNavigationAt = 0;

export function canNavigate(minIntervalMs = 600): boolean {
  const now = Date.now();
  if (now - lastNavigationAt < minIntervalMs) {
    return false;
  }
  lastNavigationAt = now;
  return true;
}
