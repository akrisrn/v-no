import { StateUpdater, useEffect } from 'preact/hooks';

const registry: Record<string, unknown> = {};

function register<T>(name: string, setter: StateUpdater<T>) {
  Object.defineProperty(registry, name, {
    configurable: true,
    enumerable: true,
    async get() {
      return await new Promise<T>(resolve => {
        setter(prev => {
          resolve(prev);
          return prev;
        });
      });
    },
    set(value: T) {
      setter(value);
    },
  });
}

function deregister(name: string) {
  delete registry[name];
}

export function useRegistry<T>(name: string, setter: StateUpdater<T>) {
  useEffect(() => {
    register(name, setter);
    return () => {
      deregister(name);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function useLocalStorage(key: string, value: string) {
  useEffect(() => {
    if (value) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
}
