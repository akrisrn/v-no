interface IConfig {
  siteName: string;
  favicon: string;
  indexFile: string;
  readmeFile: string;
  categoryFile: string;
  archiveFile: string;
  searchFile: string;
  commonFile: string;
  untagged: string;
}

interface IFlags {
  title: string;
  tags: string[];
  updated: string[];
  cover: string;

  [index: string]: string[] | string;
}

type TMDFile = {
  data: string;
  flags: IFlags;
}

type TMDFileDict = { [index: string]: TMDFile }
