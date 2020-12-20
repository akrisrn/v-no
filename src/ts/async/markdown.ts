import { config } from '@/ts/config';
import { getIcon } from '@/ts/dom';
import { EIcon } from '@/ts/enums';
import { addBaseUrl, homePath, shortenPath } from '@/ts/path';
import { chopStr, getAnchorRegExp, snippetMark } from '@/ts/utils';
import { replaceByRegExp } from '@/ts/async/updata';
import { isExternalLink, trimList } from '@/ts/async/utils';
import MarkdownIt from 'markdown-it';
import Token from 'markdown-it/lib/token';

const footnote = require('markdown-it-footnote');
const deflist = require('markdown-it-deflist');
const taskLists = require('markdown-it-task-lists');
const container = require('markdown-it-container');

let isRenderingSummary = false;
const detailsRegExp = /^\s+(open\s+)?(?:\.(.*?)\s+)?(.*)$/;

const quotes = config.smartQuotes;
// noinspection JSUnusedGlobalSymbols
const markdownIt = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  typographer: true,
  quotes,
}).use(footnote).use(deflist).use(taskLists).use(container, 'details', {
  validate: (params: string) => params.match(detailsRegExp) || params === '',
  render: (tokens: Token[], idx: number) => {
    const token = tokens[idx];
    if (token.nesting !== 1) {
      return '</details>';
    }
    let isOpen = true;
    let classList: string[] = [];
    let summary = '';
    const match = token.info.match(detailsRegExp);
    if (!match) {
      classList.push('empty');
    } else {
      const openMatch = match[1];
      const classMatch = match[2];
      const summaryMatch = match[3];
      if (classMatch) {
        classList = trimList(classMatch.split('.'));
      }
      if (!classList.includes('empty')) {
        if (!openMatch) {
          isOpen = false;
        }
        if (summaryMatch !== '\\') {
          isRenderingSummary = true;
          summary = markdownIt.render(summaryMatch);
          isRenderingSummary = false;
        }
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
  },
});
markdownIt.linkify.tlds([], false);

if (!quotes || quotes.length < 4) {
  markdownIt.disable('smartquotes');
}

markdownIt.renderer.rules.footnote_block_open = () => {
  return `<section class="footnotes"><p>${config.messages.footnotes}</p><ol class="footnotes-list">`;
};

const getDefaultRenderRule = (name: string) => {
  return markdownIt.renderer.rules[name] || function(tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };
};

const replacer = config.replacer;
const replacerList: [RegExp, string][] = [];
replacer?.forEach(item => {
  try {
    replacerList.push([new RegExp(item[0], 'g'), item[1]]);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  }
});

const defaultTextRenderRule = getDefaultRenderRule('text');
markdownIt.renderer.rules.text = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  let content = token.content;
  content = replaceByRegExp(/(\\u[0-9a-f]{4}|u\+[0-9a-f]{4,6})/ig, content, match => {
    let code = parseInt(match.substr(2), 16);
    if (match.startsWith('\\') || code < 0x10000) {
      return String.fromCharCode(code);
    }
    code -= 0x10000;
    return String.fromCharCode(0xD800 + (code >> 10), 0xDC00 + (code & 0x3FF));
  });
  if (replacerList.length === 0) {
    token.content = content;
    return defaultTextRenderRule(tokens, idx, options, env, self);
  }
  replacerList.forEach(item => {
    content = content.replace(item[0], item[1]);
  });
  token.content = content;
  return defaultTextRenderRule(tokens, idx, options, env, self);
};

const defaultFenceRenderRule = getDefaultRenderRule('fence');
markdownIt.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  if (token.tag !== 'code') {
    return defaultFenceRenderRule(tokens, idx, options, env, self);
  }
  let dataLine = '';
  let lang = token.info.trim();
  const { key, value } = chopStr(lang, '|');
  if (value !== null) {
    lang = key;
    dataLine = value;
  }
  token.info = lang;
  if (lang) {
    token.attrJoin('class', 'line-numbers');
    if (dataLine) {
      token.attrSet('data-line', dataLine);
    }
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

let headingCount: Dict<number> = {};

const defaultHeadingRenderRule = getDefaultRenderRule('heading_open');
markdownIt.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  if (isRenderingSummary || token.level !== 0) {
    return defaultHeadingRenderRule(tokens, idx, options, env, self);
  }
  const nextToken = tokens[idx + 1];
  const match = nextToken.content.match(/^\+\s+/);
  if (match) {
    const textToken = nextToken.children![0];
    textToken.content = textToken.content.substr(match[0].length);
    token.attrJoin('class', 'fold');
  }
  const tag = token.tag;
  let count = headingCount[tag];
  count = count === undefined ? 1 : (count + 1);
  headingCount[tag] = count;
  token.attrSet('id', `${tag}-${count}`);
  const span = document.createElement('span');
  span.classList.add('heading-tag');
  span.innerText = 'H';
  const small = document.createElement('small');
  small.innerText = tag.substr(1);
  span.append(small);
  return defaultHeadingRenderRule(tokens, idx, options, env, self) + span.outerHTML;
};

const defaultHeadingCloseRenderRule = getDefaultRenderRule('heading_close');
markdownIt.renderer.rules.heading_close = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  if (isRenderingSummary || token.level !== 0) {
    return defaultHeadingCloseRenderRule(tokens, idx, options, env, self);
  }
  const span = document.createElement('span');
  span.classList.add('heading-link');
  span.innerHTML = getIcon(EIcon.link, 14);
  return span.outerHTML + defaultHeadingCloseRenderRule(tokens, idx, options, env, self);
};

