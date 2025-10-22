import { join } from 'node:path';

// for some strange reason, before I had to do this hacky way to get the root path
// `${envs.NODE_ENV === 'production' ? '' : '../'}../`,
export const ROOT_PATH = join(import.meta.dirname, '../../');
