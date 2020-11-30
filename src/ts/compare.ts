import { baseFiles } from '@/ts/config';
import { parseDate } from '@/ts/date';

function comparePath(pathA: string, pathB: string) {
  if (baseFiles.includes(pathA)) {
    return baseFiles.includes(pathB) ? 0 : 1;
  }
  return baseFiles.includes(pathB) ? -1 : 0;
}

function compareDate(dateA: string, dateB: string) {
  if (dateA) {
    return dateB ? parseDate(dateB).getTime() - parseDate(dateA).getTime() : -1;
  }
  return dateB ? 1 : 0;
}

function compareTags(tagsA: string[], tagsB: string[]) {
  if (tagsA.length > 0) {
    if (tagsB.length > 0) {
      if (tagsA.length === tagsB.length) {
        for (let i = 0; i < tagsA.length; i++) {
          const x = tagsA[i].localeCompare(tagsB[i]);
          if (x !== 0) {
            return x;
          }
        }
        return 0;
      }
      return tagsB.length - tagsA.length;
    }
    return -1;
  }
  return tagsB.length > 0 ? 1 : 0;
}

function compareTitle(titleA: string, titleB: string) {
  return titleA.localeCompare(titleB);
}

function comparePath2(pathA: string, pathB: string) {
  return pathA.localeCompare(pathB);
}

export function sortFiles(fileA: TFile, fileB: TFile) {
  const flagsA = fileA.flags;
  const flagsB = fileB.flags;
  let x = comparePath(fileA.path, fileB.path);
  if (x === 0) {
    x = compareDate(flagsA.startDate, flagsB.startDate);
    if (x === 0) {
      x = compareTags(flagsA.tags, flagsB.tags);
      if (x === 0) {
        x = compareTitle(flagsA.title, flagsB.title);
        if (x === 0) {
          x = comparePath2(fileA.path, fileB.path);
        }
      }
    }
  }
  return x;
}
