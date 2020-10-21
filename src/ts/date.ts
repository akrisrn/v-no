function getDate(path: string) {
  if (path) {
    const match = path.match(/(\d{4}[/-]\d{2}[/-]\d{2})/);
    if (match) {
      return new Date(match[1]);
    }
  }
  return null;
}

export function getDateString(path: string) {
  const date = getDate(path);
  return date ? date.toDateString() : '';
}

export function getTime(path: string) {
  const date = getDate(path);
  return date ? date.getTime() : 0;
}
