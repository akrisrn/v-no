import resource from '@/resource';
import axios from 'axios';
import {AxiosError} from 'axios';

export function error2markdown(error: AxiosError) {
    return `# ${error.response!.status} ${error.response!.statusText}\n${resource.pageError}`;
}

export function getDate(path: string) {
    if (path) {
        if (path.endsWith('/')) {
            path = path.substr(0, path.length - 1);
        }
        let match = path.split('/').reverse()[0].match(/^(\d{4}-\d{2}-\d{2})-/);
        if (!match) {
            match = path.match(/\/(\d{4}\/\d{2}\/\d{2})\//);
            if (!match) {
                return null;
            }
        }
        return new Date(match[1]);
    } else {
        return null;
    }
}

export function getDateString(path: string) {
    const date = getDate(path);
    return date ? date.toDateString() : '';
}

export function getTime(path: string) {
    const date = getDate(path);
    return date ? date.getTime() : 0;
}

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

export enum EFlags {
    author = 'author',
    tags = 'tags'
}
