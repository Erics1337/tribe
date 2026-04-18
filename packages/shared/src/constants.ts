export const TIER_CAPS = {
  inner: 5,
  close: 15,
  tribe: 50,
  village: 150,
} as const;

export const TIER_ORDER = ["inner", "close", "tribe", "village"] as const;

export const AUDIENCE_OPTIONS = [...TIER_ORDER, "broadcast"] as const;

export const PAGE_SIZE = 10;

export const NUDGE_TYPES = ["capacity", "inactivity", "review"] as const;
