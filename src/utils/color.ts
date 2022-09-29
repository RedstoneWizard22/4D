/**
 * Converts a hsl color to rgb
 *
 * @param h hue [0, 360]
 * @param s saturation [0, 1]
 * @param l lightness [0, 1]
 *
 * @returns rgb color array, all entries [0, 1]
 *
 * Formulas from https://www.rapidtables.com/convert/color/hsl-to-rgb.html
 */
export function hsl2rgb(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return [r + m, g + m, b + m];
}

/**
 * Converts a rgb color to hsl
 *
 * @param r red [0, 1]
 * @param g green [0, 1]
 * @param b blue [0, 1]
 *
 * @returns hsl color array, h [0, 360], s and l [0, 1]
 *
 * Formulas from https://www.rapidtables.com/convert/color/rgb-to-hsl.html
 */
export function rgb2hsl(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  const del = max - min;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;
  if (del !== 0) {
    s = del / (1 - Math.abs(2 * l - 1));
    if (max === r) {
      h = ((g - b) / del) % 6;
    } else if (max === g) {
      h = (b - r) / del + 2;
    } else {
      h = (r - g) / del + 4;
    }
  }

  return [h * 60, s, l];
}
