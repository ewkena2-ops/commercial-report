# Commercial Report

A single-page commercial report covering **leads, sales, expenses, advances, final settlements and payments**. It has a period filter, charts with table views, searchable and sortable registers with CSV export, printable settlement statements, and light and dark themes.

**Live:** https://ewkena2-ops.github.io/commercial-report/

## Use your own data

Everything on the page is calculated from **`data.js`**. Replace the sample records with your own:

| Array | One row per | Key fields |
|---|---|---|
| `leads` | lead | `date`, `company`, `source`, `stage` (New / Contacted / Qualified / Proposal / Won / Lost), `value`, `owner` |
| `sales` | invoice | `date`, `customer`, `category`, `amount`, `status` (Paid / Partially paid / Unpaid) |
| `expenses` | expense | `date`, `category`, `description`, `vendor`, `amount` |
| `advances` | advance | `date`, `type` (Received / Paid), `party`, `reference`, `contractValue`, `amount`, `recovered` |
| `settlements` | project | `contractValue`, `variations`, `advance`, `interimPaid`, `penalties`, `amountPaid`, `status` |
| `payments` | payment | `date`, `direction` (In / Out), `party`, `type`, `amount`, `status` (Completed / Pending / Overdue) |

Set the company name, currency (any ISO code, e.g. `ETB`, `USD`, `EUR`) and reporting period in the `company` block at the top of the file. Push the change and GitHub Pages will update the live site in about a minute.

The sample data in this repository is fictional.

## Files

- `index.html`: page structure
- `styles.css`: design tokens (light and dark), layout and print styles
- `app.js`: calculations, charts, tables and the period filter (no dependencies)
- `data.js`: your data
