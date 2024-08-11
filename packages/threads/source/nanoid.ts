// Copied from https://github.com/ai/nanoid/blob/main/nanoid.js
let a = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';

export function nanoid(e = 21) {
  let t = '',
    r = crypto.getRandomValues(new Uint8Array(e));
  for (let n = 0; n < e; n++) t += a[63 & r[n]!];
  return t;
}
