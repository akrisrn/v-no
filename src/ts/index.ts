import * as config from '@/ts/config';
import * as element from '@/ts/element';
import * as enums from '@/ts/enums';
import * as path from '@/ts/path';
import * as store from '@/ts/store';
import * as utils from '@/ts/utils';
import { addInputBinds, destructors } from '@/ts/utils';
import { exposeToWindow } from '@/ts/window';

export function bang() {
  exposeToWindow({
    version: process.env.VUE_APP_VERSION,
    addInputBinds,
    destructors,
  });
  exposeToWindow({ config, element, enums, path, store, utils });
}
