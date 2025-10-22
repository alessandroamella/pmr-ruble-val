import { join } from 'node:path';
import { envs } from 'server/config/envs';

export const ROOT_PATH = join(
  import.meta.dirname,
  `${envs.NODE_ENV === 'production' ? '' : '../'}../`,
);
