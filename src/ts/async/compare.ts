import { parseDate } from '@/ts/async/date';

function compareDate(dateA?: string, dateB?: string) {
  if (dateA) {
    return dateB ? parseDate(dateB).getTime() - parseDate(dateA).getTime() : -1;
  }
  return dateB ? 1 : 0;
}

function compareTags(tagsA?: string[], tagsB?: string[]) {
  if (!tagsA || tagsA.length === 0) {
    return tagsB && tagsB.length > 0 ? 1 : 0;
  }
  if (!tagsB || tagsB.length === 0) {
    return -1;
  }
  if (tagsA.length !== tagsB.length) {
    return tagsB.length - tagsA.length;
  }
  for (let i = 0; i < tagsA.length; i++) {
    const x = tagsA[i].localeCompare(tagsB[i]);
    if (x !== 0) {
      return x;
    }
  }
  return 0;
}

function compareTitle(titleA: string, titleB: string) {
  return titleA.localeCompare(titleB);
}

function comparePath(pathA: string, pathB: string) {
  return pathA.localeCompare(pathB);
}

export function sortFiles(fileA: ISimpleFile, fileB: ISimpleFile) {
  const flagsA = fileA.flags;
  const flagsB = fileB.flags;
  let x = compareDate(flagsA.startDate, flagsB.startDate);
  if (x === 0) {
    x = compareTags(flagsA.tags, flagsB.tags);
    if (x === 0) {
      x = compareTitle(flagsA.title, flagsB.title);
      if (x === 0) {
        x = comparePath(fileA.path, fileB.path);
      }
    }
  }
  return x;
}
