export function getAnchorRegExp(isLine = true, min = 2, max = 6, flags?: string) {
  let pattern = `h[${min}-${max}]-\\d+`;
  if (isLine) {
    pattern = `^${pattern}$`;
  }
  return new RegExp(pattern, flags);
}
