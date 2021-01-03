import { config } from '@/ts/config';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import localizedFormat from 'dayjs/plugin/localizedFormat';

dayjs.extend(advancedFormat);
dayjs.extend(localizedFormat);

export function parseDate(date: string | number) {
  if (typeof date === 'string' && config.dateFormat) {
    return dayjs(date, config.dateFormat).toDate();
  }
  return new Date(date);
}

export function formatDate(date: string | number | Date | dayjs.Dayjs, format?: string) {
  if (format) {
    return dayjs(date).format(format);
  }
  if (config.dateFormat) {
    return dayjs(date).format(config.dateFormat);
  }
  if (dayjs.isDayjs(date)) {
    date = date.toDate();
  }
  return new Date(date).toDateString();
}

export { dayjs };
