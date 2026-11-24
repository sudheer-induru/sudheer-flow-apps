# Package audit: Asset 360

Sources: `npm outdated --json` and `npm audit --json` at commit `1c4a266`.

### Dependencies

| Package | Used version | Latest | Deprecated | CVEs | Health |
| ------- | ------------ | ------ | ---------- | ---- | ------ |
| `@cognite/app-sdk` | 0.11.50644 | 0.11.50708 | no | none | Pass (same minor; peers `vite@8.2.4`, `@cognite/sdk@10.20.0`, `react@^18.3.1`) |
| `@cognite/aura` | 1.50667.0 | 1.50885.0 | no | low (transitive `katex`, `mermaid`, `@streamdown/*`) | Pass (minor behind) |
| `@cognite/sdk` | 10.20.0 | 10.20.0 | no | none | Pass |
| `@tabler/icons-react` | current | current | no | none | Pass |
| `@tanstack/react-query` | current | current | no | none | Pass |
| `@tanstack/react-table` | 8.21.3 | 9.3.1 | no | none | Warn — one major behind; pinned by `@cognite/aura` peer `^8.7.4` |
| `@tanstack/react-virtual` | current | current | no | none | Pass |
| `react` / `react-dom` | 18.3.1 | 19.3.1 | no | none | Warn — one major behind; pinned by `@cognite/app-sdk` and `@cognite/aura` peers `^18.3.1` |
| `recharts` | 3.11.0 | 3.11.1 | no | none | Pass (patch behind) |

Dev dependencies: `vite` 8.2.4 (8.3.8 available, held at the exact `@cognite/app-sdk` peer), `typescript-eslint` 8.73.0 → 8.74.0, and majors `eslint` 10, `@eslint/js` 10, `typescript` 7, `@types/react(-dom)` 19 (the last held with React 18). No dev dependency has an advisory.

### Security audit

| Severity | Count |
| -------- | ----- |
| Critical | 0 |
| High | 0 |
| Moderate | 0 |
| Low | 8 |

#### Vulnerabilities

| Package | Severity | Title | Patched in | Advisory |
| ------- | -------- | ----- | ---------- | -------- |
| `katex` via `@cognite/aura` | Low | Existing prototype pollution can bypass trust restrictions | 0.18.2 | [GHSA-238p-pmpm-9mq7](https://github.com/advisories/GHSA-238p-pmpm-9mq7) |
| `mermaid`, `@streamdown/math`, `@streamdown/mermaid`, `rehype-katex`, `remark-math`, `micromark-extension-math` via `@cognite/aura` | Low | Transitive through Aura's message/markdown components (not imported by this app) | Aura release | — |
