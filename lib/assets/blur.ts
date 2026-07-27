import { BLUR_DATA } from './blur-data.generated'

/**
 * The shared fallback plate (F7.5).
 *
 * 1024x576, dark, textured, no copy and no mark — deliberately anonymous, because
 * it stands in for a *promo banner* one minute and an *attract frame* the next,
 * and anything recognisable in the pixels would read as a real campaign. It is
 * the only image in the product allowed to render without its own subject.
 */
export const FALLBACK_ASSET = '/fallback.webp'

/**
 * LQIP for a public path, or `undefined` when the family deliberately has none.
 *
 * `undefined` is not a miss — see `scripts/generate-blur.mjs`: covers and product
 * thumbnails paint a designed layer (gradient + initials, category icon) under
 * the art, so they need no blur and carry no data URL. Callers therefore branch
 * on `placeholder` rather than assuming a value exists.
 */
export function blurFor(src: string): string | undefined {
  return BLUR_DATA[src]
}
