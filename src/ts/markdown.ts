import { addBaseUrl, getWrapRegExp, isExternalLink, isHashMode, trimList } from '@/ts/utils';
import MarkdownIt from 'markdown-it';
import Token from 'markdown-it/lib/token';

const footnote = require('markdown-it-footnote');
const deflist = require('markdown-it-deflist');
const taskLists = require('markdown-it-task-lists');
const container = require('markdown-it-container');

const detailsRegExp = /^(open\s+)?(?:\.(.*?)\s+)?(.*)$/;

// noinspection JSUnusedGlobalSymbols
const markdownIt = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
}).use(footnote).use(deflist).use(taskLists).use(container, 'details', {
  validate: (params: string) => {
    return params.trim().match(detailsRegExp);
  },
  render: (tokens: Token[], idx: number) => {
    const token = tokens[idx];
    if (token.nesting === 1) {
      let isOpen = false;
      let classList: string[] = [];
      let summary = '';
      const match = token.info.trim().match(detailsRegExp)!;
      if (match[1]) {
        isOpen = true;
      }
      if (match[2]) {
        classList = trimList(match[2].split('.'));
      }
      if (match[3]) {
        summary = markdownIt.render(match[3]).trim();
      } else {
        isOpen = true;
        if (!classList.includes('empty')) {
          classList.push('empty');
        }
      }
      let attrs = '';
      if (isOpen) {
        attrs += ' open';
      }
      if (classList.length > 0) {
        attrs += ` class="${classList.join(' ')}"`;
      }
      return `<details${attrs}><summary>${summary}</summary>`;
    }
    return '</details>';
  },
});
markdownIt.linkify.tlds([], false);

const getDefaultRenderRule = (name: string) => {
  return markdownIt.renderer.rules[name] || function(tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };
};

const defaultImageRenderRule = getDefaultRenderRule('image');
markdownIt.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  let src = token.attrGet('src')!;
  if (!isExternalLink(src)) {
    src = addBaseUrl(src);
  }
  // put '#' suffix to 'alt' will be better, but no way to get/set it for now.
  const match = src.match(/#(.+)$/);
  if (match) {
    const width = parseInt(match[1]);
    if (isNaN(width)) {
      if (match[1].startsWith('.')) {
        trimList(match[1].split('.')).forEach(cls => {
          token.attrJoin('class', cls);
        });
      } else {
        token.attrSet('style', match[1]);
      }
    } else {
      token.attrSet('width', width.toString());
    }
    src = src.replace(/#.+$/, '');
  }
  token.attrSet('src', src);
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

const defaultHeadingRenderRule = getDefaultRenderRule('heading_close');
markdownIt.renderer.rules.heading_close = (tokens, idx, options, env, self) => {
  const link = document.createElement('a');
  link.classList.add('heading-link');
  link.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -2 16 16"><path fill-rule="evenodd" d="M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z"></path></svg>';
  return link.outerHTML + defaultHeadingRenderRule(tokens, idx, options, env, self);
};

const defaultFootnoteRenderRule = getDefaultRenderRule('footnote_anchor');
markdownIt.renderer.rules.footnote_anchor = (tokens, idx, options, env, self) => {
  return defaultFootnoteRenderRule(tokens, idx, options, env, self).replace(/\shref=".*?"/, '');
};

const defaultLinkRenderRule = getDefaultRenderRule('link_open');
markdownIt.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const textToken = tokens[idx + 1];
  const closeToken = textToken.type === 'text' ? tokens[idx + 2] : textToken;
  const text = textToken.content;
  const href = token.attrGet('href')!;
  if (isExternalLink(href)) {
    token.attrSet('target', '_blank');
    token.attrSet('rel', 'noopener noreferrer');
    closeToken.attrSet('external', 'true');
  } else if (text.endsWith('#') && href.startsWith('/') && href.endsWith('.md')) {
    textToken.content = text.substr(0, text.length - 1);
    token.attrSet('href', `#${href}`);
  } else {
    token.attrSet('href', addBaseUrl(href));
  }
  return defaultLinkRenderRule(tokens, idx, options, env, self);
};

const defaultLinkCloseRenderRule = getDefaultRenderRule('link_close');
markdownIt.renderer.rules.link_close = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const svg = !token.attrGet('external') ? '' : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -2 12 16"><path fill-rule="evenodd" d="M11 10h1v3c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V3c0-.55.45-1 1-1h3v1H1v10h10v-3zM6 2l2.25 2.25L5 7.5 6.5 9l3.25-3.25L12 8V2H6z"></path></svg>';
  return svg + defaultLinkCloseRenderRule(tokens, idx, options, env, self);
};

export function renderMD(path: string, data: string, isCategory: boolean) {
  let article: HTMLElement;
  const isHash = isHashMode();
  const tocRegExp = /^\[toc]$/im;
  const headingRegExp = getWrapRegExp('^(##{1,5})', '$');
  const evalRegExp = getWrapRegExp('\\$', '\\$', 'g');
  const needRenderToc = !!data.match(tocRegExp);
  let firstHeading = '';
  const headingList: string[] = [];
  data = data.split('\n').map(line => {
    if (needRenderToc) {
      const headingMatch = line.match(headingRegExp);
      if (headingMatch) {
        const linkMatch = headingMatch[2].match(/\[(.*?)]\((.*?)\)/);
        if (linkMatch) {
          if (linkMatch[1].endsWith('#') && linkMatch[2].startsWith('/') && linkMatch[2].endsWith('.md')) {
            if (linkMatch[1] === '#') {
              headingMatch[2] = linkMatch[2];
            } else {
              headingMatch[2] = linkMatch[1].substr(0, linkMatch[1].length - 1);
            }
          } else {
            headingMatch[2] = linkMatch[1];
          }
        }
        if (!firstHeading) {
          firstHeading = headingMatch[1];
        }
        let prefix = '-';
        if (headingMatch[1] !== firstHeading) {
          prefix = headingMatch[1].replace(new RegExp(`${firstHeading}$`), '-').replace(/#/g, '  ');
        }
        headingList.push(`${prefix} [${headingMatch[2]}](h${headingMatch[1].length})`);
      }
    }
    // 将被 $ 包围的部分作为 JavaScript 表达式执行
    const lineCopy = line;
    let evalMatch = evalRegExp.exec(lineCopy);
    while (evalMatch) {
      let result: string;
      try {
        if (!article) {
          article = document.createElement('article');
          article.innerHTML = markdownIt.render(data);
        }
        result = eval(`(function(path,article,isHash){${evalMatch[1]}})`)(path, article, isHash);
      } catch (e) {
        result = `${e.name}: ${e.message}`;
      }
      line = line.replace(evalMatch[0], result);
      evalMatch = evalRegExp.exec(lineCopy);
    }
    return line;
  }).join('\n');
  if (needRenderToc) {
    let tocDiv = '<div id="toc">';
    if (headingList.length > 0) {
      if (headingList.length > 7 && !isCategory) {
        let median = Math.ceil(headingList.length / 2);
        while (headingList[median] && !headingList[median].startsWith('-')) {
          median += 1;
        }
        tocDiv += markdownIt.render(headingList.slice(0, median).join('\n')) +
          markdownIt.render(headingList.slice(median, headingList.length).join('\n'));
      } else {
        tocDiv += markdownIt.render(headingList.join('\n'));
      }
      tocDiv = tocDiv.replace(/<ul>/g, `<ul class="toc${isCategory ? ' tags' : ''}">`);
    }
    tocDiv += '</div>';
    data = data.replace(tocRegExp, tocDiv);
  }
  return markdownIt.render(data);
}
