/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly __NAME__: string;
  readonly __VERSION__: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
