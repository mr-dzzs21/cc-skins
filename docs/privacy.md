# Privacy and safety

[← cc-skins](../README.md) · [All docs](README.md)

cc-skins runs inside Claude Code on your machine and keeps to what it needs:

- **No network.** It makes no requests of its own and sends nothing anywhere.
- **Reads:** the session's usage figures, model and effort (from Claude Code), your repository's current branch (`.git/HEAD`, a small plain file only), and, when you click the branch or run `/skin changes` (or after each reply, with the Git status extra on), `git status` and `git diff --shortstat` (run without a shell, without optional locks, fsmonitor, external diff or textconv).
- **Writes:** nothing to your files or projects. Your choices and your own skins are kept through Claude Code's local plugin store on your machine.
- **Acts only when you ask:** a model pick (saved as your default, as `/model` does), an effort pick (`/effort`), a compact, a copy on `/skin export`. Unasked, it shows a welcome toast and the usage alerts.
- **Sound and notifications are off** until you turn them on. A notification says how long a turn took; the answer's first line goes along only if you turn that on, cleaned of control characters.
- **Shared skins are data, not code.** `/skin import` takes a name, a built-in base, a `#rrggbb` accent and a style; the name loses every control character, the id must be lowercase words and dashes.

Found a security problem? See [SECURITY.md](../SECURITY.md).
