import { config } from '@/ts/config';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import localizedFormat from 'dayjs/plugin/localizedFormat';

dayjs.extend(advancedFormat);
dayjs.extend(localizedFormat);

export function parseDate(dateStr: string) {
  return config.dateFormat ? dayjs(dateStr, config.dateFormat).toDate() : new Date(dateStr);
}

export function formatDate(date: Date) {
  return config.dateFormat ? dayjs(date).format(config.dateFormat) : date.toDateString();
}

export { dayjs };
