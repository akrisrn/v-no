import { sleep } from '@/utils';
import { StateUpdater } from 'preact/hooks';

export function modelEvent<T extends HTMLElement & { value: V }, V>(setter: StateUpdater<V>) {
  return (event: Event) => {
    setter((event.target as T).value);
  };
}

export function preventEvent(callback: () => void) {
  return (event: Event) => {
    event.preventDefault();
    callback();
  };
}

export async function dispatchEvent<T>(type: string, payload?: T, timeout?: number) {
  if (timeout) {
    await sleep(timeout);
  }
  return document.dispatchEvent(new CustomEvent<T>(type, {
    detail: payload,
  }));
}
