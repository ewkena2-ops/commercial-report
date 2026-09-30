# Daily Commercial Report

This folder is the **Commercial** department report. Other departments have their own folders next to it.

A daily commercial report for a kitchen & cabinet business, built around ten questions:

1. **Today paid**: money customers paid today, each day this week, split into advance / final / other
2. **Leads**: new leads today and this week, by source and stage
3. **Pre-measurement**: site measurements taken today and this week, scheduled and missed ones
4. **Expected advance**: deposits customers agreed to pay, marked overdue / due today / this week
5. **Expected final**: final payments expected after installation, with the same markers
6. **Problems**: open problems, who is responsible, days open
7. **Social media**: posts, new followers, views and inquiries per platform, compared with last week
8. **Weekly total leads**: leads per week over the last 12 weeks
9. **Changed to paid customer**: leads that became paying customers, and the conversion rate
10. **Week production schedule**: jobs in the workshop this week (Monday to Sunday), when production starts and finishes, installation days, and late or delayed jobs

**Live:** https://ewkena2-ops.github.io/commercial-report/commercial/

## Using it

- Pick any **date** at the top (arrows move one day). The week runs Monday to Sunday.
- **Data sheet** holds the records, one tab per topic: Payments received, Leads, Pre-measurement, Expected advance, Expected final, Problems, Social media, Production schedule. Type rows directly, or **Import Excel / CSV**.
  - Setting a lead's stage to *Paid customer* fills in the paid date. Setting a problem to *Solved* fills in the solved date.
  - Production schedule: one row per job with production start, planned finish and installation date. A job is *Late* when its planned finish has passed and it is not Ready. Setting a job to *Installed* fills in the installation date.
- **Download PDF** makes a 3 to 4 page report for the selected date. Amharic text is supported through the bundled Abyssinica SIL font (`fonts/`, SIL Open Font License).

## Sharing (no login)

Records are shared online through a small Cloudflare server (Worker + D1 database, free plan). There is no login. The report's full link ends with a secret code (`?k=...`): everyone who opens the full link sees and edits the same records, live. Without the code nothing can be seen or changed. The code is not stored in this repository; the server keeps only its hash.

- Send the **full link** (with `?k=...`) to the people who should use the report.
- A device that opened the full link once remembers the code, so a home-screen shortcut keeps working.
- To lock everyone out, a new code is made on the server (`link_keys` table) and the new full link is sent again.

Back up with **Export Excel**. To keep records on one device only, leave `apiUrl` empty in `config.js`.

## Files

- `index.html`: page structure
- `styles.css`: design tokens (light and dark), layout and print styles
- `app.js`: calculations, charts, tables, data sheet, Excel and PDF export
- `data.js`: default settings (company name, currency)
- `config.js`: the server address and department name
- `fonts/`: Abyssinica SIL font for Amharic in PDFs, with its licence
