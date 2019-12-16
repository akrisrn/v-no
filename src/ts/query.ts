export function getQueryContent(params: { [index: string]: string | undefined }) {
    return params.content ? decodeURIComponent(params.content) : '';
}

export function buildQueryContent(content: string, isComplete = false) {
    return (isComplete ? `#/${process.env.VUE_APP_SEARCH_FILE}` : '') + `?content=${encodeURIComponent(content)}`;
}
