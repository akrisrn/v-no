import { checkLinkPath, getFile, getFiles } from '@/ts/file';
import {
  buildQueryContent,
  EFlag,
  getEventListenerDict,
  getHeadingRegExp,
  getSearchTagLinks,
  getWrapRegExp,
  removeClass,
  replaceByRegExp,
  replaceInlineScript,
  scroll,
  sortFiles,
  trimList,
} from '@/ts/utils';
import { config } from '@/ts/config';
import Prism from 'prismjs';

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

const eventListenerDict = getEventListenerDict();

function addEventListener(element: Element, type: string, listener: EventListenerOrEventListenerObject) {
  let eventListeners = eventListenerDict[type];
  if (eventListeners === undefined) {
    eventListeners = { elements: [element], listeners: [listener] };
    eventListenerDict[type] = eventListeners;
  } else {
    const indexOf = eventListeners.elements.indexOf(element);
    if (indexOf >= 0) {
      element.removeEventListener(type, eventListeners.listeners[indexOf]);
      eventListeners.listeners.splice(indexOf, 1, listener);
    } else {
      eventListeners.elements.push(element);
      eventListeners.listeners.push(listener);
    }
  }
  element.addEventListener(type, listener);
}

function updateAnchor() {
  document.querySelectorAll<HTMLLinkElement>('article a[href^="#h"]').forEach(a => {
    const text = a.innerText;
    if (text.startsWith('/')) {
      const path = checkLinkPath(text);
      if (path) {
        a.classList.add('rendering');
        getFile(path).then(file => {
          if (file.isError) {
            a.classList.add('error');
          }
          a.innerText = file.flags.title;
        }).finally(() => {
          removeClass(a, 'rendering');
        });
      }
    }
    const anchor = a.getAttribute('href')!.substr(1);
    if (/^h[2-6]-\d+$/.test(anchor)) {
      const [tagName, numStr] = anchor.split('-');
      const num = parseInt(numStr);
      const headings: HTMLHeadingElement[] = [];
      document.querySelectorAll<HTMLHeadingElement>(`article ${tagName}`).forEach(heading => {
        if (heading.parentElement!.tagName !== 'SUMMARY') {
          headings.push(heading);
        }
      });
      if (num < headings.length) {
        const heading = headings[num];
        addEventListener(a, 'click', e => {
          e.preventDefault();
          if (heading.offsetTop > 0) {
            scroll(heading.offsetTop - 10);
          }
        });
      }
    }
  });
  document.querySelectorAll<HTMLHeadingElement>([1, 2, 3, 4, 5, 6].map(n => {
    return `article h${n}`;
  }).join(',')).forEach(heading => {
    addEventListener(heading.querySelector('.heading-link')!, 'click', e => {
      e.preventDefault();
      scroll(heading.offsetTop - 10);
    });
  });
  document.querySelectorAll<HTMLLinkElement>('article .footnote-backref').forEach(backref => {
    const fnref = document.getElementById(backref.getAttribute('href')!.substr(1))!;
    addEventListener(fnref, 'click', e => {
      e.preventDefault();
      scroll(backref.offsetTop - 10);
    });
    addEventListener(backref, 'click', e => {
      e.preventDefault();
      if (fnref.offsetTop > 0) {
        scroll(fnref.offsetTop - 10);
      }
    });
  });
}

function updateImagePath() {
  document.querySelectorAll<HTMLImageElement>('#cover img, article img').forEach(img => {
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
    let loadings = parent.previousElementSibling;
    if (!parent.classList.contains('hidden') || loadings && loadings.classList.contains('lds-ellipsis')) {
      parent.classList.add('hidden');
      if (!loadings || !loadings.classList.contains('lds-ellipsis')) {
        loadings = document.createElement('div');
        loadings.classList.add('lds-ellipsis');
        for (let i = 0; i < 4; i++) {
          loadings.append(document.createElement('div'));
        }
        parent.parentElement!.insertBefore(loadings, parent);
      }
      const onload = () => {
        removeClass(parent, 'hidden');
        loadings!.remove();
      };
      if (img.naturalWidth === 0) {
        img.onload = onload;
      } else {
        onload();
      }
    }
    if (parent.tagName === 'DT') {
      parent.parentElement!.classList.add('center');
    } else if (parent.parentElement!.tagName !== 'BLOCKQUOTE') {
      parent.classList.add('center');
    }
  });
}

