import { getFile, getFiles } from '@/ts/file';
import { renderMD } from '@/ts/markdown';
import {
  buildQueryContent,
  config,
  degradeHeading,
  EFlag,
  escapeHTML,
  getDateString,
  getQueryContent,
  getQueryTypeAndParam,
  getWrapRegExp,
  isExternalLink,
  removeClass,
  scroll,
} from '@/ts/utils';
import Prism from 'prismjs';

export function updateDD() {
  document.querySelectorAll<HTMLParagraphElement>('article p').forEach(p => {
    if (p.innerText.startsWith(': ')) {
      const dl = document.createElement('dl');
      const dd = document.createElement('dd');
      dl.append(dd);
      dd.innerHTML = p.innerHTML.substr(2);
      p.outerHTML = dl.outerHTML;
    }
  });
  document.querySelectorAll<HTMLElement>('article dt').forEach(dt => {
    if (dt.innerText.startsWith(': ')) {
      const dd = document.createElement('dd');
      dd.innerHTML = dt.innerHTML.substr(2);
      dt.outerHTML = dd.outerHTML;
    }
  });
}

export function updateToc() {
  document.querySelectorAll<HTMLLinkElement>('#toc a').forEach(a => {
    const href = a.getAttribute('h');
    let innerText = a.innerText;
    const nextSibling = a.nextElementSibling as HTMLElement;
    if (nextSibling && nextSibling.classList.value === 'count') {
      innerText += nextSibling.innerText;
    }
    a.addEventListener('click', e => {
      e.preventDefault();
      for (const heading of document.querySelectorAll<HTMLHeadingElement>(`article ${href}`)) {
        if (heading.innerText === innerText) {
          scroll(heading.offsetTop - 10);
          break;
        }
      }
    });
  });
  document.querySelectorAll<HTMLHeadingElement>([1, 2, 3, 4, 5, 6].map(n => {
    return `article h${n}`;
  }).join(',')).forEach(heading => {
    heading.querySelector('.heading-link')!.addEventListener('click', () => {
      scroll(heading.offsetTop - 10);
    });
  });
}

export function updateFootnote() {
  document.querySelectorAll<HTMLLinkElement>('article .footnote-backref').forEach((backref, i) => {
    const fnref = document.getElementById(`fnref${i + 1}`);
    if (fnref) {
      fnref.addEventListener('click', e => {
        e.preventDefault();
        scroll(backref.offsetTop - 10);
      });
      backref.addEventListener('click', e => {
        e.preventDefault();
        scroll(fnref.offsetTop - 10);
      });
    }
  });
}

