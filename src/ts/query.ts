import {EFlag} from '@/ts/enums';

export function buildQueryContent(content: string, isComplete = false) {
    return (isComplete ? `#/${process.env.VUE_APP_SEARCH_FILE}` : '') + `?content=${encodeURIComponent(content)}`;
}

export function getQueryContent(params: { [index: string]: string | undefined }) {
    return params.content ? decodeURIComponent(params.content) : '';
}

export function getQueryTypeAndParam(queryContent: string) {
    const match = queryContent.match(/^@(.*?):\s*(.*?)\s*$/);
    if (match) {
        return [match[1], match[2]];
    }
    return [undefined, undefined];
}

export function getQueryLink(type: EFlag, param: string) {
    return buildQueryContent(`@${type}:${param}`, true);
}