function updateLinkPath() {
  for (const a of document.querySelectorAll<HTMLLinkElement>('a[href^="#/"]')) {
    if (a.innerText !== '') {
      continue;
    }
    a.innerText = '#';
    const path = checkLinkPath(a.getAttribute('href')!.substr(1));
    if (!path) {
      continue;
    }
    a.classList.add('rendering');
    getFile(path).then(file => {
      if (file.isError) {
        a.classList.add('error');
      }
      const flags = file.flags;
      a.innerText = flags.title;
      const parent = a.parentElement!;
      if (parent.tagName === 'LI') {
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
        if (!isPass) {
          parent.classList.add('article');
          if (file.isError) {
            return;
          }
          const bar = document.createElement('div');
          bar.classList.add('bar');
          flags.tags.forEach(tag => {
            const itemTag = document.createElement('code');
            itemTag.classList.add('item-tag');
            getSearchTagLinks(tag).forEach(link => {
              const a = document.createElement('a');
              a.href = link[0];
              a.innerText = link[1];
              itemTag.append(a);
            });
            bar.append(itemTag);
          });
          if (flags.startDate) {
            const itemDate = document.createElement('code');
            itemDate.classList.add('item-date');
            itemDate.innerText = flags.startDate;
            bar.append(itemDate);
          }
          if (bar.childElementCount > 0) {
            if (hasQuote) {
              parent.insertBefore(bar, parent.lastElementChild);
            } else {
              parent.append(bar);
            }
          }
        }
      }
    }).finally(() => {
      removeClass(a, 'rendering');
    });
  }
}

function updateCustomScript() {
  document.querySelectorAll<HTMLLinkElement>('article a[href$=".js"]').forEach(a => {
    if (a.innerText === '$') {
      const href = a.getAttribute('href')!;
      if (!document.querySelector(`script[src='${href}']`)) {
        const script = document.createElement('script');
        script.src = href;
        script.classList.add('custom');
        document.body.appendChild(script);
      }
      a.parentElement!.remove();
    }
  });
}

