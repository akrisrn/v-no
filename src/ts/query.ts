import { config, EFlag } from '@/ts/utils';

export function buildQueryContent(content: string, isComplete = false) {
  return (isComplete ? `#${config.searchFile}` : '') + `?content=${encodeURIComponent(content)}`;
}

export function getQueryContent(params: { [index: string]: string }) {
  return params.content ? decodeURIComponent(params.content) : '';
}

export function getQueryTypeAndParam(queryContent: string) {
  const match = queryContent.match(/^@(.*?):\s*(.*?)\s*$/);
  if (match) {
    return [match[1], match[2]];
  }
  return ['', ''];
}

export function getQueryLink(type: EFlag, param: string) {
  return buildQueryContent(`@${type}:${param}`, true);
}
