// https://github.com/ai/nanoid/blob/641487083f66af7003bbad08bd19dfbff7f25a64/non-secure/index.js
const urlAlphabet =
  "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

export function nanoid(size = 21) {
  let id = "";
  let i = size | 0;
  while (i--) {
    id += urlAlphabet[(Math.random() * 64) | 0];
  }
  return id;
}
