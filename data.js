/*
 * COMMERCIAL REPORT — DATA FILE
 * ------------------------------------------------------------------
 * Enter records on the page: click "Data sheet". Records are saved on the
 * device you type them on. To publish them for everyone, use
 * "Download data.js" in the Data sheet and upload that file here.
 *
 *  - Dates are "YYYY-MM-DD". Amounts are plain numbers (no commas).
 *  - periodEnd "" means "up to today".
 */
window.REPORT_DATA = {
  sample: false,
  company: {
    name: "Klever Kitchen",
    tagline: "Kitchen & cabinet commercial report",
    currency: "ETB",
    locale: "en-US",
    periodStart: "2026-01-01",
    periodEnd: "",
    preparedBy: "Finance & Sales",
    cogsCategories: ["MDF & boards", "Hardware & fittings", "Edge banding & finishes"],
  },

  // stage: New inquiry | Site measured | Design & quote | Negotiation | Won | Lost
  leads: [],

  // status: Paid | Partially paid | Unpaid
  sales: [],

  // one row per expense
  expenses: [],

  // type: Received (customer deposit) | Paid (to supplier). recovered = amount already offset
  advances: [],

  // status: Settled | Awaiting payment | Under review
  settlements: [],

  // direction: In | Out. status: Completed | Pending | Overdue
  payments: [],
};
