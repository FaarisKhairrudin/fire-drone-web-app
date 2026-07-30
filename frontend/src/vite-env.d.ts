/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HF_TOKEN?: string;
  readonly VITE_LOCAL_BACKEND_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
