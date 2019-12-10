export function getWrapRegExp(wrapLeft: string, wrapRight: string = wrapLeft, flags = '') {
    return new RegExp(`${wrapLeft}\\s*(.+?)\\s*${wrapRight}`, flags);
}

export function splitTags(tags: string) {
    return tags.split(/\s*[,，]\s*/);
}

export function getQueryContent(params: { [index: string]: string | undefined }) {
    return params.content ? decodeURIComponent(params.content) : '';
}

export function buildQueryContent(content: string, isComplete = false) {
    return (isComplete ? `#/${process.env.VUE_APP_SEARCH_FILE}` : '') + `?content=${encodeURIComponent(content)}`;
}
