import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = "dist";
const mount = "/immigration-tracking-application/";
const port = 4174;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

function resolveFile(pathname) {
  if (!pathname.startsWith(mount)) return null;
  const relative = decodeURIComponent(pathname.slice(mount.length));
  const safe = normalize(relative).replace(/^([.][.][/\\])+/, "");
  const candidate = join(root, safe || "index.html");
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  return join(root, "index.html");
}

createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  const file = resolveFile(url.pathname);
  if (!file || !existsSync(file)) {
    response.writeHead(404).end("Not found");
    return;
  }

  response.setHeader(
    "Content-Type",
    contentTypes[extname(file)] ?? "application/octet-stream",
  );
  response.setHeader("Cache-Control", "no-store");
  createReadStream(file).pipe(response);
}).listen(port, "127.0.0.1", () => {
  process.stdout.write(
    `GitHub Pages subpath fixture running at http://127.0.0.1:${port}${mount}\n`,
  );
});
