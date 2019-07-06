import {AxiosError} from 'axios';
import resource from '@/resource';

export function error2markdown(error: AxiosError) {
    return `# ${error.response!.status} ${error.response!.statusText}\n${resource.pageError}`;
}

export function getDate(path: string) {
    const match = path.split('/').reverse()[0].match(/^\d{4}-\d{2}-\d{2}/);
    return match ? new Date(match[0]) : null;
}

export function getDateString(path: string) {
    const date = getDate(path);
    return date ? date.toDateString() : '';
}