export function updateImagePath() {
  document.querySelectorAll<HTMLImageElement>('article img, #cover img').forEach(img => {
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

export function updateLinkPath(isCategory: boolean, updatedLinks: string[] = []) {
  for (const a of document.querySelectorAll<HTMLLinkElement>('article a[href]')) {
    const text = a.innerText;
    const href = a.getAttribute('href')!;
    if (!isExternalLink(href) && href.endsWith('.md')) {
      if (text === '') {
        if (!href.startsWith('#/')) {
          continue;
        }
        const path = href.substr(1);
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
              const dateString = getDateString(href);
              if (dateString) {
                const date = document.createElement('span');
                date.classList.add('date');
                date.innerText = dateString;
                if (hasQuote) {
                  parent.insertBefore(date, parent.lastElementChild);
                } else {
                  parent.append(date);
                }
              }
              flags.tags.forEach(tag => {
                const code = document.createElement('code');
                const a = document.createElement('a');
                a.innerText = tag;
                a.href = buildQueryContent(`@${EFlag.tags}:${tag}`, true);
                code.append(a);
                if (hasQuote) {
                  parent.insertBefore(code, parent.lastElementChild);
                } else {
                  parent.append(code);
                }
              });
            }
          }
        }).finally(() => {
          a.classList.remove('snippet');
        });
      } else if (text.match(/^\+(?:#.+)?$/)) {
        if (!href.startsWith('/')) {
          continue;
        }
        if (updatedLinks.includes(href)) {
          continue;
        }
        updatedLinks.push(href);
        const params: Dict<string> = {};
        const match = text.match(/#(.+)$/);
        if (match) {
          match[1].split('|').forEach((seg, i) => {
            let param = seg;
            const paramMatch = seg.match(/(.+?)=(.+)/);
            if (paramMatch) {
              param = paramMatch[2];
              params[paramMatch[1]] = param;
            }
            params[i + 1] = param;
          });
        }
        a.classList.add('snippet');
        getFile(href).then(file => {
          let data = degradeHeading(file.data).split('\n').map(line => {
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
            const slips = data.split('--8<--');
            let num = parseInt(clip);
            if (isNaN(num)) {
              num = clip === 'random' ? Math.floor(Math.random() * slips.length) : 0;
            } else if (num < 0) {
              num = 0;
            } else if (num >= slips.length) {
              num = slips.length - 1;
            }
            data = slips[num];
          }
          // 规避递归节点重复问题。
          try {
            a.parentElement!.outerHTML = renderMD(href, data, isCategory);
          } catch (e) {
            return;
          }
          updateDD();
          updateToc();
          updateImagePath();
          updateLinkPath(isCategory, updatedLinks);
          Prism.highlightAll();
        }).catch(error => {
          a.parentElement!.innerHTML = `${error.response.status} ${error.response.statusText}`;
        });
      }
    }
    if (text === '*') {
      if (href.endsWith('js')) {
        if (!document.querySelector(`script[src$='${href}']`)) {
          const script = document.createElement('script');
          script.src = href;
          script.classList.add('custom');
          document.body.appendChild(script);
        }
        a.parentElement!.remove();
      }
    } else if (text === '$' && href.endsWith('css')) {
      if (!document.querySelector(`link[href$='${href}']`)) {
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
}

function updateCategoryListActual(syncData: string, updateData: (data: string) => void) {
  return (files: TMDFileDict) => {
    const paths = Object.keys(files);
    const tags: Dict<string[]> = {};
    const untagged = [];
    for (const path of paths) {
      const flags = files[path].flags;
      if (flags.tags.length === 0) {
        untagged.push(`- [#](${path})`);
        continue;
      }
      flags.tags.forEach(tag => {
        if (tags[tag] === undefined) {
          tags[tag] = [];
        }
        tags[tag].push(`- [#](${path})`);
      });
    }
    const sortedKeys = Object.keys(tags).sort();
    if (untagged.length > 0) {
      sortedKeys.unshift(config.messages.untagged);
      tags[config.messages.untagged] = untagged;
    }
    updateData(syncData.replace(/^\[list]$/im, sortedKeys.map(key => {
      const count = `<span class="count">( ${tags[key].length} )</span>`;
      return `###### ${key}${count}\n\n${tags[key].join('\n')}`;
    }).join('\n\n')));
    setTimeout(() => {
      updateToc();
      updateLinkPath(true);
    }, 0);
  };
}

export function updateCategoryList(syncData: string, updateData: (data: string) => void) {
  getFiles(updateCategoryListActual(syncData, updateData));
}

function updateSearchListActual(queryContent: string, resultUl: HTMLUListElement) {
  resultUl.innerText = config.messages.searching;
  const timeStart = new Date().getTime();
  return (files: TMDFileDict) => {
    const [queryType, queryParam] = getQueryTypeAndParam(queryContent);
    resultUl.innerText = '';
    const paths = Object.keys(files);
    paths.forEach(path => {
      const { data, flags } = files[path];
      let isFind = false;
      let hasQuote = false;
      if (queryType) {
        if (queryParam && queryType === EFlag.tags) {
          for (const tag of flags.tags) {
            if (tag.toLowerCase() === queryParam) {
              isFind = true;
              break;
            }
          }
        }
      } else if (flags.title.toLowerCase().indexOf(queryContent) >= 0) {
        isFind = true;
      } else if (data.toLowerCase().indexOf(queryContent) >= 0) {
        isFind = true;
        hasQuote = true;
      }
      if (isFind) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${path}`;
        li.append(a);
        if (hasQuote) {
          const results = [];
          let prevEndIndex = 0;
          const regexp = new RegExp(queryContent, 'ig');
          let match = regexp.exec(data);
          while (match !== null) {
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
          li.append(blockquote);
        }
        resultUl.append(li);
      }
    });
    updateLinkPath(false);
    const searchTime = document.querySelector<HTMLSpanElement>('span#search-time');
    if (searchTime) {
      searchTime.innerText = ((new Date().getTime() - timeStart) / 1000).toString();
    }
    const searchCount = document.querySelector<HTMLSpanElement>('span#search-count');
    if (searchCount) {
      searchCount.innerText = `${resultUl.childElementCount}/${paths.length}`;
    }
    if (resultUl.childElementCount === 0) {
      resultUl.innerText = config.messages.searchNothing;
    }
  };
}

export function updateSearchList(params: Dict<string>) {
  const queryContent = getQueryContent(params);
  const resultUl = document.querySelector<HTMLUListElement>('ul#result');
  const searchInput = document.querySelector<HTMLInputElement>('input#search-input');
  if (searchInput) {
    searchInput.value = queryContent;
    searchInput.addEventListener('keyup', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        searchInput.value = searchInput.value.trim();
        const param = searchInput.value ? buildQueryContent(searchInput.value) : '';
        const indexOf = location.href.indexOf('?');
        location.href = (indexOf >= 0 ? location.href.substring(0, indexOf) : location.href) + param;
      }
    });
  }
  if (queryContent && resultUl) {
    getFiles(updateSearchListActual(queryContent.toLowerCase(), resultUl));
  }
}
