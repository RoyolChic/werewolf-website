/**
 * All static asset paths in this app (backgrounds, role art, audio) are written as root-absolute
 * strings like "/roles/seer.png". That's correct when the site is served from "/", but this app
 * is also built for GitHub Pages under a sub-path (see the GITHUB_PAGES branch in vite.config.ts),
 * where the real root is "/werewolf-website/" -- a root-absolute path skips that prefix entirely
 * and 404s. Vite exposes the configured base as import.meta.env.BASE_URL; route this through here
 * instead of using those paths directly.
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}${path}`;
}
