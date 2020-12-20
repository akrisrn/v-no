import { sortFiles } from '@/ts/compare';
import { config } from '@/ts/config';
import { addEventListener, createList, removeClass, scroll, simpleUpdateLinkPath } from '@/ts/dom';
import { EFlag } from '@/ts/enums';
import { getFile, getFiles } from '@/ts/file';
import { addCacheKey, buildHash, buildSearchContent, changeHash, checkLinkPath, parseHash } from '@/ts/path';
import { getAnchorRegExp, getHeadingPattern, getHeadingRegExp, getLinkPathPattern, getWrapRegExp } from '@/ts/regexp';
import { chopStr, replaceByRegExp, replaceInlineScript, snippetMark, trimList } from '@/ts/utils';

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

function updateDD() {
  document.querySelectorAll<HTMLParagraphElement>('article p').forEach(p => {
    if (p.innerHTML.startsWith(': ')) {
      const dl = document.createElement('dl');
      const dd = document.createElement('dd');
      dl.append(dd);
      dd.innerHTML = p.innerHTML.substr(2).trimStart();
      p.outerHTML = dl.outerHTML;
    }
  });
  document.querySelectorAll<HTMLElement>('article dt').forEach(dt => {
    if (dt.innerHTML.startsWith(': ')) {
      const dd = document.createElement('dd');
      dd.innerHTML = dt.innerHTML.substr(2).trimStart();
      dt.outerHTML = dd.outerHTML;
    }
  });
}

function updateAnchor(onlyToc = false) {
  for (const a of document.querySelectorAll<HTMLAnchorElement>(`article ${onlyToc ? '#toc' : ''} a[href^="#h"]`)) {
    const anchor = a.getAttribute('href')!.substr(1);
    if (!getAnchorRegExp().test(anchor)) {
      continue;
    }
    const heading = document.querySelector<HTMLHeadingElement>(`article > *[id="${anchor}"]`);
    addEventListener(a, 'click', e => {
      e.preventDefault();
      if (heading && heading.offsetTop > 0) {
        scroll(heading.offsetTop - 6);
        changeHash(anchor);
      }
    });
  }
  if (onlyToc) {
    return;
  }
  document.querySelectorAll<HTMLSpanElement>('article .heading-link').forEach(headingLink => {
    const heading = headingLink.parentElement!;
    addEventListener(headingLink, 'click', () => {
      scroll(heading.offsetTop - 6);
      changeHash(heading.id);
    });
  });
  document.querySelectorAll<HTMLAnchorElement>('article .footnote-backref').forEach(backref => {
    const fnref = document.getElementById(backref.getAttribute('href')!.substr(1))!;
    addEventListener(fnref, 'click', e => {
      e.preventDefault();
      scroll(backref.offsetTop - 6);
    });
    addEventListener(backref, 'click', e => {
      e.preventDefault();
      if (fnref.offsetTop > 0) {
        scroll(fnref.offsetTop - 6);
      }
    });
  });
}

