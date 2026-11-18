/**
 * Converts numbers into Indian Currency Words.
 * Supports Indian numbering system: Crores, Lakhs, Thousands, Hundreds, and Paise.
 * Example: 12500 -> "Rupees Twelve Thousand Five Hundred Only"
 * Example: 12500.50 -> "Rupees Twelve Thousand Five Hundred and Fifty Paise Only"
 */

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function convertBelowThousand(n: number): string {
  let str = "";
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + " Hundred ";
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + " ";
    n %= 10;
  }
  if (n > 0) {
    str += ONES[n] + " ";
  }
  return str.trim();
}

export function convertNumberToIndianWords(amount: number): string {
  if (amount === 0 || isNaN(amount)) {
    return "Rupees Zero Only";
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const rupees = Math.floor(absAmount);
  const paise = Math.round((absAmount - rupees) * 100);

  let rupeesStr = "";

  if (rupees === 0) {
    rupeesStr = "Zero";
  } else {
    // Indian Numbering grouping: Crores (> 1,00,00,000), Lakhs (> 1,00,000), Thousands (> 1,000), Hundreds
    const crore = Math.floor(rupees / 10000000);
    const remCrore = rupees % 10000000;

    const lakh = Math.floor(remCrore / 100000);
    const remLakh = remCrore % 100000;

    const thousand = Math.floor(remLakh / 1000);
    const remThousand = remLakh % 1000;

    if (crore > 0) {
      rupeesStr += convertBelowThousand(crore) + " Crore ";
    }
    if (lakh > 0) {
      rupeesStr += convertBelowThousand(lakh) + " Lakh ";
    }
    if (thousand > 0) {
      rupeesStr += convertBelowThousand(thousand) + " Thousand ";
    }
    if (remThousand > 0) {
      rupeesStr += convertBelowThousand(remThousand) + " ";
    }
  }

  rupeesStr = rupeesStr.trim();

  let result = `Rupees ${rupeesStr}`;

  if (paise > 0) {
    const paiseStr = convertBelowThousand(paise);
    result += ` and ${paiseStr} Paise`;
  }

  result += " Only";

  return isNegative ? `Minus ${result}` : result;
}

/**
 * Detect Indian Financial Year from date (YYYY-MM-DD or Date object)
 * Indian FY starts 1 April and ends 31 March.
 * Example:
 * 2026-11-18 -> { financialYear: "2026-27", prefix: "ABR/2026-27/" }
 * 2027-02-10 -> { financialYear: "2026-27", prefix: "ABR/2026-27/" }
 * 2027-04-01 -> { financialYear: "2027-28", prefix: "ABR/2027-28/" }
 */
export function getIndianFinancialYear(dateInput: string | Date = new Date()): {
  financialYear: string;
  prefix: string;
} {
  const dateParts = typeof dateInput === "string"
    ? dateInput.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    : null;
  const d = dateInput instanceof Date ? dateInput : dateParts ? null : new Date(dateInput);
  const year = dateParts ? Number(dateParts[1]) : d!.getFullYear();
  const month = dateParts ? Number(dateParts[2]) : d!.getMonth() + 1;

  let startYear: number;
  let endYear: number;

  if (month >= 4) {
    // April to December
    startYear = year;
    endYear = year + 1;
  } else {
    // January to March
    startYear = year - 1;
    endYear = year;
  }

  const endYearShort = String(endYear).slice(-2);
  const financialYear = `${startYear}-${endYearShort}`;
  const prefix = `ABR/${financialYear}/`;

  return { financialYear, prefix };
}
