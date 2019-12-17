export function getWrapRegExp(wrapLeft: string, wrapRight: string = wrapLeft, flags = '') {
    return new RegExp(`${wrapLeft}\\s*(.+?)\\s*${wrapRight}`, flags);
}

export function trimList(list: string[]) {
    const result: string[] = [];
    list.forEach((item) => {
        const trim = item.trim();
        if (trim) {
            result.push(trim);
        }
    });
    return result;
}

export function splitTags(tags: string) {
    return trimList(tags.split(/\s*[,，]\s*/));
}
