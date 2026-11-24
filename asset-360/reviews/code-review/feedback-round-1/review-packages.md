# Package audit: Asset 360

Sources: `npm outdated --json` and `npm audit --json` at commit `09f074f`.

### Dependencies

| Package | Used version | Latest | Deprecated | CVEs | Health |
| ------- | ------------ | ------ | ---------- | ---- | ------ |
| `@cognite/app-sdk` | 0.9.0 | 0.11.50708 | no | none | **Fail** — two pre-1.0 minors behind (breaking under semver); 0.11 needs `vite@8.2.4` and `@cognite/sdk@10.20.0` |
| `@cognite/aura` | 1.50667.0 | 1.50885.0 | no | low (transitive `katex`, `mermaid`, `@streamdown/*`) | Pass (minor behind) |
| `@cognite/sdk` | 10.20.0 | 10.20.0 | no | none | Pass |
| `@tabler/icons-react` | current | current | no | none | Pass |
| `@tanstack/react-query` | current | current | no | none | Pass |
| `@tanstack/react-table` | 8.21.3 | 9.3.1 | no | none | Warn — one major behind; pinned by `@cognite/aura` peer `^8.7.4` |
| `@tanstack/react-virtual` | current | current | no | none | Pass |
| `clsx` | 2.1.1 | 2.1.1 | no | none | Pass (only used by unused `src/lib/utils.ts`) |
| `react` / `react-dom` | 18.3.1 | 19.3.1 | no | none | Warn — one major behind; pinned by `@cognite/app-sdk` and `@cognite/aura` peers `^18.3.1` |
| `recharts` | 3.11.0 | 3.11.1 | no | none | Pass |
| `tailwind-merge` | current | current | no | none | Pass (only used by unused `src/lib/utils.ts`) |

Dev dependencies flagged by the audit: `happy-dom` 20.14.6 (high, fix 21.0.4, major), `vitest` / `@vitest/coverage-v8` / `@vitest/ui` 4.1.10 (moderate, fix 4.1.12, patch).

### Security audit

| Severity | Count |
| -------- | ----- |
| Critical | 0 |
| High | 1 |
| Moderate | 4 |
| Low | 8 |

#### Vulnerabilities

| Package | Severity | Title | Patched in | Advisory |
| ------- | -------- | ----- | ---------- | -------- |
| `happy-dom` (dev) | High | Incomplete fix for CVE-2026-33943: unsanitized import alias leads to host code execution | 21.0.4 | [GHSA-834v-8h66-3h79](https://github.com/advisories/GHSA-834v-8h66-3h79) |
| `happy-dom` (dev) | Moderate | SSRF via iframe and link stylesheet when parsing untrusted HTML | 20.14.7 | [GHSA-c8p4-j97h-3vg8](https://github.com/advisories/GHSA-c8p4-j97h-3vg8) |
| `@vitest/mocker` via `vitest` (dev) | Moderate | Path traversal / arbitrary file read via redirect mock | 4.1.11 | [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) |
| `@vitest/mocker` via `vitest` (dev) | Moderate | Code injection via unauthenticated manual mock registration | 4.1.12 | [GHSA-qxg6-89mg-rqv8](https://github.com/advisories/GHSA-qxg6-89mg-rqv8) |
| `katex` via `@cognite/aura` | Low | Existing prototype pollution can bypass trust restrictions | 0.18.2 | [GHSA-238p-pmpm-9mq7](https://github.com/advisories/GHSA-238p-pmpm-9mq7) |
| `mermaid`, `@streamdown/math`, `@streamdown/mermaid`, `rehype-katex`, `remark-math`, `micromark-extension-math` via `@cognite/aura` | Low | Transitive through Aura's message/markdown components (not imported by this app) | Aura release | — |
