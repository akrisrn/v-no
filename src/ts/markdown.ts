import { addBaseUrl, EIcon, getIcon, getWrapRegExp, isExternalLink, trimList } from '@/ts/utils';
import { config } from '@/ts/config';
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
      if (match[2]) {
        classList = trimList(match[2].split('.'));
      }
      if (classList.includes('empty')) {
        isOpen = true;
      } else if (match[3]) {
        summary = markdownIt.render(match[3]);
        if (match[1]) {
          isOpen = true;
        }
      } else {
        isOpen = true;
        classList.push('empty');
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

markdownIt.renderer.rules.footnote_block_open = () => {
  return `<section class="footnotes"><span>${config.messages.footnotes}</span><ol class="footnotes-list">`;
};

const getDefaultRenderRule = (name: string) => {
  return markdownIt.renderer.rules[name] || function(tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };
};

const defaultImageRenderRule = getDefaultRenderRule('image');
markdownIt.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  let src = token.attrGet('src')!;
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
  if (!isExternalLink(src)) {
    src = addBaseUrl(src);
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
  const span = document.createElement('span');
  span.classList.add('heading-link');
  span.innerHTML = getIcon(EIcon.link, 14);
  return span.outerHTML + defaultHeadingRenderRule(tokens, idx, options, env, self);
};

const defaultLinkRenderRule = getDefaultRenderRule('link_open');
markdownIt.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const textToken = tokens[idx + 1];
  const closeToken = textToken.type === 'text' ? tokens[idx + 2] : textToken;
  const text = textToken.content;
  let href = token.attrGet('href')!;
  if (isExternalLink(href)) {
    token.attrSet('target', '_blank');
    token.attrSet('rel', 'noopener noreferrer');
    closeToken.attrSet('external', 'true');
  } else {
    if (href.startsWith('/')) {
      if (href.endsWith('.md') || href.endsWith('/')) {
        if (text.endsWith('#')) {
          textToken.content = text.substr(0, text.length - 1);
          href = `#${href}`;
        } else if (/^\+(#.+)?$/.test(text)) {
          token.attrJoin('class', 'snippet');
          href = addBaseUrl(href);
        } else {
          href = addBaseUrl(href);
        }
      } else {
        href = addBaseUrl(href);
      }
      token.attrSet('href', href);
    }
    if (!href.startsWith('#') && href !== addBaseUrl('/')) {
      token.attrSet('target', '_blank');
    }
  }
  return defaultLinkRenderRule(tokens, idx, options, env, self);
};

const defaultLinkCloseRenderRule = getDefaultRenderRule('link_close');
markdownIt.renderer.rules.link_close = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const icon = token.attrGet('external') ? getIcon(EIcon.external, 14) : '';
  return icon + defaultLinkCloseRenderRule(tokens, idx, options, env, self);
};

function evalFunction(evalStr: string, params: Dict<any>) {
  return eval(`(function(${Object.keys(params).join()}){${evalStr}})`)(...Object.values(params));
}

export function renderMD(path: string, data: string) {
  const tocRegExpStr = '^\\[toc]$';
  const tocRegExp = new RegExp(tocRegExpStr, 'im');
  const tocRegExpG = new RegExp(tocRegExpStr, 'img');
  const needRenderToc = tocRegExp.test(data);
  const headingRegExp = getWrapRegExp('^(##{1,5})\\s', '$');
  const evalRegExp = getWrapRegExp('\\$', '\\$', 'g', true);
  let firstHeading = '';
  const headingCount: Dict<number> = {};
  const headingList: string[] = [];
  data = data.split('\n').map(line => {
    if (needRenderToc) {
      const headingMatch = line.match(headingRegExp);
      if (headingMatch) {
        const headingLevel = headingMatch[1];
        let headingText = headingMatch[2];
        const linkMatch = headingText.match(/\[(.*?)]\((.*?)\)/);
        if (linkMatch) {
          const text = linkMatch[1];
          const href = linkMatch[2];
          if (text.endsWith('#') && href.startsWith('/') && (href.endsWith('.md') || href.endsWith('/'))) {
            if (text === '#') {
              headingText = href;
            } else {
              headingText = text.substr(0, text.length - 1);
            }
          } else {
            headingText = text;
          }
        }
        if (!firstHeading) {
          firstHeading = headingLevel;
        }
        let prefix = '-';
        if (headingLevel !== firstHeading) {
          prefix = headingLevel.replace(new RegExp(`${firstHeading}$`), '-').replace(/#/g, '  ');
        }
        const headingTag = `h${headingLevel.length}`;
        if (headingCount[headingTag] === undefined) {
          headingCount[headingTag] = 0;
        } else {
          headingCount[headingTag]++;
        }
        headingList.push(`${prefix} [${headingText}](#${headingTag}-${headingCount[headingTag]})`);
      }
    }
    // 将被 $ 包围的部分作为 JavaScript 表达式执行
    const lineCopy = line;
    let evalMatch = evalRegExp.exec(lineCopy);
    while (evalMatch) {
      const evalStr = evalMatch[1];
      let result: string;
      try {
        result = evalFunction(evalStr, { path, data });
      } catch (e) {
        result = `::: open .danger.readonly **${e.name}: ${e.message}**\n\`\`\`js\n${evalStr}\n\`\`\`\n:::`;
      }
      line = line.replace(evalMatch[0], result);
      evalMatch = evalRegExp.exec(lineCopy);
    }
    return line;
  }).join('\n');
  if (needRenderToc) {
    const headingLength = headingList.length;
    if (headingLength > 0) {
      const tocDiv = document.createElement('div');
      tocDiv.classList.add('toc');
      let left = headingLength;
      let right = headingLength;
      if (headingLength > 11) {
        left = Math.ceil(headingLength / 3);
        while (headingList[left] && !headingList[left].startsWith('-')) {
          left += 1;
        }
        if (left < headingLength) {
          let count = 0;
          for (let i = 0; i < left; i++) {
            if (headingList[i].startsWith('-')) {
              count++;
            }
          }
          right = left + count;
          while (headingList[right] && !headingList[right].startsWith('-')) {
            right += 1;
          }
        }
      } else if (headingLength > 7) {
        left = Math.ceil(headingLength / 2);
        while (headingList[left] && !headingList[left].startsWith('-')) {
          left += 1;
        }
      }
      if (left >= headingLength) {
        tocDiv.innerHTML = markdownIt.render(headingList.join('\n'));
      } else if (right >= headingLength) {
        tocDiv.innerHTML = markdownIt.render(headingList.slice(0, left).join('\n')) +
          markdownIt.render(headingList.slice(left, headingLength).join('\n'));
        tocDiv.firstElementChild!.classList.add('ul-a');
        tocDiv.lastElementChild!.classList.add('ul-b');
      } else {
        tocDiv.innerHTML = markdownIt.render(headingList.slice(0, left).join('\n')) +
          markdownIt.render(headingList.slice(left, right).join('\n')) +
          markdownIt.render(headingList.slice(right, headingLength).join('\n'));
        for (let i = 0; i < tocDiv.children.length; i++) {
          tocDiv.children[i].classList.add(`ul-${i + 1}`);
        }
      }
      tocDiv.querySelectorAll('a').forEach(a => {
        const count = a.querySelector<HTMLSpanElement>('.count');
        if (count) {
          a.parentElement!.insertBefore(count, a.nextElementSibling);
        }
      });
      data = data.replace(tocRegExp, tocDiv.outerHTML);
    }
    data = data.replace(tocRegExpG, '');
  }
  return markdownIt.render(data);
}
