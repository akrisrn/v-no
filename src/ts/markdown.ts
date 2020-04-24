import resource from '@/ts/resource';
import { getWrapRegExp, isHashMode } from '@/ts/utils';
import { AxiosError } from 'axios';
import MarkdownIt from 'markdown-it';
import Token from 'markdown-it/lib/token';
import { getDateString } from '@/ts/date';

// tslint:disable no-var-requires
const footnote = require('markdown-it-footnote');
const deflist = require('markdown-it-deflist');
const taskLists = require('markdown-it-task-lists');
const container = require('markdown-it-container');
// tslint:enable no-var-requires

// noinspection JSUnusedGlobalSymbols
const markdownIt = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
}).use(footnote).use(deflist).use(taskLists).use(container, 'details', {
  validate: (params: string) => {
    return params.trim().match(/^(open\s+)?(?:\.(.*?)\s+)?(.*)$/);
  },
  render: (tokens: Token[], idx: number) => {
    const token = tokens[idx];
    if (token.nesting === 1) {
      const match = token.info.trim().match(/^(open\s+)?(?:\.(.*?)\s+)?(.*)$/)!;
      let open = '';
      if (match[1]) {
        open = ' open';
      }
      let classAttr = '';
      if (match[2]) {
        classAttr = ` class="${match[2].split('.').join(' ')}"`;
      }
      const summary = markdownIt.render(match[3]).trim().replace(/^<p>(.*)<\/p>$/, '$1');
      return `<details${classAttr}${open}><summary>${summary}</summary>`;
    }
    return '</details>';
  },
});
markdownIt.linkify.tlds([], false);

const getDefaultRenderRule = (name: string) => {
  // tslint:disable-next-line:only-arrow-functions
  return markdownIt.renderer.rules[name] || function(tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };
};

const defaultImageRenderRule = getDefaultRenderRule('image');
markdownIt.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  let src = token.attrGet('src')!;
  let alterExt = 'jpg';
  const match = src.match(/#(.+)$/);
  if (match) {
    const width = parseInt(match[1], 0);
    if (isNaN(width)) {
      if (match[1].startsWith('.')) {
        match[1].substr(1).split('.').forEach((cls) => {
          cls = cls.trim();
          if (cls.startsWith('$')) {
            alterExt = cls.substr(1);
          } else {
            token.attrJoin('class', cls);
          }
        });
      } else {
        token.attrSet('style', match[1]);
      }
    } else {
      token.attrSet('width', width.toString());
    }
    src = src.replace(/#.+$/, '');
    token.attrSet('src', src);
  }
  if (src.endsWith('.webp')) {
    const picture = document.createElement('picture');
    const source = document.createElement('source');
    source.srcset = src;
    source.type = 'image/webp';
    token.attrSet('src', src.substr(0, src.length - 4) + alterExt);
    picture.innerHTML = defaultImageRenderRule(tokens, idx, options, env, self);
    picture.insertBefore(source, picture.children[0]);
    return picture.outerHTML;
  }
  return defaultImageRenderRule(tokens, idx, options, env, self);
};

const defaultFenceRenderRule = getDefaultRenderRule('fence');
markdownIt.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  if (token.tag === 'code') {
    token.attrJoin('class', 'line-numbers');
  }
  return defaultFenceRenderRule(tokens, idx, options, env, self);
};

const defaultTheadRenderRule = getDefaultRenderRule('thead_open');
markdownIt.renderer.rules.thead_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  let isEmpty = true;
  let i = idx + 2;
  do {
    const thToken = tokens[i];
    if (thToken.type === 'inline' && thToken.content) {
      isEmpty = false;
      break;
    }
    i += 1;
  } while (tokens[i].type !== 'tr_close');
  if (isEmpty) {
    token.attrJoin('class', 'hidden');
  }
  return defaultTheadRenderRule(tokens, idx, options, env, self);
};

const defaultHtmlBlockRenderRule = getDefaultRenderRule('html_block');
markdownIt.renderer.rules.html_block = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  if (token.content.startsWith('<div id="toc">')) {
    const div = document.createElement('div');
    div.innerHTML = token.content;
    const uls = div.querySelectorAll<HTMLUListElement>('#toc > ul');
    if (uls.length === 2) {
      uls[0].classList.add('ul-a');
      uls[1].classList.add('ul-b');
    }
    div.querySelectorAll<HTMLLinkElement>('#toc a').forEach((a) => {
      a.setAttribute('h', a.getAttribute('href')!);
      a.removeAttribute('href');
    });
    div.querySelectorAll<HTMLLinkElement>('#toc > ul.tags > li > a').forEach((a) => {
      const count = a.querySelector<HTMLSpanElement>('span.count');
      if (count) {
        a.removeChild(count);
        a.parentElement!.append(count);
        const fontSize = Math.log10(parseInt(count.innerText.substr(1), 0)) + 1;
        if (fontSize > 1) {
          a.style.fontSize = fontSize + 'em';
        }
      }
    });
    token.content = div.innerHTML;
  }
  return defaultHtmlBlockRenderRule(tokens, idx, options, env, self);
};