function updateImagePath() {
  for (const img of document.querySelectorAll<HTMLImageElement>('#cover img, article img')) {
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

let waitingList: { heading: HTMLHeadingElement; a: HTMLAnchorElement }[] = [];

function getHeadingText(heading: HTMLHeadingElement) {
  return heading.innerText.substr(2).trim() || `[${null}]`;
}

function updateLinkPath() {
  simpleUpdateLinkPath((file, a) => {
    const parent = a.parentElement!;
    if (parent.tagName !== 'LI') {
      return;
    }
    let isPass = true;
    let hasQuote = false;
    if (parent.childNodes[0].nodeType === 1) {
      if (parent.childElementCount === 1) {
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
  }).then(() => {
    waitingList.forEach(({ heading, a }) => {
      a.innerText = getHeadingText(heading);
    });
  });
}

function updateCustomScript(links: NodeListOf<HTMLAnchorElement>) {
  for (const a of links) {
    if (a.innerText !== '$') {
      continue;
    }
    const href = addCacheKey(a.getAttribute('href')!);
    if (!document.querySelector(`script[src="${href}"]`)) {
      const script = document.createElement('script');
      script.src = href;
      script.classList.add('custom');
      document.body.appendChild(script);
    }
    a.parentElement!.remove();
  }
}

function updateCustomStyle(links: NodeListOf<HTMLAnchorElement>) {
  for (const a of links) {
    if (a.innerText !== '*') {
      continue;
    }
    const href = addCacheKey(a.getAttribute('href')!);
    if (!document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = href;
      link.classList.add('custom');
      document.head.appendChild(link);
    }
    a.parentElement!.remove();
  }
}

const prismjs = () => import(/* webpackChunkName: "prismjs" */ '@/ts/prismjs');
let highlightAll: () => void;

async function updateHighlight() {
  const codes = document.querySelectorAll('article pre > code');
  if (codes.length === 0) {
    return;
  }
  codes.forEach(code => {
    const dataLine = code.getAttribute('data-line');
    if (dataLine) {
      code.parentElement!.setAttribute('data-line', dataLine);
      code.removeAttribute('data-line');
    }
  });
  if (!highlightAll) {
    highlightAll = (await prismjs()).highlightAll;
  }
  highlightAll();
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
  a.innerText = getHeadingText(headingElement);
  li.append(a);
  if (headingElement.querySelector<HTMLAnchorElement>('a.rendering')) {
    waitingList.push({ heading: headingElement, a });
  }
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
  (header.children as THeading[]).forEach(heading => {
    const headingElement = heading.element;
    const headingTag = headingElement.querySelector<HTMLSpanElement>('.heading-tag')!;
    const toggleFold = () => {
      heading.isFolded = !heading.isFolded;
      if (heading.isFolded) {
        headingTag.classList.add('folding');
      } else {
        removeClass(headingTag, 'folding');
      }
      heading.children.forEach(child => {
        foldChild(child, heading.isFolded);
      });
    };
    if (headingElement.classList.contains('fold')) {
      toggleFold();
    }
    addEventListener(headingTag, 'click', toggleFold);
    if (!heading.parent) {
      headingList.push(heading);
    }
  });
  if (!tocDiv) {
    return;
  }
  tocDiv.innerHTML = '';
  let maxLength = headingLength;
  if (headingLength > 11) {
    maxLength = Math.ceil(headingLength / 3);
  } else if (headingLength > 7) {
    maxLength = Math.ceil(headingLength / 2);
  }
  let currentUl = document.createElement('ul');
  tocDiv.append(currentUl);
  let count = 0;
  for (const heading of headingList) {
    const list = transHeading(heading);
    count += list.count;
    if (count <= maxLength) {
      currentUl.append(list.li);
      continue;
    }
    count = list.count;
    if (currentUl.childElementCount > 0 && tocDiv.childElementCount < 3) {
      currentUl = document.createElement('ul');
      tocDiv.append(currentUl);
    }
    currentUl.append(list.li);
  }
  if (tocDiv.childElementCount === 3) {
    for (let i = 0; i < tocDiv.children.length; i++) {
      tocDiv.children[i].classList.add(`ul-${i + 1}`);
    }
  } else if (tocDiv.childElementCount === 2) {
    tocDiv.firstElementChild!.classList.add('ul-a');
    tocDiv.lastElementChild!.classList.add('ul-b');
  }
  updateAnchor(true);
}

export function updateDom() {
  waitingList = [];
  updateDD();
  updateAnchor();
  updateImagePath();
  updateLinkPath();
  const scripts = document.querySelectorAll<HTMLAnchorElement>('article a[href$=".js"]');
  const styles = document.querySelectorAll<HTMLAnchorElement>('article a[href$=".css"]');
  updateCustomScript(scripts);
  updateCustomStyle(styles);
  updateHighlight().then(() => {
    updateHeading();
  });
}

const htmlSymbolDict: Dict<string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};
const htmlSymbolRegExp = new RegExp(`[${Object.keys(htmlSymbolDict).join('')}]`, 'g');

function escapeHTML(html: string) {
  return html.replace(htmlSymbolRegExp, key => htmlSymbolDict[key]);
}

export async function updateSearchPage(content: string) {
  const searchInput = document.querySelector<HTMLInputElement>('#search-input');
  if (searchInput) {
    searchInput.value = content;
    searchInput.addEventListener('keyup', e => {
      if (e.key !== 'Enter') {
        return;
      }
      const searchValue = searchInput.value.trim();
      searchInput.value = searchValue;
      const query = searchValue ? buildSearchContent(searchValue) : '';
      const { path, anchor } = parseHash(location.hash, true);
      location.hash = buildHash({ path, anchor, query });
    });
  }
  const resultUl = document.querySelector<HTMLUListElement>('#result');
  if (!content || !resultUl) {
    return;
  }
  content = content.toLowerCase();
  let queryFlag = '';
  let queryParam = '';
  const match = content.match(/^@(\S+?):\s*(.*)$/);
  if (match) {
    queryFlag = match[1];
    queryParam = match[2];
  }
  resultUl.innerText = config.messages.searching;
  const timeStart = new Date().getTime();
  const { files } = await (await importFileTs()).getFiles();
  const resultFiles: TFile[] = [];
  const quoteDict: Dict<HTMLQuoteElement> = {};
  let count = 0;
  for (const file of Object.values(files)) {
    if (file.isError) {
      continue;
    }
    count++;
    const { data, flags } = file;
    let isFind = false;
    let hasQuote = false;
    if (!queryFlag) {
      if (flags.title.toLowerCase().indexOf(content) >= 0) {
        isFind = true;
      } else if (data.toLowerCase().indexOf(content) >= 0) {
        isFind = true;
        hasQuote = true;
      }
    } else if (queryParam) {
      if (queryFlag === EFlag.tags && flags.tags) {
        for (const tag of flags.tags) {
          const a = tag.toLowerCase();
          const b = trimList(queryParam.split('/'), false).join('/');
          if (a === b || a.startsWith(`${b}/`)) {
            isFind = true;
            break;
          }
        }
      }
    }
    if (!isFind) {
      continue;
    }
    resultFiles.push(file);
    if (!hasQuote) {
      continue;
    }
    const results = [];
    let prevEndIndex = 0;
    const regexp = new RegExp(content, 'ig');
    let match = regexp.exec(data);
    while (match) {
      const offset = 10;
      let startIndex = match.index - offset;
      if (prevEndIndex === 0 && startIndex > 0) {
        results.push('');
      }
      const endIndex = regexp.lastIndex + offset;
      const lastIndex = results.length - 1 as number;
      let result = `<span class="highlight">${escapeHTML(match[0])}</span>` +
        escapeHTML(data.substring(match.index + match[0].length, endIndex).trimEnd());
      if (startIndex > prevEndIndex) {
        results.push(escapeHTML(data.substring(startIndex, match.index).trimStart()) + result);
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
        result = escapeHTML(data.substring(startIndex, match.index).trimStart()) + result;
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
    quoteDict[file.path] = blockquote;
  }
  if (resultFiles.length === 0) {
    resultUl.innerText = config.messages.searchNothing;
  } else {
    resultUl.innerText = '';
    resultFiles.sort((await importFileTs()).sortFiles).forEach(file => {
      resultUl.append(createList(file));
      const blockquote = quoteDict[file.path];
      if (blockquote) {
        resultUl.append(blockquote);
      }
    });
  }
  const searchTime = document.querySelector<HTMLSpanElement>('#search-time');
  if (searchTime) {
    searchTime.innerText = `${(new Date().getTime() - timeStart) / 1000}`;
  }
  const searchCount = document.querySelector<HTMLSpanElement>('#search-count');
  if (searchCount) {
    searchCount.innerText = `${resultFiles.length}/${count}`;
  }
}
