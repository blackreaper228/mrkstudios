# Project preferences

- Do not push or publish changes without an explicit user command.
- Use terminal git commands (git commit, git push, etc.) for version-control changes. Do not use browser or GitHub connector mutations to commit or push.
- Read and write text files explicitly as UTF-8. Use Unicode escapes for cursor arrows to prevent encoding corruption.
- dist is the local site. docs/content and docs/uploads are authoritative CMS content. Use python scripts/sync-site.py to synchronize; never overwrite these folders from dist. Before future publication, reconcile remote client content with terminal Git and preserve it.
