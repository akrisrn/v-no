import { cleanFlags, getFlag, getFlags, getIndexFileData, getListFromData } from '@/ts/data';
import { getDateString } from '@/ts/date';
import { EFlag } from '@/ts/enums';
import { renderMD } from '@/ts/markdown';
import { buildQueryContent, getQueryContent, getQueryTypeAndParam } from '@/ts/query';
import resource from '@/ts/resource';
import { scroll } from '@/ts/scroll';
import { axiosGet, config, escapeHTML, getWrapRegExp, isExternalLink, removeClass, splitFlag } from '@/ts/utils';
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
  document.querySelectorAll<HTMLDetailsElement>('article dt').forEach(dt => {
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
      for (const h of document.querySelectorAll<HTMLHeadingElement>(`article ${href}`)) {
        if (h.innerText === innerText) {
          scroll(h.offsetTop - 10);
          break;
        }
      }
    });
  });
  document.querySelectorAll<HTMLHeadingElement>([1, 2, 3, 4, 5, 6].map(item => {
    return `article h${item}`;
  }).join(',')).forEach(h => {
    h.querySelector('.heading-link')!.addEventListener('click', () => {
      scroll(h.offsetTop - 10);
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
      if (img.naturalWidth === 0) {
        img.onload = () => {
          removeClass(parent, 'hidden');
          loadings!.remove();
        };
      } else {
        removeClass(parent, 'hidden');
        loadings.remove();
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
    let isPass = false;
    if (!isExternalLink(href) && href.endsWith('.md')) {
      if (text === '') {
        isPass = true;
        if (href.startsWith('#/')) {
          a.innerText = href.substr(1);
          a.classList.add('snippet');
          axiosGet(process.env.BASE_URL + href.substr(2)).then(response => {
            const result = getFlags(response.data).result;
            if (result.title) {
              a.innerText = result.title;
            }
            const parent = a.parentElement!;
            if (parent.tagName === 'LI' && parent.childNodes.length === 1) {
              parent.classList.add('article');
              const dateString = getDateString(href);
              if (dateString) {
                const date = document.createElement('span');
                date.classList.add('date');
                date.innerText = dateString;
                parent.append(date);
              }
              result.tags.forEach(tag => {
                const code = document.createElement('code');
                const a = document.createElement('a');
                a.innerText = tag;
                a.href = buildQueryContent(`@${EFlag.tags}:${tag}`, true);
                code.append(a);
                parent.append(code);
              });
            }
          }).finally(() => {
            a.classList.remove('snippet');
          });
        }
      } else if (text.match(/^\+(?:#.+)?$/)) {
        isPass = true;
        if (updatedLinks.includes(href)) {
          continue;
        }
        a.classList.add('snippet');
        const params: { [index: string]: string | undefined } = {};
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
        updatedLinks.push(href);
        axiosGet(href).then(response => {
          let data = cleanFlags(response.data).replace(/^(#{1,5}) /gm, '$1# ').split('\n').map(line => {
            const regexp = getWrapRegExp('{{', '}}', 'g');
            const lineCopy = line;
            let paramMatch = regexp.exec(lineCopy);
            while (paramMatch) {
              let defaultValue;
              [paramMatch[1], defaultValue] = paramMatch[1].split('|');
              const param = params[paramMatch[1]];
              let result: string;
              if (param !== undefined) {
                result = param;
              } else if (defaultValue !== undefined) {
                result = defaultValue;
              } else {
                result = 'undefined';
              }
              line = line.replace(paramMatch[0], result.replace(/\\n/g, '\n'));
              paramMatch = regexp.exec(lineCopy);
            }
            return line;
          }).join('\n');
          if (params.clip !== undefined) {
            const slips = data.split('--8<--');
            let num = parseInt(params.clip, 0);
            if (isNaN(num)) {
              if (params.clip === 'random') {
                num = Math.floor(Math.random() * slips.length);
              } else {
                num = 0;
              }
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
    if (!isPass) {
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
}

export function updateCategoryListActual(syncData: string, updateData: (data: string) => void, isCategory: boolean) {
  return (pageData: string) => {
    const list = getListFromData(pageData);
    if (list.length > 0) {
      const tagDict: { [index: string]: string[] | undefined } = {};
      const untagged = [];
      for (const item of list) {
        if (item.tags.length === 0) {
          untagged.push(`- [${item.title}](${item.href})`);
          continue;
        }
        const tags = item.tags.map(tag => {
          return '`' + tag + '`';
        }).join(' ');
        item.tags.forEach(tag => {
          if (tagDict[tag] === undefined) {
            tagDict[tag] = [];
          }
          tagDict[tag]!.push(`- [${item.title}](${item.href}) ${tags}`);
        });
      }
      const sortedKeys = Object.keys(tagDict).sort();
      if (untagged.length > 0) {
        sortedKeys.unshift(config.untagged);
        tagDict[config.untagged] = untagged;
      }
      updateData(syncData.replace(/^\[list]$/im, sortedKeys.map(key => {
        const count = `<span class="count">（${tagDict[key]!.length}）</span>`;
        return `###### ${key}${count}\n\n${tagDict[key]!.join('\n')}`;
      }).join('\n\n')));
      setTimeout(() => {
        updateToc();
        updateLinkPath(isCategory);
      }, 0);
    } else {
      updateData(syncData.replace(/^\[list]$/im, ''));
      setTimeout(() => {
        updateLinkPath(isCategory);
      }, 0);
    }
  };
}

export function updateCategoryList(syncData: string, updateData: (data: string) => void, isCategory: boolean) {
  getIndexFileData(updateCategoryListActual(syncData, updateData, isCategory));
}

export function updateSearchListActual(params: { [index: string]: string | undefined }, isCategory: boolean) {
  return (pageData: string) => {
    const queryContent = getQueryContent(params).toLowerCase();
    const [queryType, queryParam] = getQueryTypeAndParam(queryContent);
    const resultUl = document.querySelector<HTMLUListElement>('ul#result')!;
    const list = getListFromData(pageData, true);
    if (list.length > 0) {
      const header = document.querySelector('header')!;
      let count = 0;
      const timeStart = new Date().getTime();
      list.forEach(item => {
        axiosGet(item.href).then(response => {
          const data = response.data.trim();
          let isFind: boolean;
          if (queryType === EFlag.tags) {
            const dataTags = splitFlag(getFlag(data, EFlag.tags).toLowerCase());
            isFind = dataTags.includes(queryParam!);
          } else {
            isFind = data.toLowerCase().indexOf(queryContent) >= 0;
          }
          if (isFind) {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = item.href;
            a.innerText = item.title;
            li.append(a);
            item.tags.forEach(tag => {
              const code = document.createElement('code');
              code.innerText = tag;
              li.append(' ');
              li.append(code);
            });
            if (!queryType) {
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
            updateLinkPath(isCategory);
          }
        }).finally(() => {
          if (++count === list.length) {
            header.innerText = resource.searchDone;
            const searchTime = document.querySelector<HTMLSpanElement>('span#search-time');
            if (searchTime) {
              searchTime.innerText = ((new Date().getTime() - timeStart) / 1000).toString();
            }
            const searchCount = document.querySelector<HTMLSpanElement>('span#search-count');
            if (searchCount) {
              searchCount.innerText = `${resultUl.childElementCount}/${list.length}`;
            }
          } else {
            header.innerText = `${resource.searching}(${count}/${list.length})`;
          }
        });
      });
    }
    if (resultUl.childElementCount === 0) {
      resultUl.innerText = resource.searchNothing;
    }
  };
}

export function updateSearchList(params: { [index: string]: string | undefined }, isCategory: boolean) {
  const queryContent = getQueryContent(params);
  const resultUl = document.querySelector('ul#result');
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
    getIndexFileData(updateSearchListActual(params, isCategory));
  }
}
