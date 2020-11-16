import { checkLinkPath, getFile, getFiles } from '@/ts/file';
import {
  addEventListener,
  buildQueryContent,
  degradeHeading,
  EFlag,
  escapeHTML,
  getDateFromPath,
  getLastedDate,
  getWrapRegExp,
  removeClass,
  scroll,
  sortFiles,
  transForSort,
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

function updateToc() {
  document.querySelectorAll<HTMLLinkElement>('article a[href^="#h"]').forEach(a => {
    const text = a.innerText;
    if (text.startsWith('/')) {
      const path = checkLinkPath(text);
      if (path) {
        a.classList.add('snippet');
        getFile(path).then(file => {
          a.innerText = file.flags.title || path;
        }).finally(() => {
          removeClass(a, 'snippet');
        });
      }
    }
    const anchor = a.getAttribute('href')!.substr(1);
    if (/^h[2-6]-\d+$/.test(anchor)) {
      const [tagName, numStr] = anchor.split('-');
      const num = parseInt(numStr);
      const headings = document.querySelectorAll<HTMLHeadingElement>(`article ${tagName}`);
      if (num < headings.length) {
        const heading = headings[num];
        addEventListener(a, 'click', e => {
          e.preventDefault();
          scroll(heading.offsetTop - 10);
        });
      }
    }
  });
  document.querySelectorAll<HTMLHeadingElement>([2, 3, 4, 5, 6].map(n => {
    return `article h${n}`;
  }).join(',')).forEach(heading => {
    addEventListener(heading.querySelector('.heading-link')!, 'click', () => {
      scroll(heading.offsetTop - 10);
    });
  });
}

function updateFootnote() {
  document.querySelectorAll<HTMLLinkElement>('article .footnote-backref').forEach(backref => {
    const fnref = document.getElementById(backref.getAttribute('href')!.substr(1))!;
    addEventListener(fnref, 'click', e => {
      e.preventDefault();
      scroll(backref.offsetTop - 10);
    });
    addEventListener(backref, 'click', e => {
      e.preventDefault();
      scroll(fnref.offsetTop - 10);
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
  for (const a of document.querySelectorAll<HTMLLinkElement>('article a[href^="#/"]')) {
    if (a.innerText === '') {
      const path = checkLinkPath(a.getAttribute('href')!.substr(1));
      if (!path) {
        continue;
      }
      a.innerText = path;
      a.classList.add('snippet');
      getFile(path).then(file => {
        const flags = file.flags;
        if (flags.title) {
          a.innerText = flags.title;
        }
        const parent = a.parentElement!;
        if (parent.tagName === 'LI') {
          let isPass = true;
          let hasQuote = false;
          if (parent.childElementCount === 1) {
            isPass = false;
          } else if (parent.childElementCount === 2 && parent.lastElementChild!.tagName === 'BLOCKQUOTE') {
            isPass = false;
            hasQuote = true;
          }
          if (!isPass) {
            parent.classList.add('article');
            const bar = document.createElement('div');
            bar.classList.add('bar');
            flags.tags.forEach(tag => {
              const itemTag = document.createElement('code');
              itemTag.classList.add('item-tag');
              const a = document.createElement('a');
              a.innerText = tag;
              a.href = buildQueryContent(`@${EFlag.tags}:${tag}`, true);
              itemTag.append(a);
              bar.append(itemTag);
            });
            const date = getDateFromPath(path) || getLastedDate(flags.updated);
            if (date) {
              const itemDate = document.createElement('code');
              itemDate.classList.add('item-date');
              itemDate.innerText = date;
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
        removeClass(a, 'snippet');
      });
    }
  }
}

function updateCustomScript() {
  document.querySelectorAll<HTMLLinkElement>('article a[href$=".js"]').forEach(a => {
    if (a.innerText === '*') {
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
    if (a.innerText === '$') {
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

export function updateDom() {
  updateDD();
  updateToc();
  updateFootnote();
  updateImagePath();
  updateLinkPath();
  updateCustomScript();
  updateCustomStyle();
  Prism.highlightAll();
}

export async function updateSnippet(data: string, updatedPaths: string[] = []) {
  const dict: Dict<Dict<{ heading: number; params: Dict<string> }>> = {};
  const regexp = /^(#{2,6}\s+)?\[\+(#.+)?]\((\/.*?)\)$/gm;
  let match = regexp.exec(data);
  while (match) {
    const path = checkLinkPath(match[3]);
    if (path && !updatedPaths.includes(path)) {
      let snippetDict = dict[path];
      if (snippetDict === undefined) {
        snippetDict = {};
        dict[path] = snippetDict;
      }
      if (snippetDict[match[0]] === undefined) {
        const heading = match[1] ? match[1].trimEnd().length : 0;
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
    match = regexp.exec(data);
  }
  const paths = Object.keys(dict);
  if (paths.length === 0) {
    return data;
  }
  const files = await Promise.all(paths.map(path => {
    updatedPaths.push(path);
    return getFile(path);
  }));
  for (const file of files) {
    const title = file.flags.title || file.path;
    const snippetDict = dict[file.path];
    for (const match of Object.keys(snippetDict)) {
      const { heading, params } = snippetDict[match];
      let snippetData = heading > 1 ? degradeHeading(`# [${title}](#${file.path})\n\n${file.data}`, heading - 1) : file.data;
      snippetData = snippetData.split('\n').map(line => {
        const regexp = getWrapRegExp('{{', '}}', 'g');
        const lineCopy = line;
        let match = regexp.exec(lineCopy);
        while (match) {
          let defaultValue: string;
          [match[1], defaultValue] = match[1].split('|');
          const param = params[match[1]];
          let result: string;
          if (param !== undefined) {
            result = param;
          } else if (defaultValue !== undefined) {
            result = defaultValue;
          } else {
            result = 'undefined';
          }
          line = line.replace(match[0], result.replace(/\\n/g, '\n'));
          match = regexp.exec(lineCopy);
        }
        return line;
      }).join('\n');
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
          snippetData = slips[num];
        }
      }
      data = data.replaceAll(match, await updateSnippet(snippetData, [...updatedPaths]));
    }
  }
  return data;
}

export async function updateCategoryPage(data: string) {
  const listRegExpStr = '^\\[list]$';
  const listRegExp = new RegExp(listRegExpStr, 'im');
  const listRegExpG = new RegExp(listRegExpStr, 'img');
  if (!listRegExp.test(data)) {
    return data;
  }
  const { files } = await getFiles();
  const taggedDict: Dict<TFile[]> = {};
  const untaggedFiles: TFile[] = [];
  Object.values(files).forEach(file => {
    const flags = file.flags;
    if (flags.tags.length === 0) {
      untaggedFiles.push(file);
    } else {
      flags.tags.forEach(tag => {
        let taggedFiles = taggedDict[tag];
        if (taggedFiles === undefined) {
          taggedFiles = [file];
          taggedDict[tag] = taggedFiles;
        } else {
          taggedFiles.push(file);
        }
      });
    }
  });
  const sortedTags = Object.keys(taggedDict).sort();
  if (untaggedFiles.length > 0) {
    const untagged = config.messages.untagged;
    sortedTags.push(untagged);
    taggedDict[untagged] = untaggedFiles;
  }
  return data.replace(listRegExp, sortedTags.map(tag => {
    const taggedFiles = taggedDict[tag];
    const count = `<span class="count">( ${taggedFiles.length} )</span>`;
    const list = taggedFiles.map(transForSort).sort(sortFiles).map(file => `- [#](${file.path})`).join('\n');
    return `${'#'.repeat(6)} ${tag}${count}\n\n${list}`;
  }).join('\n\n')).replace(listRegExpG, '');
}

export async function updateSearchPage(params: Dict<string>) {
  let content = params.content !== undefined ? decodeURIComponent(params.content.trim()) : '';
  const searchInput = document.querySelector<HTMLInputElement>('input#search-input');
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
  const resultUl = document.querySelector<HTMLUListElement>('ul#result');
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
    for (const file of Object.values(files)) {
      const { data, flags } = file;
      let isFind = false;
      let hasQuote = false;
      if (queryFlag) {
        if (queryParam && queryFlag === EFlag.tags) {
          for (const tag of flags.tags) {
            if (tag.toLowerCase() === queryParam) {
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
          let result = `<span class="hl">${escapeHTML(match[0])}</span>` +
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
      resultFiles.map(transForSort).sort(sortFiles).forEach(file => {
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
    const searchTime = document.querySelector<HTMLSpanElement>('span#search-time');
    if (searchTime) {
      searchTime.innerText = ((new Date().getTime() - timeStart) / 1000).toString();
    }
    const searchCount = document.querySelector<HTMLSpanElement>('span#search-count');
    if (searchCount) {
      searchCount.innerText = `${resultFiles.length}/${Object.keys(files).length}`;
    }
  }
}
