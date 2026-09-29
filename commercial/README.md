# Daily Commercial Report

This folder is the **Commercial** department report. Other departments have their own folders next to it.

A daily commercial report for a kitchen & cabinet business, built around nine questions:

1. **Today paid**: money customers paid today, each day this week, split into advance / final / other
2. **Leads**: new leads today and this week, by source and stage
3. **Pre-measurement**: site measurements taken today and this week, scheduled and missed ones
4. **Expected advance**: deposits customers agreed to pay, marked overdue / due today / this week
5. **Expected final**: final payments expected after installation, with the same markers
6. **Problems**: open problems, who is responsible, days open
7. **Social media**: posts, new followers, views and inquiries per platform, compared with last week
8. **Weekly total leads**: leads per week over the last 12 weeks
9. **Changed to paid customer**: leads that became paying customers, and the conversion rate

**Live:** https://ewkena2-ops.github.io/commercial-report/commercial/

## Using it

- Pick any **date** at the top (arrows move one day). The week runs Monday to Sunday.
- **Data sheet** holds the records, one tab per topic: Payments received, Leads, Pre-measurement, Expected advance, Expected final, Problems, Social media. Type rows directly, or **Import Excel / CSV**.
  - Setting a lead's stage to *Paid customer* fills in the paid date. Setting a problem to *Solved* fills in the solved date.
- **Download PDF** makes a 3 to 4 page report for the selected date. Amharic text is supported through the bundled Abyssinica SIL font (`fonts/`, SIL Open Font License).

## Login and access

Records are shared online through a small Cloudflare server (Worker + D1 database, free plan). Everyone signs in with email and password. One account works on every department page the person has access to.

| Access | Can do |
|---|---|
| Owner | Everything, plus **Team & access**: add people, change access, reset forgotten passwords |
| Enters data | Add and edit records and settings, see the report, make PDFs |
| View only | See the report and records, make PDFs; cannot change anything |

**Adding people:** there is no self sign-up. The owner opens **Data sheet → Team & access**, types the person's name, a login (e.g. `sara@klever.local`, it does not need to be a real email) and a password, picks the access level and taps *Give access*. Then they send the person the link, login and password. A forgotten password is reset there with *Set password*. Someone who already has a login from another department is added without a password.

Back up with **Export Excel**. To use the page on one device only (no login), leave `apiUrl` empty in `config.js`.

## Files

- `index.html`: page structure
- `styles.css`: design tokens (light and dark), layout and print styles
- `app.js`: calculations, charts, tables, data sheet, Excel and PDF export
- `data.js`: default settings (company name, currency)
- `config.js`: the server address and department name
- `fonts/`: Abyssinica SIL font for Amharic in PDFs, with its licence