const defaultHeadingRenderRule = getDefaultRenderRule('heading_close');
markdownIt.renderer.rules.heading_close = (tokens, idx, options, env, self) => {
  const link = document.createElement('a');
  link.classList.add('heading-link');
  return link.outerHTML + defaultHeadingRenderRule(tokens, idx, options, env, self);
};

const defaultFootnoteRenderRule = getDefaultRenderRule('footnote_anchor');
markdownIt.renderer.rules.footnote_anchor = (tokens, idx, options, env, self) => {
  return defaultFootnoteRenderRule(tokens, idx, options, env, self).replace(/\shref=".*?"/, '');
};

const defaultLinkRenderRule = getDefaultRenderRule('link_open');
markdownIt.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const href = token.attrGet('href')!;
  const pathname = new URL(href, document.location.href).pathname;
  if (href.endsWith('.md#')) {
    token.attrSet('href', `#${pathname}`);
  } else if (href.endsWith('.md#/')) {
    token.attrSet('href', `${pathname.substr(0, href.length - 2)}html`);
  } else if (href.startsWith('http://') || href.startsWith('https://')) {
    token.attrSet('target', '_blank');
    token.attrSet('rel', 'noopener noreferrer');
  }
  return defaultLinkRenderRule(tokens, idx, options, env, self);
};

const defaultListRenderRule = getDefaultRenderRule('list_item_open');
markdownIt.renderer.rules.list_item_open = (tokens, idx, options, env, self) => {
  const inline = tokens[idx + 2];
  if (inline.type === 'inline' && inline.children) {
    let link;
    for (const child of inline.children) {
      if (child.type === 'link_open') {
        if (link) {
          return defaultListRenderRule(tokens, idx, options, env, self);
        }
        link = child;
      }
    }
    if (!link) {
      return defaultListRenderRule(tokens, idx, options, env, self);
    }
    const href = link.attrGet('href')!;
    const dateString = getDateString(href);
    if (dateString) {
      const date = document.createElement('span');
      date.classList.add('date');
      date.innerText = dateString;
      return defaultListRenderRule(tokens, idx, options, env, self) + date.outerHTML;
    }
  }
  return defaultListRenderRule(tokens, idx, options, env, self);
};

export function renderMD(data: string, isCategory: boolean, noToc = false) {
  let article: HTMLElement;
  const toc: string[] = [];
  let firstHeader = '';
  data = data.split('\n').map((line) => {
    if (!noToc) {
      const tocMatch = line.match(getWrapRegExp('^(##+)', '$'));
      if (tocMatch) {
        if (!firstHeader) {
          firstHeader = tocMatch[1];
        }
        let prefix = '-';
        if (tocMatch[1] !== firstHeader) {
          prefix = tocMatch[1].replace(new RegExp(`${firstHeader}$`), '-').replace(/#/g, '  ');
        }
        toc.push(`${prefix} [${tocMatch[2]}](h${tocMatch[1].length})`);
      }
    }
    // 将被 $ 包围的部分作为 JavaScript 表达式执行
    const jsExpMatches = line.match(getWrapRegExp('\\$', '\\$', 'g'));
    if (jsExpMatches) {
      jsExpMatches.forEach((jsExpMatch) => {
        const m = jsExpMatch.match(getWrapRegExp('\\$', '\\$'))!;
        let result: string;
        try {
          if (!article) {
            article = document.createElement('article');
            article.innerHTML = markdownIt.render(data);
          }
          // tslint:disable-next-line:no-eval
          result = eval(`(function(article,isHashMode){${m[1]}})`)(article, isHashMode());
        } catch (e) {
          result = `${e.name}: ${e.message}`;
        }
        line = line.replace(m[0], result);
      });
      return line;
    }
    return line;
  }).join('\n');
  if (!noToc) {
    let tocHtml = '<div id="toc">';
    if (toc.length > 7 && !isCategory) {
      let mid = Math.ceil(toc.length / 2);
      while (toc[mid] && !toc[mid].startsWith('-')) {
        mid += 1;
      }
      tocHtml += markdownIt.render(toc.slice(0, mid).join('\n')) +
        markdownIt.render(toc.slice(mid, toc.length).join('\n'));
    } else {
      tocHtml += markdownIt.render(toc.join('\n'));
    }
    tocHtml += '</div>';
    tocHtml = tocHtml.replace(/<ul>/g, `<ul class="toc${isCategory ? ' tags' : ''}">`);
    data = data.replace(/\[toc]/i, tocHtml);
  }
  return markdownIt.render(data);
}

export function error2markdown(error: AxiosError) {
  return `# ${error.response!.status} ${error.response!.statusText}\n${resource.pageError}`;
}