const defaultImageRenderRule = getDefaultRenderRule('image');
markdownIt.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const src = token.attrGet('src')!;
  if (!isExternalLink(src)) {
    token.attrSet('src', addBaseUrl(src));
  }
  let title = token.attrGet('title');
  if (!title) {
    return defaultImageRenderRule(tokens, idx, options, env, self);
  }
  const match = title.match(/#(.+)$/);
  if (!match) {
    return defaultImageRenderRule(tokens, idx, options, env, self);
  }
  const width = parseInt(match[1]);
  if (!isNaN(width)) {
    token.attrSet('width', `${width}`);
  } else if (match[1].startsWith('.')) {
    trimList(match[1].split('.')).forEach(cls => {
      token.attrJoin('class', cls);
    });
  } else {
    token.attrSet('style', match[1]);
  }
  title = title.replace(/#.+$/, '');
  if (title) {
    token.attrSet('title', title);
  } else {
    token.attrs!.splice(token.attrIndex('title'), 1);
  }
  return defaultImageRenderRule(tokens, idx, options, env, self);
};

let isExternal = false;

const defaultLinkRenderRule = getDefaultRenderRule('link_open');
markdownIt.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  let href = token.attrGet('href')!;
  if (isExternalLink(href)) {
    token.attrSet('target', '_blank');
    token.attrSet('rel', 'noopener noreferrer');
    isExternal = true;
    return defaultLinkRenderRule(tokens, idx, options, env, self);
  }
  isExternal = false;
  if (href.startsWith('/') && (href.endsWith('.md') || href.endsWith('/'))) {
    let title = token.attrGet('title');
    if (title) {
      const regexp = new RegExp(`#(${getAnchorRegExp(false).source})?$`);
      const match = title.match(regexp);
      if (match) {
        const anchor = match[1];
        href = `#${shortenPath(href)}${anchor ? `#${anchor}` : ''}`;
        title = title.substr(0, title.length - match[0].length);
        if (title) {
          token.attrSet('title', title);
        } else {
          token.attrs!.splice(token.attrIndex('title'), 1);
        }
      }
    }
  }
  href = addBaseUrl(href);
  token.attrSet('href', href);
  if (!href.startsWith('#') && href !== homePath) {
    token.attrSet('target', '_blank');
  }
  return defaultLinkRenderRule(tokens, idx, options, env, self);
};

const defaultLinkCloseRenderRule = getDefaultRenderRule('link_close');
markdownIt.renderer.rules.link_close = (tokens, idx, options, env, self) => {
  const icon = isExternal ? getIcon(EIcon.external, 14) : '';
  return icon + defaultLinkCloseRenderRule(tokens, idx, options, env, self);
};

export function renderMD(data: string) {
  data = data.replaceAll(snippetMark, '');
  const tocRegExpStr = '^\\[toc]$';
  const tocRegExp = new RegExp(tocRegExpStr, 'im');
  const tocRegExpG = new RegExp(tocRegExpStr, 'img');
  if (tocRegExp.test(data)) {
    const tocDiv = document.createElement('div');
    tocDiv.id = 'toc';
    data = data.replace(tocRegExp, tocDiv.outerHTML).replace(tocRegExpG, '');
  }
  headingCount = {};
  return markdownIt.render(data);
}

export { replaceInlineScript, updateCategoryPage, updateDom, updateSearchPage, updateSnippet } from '@/ts/async/updata';
