import { sortFiles } from '@/ts/compare';
import { config } from '@/ts/config';
import { getFile, getFiles } from '@/ts/file';
import { checkLinkPath } from '@/ts/path';
import { getHeadingPattern, getHeadingRegExp, getLinkPathPattern, getWrapRegExp } from '@/ts/regexp';
import { chopStr, snippetMark } from '@/ts/utils';

function getCategories(level: number, parentTag: string, tagTree: TTagTree, sortedTags: string[],
                       taggedDict: Dict<TFile[]>) {
  const category: string[] = [];
  let count = 0;
  sortedTags.forEach(tag => {
    const nestedTag = parentTag ? `${parentTag}/${tag}` : tag;
    let list = '';
    let fileCount = 0;
    const taggedFiles = taggedDict[nestedTag];
    if (taggedFiles) {
      list = taggedFiles.sort(sortFiles).map(file => `- [](${file.path} "#")`).join('\n');
      fileCount = taggedFiles.length;
      count += fileCount;
    }
    const subTree = tagTree[tag];
    const categories = getCategories(level + 1, nestedTag, subTree, Object.keys(subTree).sort(), taggedDict);
    category.push(`${'#'.repeat(level)} ${tag} - ( ${fileCount + categories.count} )${list ? `\n\n${list}` : ''}`);
    if (categories.data) {
      category.push(categories.data);
    }
    count += categories.count;
  });
  return { data: category.join('\n\n'), count };
}

export async function updateCategoryPage(data: string) {
  const listRegExpStr = '^\\[list]$';
  const listRegExp = new RegExp(listRegExpStr, 'im');
  const listRegExpG = new RegExp(listRegExpStr, 'img');
  if (!listRegExp.test(data)) {
    return data;
  }
  const { files } = await getFiles();
  const tagTree: TTagTree = {};
  const taggedDict: Dict<TFile[]> = {};
  const untaggedFiles: TFile[] = [];
  for (const file of Object.values(files)) {
    if (file.isError) {
      continue;
    }
    const tags = file.flags.tags;
    if (!tags || tags.length === 0) {
      untaggedFiles.push(file);
      continue;
    }
    tags.forEach(tag => {
      let cursor = tagTree;
      tag.split('/').forEach(seg => {
        let subTree = cursor[seg];
        if (subTree === undefined) {
          subTree = {};
          cursor[seg] = subTree;
        }
        cursor = subTree;
      });
      let taggedFiles = taggedDict[tag];
      if (taggedFiles === undefined) {
        taggedFiles = [file];
        taggedDict[tag] = taggedFiles;
      } else {
        taggedFiles.push(file);
      }
    });
  }
  const sortedTags = Object.keys(tagTree).sort();
  if (untaggedFiles.length > 0) {
    const untagged = config.messages.untagged;
    tagTree[untagged] = {};
    sortedTags.push(untagged);
    taggedDict[untagged] = untaggedFiles;
  }
  const categories = getCategories(2, '', tagTree, sortedTags, taggedDict);
  return data.replace(listRegExp, categories.data).replace(listRegExpG, '').trim();
}

export function replaceByRegExp(regexp: RegExp, data: string, callback: (match: string) => string) {
  let newData = '';
  let start = 0;
  let match = regexp.exec(data);
  while (match) {
    newData += data.substring(start, match.index) + callback(match[1]);
    start = match.index + match[0].length;
    match = regexp.exec(data);
  }
  if (start === 0) {
    return data;
  }
  newData += data.substring(start);
  return newData;
}

function evalFunction(evalStr: string, params: Dict<any>) {
  return eval(`(function(${Object.keys(params).join()}) {${evalStr}})`)(...Object.values(params));
}

export function replaceInlineScript(path: string, data: string) {
  return replaceByRegExp(getWrapRegExp('\\$\\$', '\\$\\$', 'g'), data, evalStr => {
    let result: string;
    try {
      result = evalFunction(evalStr, { path, data });
    } catch (e) {
      result = `\n\n::: open .danger.readonly **${e.name}: ${e.message}**\n\`\`\`js\n${evalStr}\n\`\`\`\n:::\n\n`;
    }
    return result;
  }).trim();
}

