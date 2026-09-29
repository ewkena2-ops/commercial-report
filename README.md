# Klever Kitchen Reports

Department reports, one folder per department.

**Live:** https://ewkena2-ops.github.io/commercial-report/

| Folder | Department | Live link |
|---|---|---|
| `commercial/` | Commercial: daily commercial report | https://ewkena2-ops.github.io/commercial-report/commercial/ |
| (separate repo `purchasing-report`) | Purchasing & Materials: daily purchasing report | https://ewkena2-ops.github.io/purchasing-report/ |
| (separate repo `finance-report`) | Group Finance: finance controller's 9 reports | https://ewkena2-ops.github.io/finance-report/ |

The home page (`index.html` in this folder) links to every department. To add a department, create a new folder next to `commercial/` and add a card for it on the home page.

Each report needs a login. Commercial and Purchasing share one server; Finance has its own:

| Server | Used by | Code |
|---|---|---|
| https://klever-reports-api.ewkena2.workers.dev | Commercial, Purchasing | `server/` (Worker + D1 `klever-reports`) |
| https://klever-finance-api.ewkena2.workers.dev | Group Finance | `server/` in the finance-report repo |

Every department has its own team and its own records, so their data never mixes. One account works on every department page the person is given access to. Deploy a server change with `cd server && npx wrangler deploy`.
