import axios from 'axios';

export function getWrapRegExp(wrapLeft: string, wrapRight: string = wrapLeft, flags = '') {
    return new RegExp(`${wrapLeft}\\s*(.+?)\\s*${wrapRight}`, flags);
}

export function getListFromData(data: string) {
    const matches = data.match(/^-\s*\[.*?]\(.*?\)\s*`.*?`\s*$/gm);
    if (matches) {
        return matches.map((match) => {
            const m = match.match(/^-\s*\[(.*?)]\((.*?)\)\s*(.*?)\s*$/)!;
            const title = m[1];
            const href = m[2];
            const tags = m[3].split(/`\s+`/).map((seg) => {
                return seg.replace(/`/g, '');
            });
            return {title, href, tags};
        });
    } else {
        return [];
    }
}

export function getIndexFileData(func: (data: string) => void) {
    axios.get('/' + process.env.VUE_APP_INDEX_FILE).then((response) => {
        axios.get('/' + process.env.VUE_APP_ARCHIVE_FILE).then((response2) => {
            func(response.data + response2.data);
        }).catch(() => {
            func(response.data);
        });
    });
}

export function setFlag(data: string, flag: string, onMatch?: (match: string) => void, onNotMatch?: () => void,
                        onDone?: () => void) {
    const match = data.match(getWrapRegExp(flag, '\n'));
    if (match) {
        if (onMatch) {
            onMatch(match[1]);
        }
        data = data.replace(match[0], '');
    } else {
        if (onNotMatch) {
            onNotMatch();
        }
    }
    if (onDone) {
        onDone();
    }
    return data;
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

export enum EFlags {
    author = 'author',
    tags = 'tags',
}
