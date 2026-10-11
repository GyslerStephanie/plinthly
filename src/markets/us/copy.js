/**
 * US copy — English only by design (spec: US v1 is en-only). Kept out of
 * i18n/translations.js on purpose: that file is the four-locale Swiss catalogue
 * and its test requires every key in en/de/fr/it.
 *
 * `ut(key, vars)` mirrors `t()`: dotted key, {placeholder} interpolation, and
 * the raw key when missing so a gap is visible rather than blank.
 */
const COPY = {
  header: {
    tagline: 'Sustainable Real Estate Explorer',
  },
  country: {
    eyebrow: 'Before we start',
    title: 'Where do you want to buy?',
    intro: 'Mortgage rules, taxes and prices are different in every country. We’ll use the right ones for you.',
    detected: 'Looks like you’re in',
    confirm: 'Yes, I’m buying in {name}',
    other: 'Or choose another country',
    otherSoon: 'More countries coming. Not listed? You can still explore, but the numbers won’t fit your rules.',
    privacy: 'We guessed from your browser’s time zone. Nothing is sent anywhere, and you can change country any time from the top-right of the page.',
    pick: 'Which country are you buying in?',
    summary: {
      us: 'US conventional-loan rules · prices in USD · square feet · 9 states to start.',
      ch: 'Swiss mortgage rules · CHF · 16 cantons · EN / DE / FR / IT',
    },
    continue: 'Continue',
  },
  switcher: {
    label: 'Country: {name}. Change country',
    list: 'Country',
    detail: {
      us: 'USD · 9 states · English',
      ch: 'CHF · 16 cantons · EN / DE / FR / IT',
    },
    note: 'Switching country clears your numbers, because the rules are different.',
    confirmTitle: 'Switch to {name}?',
    confirmBody: 'Your current numbers will be cleared so nothing mixes with {name}’s rules.',
    confirmYes: 'Switch and start fresh',
    confirmNo: 'Stay in {current}',
  },
  onboarding: {
    q2: 'How long do you plan to stay in your next home?',
    q4: 'Have you owned a home before?',
    q4opt: { first: 'No, this would be my first home', owned: 'Yes, I’ve owned before' },
    q5: 'Do you know which state you’d buy in?',
    q5opt: { state: 'Yes, a specific state', notyet: 'Not yet' },
    stateLabel: 'Which state?',
    statePlaceholder: 'Select a state',
    focusOpt: {
      learn: 'Just learning how buying works',
      afford: 'Seeing what I can afford',
      dream: 'I have a home / price in mind — how do I reach it?',
    },
    soonNote: 'Rent-vs-buy and energy upgrades are coming soon for the US.',
    why: {
      firstTime: 'First-time buyers can put as little as 3% down through Fannie Mae and Freddie Mac programs (with mortgage insurance).',
      dream: 'We’ll show what it takes to reach your price — the dream-price tools for the US are coming next.',
      afford: 'We test your numbers the way a US lender does: cash, housing cost and total debt.',
      durFew: 'If you only plan to stay a few years, closing costs weigh more — worth knowing before you buy.',
    },
  },
  hero: {
    title: 'Can I buy?',
    blurb: 'Get an honest picture of your buying power under US lending rules — before you talk to a lender, agent, or builder. No account needed, nothing saved, nothing sold to you.',
  },
  form: {
    title: 'Your situation',
    income: 'Gross household income (per year)',
    incomeHint: 'Combined income before tax. Lenders use gross, not take-home, pay.',
    savings: 'Savings for down payment and closing costs',
    savingsHint: 'Cash you can put in at closing, including gifts. Keep your emergency fund out of this.',
    debts: 'Monthly debt payments',
    debtsHint: 'Car loans, student loans, credit card minimums, child support. Not rent or utilities.',
    down: 'Down payment',
    downHint: '3% is the minimum for first-time buyers. Under 20% you pay mortgage insurance (PMI).',
    state: 'State',
    stateHint: 'Median home ≈ {price} · property tax ≈ {tax}% · insurance ≈ {ins}% a year',
    rate: 'Mortgage rate (30-year fixed)',
    rateHint: 'Freddie Mac weekly average, {date}. Not a quote — your rate depends on credit score and lender.',
    hoa: 'HOA dues (optional)',
    hoaHint: 'Monthly homeowners-association fees, common for condos and new builds.',
    live: 'Your result updates as you type.',
  },
  result: {
    eyebrow: 'Your estimated maximum purchase price',
    empty: 'Enter your income and savings to see what you could buy.',
    status: {
      not_viable: 'Not yet',
      tight: 'Tight',
      comfortable: 'Comfortable',
      qualifies: 'Qualifies',
    },
    headline: {
      cash: 'Your savings set the limit: they need to cover the down payment and closing costs. More savings, or a smaller down payment, lifts it.',
      front_end: 'Your income sets the limit: lenders like housing costs under {front}% of gross income. More income, or a cheaper area, lifts it.',
      back_end: 'Your existing debts set the limit: housing plus debts should stay under {back}% of gross income. Paying down debt lifts it fastest.',
    },
    notViable: 'At these numbers you can’t reach a {target} home yet.',
    gapCash: 'About {gap} more in savings would get you there.',
    gapIncome: 'About {gap} more in yearly income would get you there.',
    limitsTitle: 'What sets your limit',
    limits: {
      cash: 'Cash for down payment + closing',
      front_end: 'Housing cost ≤ {front}% of income',
      back_end: 'Housing + debts ≤ {back}% of income',
    },
    binding: 'Your limit',
    upfrontTitle: 'Cash you need at closing',
    downPayment: 'Down payment ({pct}%)',
    closing: 'Closing costs (≈ {pct}%)',
    cashTotal: 'Total cash needed',
    loan: 'Mortgage',
    monthlyTitle: 'What it costs per month',
    pi: 'Principal & interest',
    tax: 'Property tax',
    insurance: 'Homeowners insurance',
    pmi: 'Mortgage insurance (PMI)',
    hoa: 'HOA dues',
    total: 'Total housing cost',
    ratios: 'That’s {housing}% of your gross income ({debt}% with your other debts).',
    maintenance: 'Also budget ≈ {amount}/mo for maintenance (about 1% of the price a year). Lenders don’t count it, but you’ll pay it.',
    pmiNote: 'With less than 20% down you pay PMI (≈ {rate}% of the loan a year). You can ask to cancel it once you owe 80% of the original price; it ends automatically at 78%.',
    jumbo: 'This loan is above the {limit} conforming limit, so it would be a jumbo loan in most counties: stricter credit and cash-reserve rules, sometimes a higher rate. High-cost counties allow up to {high}.',
    dti: 'Some lenders go up to {stretch}% of income for total debts with strong credit and savings, and automated underwriting can allow up to {max}%. We use {back}% so the result stays comfortable.',
  },
  soon: {
    title: 'Coming soon for the US',
    body: 'This step is built for Switzerland today. The US version is on the way.',
    planned: {
      2: 'Dream price: test a specific home price, see the gap and a savings path, plus a 30-year payoff schedule with PMI drop-off.',
      3: 'What to look for: home energy ratings and running costs by state.',
      4: 'Real options: buy and upgrade, buy new, or build — with state and utility rebates.',
      5: 'Action plan: your next steps with US lenders and programs.',
    },
    back: '← Back to Can I buy?',
  },
  footer: {
    disclaimer: 'Indicative estimates only — not financial, tax, or mortgage advice. Based on Fannie Mae guidelines, FHFA conforming limits, Freddie Mac rates and public state data ({date}). Always check with a lender or housing counselor before deciding.',
  },
}

function resolve(key) {
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), COPY)
}

export function ut(key, vars) {
  let s = resolve(key)
  if (s == null) return key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
  return s
}
