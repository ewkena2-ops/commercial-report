/*
 * DAILY COMMERCIAL REPORT — DATA FILE
 * ------------------------------------------------------------------
 * Enter records on the page: click "Data sheet". Records are saved on the
 * device you type them on. To publish them for everyone, use
 * "Download data.js" in the Data sheet and upload that file here.
 *
 * Dates are "YYYY-MM-DD". Amounts are plain numbers (no commas).
 */
window.REPORT_DATA = {
  sample: false,
  company: {
    name: "Klever Kitchen",
    tagline: "Kitchen & cabinet daily commercial report",
    currency: "ETB",
    locale: "en-US",
    preparedBy: "Sales team",
  },

  // stage: New | Contacted | Site visit | Quotation | Paid customer | Lost
  leads: [],

  // site measurements before the quotation. status: Taken | Scheduled | Cancelled
  measurements: [],

  // money customers paid us. type: Advance | Final | Other
  payments: [],

  // status: Expected | Delayed | Received | Cancelled
  expAdvance: [],
  expFinal: [],

  // status: Open | In progress | Solved
  problems: [],

  // one row per platform per week. week = any date in that week
  social: [],

  // week production schedule. m2 = size in square metres. status: Planned | In production | Ready | Installed | Delayed
  production: [],
};
