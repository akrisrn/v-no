import { sortFiles } from '@/ts/compare';
import { config } from '@/ts/config';
import { EFlag, EIcon } from '@/ts/enums';
import { getFile, getFiles } from '@/ts/file';
import {
  buildHash,
  buildQueryContent,
  changeHash,
  checkLinkPath,
  getSearchTagLinks,
  parseHash,
  shortenPath,
} from '@/ts/path';
import { trimList } from '@/ts/utils';
import Prism from 'prismjs';

let eventListenerDict: Dict<{ elements: Element[]; listeners: EventListenerOrEventListenerObject[] }> = {};

export function cleanEventListenerDict() {
  eventListenerDict = {};
}

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

export function removeClass(element: Element, cls?: string) {
  if (cls) {
    element.classList.remove(cls);
  }
  if (element.classList.length === 0) {
    element.removeAttribute('class');
  }
}

export function scroll(height: number, isSmooth = true) {
  document.documentElement.style.scrollBehavior = !isSmooth ? 'auto' : 'smooth';
  setTimeout(() => {
    scrollTo(0, height);
  }, 0);
}

// noinspection JSSuspiciousNameCombination
export function getIcon(type: EIcon, width = 16, height = width) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${width}" height="${height}"><path fill-rule="evenodd" d="${type}"></path></svg>`;
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
    if (!parent.classList.contains('hidden') && img.naturalWidth === 0) {
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
    if (parent.tagName === 'DT') {
      parent.parentElement!.classList.add('center');
    } else {
      parent.classList.add('center');
    }
  });
}

function createBar(flags: IFlags) {
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
  return bar.childElementCount > 0 ? bar : null;
}

let waitingList: { heading: HTMLHeadingElement; a: HTMLAnchorElement }[] = [];

function getHeadingText(heading: HTMLHeadingElement) {
  return heading.innerText.substr(2).trim() || `[${null}]`;
}

export function updateLinkPath() {
  const dict: Dict<HTMLAnchorElement[]> = {};
  for (const a of document.querySelectorAll<HTMLAnchorElement>('a[href^="#/"]')) {
    if (a.innerText !== '') {
      continue;
    }
    a.innerText = '#';
    const path = checkLinkPath(a.getAttribute('href')!.substr(1));
    if (!path) {
      continue;
    }
    a.classList.add('rendering');
    let links = dict[path];
    if (links === undefined) {
      links = [a];
      dict[path] = links;
    } else {
      links.push(a);
    }
  }
  const paths = Object.keys(dict);
  if (paths.length > 0) {
    Promise.all(paths.map(path => getFile(path))).then(files => {
      files.forEach(file => {
        const isError = file.isError;
        const flags = file.flags;
        dict[file.path].forEach(a => {
          if (isError) {
            a.classList.add('error');
          }
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
              if (!isError) {
                const bar = createBar(flags);
                if (bar) {
                  if (hasQuote) {
                    parent.insertBefore(bar, parent.lastElementChild);
                  } else {
                    parent.append(bar);
                  }
                }
              }
            }
          }
          removeClass(a, 'rendering');
        });
      });
      waitingList.forEach(({ heading, a }) => {
        a.innerText = getHeadingText(heading);
      });
    });
  }
}

function updateCustomScript() {
  document.querySelectorAll<HTMLAnchorElement>('article a[href$=".js"]').forEach(a => {
    if (a.innerText === '$') {
      const href = a.getAttribute('href')!;
      if (!document.querySelector(`script[src="${href}"]`)) {
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
  document.querySelectorAll<HTMLAnchorElement>('article a[href$=".css"]').forEach(a => {
    if (a.innerText === '*') {
      const href = a.getAttribute('href')!;
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
  if (heading.children.length > 0) {
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
      if (cursor) {
        if (level > cursor.level) {
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
      }
      cursor = heading;
    } else if (cursor) {
      cursor.children.push(child);
    }
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
    if (!heading.parent) {
      headingList.push(heading);
    }
  });
  if (tocDiv) {
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
    headingList.forEach(heading => {
      const list = transHeading(heading);
      count += list.count;
      if (count > maxLength) {
        count = list.count;
        if (tocDiv.childElementCount < 3) {
          currentUl = document.createElement('ul');
          tocDiv.append(currentUl);
        }
      }
      currentUl.append(list.li);
    });
    if (tocDiv.childElementCount === 3) {
      for (let i = 0; i < tocDiv.children.length; i++) {
        tocDiv.children[i].classList.add(`ul-${i + 1}`);
      }
    } else if (tocDiv.childElementCount === 2) {
      tocDiv.firstElementChild!.classList.add('ul-a');
      tocDiv.lastElementChild!.classList.add('ul-b');
    }
  }
}

function updateAnchor() {
  document.querySelectorAll<HTMLAnchorElement>('article a[href^="#h"]').forEach(a => {
    const anchor = a.getAttribute('href')!.substr(1);
    if (/^h[2-6]-\d+$/.test(anchor)) {
      const heading = document.querySelector<HTMLHeadingElement>(`article > *[id="${anchor}"]`);
      addEventListener(a, 'click', e => {
        e.preventDefault();
        if (heading && heading.offsetTop > 0) {
          scroll(heading.offsetTop - 6);
          changeHash(anchor);
        }
      });
    }
  });
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
  waitingList = [];
  updateDD();
  updateImagePath();
  updateLinkPath();
  updateCustomScript();
  updateCustomStyle();
  updateHeading();
  updateAnchor();
  updateHighlight();
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
      if (e.key === 'Enter') {
        const searchValue = searchInput.value.trim();
        searchInput.value = searchValue;
        const query = searchValue ? buildQueryContent(searchValue) : '';
        const { path, anchor } = parseHash(location.hash, true);
        location.hash = buildHash({ path, anchor, query });
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
        li.classList.add('article');
        const a = document.createElement('a');
        a.href = `#${shortenPath(file.path)}`;
        a.innerText = file.flags.title;
        li.append(a);
        const bar = createBar(file.flags);
        if (bar) {
          li.append(bar);
        }
        const blockquote = quoteDict[file.path];
        if (blockquote) {
          li.append(blockquote);
        }
        resultUl.append(li);
      });
    } else {
      resultUl.innerText = config.messages.searchNothing;
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
}
