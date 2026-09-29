# Daily Commercial Report

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

**Live:** https://ewkena2-ops.github.io/commercial-report/

## Using it

- Pick any **date** at the top (arrows move one day). The week runs Monday to Sunday.
- **Data sheet** holds the records, one tab per topic: Payments received, Leads, Pre-measurement, Expected advance, Expected final, Problems, Social media. Type rows directly, or **Import Excel / CSV**.
  - Setting a lead's stage to *Paid customer* fills in the paid date. Setting a problem to *Solved* fills in the solved date.
  - **Try example data** fills the sheet with made-up records so you can see the report; **Start empty** clears it.
- **Download PDF** makes a 3 to 4 page report for the selected date. Amharic text is supported through the bundled Abyssinica SIL font (`fonts/`, SIL Open Font License).

Records are saved **on the device where you type them**. Back up often with **Export Excel**. To publish the same data for everyone, use **Download data.js** and upload it to this repository (Add file → Upload files).

## Files

- `index.html`: page structure
- `styles.css`: design tokens (light and dark), layout and print styles
- `app.js`: calculations, charts, tables, data sheet, Excel and PDF export
- `data.js`: the published data (empty to start)
- `fonts/`: Abyssinica SIL font for Amharic in PDFs, with its licence
