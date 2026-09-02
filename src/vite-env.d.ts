/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IDEAL_POSTCODES_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
