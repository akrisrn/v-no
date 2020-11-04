import { getFile, getFiles } from '@/ts/file';
import { renderMD } from '@/ts/markdown';
import {
  buildQueryContent,
  cleanBaseUrl,
  config,
  degradeHeading,
  EFlag,
  escapeHTML,
  getDateFromPath,
  getLastedDate,
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
  document.querySelectorAll<HTMLLinkElement>('.toc a').forEach(a => {
    if (a.innerText.startsWith('/') && a.innerText.endsWith('.md')) {
      a.classList.add('snippet');
      getFile(a.innerText).then(file => {
        const flags = file.flags;
        if (flags.title) {
          a.innerText = flags.title;
        }
      }).finally(() => {
        removeClass(a, 'snippet');
      });
    }
    const anchor = a.getAttribute('anchor')!;
    const [headingTag, numStr] = anchor.split('-');
    const num = parseInt(numStr);
    const heading = document.querySelectorAll<HTMLHeadingElement>(`article ${headingTag}`)[num];
    a.addEventListener('click', e => {
      e.preventDefault();
      scroll(heading.offsetTop - 10);
    });
  });
  document.querySelectorAll<HTMLHeadingElement>([2, 3, 4, 5, 6].map(n => {
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

export function updateLinkPath(updatedLinks: string[] = []) {
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
        const path = cleanBaseUrl(href);
        getFile(path).then(file => {
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
            a.parentElement!.outerHTML = renderMD(path, data);
          } catch (e) {
            return;
          }
          updateDD();
          updateToc();
          updateFootnote();
          updateImagePath();
          updateLinkPath(updatedLinks);
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
  return (files: Dict<TMDFile>) => {
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
      return `${'#'.repeat(6)} ${key}${count}\n\n${tags[key].join('\n')}`;
    }).join('\n\n')));
    setTimeout(() => {
      updateDD();
      updateToc();
      updateFootnote();
      updateImagePath();
      updateLinkPath();
      Prism.highlightAll();
    }, 0);
  };
}

export function updateCategoryList(syncData: string, updateData: (data: string) => void) {
  getFiles(updateCategoryListActual(syncData, updateData));
}

function updateSearchListActual(content: string, resultUl: HTMLUListElement) {
  resultUl.innerText = config.messages.searching;
  const timeStart = new Date().getTime();
  return (files: Dict<TMDFile>) => {
    let queryFlag = '';
    let queryParam = '';
    const match = content.match(/^@(\S+?):\s*(.*)$/);
    if (match) {
      queryFlag = match[1];
      queryParam = match[2];
    }
    resultUl.innerText = '';
    const paths = Object.keys(files);
    paths.forEach(path => {
      const { data, flags } = files[path];
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
      if (isFind) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${path}`;
        li.append(a);
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
          li.append(blockquote);
        }
        resultUl.append(li);
      }
    });
    updateLinkPath();
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
  const content = params.content !== undefined ? decodeURIComponent(params.content.trim()) : '';
  const resultUl = document.querySelector<HTMLUListElement>('ul#result');
  const searchInput = document.querySelector<HTMLInputElement>('input#search-input');
  if (searchInput) {
    searchInput.value = content;
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
  if (content && resultUl) {
    getFiles(updateSearchListActual(content.toLowerCase(), resultUl));
  }
}
