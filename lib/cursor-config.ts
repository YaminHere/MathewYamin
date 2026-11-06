// DISPLAY LABELS
export const CURSOR_LABELS = {
  home: 'Home',
} as const

export type CursorLabelKey = keyof typeof CURSOR_LABELS

type CursorTargetConfig = {
  label: CursorLabelKey
  states?: Record<string, CursorLabelKey>
}

// ELEMENT CONFIGURATION
export const CURSOR_TARGETS: Record<string, CursorTargetConfig> = {
  home: {
    label: 'home',
  },
}

export type CursorTargetKey = keyof typeof CURSOR_TARGETS