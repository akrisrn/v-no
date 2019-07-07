import {AxiosError} from 'axios';
import resource from '@/resource';

export function error2markdown(error: AxiosError) {
    return `# ${error.response!.status} ${error.response!.statusText}\n${resource.pageError}`;
}

export function getDate(path: string) {
    if (path) {
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
