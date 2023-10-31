import {fileURLToPath} from 'url';

export function resolveRoot(root: string | URL) {
  return typeof root === 'string' ? root : fileURLToPath(root);
}
