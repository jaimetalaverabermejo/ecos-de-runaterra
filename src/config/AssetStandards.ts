export const LEGACY_ASSET_STANDARD = {
  overworld: {
    frameWidth: 48,
    frameHeight: 48,
    sheetWidth: 144,
    sheetHeight: 192,
    columns: 3,
    rows: 4
  },
  battle: { width: 192, height: 192 },
  portrait: { width: 192, height: 192 },
  typeIcon: { width: 16, height: 16 }
} as const;

export const ASSET_STANDARD_960 = {
  overworld: {
    frameWidth: 96,
    frameHeight: 96,
    sheetWidth: 288,
    sheetHeight: 384,
    columns: 3,
    rows: 4
  },
  battle: { width: 320, height: 320 },
  portrait: { width: 160, height: 160 },
  typeIcon: { width: 24, height: 24 }
} as const;