function degradeHeading(data: string, level: number) {
  if (level <= 0) {
    return data;
  }
  const headingRegExp = getHeadingRegExp(1, 5);
  return data.split('\n').map(line => {
    const headingMatch = line.match(headingRegExp);
    if (!headingMatch) {
      return line;
    }
    const headingLevel = headingMatch[1];
    const headingText = headingMatch[2];
    let newLine = headingLevel + '#'.repeat(level);
    if (newLine.length >= 7) {
      newLine = newLine.substr(0, 6);
    }
    if (headingText) {
      newLine += ` ${headingText}`;
    }
    return newLine;
  }).join('\n');
}

export async function updateSnippet(data: string, updatedPaths: string[] = []) {
  const dict: Dict<Dict<{ heading: number; params: Dict<string> }>> = {};
  const linkRegExp = new RegExp(`^(?:${getHeadingPattern(2, 6)} )?\\s*\\[\\+(#.+)?]${getLinkPathPattern(true)}$`);
  data = data.split('\n').map(line => {
    const match = line.match(linkRegExp);
    if (!match) {
      return line;
    }
    const path = checkLinkPath(match[3]);
    if (!path) {
      return line;
    }
    if (updatedPaths.includes(path)) {
      return '';
    }
    let snippetDict = dict[path];
    if (snippetDict === undefined) {
      snippetDict = {};
      dict[path] = snippetDict;
    }
    if (snippetDict[match[0]] !== undefined) {
      return line;
    }
    const heading = match[1] ? match[1].length : 0;
    const params: Dict<string> = {};
    match[2]?.substr(1).split('|').forEach((seg, i) => {
      const { key, value } = chopStr(seg.trim(), '=');
      let param = key;
      if (value !== null) {
        param = value;
        if (key) {
          params[key] = param;
        }
      }
      params[i + 1] = param;
    });
    snippetDict[match[0]] = { heading, params };
    return line;
  }).join('\n');
  const paths = Object.keys(dict);
  if (paths.length === 0) {
    return data;
  }
  const paramRegExp = getWrapRegExp('{{', '}}', 'g');
  const files = await Promise.all(paths.map(path => {
    updatedPaths.push(path);
    return getFile(path);
  }));
  for (const file of files) {
    const isError = file.isError;
    const path = file.path;
    const fileData = file.data ? replaceInlineScript(path, file.data) : '';
    const snippetDict = dict[path];
    for (const match of Object.keys(snippetDict)) {
      const { heading, params } = snippetDict[match];
      let snippetData = fileData;
      if (snippetData) {
        snippetData = replaceByRegExp(paramRegExp, snippetData, match => {
          let defaultValue: string | undefined = undefined;
          const { key, value } = chopStr(match, '|');
          if (value !== null) {
            match = key;
            defaultValue = value;
          }
          const param = params[match];
          let result: string;
          if (param !== undefined) {
            result = param;
          } else if (defaultValue !== undefined) {
            result = defaultValue;
          } else {
            return 'undefined';
          }
          return result.replace(/\\n/g, '\n');
        }).trim();
        const clip = params['clip'];
        if (clip !== undefined) {
          const slips = snippetData.split(snippetMark);
          if (slips.length > 1) {
            let num = parseInt(clip);
            if (isNaN(num)) {
              num = clip === 'random' ? Math.floor(Math.random() * slips.length) : 0;
            } else if (num < 0) {
              num = 0;
            } else if (num >= slips.length) {
              num = slips.length - 1;
            }
            snippetData = slips[num].trim();
          }
        }
      }
      let dataWithHeading = snippetData;
      if (heading > 1) {
        const headingText = `# [](${path} "#")`;
        if (snippetData) {
          dataWithHeading = degradeHeading(`${headingText}\n\n${snippetData}`, heading - 1);
        } else {
          dataWithHeading = degradeHeading(headingText, heading - 1);
        }
      }
      if (snippetData) {
        snippetData = await updateSnippet(dataWithHeading, [...updatedPaths]);
      } else if (dataWithHeading) {
        snippetData = dataWithHeading;
      }
      data = data.split('\n').map(line => {
        if (line === match) {
          return isError ? `::: .danger.empty .\n${snippetData}\n:::` : snippetData;
        }
        return line;
      }).join('\n');
    }
  }
  return data.trim();
}
