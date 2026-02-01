import { Platform } from 'react-native'

/**
 * Readable typography — slightly larger + stronger contrast (production-grade)
 */
export const typography = {
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  title2: {
    fontSize: 19,
    fontWeight: '700' as const,
  },
  body: {
    fontSize: 17,
    fontWeight: '400' as const,
  },
  bodyBold: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  caption: {
    fontSize: 15,
    fontWeight: '400' as const,
  },
  captionBold: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  small: {
    fontSize: 13,
    fontWeight: '400' as const,
  },
}

export const fontFamily = Platform.select({
  ios: { ar: 'System', en: 'System' },
  android: { ar: 'sans-serif', en: 'sans-serif' },
  default: { ar: 'sans-serif', en: 'sans-serif' },
})
