import { config } from '@/ts/config';
import { addEventListener, createList, dispatchEvent, getSyncSpan, removeClass, scroll } from '@/ts/element';
import { EEvent, EFlag, EMark } from '@/ts/enums';
import { changeAnchor, changeQueryContent, checkLinkPath, parseHash } from '@/ts/path';
import {
  getAnchorRegExp,
  getHeadingRegExp,
  getMarkRegExp,
  getParamRegExp,
  getSnippetRegExp,
  getWrapRegExp,
} from '@/ts/regexp';
import { state } from '@/ts/store';
import { chopStr } from '@/ts/utils';
import { importPrismjsTs } from '@/ts/async';
import { formatDate } from '@/ts/async/date';
import { getFile, getFiles, sortFiles } from '@/ts/async/file';
import { addCacheKey, evalFunction, replaceByRegExp, trimList } from '@/ts/async/utils';
import { escapeHtml, escapeRE } from 'markdown-it/lib/common/utils';
import htmlBlocks from 'markdown-it/lib/common/html_blocks';

export function updateAsyncScript(asyncResult: TAsyncResult) {
  const { id, result, isError } = asyncResult;
  const span = document.querySelector(`span#${id}`);
  if (!span) {
    return false;
  }
  let value = result;
  if (isError) {
    value = `<span class="error">${value}</span>`;
  }
  const parent = span.parentElement!;
  if (parent.tagName !== 'P' || parent.childNodes.length > 1) {
    span.outerHTML = value;
    return true;
  }
  const trimValue = value.trim();
  if (!trimValue.startsWith('<')) {
    span.outerHTML = value;
    return true;
  }
  let tagName = trimValue.substring(1, trimValue.indexOf('>'));
  if (tagName.endsWith('/')) {
    tagName = tagName.substr(0, tagName.length - 1);
  }
  if (htmlBlocks.includes(tagName)) {
    parent.outerHTML = trimValue;
  } else {
    span.outerHTML = value;
  }
  return true;
}

