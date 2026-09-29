# Commercial Report

A single-page commercial report for a kitchen & cabinet business, covering **leads, sales, expenses, advances, final settlements and payments**. It has a period filter, charts with table views, searchable and sortable registers with CSV export, printable settlement statements, and light and dark themes.

**Live:** https://ewkena2-ops.github.io/commercial-report/

## Use your own data: the Data sheet

Click **Data sheet** (top right, or in the sidebar) to edit the records behind the report, like a spreadsheet:

- **Type directly** into the sheets: Leads, Sales, Expenses, Advances, Final settlement and Payments. **Add row** adds a line and the bin icon deletes one (with Undo).
- **Import Excel / CSV**: a workbook whose tab names match the sheets (Leads, Sales, ...) fills them all at once. A single CSV goes into the sheet you have open. Column headers must match the sheet's column names. Dates are read day-first (05/03/2026 = 5 March).
- **Export Excel** saves everything as one workbook, which is also the easiest template to fill in.
- **Settings** holds the company name, currency (ETB), period and which expense categories count as materials.

Edits are saved **in your browser only**. To publish them for everyone, click **Download data.js**, then in this repository choose **Add file → Upload files** and upload it (it replaces the old `data.js`). The live site updates about a minute later.

The sample data in this repository is fictional.

## Files

- `index.html`: page structure
- `styles.css`: design tokens (light and dark), layout and print styles
- `app.js`: calculations, charts, tables and the period filter (no dependencies)
- `data.js`: the published data (created with Download data.js in the Data sheet)
