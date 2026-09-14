import type { Plugin, ViteDevServer } from "vite";
import { ensureLocalDirs, handleLocalRequest } from "./local-http.ts";

function attach(server: { middlewares: ViteDevServer["middlewares"] }): void {
  ensureLocalDirs();
  server.middlewares.use((req, res, next) => {
    if (handleLocalRequest(req, res)) return;
    next();
  });
}

/** Serves `/data/*` from `local/` and handles validated `POST /api/polls`. */
export function localDataPlugin(): Plugin {
  return {
    name: "mi-local-data",
    configureServer(server) {
      attach(server);
    },
    configurePreviewServer(server) {
      attach(server);
    },
  };
}