export function updateInlineScript(path: string, title: string, data: string, isSnippet = false, asyncResults?: TAsyncResult[]) {
  return replaceByRegExp(getWrapRegExp('\\$\\$', '\\$\\$', 'g'), data, ([match0, evalStr]) => {
    if (!evalStr) {
      return match0;
    }
    const match = evalStr.match(/^(:{1,3})\s+/);
    if (match) {
      evalStr = evalStr.substr(match[0].length);
      switch (match[1].length) {
        case 3:
          evalStr = `vno.getMessage(${evalStr})`;
          break;
        case 2:
          evalStr = `vno.${evalStr}`;
          break;
      }
      evalStr = `return ${evalStr}`;
    }
    const [result, isError] = evalFunction(evalStr, { path, title, data, isSnippet }, asyncResults);
    if (isError) {
      return `\n\n::: open .danger.readonly **${result}**\n\`\`\`js\n${evalStr}\n\`\`\`\n:::\n\n`;
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
    const [, headingLevel, headingText] = headingMatch;
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

export async function updateSnippet(data: string, updatedPaths: string[], asyncResults?: TAsyncResult[]) {
  const dict: Dict<Dict<[number, Dict<string>, string | undefined]>> = {};
  const snippetRegExp = getSnippetRegExp();
  data = data.split('\n').map(line => {
    const match = line.match(snippetRegExp);
    if (!match) {
      return line;
    }
    const [match0, level, foldMark, paramStr, href] = match;
    const path = checkLinkPath(href);
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
    if (snippetDict[match0] !== undefined) {
      return line;
    }
    const params: Dict<string> = {};
    paramStr?.split('|').forEach((param, i) => {
      const [key, value] = chopStr(param.trim(), '=');
      param = key;
      if (value !== null) {
        param = value;
        if (key) {
          params[key] = param;
        }
      }
      params[i] = param;
    });
    snippetDict[match0] = [level?.length ?? 0, params, foldMark];
    return line;
  }).join('\n');
  const paths = Object.keys(dict);
  if (paths.length === 0) {
    return data;
  }
  const paramRegExp = getParamRegExp();
  const sliceRegExp = getMarkRegExp(EMark.slice, true, 'img');
  for (const file of await Promise.all(paths.map(path => getFile(path)))) {
    const isError = file.isError;
    const path = file.path;
    const title = file.flags.title;
    const fileData = file.data;
    const snippetDict = dict[path];
    for (const match of Object.keys(snippetDict)) {
      const [heading, params, foldMark] = snippetDict[match];
      let snippetData = fileData;
      if (snippetData) {
        snippetData = replaceByRegExp(paramRegExp, snippetData, ([match0, match]) => {
          if (!match) {
            return match0;
          }
          let defaultValue: string | undefined = undefined;
          const [key, value] = chopStr(match, '|');
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
            return match0;
          }
          return result.replace(/\\n/g, '\n');
        }).trim();

        const slice = params['slice'];
        if (slice !== undefined) {
          const slips: Dict<string> = {};
          let index = 0;
          let start = 0;
          let match = sliceRegExp.exec(snippetData);
          while (match) {
            const slip = snippetData.substring(start, match.index);
            slips[index++] = slip;
            if (match[1]) {
              slips[match[1]] = slip;
            }
            start = match.index + match[0].length;
            match = sliceRegExp.exec(snippetData);
          }
          if (start !== 0) {
            const lastSlip = snippetData.substring(start);
            if (lastSlip.trim()) {
              slips[index++] = lastSlip;
            }

            let sliceIndex: number | string = parseInt(slice);
            if (isNaN(sliceIndex)) {
              sliceIndex = slice === 'random' ? Math.floor(Math.random() * index) : slice;
            } else if (sliceIndex < 0) {
              sliceIndex = 0;
            } else if (sliceIndex >= index) {
              sliceIndex = index - 1;
            }
            const sliceData = slips[sliceIndex];
            snippetData = sliceData === undefined ? '' : sliceData.trim();
          }
        }
        if (snippetData) {
          snippetData = updateInlineScript(path, title, snippetData, true, asyncResults);
        }
      }
      let dataWithHeading = snippetData;
      if (heading > 1) {
        const headingText = `# ${foldMark || ''}[](${path} "#")`;
        if (snippetData) {
          dataWithHeading = degradeHeading(`${headingText}\n\n${snippetData}`, heading - 1);
        } else {
          dataWithHeading = degradeHeading(headingText, heading - 1);
        }
      }
      if (snippetData) {
        snippetData = await updateSnippet(dataWithHeading, [path, ...updatedPaths], asyncResults);
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

function getQueryParams(content: string) {
  content = content.toLowerCase();
  const match = content.match(/^@(\S+?):\s*(.*)$/);
  return match ? [content, match[1], match[2]] : [content, '', ''];
}

function findIn(file: IFile, [keyword, flag, value]: string[]): [boolean, boolean?] {
  if (!flag) {
    if (file.flags.title.toLowerCase().indexOf(keyword) >= 0) {
      return [true];
    }
    if (file.data.toLowerCase().indexOf(keyword) >= 0) {
      return [true, true];
    }
    return [false];
  }
  if (!value) {
    return [false];
  }
  if (![EFlag.tags, EFlag.updated].includes(flag as EFlag)) {
    if (!Object.keys(file.flags).includes(flag)) {
      return [false];
    }
    const flagValue = (file.flags)[flag]!;
    if (typeof flagValue === 'string') {
      return [flagValue.toLowerCase().indexOf(value) >= 0];
    }
    for (const item of flagValue) {
      if (`${item}`.toLowerCase().indexOf(value) >= 0) {
        return [true];
      }
    }
    return [false];
  }
  const trimValue = trimList(value.split('/'), false).join('/');
  if (flag === EFlag.tags) {
    for (let tag of file.flags.tags || []) {
      tag = tag.toLowerCase();
      if (tag === trimValue || tag.startsWith(`${trimValue}/`)) {
        return [true];
      }
    }
    return [false];
  }
  for (const time of file.flags.times || []) {
    const date = formatDate(time, 'YYYY/MM/DD');
    if (date === trimValue || date.startsWith(`${trimValue}/`)) {
      return [true];
    }
  }
  return [false];
}

function getCategories(level: number, parentTag: string, tagTree: TTagTree, sortedTags: string[], taggedDict: Dict<IFile[]>) {
  const category: string[] = [];
  let count = 0;
  for (const tag of sortedTags) {
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
  }
  return { data: category.join('\n\n'), count };
}

export async function updateList(data: string) {
  const listRegExp = getMarkRegExp(EMark.list);
  const listRegExpG = getMarkRegExp(EMark.list, true, 'img');
  let hasList = false;
  let isAll = false;
  let match = listRegExpG.exec(data);
  while (match) {
    if (!hasList) {
      hasList = true;
    }
    if (!match[1]) {
      isAll = true;
      break;
    }
    match = listRegExpG.exec(data);
  }
  if (!hasList) {
    return data;
  }
  const { files } = await getFiles();
  if (!isAll) {
    const fileList = Object.values(files).filter(file => !file.isError).sort(sortFiles);
    return replaceByRegExp(listRegExpG, data, ([, content]) => {
      const queryParams = getQueryParams(content);
      const resultFiles: IFile[] = [];
      for (const file of fileList) {
        if (findIn(file, queryParams)[0]) {
          resultFiles.push(file);
        }
      }
      return resultFiles.map(file => `- [](${file.path} "#")`).join('\n');
    }).trim();
  }
  const tagTree: TTagTree = {};
  const taggedDict: Dict<IFile[]> = {};
  const untaggedFiles: IFile[] = [];
  for (const file of Object.values(files)) {
    if (file.isError) {
      continue;
    }
    const tags = file.flags.tags;
    if (!tags || tags.length === 0) {
      untaggedFiles.push(file);
      continue;
    }
    for (const tag of tags) {
      let cursor = tagTree;
      tag.split('/').forEach(seg => {
        let subTree = cursor[seg];
        if (subTree === undefined) {
          subTree = {};
          cursor[seg] = subTree;
        }
        cursor = subTree;
      });
      const taggedFiles = taggedDict[tag];
      if (taggedFiles !== undefined) {
        taggedFiles.push(file);
        continue;
      }
      taggedDict[tag] = [file];
    }
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

export function preprocessSearchPage(data: string) {
  const replaced = [false, false];
  let markRegExp = getMarkRegExp(`(${[EMark.input, EMark.result].join('|')})`, true, 'img');
  data = replaceByRegExp(markRegExp, data, ([, mark, content]) => {
    if (mark === EMark.input) {
      if (!replaced[0]) {
        replaced[0] = true;
        return `<input id="search-${mark}" class="ipt" placeholder="${content || ''}"/>`;
      }
      return '';
    }
    if (!replaced[1]) {
      replaced[1] = true;
      return `<ul id="search-${mark}">${content || ''}</ul>`;
    }
    return '';
  });
  markRegExp = getMarkRegExp(`(${[EMark.number, EMark.count, EMark.time].join('|')})`, false, 'ig');
  return data.replace(markRegExp, '<span class="search-$1">$2</span>');
}

export async function updateSearchPage(content: string) {
  const searchInput = document.querySelector<HTMLInputElement>(`input#search-${EMark.input}`);
  if (searchInput) {
    searchInput.value = content;
    searchInput.addEventListener('keyup', e => {
      if (e.key !== 'Enter') {
        return;
      }
      const searchValue = searchInput.value.trim();
      searchInput.value = searchValue;
      changeQueryContent(searchValue);
    });
  }
  const resultUl = document.querySelector<HTMLUListElement>(`ul#search-${EMark.result}`);
  if (!content || !resultUl) {
    return;
  }
  const queryParams = getQueryParams(content);
  resultUl.innerHTML = getSyncSpan() + config.messages.searching;
  const startTime = new Date().getTime();
  const { files } = await getFiles();
  const resultFiles: IFile[] = [];
  const quoteDict: Dict<HTMLQuoteElement> = {};
  let count = 0;
  for (const file of Object.values(files)) {
    if (file.isError) {
      continue;
    }
    count++;
    const [found, inData] = findIn(file, queryParams);
    if (!found) {
      continue;
    }
    resultFiles.push(file);
    if (!inData) {
      continue;
    }
    const path = file.path;
    const data = file.data;
    const results = [];
    let prevEndIndex = 0;
    const regexp = new RegExp(escapeRE(queryParams[0]), 'ig');
    let match = regexp.exec(data);
    while (match) {
      const offset = 10;
      let startIndex = match.index - offset;
      if (prevEndIndex === 0 && startIndex > 0) {
        results.push('');
      }
      const endIndex = regexp.lastIndex + offset;
      const lastIndex = results.length - 1 as number;
      let result = `<span class="highlight">${escapeHtml(match[0])}</span>` +
        escapeHtml(data.substring(match.index + match[0].length, endIndex).trimEnd());
      if (startIndex > prevEndIndex) {
        results.push(escapeHtml(data.substring(startIndex, match.index).trimStart()) + result);
        prevEndIndex = endIndex;
        match = regexp.exec(data);
        continue;
      }
      startIndex = prevEndIndex;
      if (startIndex > match.index) {
        if (lastIndex >= 0) {
          const lastResult = results[lastIndex] as string;
          results[lastIndex] = lastResult.substring(0, lastResult.length - (startIndex - match.index));
        }
      } else if (startIndex < match.index) {
        result = escapeHtml(data.substring(startIndex, match.index).trimStart()) + result;
      }
      if (lastIndex >= 0) {
        results[lastIndex] += result;
      } else {
        results.push(result);
      }
      prevEndIndex = endIndex;
      match = regexp.exec(data);
    }
    if (prevEndIndex < data.length) {
      results.push('');
    }
    const blockquote = document.createElement('blockquote');
    const p = document.createElement('p');
    p.innerHTML = results.join('<span class="ellipsis">...</span>');
    blockquote.append(p);
    quoteDict[path] = blockquote;
  }
  if (resultFiles.length === 0) {
    resultUl.innerHTML = config.messages.searchNothing;
  } else {
    resultUl.innerHTML = '';
    resultFiles.sort(sortFiles).forEach(file => {
      resultUl.append(createList(file));
      const blockquote = quoteDict[file.path];
      if (blockquote) {
        resultUl.append(blockquote);
      }
    });
  }
  const number = resultFiles.length;
  const searchNumber = document.querySelectorAll<HTMLSpanElement>(`span.search-${EMark.number}`);
  searchNumber.forEach(element => {
    element.innerText = `${number}`;
  });
  const searchCount = document.querySelectorAll<HTMLSpanElement>(`span.search-${EMark.count}`);
  searchCount.forEach(element => {
    element.innerText = `${count}`;
  });
  const time = new Date().getTime() - startTime;
  const timeSecond = time / 1000;
  const searchTime = document.querySelectorAll<HTMLSpanElement>(`span.search-${EMark.time}`);
  searchTime.forEach(element => {
    element.innerText = `${timeSecond}`;
  });
  dispatchEvent(EEvent.searchCompleted, { number, count, time }, 100).then();
}

function updateDD() {
  document.querySelectorAll<HTMLParagraphElement>('article p').forEach(p => {
    if (p.innerHTML.startsWith(': ')) {
      p.outerHTML = `<dl><dd>${p.innerHTML.substr(2).trimStart()}</dd></dl>`;
    }
  });
  document.querySelectorAll<HTMLElement>('article dt').forEach(dt => {
    if (dt.innerHTML.startsWith(': ')) {
      dt.outerHTML = `<dd>${dt.innerHTML.substr(2).trimStart()}</dd>`;
    }
  });
}

let waitingList: [HTMLAnchorElement[], [HTMLAnchorElement, HTMLHeadingElement][]] = [[], []];

function getHeadingText(heading: HTMLHeadingElement) {
  return heading.innerText.substr(2).trim() || `[${null}]`;
}

function updateLinkPath() {
  for (const a of document.querySelectorAll<HTMLAnchorElement>('a[href^="#/"]')) {
    let { path } = parseHash(a.getAttribute('href')!);
    path = checkLinkPath(path);
    if (!path) {
      continue;
    }
    if (path === state.filePath) {
      a.classList.add('self');
    } else {
      removeClass(a, 'self');
    }
    if (a.innerHTML !== '') {
      continue;
    }
    a.innerHTML = getSyncSpan();
    a.classList.add('rendering');
    getFile(path).then(file => {
      if (file.isError) {
        a.classList.add('error');
      }
      a.innerHTML = file.flags.title;
      const parent = a.parentElement!;
      if (parent.tagName !== 'LI') {
        return;
      }
      let isPass = true;
      let hasQuote = false;
      if (parent.childNodes[0].nodeType === 1) {
        if (parent.childNodes.length === 1) {
          isPass = false;
        } else if (parent.childElementCount === 2 && parent.lastElementChild!.tagName === 'BLOCKQUOTE') {
          isPass = false;
          hasQuote = true;
        }
      }
      if (isPass) {
        return;
      }
      if (hasQuote) {
        parent.parentElement!.insertBefore(parent.lastElementChild!, parent.nextElementSibling);
      }
      createList(file, parent as HTMLLIElement);
    }).finally(() => {
      removeClass(a, 'rendering');
      const indexOf = waitingList[0].indexOf(a);
      if (indexOf >= 0) {
        const waitingItem = waitingList[1][indexOf];
        waitingItem[0].innerHTML = getHeadingText(waitingItem[1]);
      }
    });
  }
}

function updateCustom(links: NodeListOf<HTMLAnchorElement>, isScript: boolean) {
  for (const a of links) {
    if (!new RegExp(`${isScript ? '\\$' : '\\*'}+`).test(a.innerText)) {
      continue;
    }
    let href = a.getAttribute('href')!;
    let element;
    if (isScript) {
      element = document.querySelector<HTMLScriptElement>(`script[src^="${href}"]`);
    } else {
      element = document.querySelector<HTMLLinkElement>(`link[href^="${href}"]`);
    }
    if (element) {
      const nextChar = element.getAttribute(isScript ? 'src' : 'href')![href.length];
      if (!nextChar || nextChar === '?') {
        a.parentElement!.remove();
        continue;
      }
    }
    href = addCacheKey(href);
    if (isScript) {
      element = document.createElement('script');
      element.charset = 'utf-8';
      element.src = href;
    } else {
      element = document.createElement('link');
      element.rel = 'stylesheet';
      element.type = 'text/css';
      element.href = href;
    }
    if (a.innerText.length === 1) {
      element.classList.add('custom');
    }
    document.head.append(element);
    a.parentElement!.remove();
  }
}

function updateCustomStyle(links: NodeListOf<HTMLAnchorElement>) {
  updateCustom(links, false);
}

function updateCustomScript(links: NodeListOf<HTMLAnchorElement>) {
  updateCustom(links, true);
}

const scrollOffset = 6;

function updateLinkAnchor(anchorRegExp: RegExp, anchorDict: Dict<HTMLElement>, links: NodeListOf<HTMLAnchorElement>) {
  for (const a of links) {
    const anchor = a.getAttribute('href')!.substr(1);
    if (!anchorRegExp.test(anchor)) {
      continue;
    }
    const element = anchorDict[anchor];
    addEventListener(a, 'click', e => {
      e.preventDefault();
      if (element && element.offsetTop > 0) {
        scroll(element.offsetTop - scrollOffset);
        changeAnchor(anchor);
      }
    });
  }
}

function updateAnchor() {
  const anchorRegExp = getAnchorRegExp();
  const anchorDict: Dict<HTMLElement> = {};
  const anchorsDictByHref: Dict<[HTMLElement[], HTMLAnchorElement[]]> = {};
  for (const element of document.querySelectorAll<HTMLElement>('article > *[id^="h"]')) {
    if (!/^H[2-6]$/.test(element.tagName)) {
      continue;
    }
    const anchor = element.id;
    if (!anchorRegExp.test(anchor)) {
      continue;
    }
    anchorDict[anchor] = element;
    if (element.childNodes.length !== 3) {
      continue;
    }
    const a = element.childNodes[1] as HTMLAnchorElement;
    if (a.nodeType !== 1 || a.tagName !== 'A') {
      continue;
    }
    const href = a.getAttribute('href');
    if (!href || !href.startsWith('#/')) {
      continue;
    }
    const { path } = parseHash(href);
    const anchors = anchorsDictByHref[path];
    if (anchors === undefined) {
      anchorsDictByHref[path] = [[element], [a]];
      continue;
    }
    anchors[0].push(element);
    anchors[1].push(a);
  }
  updateLinkAnchor(anchorRegExp, anchorDict, document.querySelectorAll<HTMLAnchorElement>(`article a[href^="#h"]`));
  for (const a of document.querySelectorAll<HTMLAnchorElement>('article a[href^="#/"]')) {
    const { path } = parseHash(a.getAttribute('href')!);
    const anchors = anchorsDictByHref[path];
    if (anchors === undefined || anchors[1].includes(a)) {
      continue;
    }
    const elements = anchors[0];
    let nearestElement = elements[0];
    let minDistance = Math.abs(nearestElement.offsetTop - a.offsetTop);
    if (elements.length > 1) {
      for (let i = 1; i < elements.length; i++) {
        const element = elements[i];
        const distance = Math.abs(element.offsetTop - a.offsetTop);
        if (distance >= minDistance) {
          break;
        }
        nearestElement = element;
        minDistance = distance;
      }
    }
    addEventListener(a, 'click', e => {
      if (nearestElement.offsetTop > 0) {
        e.preventDefault();
        scroll(nearestElement.offsetTop - scrollOffset);
        changeAnchor(nearestElement.id);
      }
    });
  }
  document.querySelectorAll<HTMLSpanElement>('article .heading-link').forEach(headingLink => {
    const heading = headingLink.parentElement!;
    addEventListener(headingLink, 'click', () => {
      scroll(heading.offsetTop - scrollOffset);
      changeAnchor(heading.id);
    });
  });
  document.querySelectorAll<HTMLAnchorElement>('article .footnote-backref').forEach(backref => {
    const fnref = document.getElementById(backref.getAttribute('href')!.substr(1))!;
    addEventListener(fnref, 'click', e => {
      e.preventDefault();
      scroll(backref.offsetTop - scrollOffset);
    });
    addEventListener(backref, 'click', e => {
      e.preventDefault();
      if (fnref.offsetTop > 0) {
        scroll(fnref.offsetTop - scrollOffset);
      }
    });
  });
  return [anchorRegExp, anchorDict] as [RegExp, Dict<HTMLElement>];
}

function updateImagePath() {
  for (const img of document.querySelectorAll<HTMLImageElement>('#cover img, article img')) {
    if (img.classList.contains('emoji')) {
      continue;
    }
    let parent = img.parentElement!;
    if (parent.tagName === 'A') {
      parent = parent.parentElement!;
    }
    img.classList.forEach(cls => {
      if (['hidden', 'left', 'right'].includes(cls)) {
        parent.classList.add(cls);
        removeClass(img, cls);
      }
    });
    if (parent.childNodes.length === 1) {
      if (['DT', 'DD'].includes(parent.tagName)) {
        parent.parentElement!.classList.add('center');
      } else if (parent.tagName === 'P') {
        parent.classList.add('center');
      }
    }
    if (parent.classList.contains('hidden') || img.naturalWidth !== 0) {
      continue;
    }
    parent.classList.add('hidden');
    const loadings = document.createElement('div');
    loadings.classList.add('lds-ellipsis');
    for (let i = 0; i < 4; i++) {
      loadings.append(document.createElement('div'));
    }
    parent.parentElement!.insertBefore(loadings, parent);
    img.onload = () => {
      loadings.remove();
      removeClass(parent, 'hidden');
    };
  }
}

let prismjsTs: TPrismjsTs | null = null;

export async function updateHighlight() {
  const codes = document.querySelectorAll('article pre > code');
  if (codes.length === 0) {
    return;
  }
  let needHighlight = false;
  for (const code of codes) {
    const dataLine = code.getAttribute('data-line');
    if (dataLine) {
      code.parentElement!.setAttribute('data-line', dataLine);
      code.removeAttribute('data-line');
    }
    if (needHighlight) {
      continue;
    }
    for (const cls of code.classList) {
      if (/^(language|lang)-\S+$/.test(cls)) {
        needHighlight = true;
        break;
      }
    }
  }
  if (needHighlight) {
    if (!prismjsTs) {
      prismjsTs = await importPrismjsTs();
    }
    prismjsTs.highlightAll();
  }
}

function foldElement(element: Element, isFolded: boolean) {
  if (isFolded) {
    element.classList.add('folded');
  } else {
    removeClass(element, 'folded');
  }
}

function foldChild(child: Element | THeading, isFolded: boolean) {
  if (child instanceof Element) {
    foldElement(child, isFolded);
  } else {
    foldElement(child.element, isFolded);
    if (!child.isFolded) {
      child.children.forEach(child => foldChild(child, isFolded));
    }
  }
}

function transHeading(heading: THeading) {
  const headingElement = heading.element as HTMLHeadingElement;
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = `#${headingElement.id}`;
  const renderingA = headingElement.querySelector<HTMLAnchorElement>('a.rendering');
  if (renderingA) {
    a.innerHTML = getSyncSpan();
    waitingList[0].push(renderingA);
    waitingList[1].push([a, headingElement]);
  } else {
    a.innerHTML = getHeadingText(headingElement);
  }
  li.append(a);
  let count = 1;
  if (heading.children.length === 0) {
    return { li, count };
  }
  const ul = document.createElement('ul');
  heading.children.forEach(child => {
    if (!(child instanceof Element)) {
      const list = transHeading(child);
      ul.append(list.li);
      count += list.count;
    }
  });
  if (ul.childElementCount > 0) {
    li.append(ul);
  }
  return { li, count };
}

function updateHeading() {
  const header: THeading = {
    element: document.querySelector('header')!,
    level: 1,
    isFolded: false,
    children: [],
    parent: null,
  };
  let cursor: THeading | null = null;
  for (const child of document.querySelector('article')!.children) {
    if (child.classList.contains('footnotes')) {
      break;
    }
    const match = child.tagName.match(/^H([2-6])$/);
    if (!match) {
      if (cursor) {
        cursor.children.push(child);
      }
      continue;
    }
    const level = parseInt(match[1]);
    const heading: THeading = {
      element: child,
      level,
      isFolded: false,
      children: [],
      parent: null,
    };
    header.children.push(heading);
    if (!cursor) {
      cursor = heading;
      continue;
    }
    if (level > cursor.level) {
      cursor.children.push(heading);
      heading.parent = cursor;
      cursor = heading;
      continue;
    }
    let parent = cursor.parent;
    while (parent) {
      if (level <= parent.level) {
        parent = parent.parent;
        continue;
      }
      parent.children.push(heading);
      heading.parent = parent;
      break;
    }
    cursor = heading;
  }
  const tocDiv = document.querySelector('article #toc');
  const headingLength = header.children.length;
  if (headingLength === 0) {
    if (tocDiv) {
      tocDiv.remove();
    }
    return;
  }
  const headingList: THeading[] = [];
  for (const heading of (header.children as THeading[])) {
    if (!heading.parent) {
      headingList.push(heading);
    }
    const headingElement = heading.element;
    const headingTag = headingElement.querySelector<HTMLSpanElement>('.heading-tag');
    if (!headingTag) {
      continue;
    }
    const toggleFold = () => {
      heading.isFolded = !heading.isFolded;
      if (heading.isFolded) {
        headingTag.classList.add('folding');
      } else {
        removeClass(headingTag, 'folding');
      }
      heading.children.forEach(child => foldChild(child, heading.isFolded));
    };
    if (headingElement.classList.contains('fold')) {
      toggleFold();
    }
    addEventListener(headingTag, 'click', toggleFold);
  }
  if (!tocDiv) {
    return;
  }
  tocDiv.innerHTML = '';
  const transHeadingList = headingList.map(transHeading);
  const groupLength = headingLength > 11 ? 3 : (headingLength > 7 ? 2 : 1);
  const groups: HTMLLIElement[][] = '.'.repeat(groupLength - 1).split('.').map(() => []);
  let maxCount = Math.ceil(headingLength / groupLength);
  let nextCount = 0;
  let i = 0;
  let index = 0;
  for (; ;) {
    let isOver = true;
    let count = 0;
    for (; i < transHeadingList.length; i++) {
      let list = transHeadingList[i];
      let group = groups[index];
      count += list.count;
      if (group.length === 0 || count <= maxCount) {
        group.push(list.li);
        if (index === 0) {
          nextCount += list.count;
        }
        continue;
      }
      if (++index < groupLength) {
        count = list.count;
        groups[index].push(list.li);
        continue;
      }
      for (let i = 1; i < groups.length; i++) {
        groups[i] = [];
      }
      group = groups[0];
      list = transHeadingList[group.length];
      group.push(list.li);
      nextCount += list.count;
      maxCount = nextCount;
      i = group.length;
      index = 1;
      isOver = false;
      break;
    }
    if (isOver) {
      break;
    }
  }
  for (const group of groups) {
    if (group.length === 0) {
      continue;
    }
    const ul = document.createElement('ul');
    group.forEach(li => ul.append(li));
    tocDiv.append(ul);
  }
}

export async function updateDom() {
  updateDD();
  waitingList = [[], []];
  updateLinkPath();
  const styles = document.querySelectorAll<HTMLAnchorElement>('article a[href$=".css"]');
  const scripts = document.querySelectorAll<HTMLAnchorElement>('article a[href$=".js"]');
  updateCustomStyle(styles);
  updateCustomScript(scripts);
  const [anchorRegExp, anchorDict] = updateAnchor();
  updateImagePath();
  await updateHighlight();
  updateHeading();
  updateLinkAnchor(anchorRegExp, anchorDict, document.querySelectorAll(`article #toc a[href^="#h"]`));
}