function updateCustomStyle() {
  document.querySelectorAll<HTMLLinkElement>('article a[href$=".css"]').forEach(a => {
    if (a.innerText === '*') {
      const href = a.getAttribute('href')!;
      if (!document.querySelector(`link[href='${href}']`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = href;
        link.classList.add('custom');
        document.head.appendChild(link);
      }
      a.parentElement!.remove();
    }
  });
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

function updateFoldableHeading() {
  const header: THeading = {
    element: document.querySelector('header')!,
    level: 1,
    isFolded: false,
    children: [],
    parent: null,
  };
  let cursor = header;
  for (const child of document.querySelector('article')!.children) {
    if (child.classList.contains('footnotes')) {
      break;
    }
    const match = child.tagName.match(/^H([2-6])$/);
    if (match) {
      const level = parseInt(match[1]);
      const heading: THeading = {
        element: child,
        level,
        isFolded: false,
        children: [],
        parent: null,
      };
      header.children.push(heading);
      if (cursor === header) {
        heading.parent = header;
      } else if (level > cursor.level) {
        cursor.children.push(heading);
        heading.parent = cursor;
      } else {
        let parent = cursor.parent;
        while (parent && parent !== header) {
          if (level > parent.level) {
            parent.children.push(heading);
            heading.parent = parent;
            break;
          }
          parent = parent.parent;
        }
      }
      cursor = heading;
    } else {
      cursor.children.push(child);
    }
  }
  let i = 0;
  for (; i < header.children.length; i++) {
    if (!(header.children[i] instanceof Element)) {
      break;
    }
  }
  for (; i < header.children.length; i++) {
    const heading = header.children[i] as THeading;
    const headingElement = heading.element;
    let headingTag = headingElement.querySelector<HTMLSpanElement>('.heading-tag')!;
    if (!headingTag) {
      headingTag = document.createElement('span');
      headingTag.classList.add('heading-tag');
      headingTag.innerText = 'H';
      const small = document.createElement('small');
      small.innerText = headingElement.tagName.substr(1);
      headingTag.append(small);
      headingElement.insertBefore(headingTag, headingElement.childNodes[0]);
    }
    addEventListener(headingTag, 'click', () => {
      heading.isFolded = !heading.isFolded;
      if (heading.isFolded) {
        headingTag.classList.add('folding');
      } else {
        removeClass(headingTag, 'folding');
      }
      heading.children.forEach(child => {
        foldChild(child, heading.isFolded);
      });
    });
  }
}

function updateHighlight() {
  document.querySelectorAll('article pre > code').forEach(code => {
    const dataLine = code.getAttribute('data-line');
    if (dataLine) {
      code.parentElement!.setAttribute('data-line', dataLine);
      code.removeAttribute('data-line');
    }
  });
  Prism.highlightAll();
}

export function updateDom() {
  updateDD();
  updateAnchor();
  updateImagePath();
  updateLinkPath();
  updateCustomScript();
  updateCustomStyle();
  updateFoldableHeading();
  updateHighlight();
}

function degradeHeading(data: string, level: number) {
  if (level > 0) {
    const headingRegExp = getHeadingRegExp(1, 5);
    data = data.split('\n').map(line => {
      const headingMatch = line.match(headingRegExp);
      if (headingMatch) {
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
      }
      return line;
    }).join('\n');
  }
  return data;
}

export async function updateSnippet(data: string, updatedPaths: string[] = []) {
  const dict: Dict<Dict<{ heading: number; params: Dict<string> }>> = {};
  const linkRegExp = /^(?: {0,3}(#{2,6}) )?\s*\[\+(#.+)?]\((\/.*?)\)$/;
  data = data.split('\n').map(line => {
    const match = line.match(linkRegExp);
    if (match) {
      const path = checkLinkPath(match[3]);
      if (path) {
        if (updatedPaths.includes(path)) {
          return '';
        }
        let snippetDict = dict[path];
        if (snippetDict === undefined) {
          snippetDict = {};
          dict[path] = snippetDict;
        }
        if (snippetDict[match[0]] === undefined) {
          const heading = match[1] ? match[1].length : 0;
          const params: Dict<string> = {};
          if (match[2]) {
            match[2].substr(1).split('|').forEach((seg, i) => {
              let param = seg;
              const paramMatch = seg.match(/(.+?)=(.+)/);
              if (paramMatch) {
                param = paramMatch[2];
                params[paramMatch[1]] = param;
              }
              params[i + 1] = param;
            });
          }
          snippetDict[match[0]] = { heading, params };
        }
      }
    }
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
    const path = file.path;
    const fileData = file.data ? replaceInlineScript(file.data) : '';
    const snippetDict = dict[path];
    for (const match of Object.keys(snippetDict)) {
      let snippetData = fileData;
      if (snippetData) {
        const { heading, params } = snippetDict[match];
        snippetData = replaceByRegExp(paramRegExp, snippetData, match => {
          let defaultValue: string;
          [match, defaultValue] = match.split('|');
          const param = params[match];
          let result: string;
          if (param !== undefined) {
            result = param;
          } else if (defaultValue !== undefined) {
            result = defaultValue;
          } else {
            result = 'undefined';
          }
          return result.replace(/\\n/g, '\n');
        });
        const clip = params['clip'];
        if (clip !== undefined) {
          const slips = snippetData.split('--8<--');
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
        let dataWithHeading = snippetData;
        if (heading > 1) {
          const headingText = `# [#](${path})`;
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
      }
      data = data.split('\n').map(line => {
        if (line === match) {
          return file.isError ? `::: .danger.empty .\n${snippetData}\n:::` : snippetData;
        }
        return line;
      }).join('\n');
    }
  }
  return data.trim();
}

function getCategories(level: number, parentTag: string, sortedTags: string[], tagTree: TTagTree,
                       taggedDict: Dict<TFile[]>) {
  const category: string[] = [];
  let count = 0;
  sortedTags.forEach(tag => {
    const nestedTag = parentTag ? `${parentTag}/${tag}` : tag;
    let list = '';
    let fileCount = 0;
    const taggedFiles = taggedDict[nestedTag];
    if (taggedFiles) {
      list = taggedFiles.sort(sortFiles).map(file => `- [#](${file.path})`).join('\n');
      fileCount = taggedFiles.length;
      count += fileCount;
    }
    const subTree = tagTree[tag];
    const categories = getCategories(level + 1, nestedTag, Object.keys(subTree).sort(), subTree, taggedDict);
    const countSpan = `<span class="count">( ${fileCount + categories.count} )</span>`;
    category.push(`${'#'.repeat(level)} ${tag}${countSpan}${list ? `\n\n${list}` : ''}`);
    if (categories.data) {
      category.push(categories.data);
    }
    count += categories.count;
  });
  return { data: category.join('\n\n'), count: count };
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
    const flags = file.flags;
    if (flags.tags.length === 0) {
      untaggedFiles.push(file);
    } else {
      flags.tags.forEach(tag => {
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
  }
  const sortedTags = Object.keys(tagTree).sort();
  if (untaggedFiles.length > 0) {
    const untagged = config.messages.untagged;
    tagTree[untagged] = {};
    sortedTags.push(untagged);
    taggedDict[untagged] = untaggedFiles;
  }
  const categories = getCategories(2, '', sortedTags, tagTree, taggedDict);
  return data.replace(listRegExp, categories.data).replace(listRegExpG, '').trim();
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

export async function updateSearchPage(query: Dict<string>) {
  let content = query.content !== undefined ? decodeURIComponent(query.content.trim()) : '';
  const searchInput = document.querySelector<HTMLInputElement>('#search-input');
  if (searchInput) {
    searchInput.value = content;
    searchInput.addEventListener('keyup', e => {
      if (e.key === 'Enter') {
        const searchValue = searchInput.value.trim();
        searchInput.value = searchValue;
        const param = searchValue ? buildQueryContent(searchValue) : '';
        const indexOf = location.href.indexOf('?');
        location.href = (indexOf >= 0 ? location.href.substring(0, indexOf) : location.href) + param;
      }
    });
  }
  const resultUl = document.querySelector<HTMLUListElement>('#result');
  if (content && resultUl) {
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
    const { files } = await getFiles();
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
      if (queryFlag) {
        if (queryParam && queryFlag === EFlag.tags) {
          for (const tag of flags.tags) {
            const a = tag.toLowerCase();
            const b = trimList(queryParam.split('/'), false).join('/');
            if (a === b || a.startsWith(`${b}/`)) {
              isFind = true;
              break;
            }
          }
        }
      } else if (flags.title.toLowerCase().indexOf(content) >= 0) {
        isFind = true;
      } else if (data.toLowerCase().indexOf(content) >= 0) {
        isFind = true;
        hasQuote = true;
      }
      if (!isFind) {
        continue;
      }
      resultFiles.push(file);
      if (hasQuote) {
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
          if (startIndex <= prevEndIndex) {
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
          } else {
            results.push(escapeHTML(data.substring(startIndex, match.index).trimStart()) + result);
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
    }
    if (resultFiles.length > 0) {
      resultUl.innerText = '';
      resultFiles.sort(sortFiles).forEach(file => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${file.path}`;
        li.append(a);
        const blockquote = quoteDict[file.path];
        if (blockquote) {
          li.append(blockquote);
        }
        resultUl.append(li);
      });
      updateLinkPath();
    } else {
      resultUl.innerText = config.messages.searchNothing;
    }
    const searchTime = document.querySelector<HTMLSpanElement>('#search-time');
    if (searchTime) {
      searchTime.innerText = ((new Date().getTime() - timeStart) / 1000).toString();
    }
    const searchCount = document.querySelector<HTMLSpanElement>('#search-count');
    if (searchCount) {
      searchCount.innerText = `${resultFiles.length}/${count}`;
    }
  }
}
