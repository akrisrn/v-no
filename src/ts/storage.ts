const prefix = `v-no${process.env.VUE_APP_PUBLIC_PATH}`;

export function getItem(key: string) {
  return localStorage.getItem(prefix + key);
}

export function setItem(key: string, value: string) {
  localStorage.setItem(prefix + key, value);
}

export function removeItem(key: string) {
  localStorage.removeItem(prefix + key);
}
