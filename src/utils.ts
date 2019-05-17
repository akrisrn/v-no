import {AxiosError} from 'axios';
import resource from '@/resource';

export function error2markdown(error: AxiosError) {
    return `# ${error.response!.status} ${error.response!.statusText}\n${resource.pageError}`;
}
