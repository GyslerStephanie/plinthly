/**
 * Plinthly — Swiss Sustainable Real Estate Explorer (single-file build)
 * --------------------------------------------------------------------------
 * Self-contained version of the full primary track (Phases 1–4), consolidated
 * into ONE file for paste-style design tools. No local imports, data inlined,
 * browser-API calls (history/clipboard/print) wrapped so it never white-screens
 * in a sandboxed iframe. Default export is <App/>.
 *
 * Requires: React + Tailwind CSS classes available in the host environment.
 */

import { useState, useEffect, useRef, useId } from 'react'

/* ========================================================================== *
 * DATA — Swiss cantonal dataset (indicative; see meta.sources)
 * ========================================================================== */

const DATA = {
  meta: {
    version: '1.0',
    last_updated: '2026-06',
    sources: [
      'Swiss Federal Tax Administration (ESTV/AFC)',
      'Energieschweiz / Gebäudeprogramm canton pages',
      'Minergie.ch',
      'Swiss National Bank (SNB) mortgage guidelines',
      'FINMA self-regulation guidelines 2023',
      'Wüest Partner Immo-Monitoring 2025',
      'Bundesamt für Energie (SFOE)',
    ],
    notes:
      'All figures are indicative and should be verified against current official sources before use in production. Eigenmietwert abolished by Swiss voters September 2025 — cantonal implementation timelines vary and are flagged below.',
  },
  mortgage_rules: {
    min_down_payment_pct: 20,
    min_liquid_savings_pct: 10,
    max_pillar2_pct: 10,
    notional_interest_rate_pct: 5.0,
    max_housing_cost_income_ratio: 0.333,
    maintenance_cost_pct_of_value: 1.0,
    amortization_target_pct: 65,
    amortization_years: 15,
    notes:
      'Housing cost = notional interest (5% of mortgage) + amortization + maintenance (1% of property value). Must not exceed 1/3 gross income.',
  },
  eigenmietwert: {
    status: 'abolished_by_referendum',
    referendum_date: '2025-09-28',
    federal_abolition_effective: 'TBD — cantonal implementation in progress',
    notes:
      'Swiss voters approved abolition in September 2025. Federal and cantonal implementation timelines are being finalized. Mortgage interest deductions will also be phased out under the new regime.',
    transitional_guidance:
      'Until cantonal implementation is confirmed, the old Eigenmietwert system may still apply in some cantons. Platform should flag this uncertainty clearly.',
  },
  cantons: {
    ZH: {
      name_de: 'Zürich',
      name_en: 'Zurich',
      region: 'German-speaking',
      property_price_ranges: {
        apartment_chf_per_m2: { low: 9000, mid: 13000, high: 18000 },
        house_chf_per_m2: { low: 8500, mid: 12000, high: 17000 },
        new_build_premium_pct: 15,
        minergie_premium_pct: 12,
        source: 'Wüest Partner Immo-Monitoring 2025, indicative',
      },
      tax: {
        cantonal_income_tax_rate_approx_pct: 13.0,
        eigenmietwert_rate_pct_of_market_rent: 70,
        eigenmietwert_status: 'abolition pending cantonal implementation',
        property_gains_tax: 'progressive, holding period reduces rate',
      },
      gebaeueprogramm: {
        available: true,
        url: 'https://www.energiezukunft.eu',
        key_measures: ['building envelope insulation', 'window replacement', 'heat pump', 'solar thermal', 'PV systems'],
        notes: 'ZH has strong program. Check current budget availability — can have waiting periods.',
      },
      minergie_context: 'High adoption canton. Minergie label increasingly expected by buyers in premium segments.',
      market_notes: 'Highest prices in Switzerland. Strong demand, low vacancy. Winterthur offers lower entry point within canton.',
    },
    BE: {
      name_de: 'Bern',
      name_en: 'Bern',
      region: 'German-speaking (bilingual)',
      property_price_ranges: {
        apartment_chf_per_m2: { low: 5500, mid: 8000, high: 12000 },
        house_chf_per_m2: { low: 5000, mid: 7500, high: 11000 },
        new_build_premium_pct: 12,
        minergie_premium_pct: 10,
        source: 'Wüest Partner Immo-Monitoring 2025, indicative',
      },
      tax: {
        cantonal_income_tax_rate_approx_pct: 14.5,
        eigenmietwert_rate_pct_of_market_rent: 70,
        eigenmietwert_status: 'abolition pending cantonal implementation',
        property_gains_tax: 'progressive, holding period reduces rate',
      },
      gebaeueprogramm: {
        available: true,
        url: 'https://www.vol.be.ch/vol/de/index/energie/energie/foerderprogramme.html',
        key_measures: ['insulation', 'heat pump', 'solar thermal', 'windows'],
        notes: 'Strong cantonal program. GVB (Gebäudeversicherung Bern) is an active PropTech investor in this space.',
      },
      minergie_context: 'Good adoption. Federal city — some heritage constraints on older buildings.',
      market_notes: 'More affordable than Zurich. Federal employment base creates stable demand.',
    },
    VD: {
      name_de: 'Waadt',
      name_en: 'Vaud',
      region: 'French-speaking',
      property_price_ranges: {
        apartment_chf_per_m2: { low: 7000, mid: 10000, high: 16000 },
        house_chf_per_m2: { low: 6500, mid: 9500, high: 15000 },
        new_build_premium_pct: 13,
        minergie_premium_pct: 11,
        source: 'Wüest Partner Immo-Monitoring 2025, indicative',
      },
      tax: {
        cantonal_income_tax_rate_approx_pct: 15.0,
        eigenmietwert_rate_pct_of_market_rent: 70,
        eigenmietwert_status: 'abolition pending cantonal implementation',
        property_gains_tax: 'progressive',
      },
      gebaeueprogramm: {
        available: true,
        url: 'https://www.vd.ch/themes/environnement/energie',
        key_measures: ['insulation', 'heat pump', 'solar', 'windows'],
        notes: 'French-language program. Lausanne area has strong demand and higher prices.',
      },
      minergie_context: 'Growing adoption. Lausanne and Nyon areas lead.',
      market_notes: 'Lake Geneva corridor (Lausanne, Nyon, Morges) is expensive. Inland areas more accessible.',
    },
    GE: {
      name_de: 'Genf',
      name_en: 'Geneva',
      region: 'French-speaking',
      property_price_ranges: {
        apartment_chf_per_m2: { low: 10000, mid: 15000, high: 25000 },
        house_chf_per_m2: { low: 9000, mid: 14000, high: 22000 },
        new_build_premium_pct: 15,
        minergie_premium_pct: 12,
        source: 'Wüest Partner Immo-Monitoring 2025, indicative',
      },
      tax: {
        cantonal_income_tax_rate_approx_pct: 16.0,
        eigenmietwert_rate_pct_of_market_rent: 65,
        eigenmietwert_status: 'abolition pending cantonal implementation',
        property_gains_tax: 'progressive',
      },
      gebaeueprogramm: {
        available: true,
        url: 'https://www.ge.ch/energie',
        key_measures: ['insulation', 'heat pump', 'solar', 'windows'],
        notes: 'SIG (Services Industriels de Genève) runs additional programs. Strong subsidy ecosystem.',
      },
      minergie_context: 'High awareness, strong adoption in new builds.',
      market_notes: 'Second most expensive canton after Zurich. Very low vacancy. International buyer pool.',
    },
    BS: {
      name_de: 'Basel-Stadt',
      name_en: 'Basel-City',
      region: 'German-speaking',
      property_price_ranges: {
        apartment_chf_per_m2: { low: 7500, mid: 11000, high: 16000 },
        house_chf_per_m2: { low: 7000, mid: 10000, high: 15000 },
        new_build_premium_pct: 13,
        minergie_premium_pct: 11,
        source: 'Wüest Partner Immo-Monitoring 2025, indicative',
      },
      tax: {
        cantonal_income_tax_rate_approx_pct: 13.5,
        eigenmietwert_rate_pct_of_market_rent: 70,
        eigenmietwert_status: 'abolition pending cantonal implementation',
        property_gains_tax: 'progressive',
      },
      gebaeueprogramm: {
        available: true,
        url: 'https://www.aue.bs.ch',
        key_measures: ['insulation', 'heat pump', 'solar', 'windows'],
        notes: "Basel-Stadt has one of Switzerland's most ambitious cantonal energy strategies.",
      },
      minergie_context: 'Very high adoption. Basel-Stadt mandates high energy standards for new builds.',
      market_notes: 'Pharma/life sciences employment base. High incomes, strong demand. Consider Basel-Landschaft (BL) for lower entry price.',
    },
    BL: {
      name_de: 'Basel-Landschaft',
      name_en: 'Basel-Country',
      region: 'German-speaking',
      property_price_ranges: {
        apartment_chf_per_m2: { low: 5500, mid: 8000, high: 11000 },
        house_chf_per_m2: { low: 5000, mid: 7500, high: 10500 },
        new_build_premium_pct: 11,
        minergie_premium_pct: 10,
        source: 'Wüest Partner Immo-Monitoring 2025, indicative',
      },
      tax: {
        cantonal_income_tax_rate_approx_pct: 13.0,
        eigenmietwert_rate_pct_of_market_rent: 70,
        eigenmietwert_status: 'abolition pending cantonal implementation',
        property_gains_tax: 'progressive',
      },
      gebaeueprogramm: {
        available: true,
        url: 'https://www.baselland.ch/politik-und-behorden/direktionen/volkswirtschafts-und-gesundheitsdirektion/amt-fur-industrie-gewerbe-und-arbeit-kiga/energie',
        key_measures: ['insulation', 'heat pump', 'solar', 'windows'],
        notes: 'Good program availability. Less competitive than Basel-Stadt.',
      },
      minergie_context: 'Growing adoption, more accessible entry prices than BS.',
      market_notes: 'Good value relative to Basel-Stadt. Strong commuter demand.',
    },
    AG: {
      name_de: 'Aargau',
      name_en: 'Aargau',
      region: 'German-speaking',
      property_price_ranges: {
        apartment_chf_per_m2: { low: 4500, mid: 6500, high: 9500 },
        house_chf_per_m2: { low: 4200, mid: 6000, high: 9000 },
        new_build_premium_pct: 10,
        minergie_premium_pct: 9,
        source: 'Wüest Partner Immo-Monitoring 2025, indicative',
      },
      tax: {
        cantonal_income_tax_rate_approx_pct: 11.5,
        eigenmietwert_rate_pct_of_market_rent: 70,
        eigenmietwert_status: 'abolition pending cantonal implementation',
        property_gains_tax: 'progressive',
      },
      gebaeueprogramm: {
        available: true,
        url: 'https://www.ag.ch/de/verwaltung/bvu/energie',
        key_measures: ['insulation', 'heat pump', 'solar', 'windows'],
        notes: "One of Switzerland's most affordable cantons. Strong commuter belt for both Zurich and Basel.",
      },
      minergie_context: 'Moderate adoption. Good opportunity for buyers seeking affordability with upgrade potential.',
      market_notes: 'Excellent value. Baden area popular with Zurich commuters. Low tax rates.',
    },
    SG: {
      name_de: 'St. Gallen',
      name_en: 'St. Gallen',
      region: 'German-speaking',
      property_price_ranges: {
        apartment_chf_per_m2: { low: 4000, mid: 6000, high: 9000 },
        house_chf_per_m2: { low: 3800, mid: 5500, high: 8500 },
        new_build_premium_pct: 10,
        minergie_premium_pct: 9,
        source: 'Wüest Partner Immo-Monitoring 2025, indicative',
      },
      tax: {
        cantonal_income_tax_rate_approx_pct: 12.5,
        eigenmietwert_rate_pct_of_market_rent: 70,
        eigenmietwert_status: 'abolition pending cantonal implementation',
        property_gains_tax: 'progressive',
      },
      gebaeueprogramm: {
        available: true,
        url: 'https://www.sg.ch/umwelt-natur/energie.html',
        key_measures: ['insulation', 'heat pump', 'solar', 'windows'],
        notes: 'Good program. More affordable market means renovation budgets stretch further.',
      },
      minergie_context: 'Moderate adoption. Good scope for buyers to add value through sustainable upgrades.',
      market_notes: 'Among the most affordable German-speaking cantons. Rheintal and city of St. Gallen are main centres.',
    },
    LU: {
      name_de: 'Luzern',
      name_en: 'Lucerne',
      region: 'German-speaking',
      property_price_ranges: {
        apartment_chf_per_m2: { low: 5500, mid: 8000, high: 12000 },
        house_chf_per_m2: { low: 5000, mid: 7500, high: 11000 },
        new_build_premium_pct: 11,
        minergie_premium_pct: 10,
        source: 'Wüest Partner Immo-Monitoring 2025, indicative',
      },
      tax: {
        cantonal_income_tax_rate_approx_pct: 11.0,
        eigenmietwert_rate_pct_of_market_rent: 70,
        eigenmietwert_status: 'abolition pending cantonal implementation',
        property_gains_tax: 'progressive',
      },
      gebaeueprogramm: {
        available: true,
        url: 'https://www.lu.ch/verwaltung/BUD/uwe/energie',
        key_measures: ['insulation', 'heat pump', 'solar', 'windows'],
        notes: 'Good program. Lucerne city popular with families seeking quality of life outside Zurich.',
      },
      minergie_context: 'Good adoption, particularly in newer builds.',
      market_notes: 'Good value relative to Zurich. Low cantonal taxes. Strong quality of life draw.',
    },
    TI: {
      name_de: 'Tessin',
      name_en: 'Ticino',
      region: 'Italian-speaking',
      property_price_ranges: {
        apartment_chf_per_m2: { low: 4500, mid: 7000, high: 12000 },
        house_chf_per_m2: { low: 4000, mid: 6500, high: 11000 },
        new_build_premium_pct: 12,
        minergie_premium_pct: 10,
        source: 'Wüest Partner Immo-Monitoring 2025, indicative',
      },
      tax: {
        cantonal_income_tax_rate_approx_pct: 14.0,
        eigenmietwert_rate_pct_of_market_rent: 65,
        eigenmietwert_status: 'abolition pending cantonal implementation',
        property_gains_tax: 'progressive',
      },
      gebaeueprogramm: {
        available: true,
        url: 'https://www4.ti.ch/dfe/de/uacer/uffici/ure/temi/energia/',
        key_measures: ['insulation', 'heat pump', 'solar', 'windows'],
        notes: 'Italian-language program. Lugano area significantly more expensive than rest of canton.',
      },
      minergie_context: 'Growing adoption. Italian building traditions create interesting renovation opportunities.',
      market_notes: 'Unique market — Mediterranean climate, Italian culture, Swiss legal system. Lugano is expensive; other areas more accessible.',
    },
    GR: {
      name_de: 'Graubünden',
      name_en: 'Grisons',
      region: 'Multilingual (DE/RM/IT)',
      property_price_ranges: {
        apartment_chf_per_m2: { low: 4000, mid: 7000, high: 20000 },
        house_chf_per_m2: { low: 3800, mid: 6500, high: 18000 },
        new_build_premium_pct: 12,
        minergie_premium_pct: 10,
        source: 'Wüest Partner Immo-Monitoring 2025, indicative — wide range due to resort vs. valley market split',
      },
      tax: {
        cantonal_income_tax_rate_approx_pct: 11.5,
        eigenmietwert_rate_pct_of_market_rent: 70,
        eigenmietwert_status: 'abolition pending cantonal implementation',
        property_gains_tax: 'progressive',
      },
      gebaeueprogramm: {
        available: true,
        url: 'https://www.gr.ch/DE/institutionen/verwaltung/dvs/awt/energie',
        key_measures: ['insulation', 'heat pump', 'solar', 'windows'],
        notes: 'Wide price range: Chur (affordable) vs. Davos/St. Moritz (premium resort market). Lex Koller restrictions apply to non-residents for second homes.',
      },
      minergie_context: 'Important in alpine climate context — energy efficiency directly impacts heating costs.',
      market_notes: 'Lex Koller restricts non-EU/EFTA residents from buying second homes. Resort markets have very high prices and separate dynamics.',
    },
    VS: {
      name_de: 'Wallis',
      name_en: 'Valais',
      region: 'Bilingual (DE/FR)',
      property_price_ranges: {
        apartment_chf_per_m2: { low: 3500, mid: 6000, high: 15000 },
        house_chf_per_m2: { low: 3200, mid: 5500, high: 14000 },
        new_build_premium_pct: 11,
        minergie_premium_pct: 10,
        source: 'Wüest Partner Immo-Monitoring 2025, indicative — wide range due to resort vs. valley split',
      },
      tax: {
        cantonal_income_tax_rate_approx_pct: 13.0,
        eigenmietwert_rate_pct_of_market_rent: 70,
        eigenmietwert_status: 'abolition pending cantonal implementation',
        property_gains_tax: 'progressive',
      },
      gebaeueprogramm: {
        available: true,
        url: 'https://www.vs.ch/web/sde/energie',
        key_measures: ['insulation', 'heat pump', 'solar', 'windows'],
        notes: 'Good solar potential (highest sunshine hours in Switzerland). Lex Koller applies for resort areas.',
      },
      minergie_context: 'Growing. Solar potential is a genuine financial asset in this canton.',
      market_notes: 'Sion and Brig are affordable. Zermatt and Verbier are international luxury markets with Lex Koller restrictions.',
    },
    FR: {
      name_de: 'Freiburg',
      name_en: 'Fribourg',
      region: 'Bilingual (DE/FR)',
      property_price_ranges: {
        apartment_chf_per_m2: { low: 4500, mid: 7000, high: 10000 },
        house_chf_per_m2: { low: 4200, mid: 6500, high: 9500 },
        new_build_premium_pct: 11,
        minergie_premium_pct: 10,
        source: 'Wüest Partner Immo-Monitoring 2025, indicative',
      },
      tax: {
        cantonal_income_tax_rate_approx_pct: 14.0,
        eigenmietwert_rate_pct_of_market_rent: 70,
        eigenmietwert_status: 'abolition pending cantonal implementation',
        property_gains_tax: 'progressive',
      },
      gebaeueprogramm: {
        available: true,
        url: 'https://www.fr.ch/energie',
        key_measures: ['insulation', 'heat pump', 'solar', 'windows'],
        notes: 'Good program. Fribourg city is affordable relative to Lausanne and Bern.',
      },
      minergie_context: 'Moderate adoption. Good opportunity for value-add through upgrades.',
      market_notes: 'Underrated canton. University city, bilingual, between Bern and Lausanne. Affordable entry prices.',
    },
    NE: {
      name_de: 'Neuenburg',
      name_en: 'Neuchâtel',
      region: 'French-speaking',
      property_price_ranges: {
        apartment_chf_per_m2: { low: 3800, mid: 5500, high: 8500 },
        house_chf_per_m2: { low: 3500, mid: 5000, high: 8000 },
        new_build_premium_pct: 10,
        minergie_premium_pct: 9,
        source: 'Wüest Partner Immo-Monitoring 2025, indicative',
      },
      tax: {
        cantonal_income_tax_rate_approx_pct: 15.5,
        eigenmietwert_rate_pct_of_market_rent: 70,
        eigenmietwert_status: 'abolition pending cantonal implementation',
        property_gains_tax: 'progressive',
      },
      gebaeueprogramm: {
        available: true,
        url: 'https://www.ne.ch/autorites/DDTE/SENE/energie',
        key_measures: ['insulation', 'heat pump', 'solar', 'windows'],
        notes: 'Good program. One of the most affordable French-speaking cantons.',
      },
      minergie_context: 'Moderate adoption.',
      market_notes: 'Most affordable French-speaking canton. Watch canyon: higher tax rate offsets lower property prices.',
    },
    SO: {
      name_de: 'Solothurn',
      name_en: 'Solothurn',
      region: 'German-speaking',
      property_price_ranges: {
        apartment_chf_per_m2: { low: 4200, mid: 6000, high: 9000 },
        house_chf_per_m2: { low: 4000, mid: 5700, high: 8500 },
        new_build_premium_pct: 10,
        minergie_premium_pct: 9,
        source: 'Wüest Partner Immo-Monitoring 2025, indicative',
      },
      tax: {
        cantonal_income_tax_rate_approx_pct: 13.0,
        eigenmietwert_rate_pct_of_market_rent: 70,
        eigenmietwert_status: 'abolition pending cantonal implementation',
        property_gains_tax: 'progressive',
      },
      gebaeueprogramm: {
        available: true,
        url: 'https://so.ch/verwaltung/bau-und-justizdepartement/amt-fuer-umwelt/energie/',
        key_measures: ['insulation', 'heat pump', 'solar', 'windows'],
        notes: 'Good value. Commuter belt for both Zurich and Basel.',
      },
      minergie_context: 'Moderate adoption.',
      market_notes: 'Affordable and underrated. Good rail connections to Zurich and Basel.',
    },
    TG: {
      name_de: 'Thurgau',
      name_en: 'Thurgau',
      region: 'German-speaking',
      property_price_ranges: {
        apartment_chf_per_m2: { low: 4000, mid: 5800, high: 8500 },
        house_chf_per_m2: { low: 3800, mid: 5500, high: 8000 },
        new_build_premium_pct: 10,
        minergie_premium_pct: 9,
        source: 'Wüest Partner Immo-Monitoring 2025, indicative',
      },
      tax: {
        cantonal_income_tax_rate_approx_pct: 11.5,
        eigenmietwert_rate_pct_of_market_rent: 70,
        eigenmietwert_status: 'abolition pending cantonal implementation',
        property_gains_tax: 'progressive',
      },
      gebaeueprogramm: {
        available: true,
        url: 'https://www.tg.ch/verwaltung/departemente/departement-fuer-inneres-und-volkswirtschaft/amt-fuer-energie.html/6430',
        key_measures: ['insulation', 'heat pump', 'solar', 'windows'],
        notes: 'Good value canton. Lake Constance area popular with families.',
      },
      minergie_context: 'Moderate adoption.',
      market_notes: 'Affordable. Low taxes. Good for families seeking space outside Zurich.',
    },
  },
  energy_classes: {
    description: 'Swiss GEAK (Gebäudeenergieausweis der Kantone) energy rating scale A to G',
    classes: {
      A: { label: 'A', description: 'Highest efficiency — Minergie-A / Plusenergie standard', typical_heating_cost_chf_per_m2_per_year: 5, co2_kg_per_m2_per_year: 2, notes: 'Net zero or energy positive. Very rare in existing stock.' },
      B: { label: 'B', description: 'Excellent — Minergie-P standard', typical_heating_cost_chf_per_m2_per_year: 12, co2_kg_per_m2_per_year: 6, notes: 'Passive house standard. Increasingly common in new builds post-2015.' },
      C: { label: 'C', description: 'Good — Minergie standard', typical_heating_cost_chf_per_m2_per_year: 22, co2_kg_per_m2_per_year: 12, notes: 'Standard Minergie label. Common in new builds and well-renovated existing buildings.' },
      D: { label: 'D', description: 'Average — SIA 380/1 2009 compliant', typical_heating_cost_chf_per_m2_per_year: 38, co2_kg_per_m2_per_year: 22, notes: 'Meets current minimum standards. Typical of buildings renovated in the 2000s.' },
      E: { label: 'E', description: 'Below average — partial renovation or older stock', typical_heating_cost_chf_per_m2_per_year: 58, co2_kg_per_m2_per_year: 35, notes: 'Common in 1980s-1990s buildings. Renovation subsidy eligible.' },
      F: { label: 'F', description: 'Poor — minimal or no renovation', typical_heating_cost_chf_per_m2_per_year: 80, co2_kg_per_m2_per_year: 50, notes: 'Typical of unrenovated 1960s-1970s buildings. Strong renovation case.' },
      G: { label: 'G', description: 'Very poor — pre-1960 unrenovated or oil/gas heating dominant', typical_heating_cost_chf_per_m2_per_year: 110, co2_kg_per_m2_per_year: 70, notes: 'Significant energy cost and regulatory risk. Heating replacement likely mandatory within 10 years under cantonal energy laws.' },
    },
  },
  minergie: {
    standards: {
      MINERGIE: { label: 'Minergie', description: 'Standard energy efficiency label for new and renovated buildings', construction_cost_premium_pct: 10, renovation_cost_premium_pct: 15, annual_energy_saving_pct_vs_unrenovated: 60, resale_premium_pct: 5, url: 'https://www.minergie.ch' },
      MINERGIE_P: { label: 'Minergie-P', description: 'Passive house standard — very low energy demand', construction_cost_premium_pct: 15, renovation_cost_premium_pct: 25, annual_energy_saving_pct_vs_unrenovated: 80, resale_premium_pct: 8, url: 'https://www.minergie.ch' },
      MINERGIE_A: { label: 'Minergie-A', description: 'Net zero energy — building produces as much as it consumes', construction_cost_premium_pct: 20, renovation_cost_premium_pct: 35, annual_energy_saving_pct_vs_unrenovated: 95, resale_premium_pct: 12, url: 'https://www.minergie.ch' },
    },
  },
  renovation_cost_benchmarks: {
    currency: 'CHF',
    basis: 'per m2 of treated floor area, indicative ranges',
    source: 'SIA cost tables, Bauen in der Schweiz, Wüest Partner, indicative 2025',
    measures: {
      roof_insulation: { low: 80, mid: 150, high: 250, unit: 'CHF/m2 roof area' },
      facade_insulation: { low: 120, mid: 200, high: 350, unit: 'CHF/m2 facade area' },
      window_replacement: { low: 800, mid: 1200, high: 2000, unit: 'CHF per window' },
      heat_pump_air_water: { low: 15000, mid: 25000, high: 40000, unit: 'CHF total system' },
      heat_pump_ground_source: { low: 25000, mid: 40000, high: 60000, unit: 'CHF total system' },
      solar_pv: { low: 8000, mid: 15000, high: 30000, unit: 'CHF total system (6-20 kWp)' },
      solar_thermal: { low: 8000, mid: 14000, high: 22000, unit: 'CHF total system' },
      full_minergie_retrofit_apartment: { low: 500, mid: 900, high: 1400, unit: 'CHF/m2 living area' },
      full_minergie_retrofit_house: { low: 600, mid: 1100, high: 1800, unit: 'CHF/m2 living area' },
    },
    notes: 'Costs vary significantly by building type, access, existing condition, and contractor. Always obtain 3 quotes. Gebäudeprogramm subsidies can reduce net cost by 20-40% depending on measure and canton.',
  },
  gebaeueprogramm_federal: {
    description: 'Federal co-funding program for building envelope and heating upgrades',
    url: 'https://www.energieschweiz.ch/gebäudeprogramm',
    co2_levy_funded: true,
    typical_subsidy_ranges: {
      insulation_chf_per_m2: { low: 20, high: 60 },
      heat_pump_replacement_chf: { low: 2000, high: 8000 },
      solar_thermal_chf: { low: 1000, high: 3500 },
      notes: 'Federal baseline topped up by cantonal programs. Total subsidy varies by canton and current program budget. Some cantons have waiting periods.',
    },
    eligibility: 'Owner-occupied and rental residential buildings. Must be existing building (not new build). Minimum energy improvement required.',
  },
  build_cost_benchmarks: {
    currency: 'CHF',
    basis: 'per m2 gross floor area (BGF/SIA 416), indicative ranges',
    source: 'SIA cost tables, indicative 2025',
    standards: {
      standard_build: { low: 2800, mid: 3800, high: 5000, unit: 'CHF/m2 BGF' },
      minergie: { low: 3200, mid: 4400, high: 5800, unit: 'CHF/m2 BGF' },
      minergie_p: { low: 3600, mid: 5000, high: 6500, unit: 'CHF/m2 BGF' },
      minergie_a: { low: 4000, mid: 5500, high: 7500, unit: 'CHF/m2 BGF' },
    },
    additional_costs: {
      land_not_included: true,
      architect_fees_pct_of_build_cost: { low: 12, high: 18 },
      engineer_fees_pct_of_build_cost: { low: 5, high: 10 },
      permits_and_fees_pct: { low: 2, high: 5 },
      contingency_pct: { low: 10, high: 15 },
    },
    notes: 'Build costs vary significantly by site conditions, access, specification level, and market conditions. These are indicative ranges only.',
  },
}

/* ========================================================================== *
 * FORMAT HELPERS
 * ========================================================================== */

const _chf0 = new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 })
const _num0 = new Intl.NumberFormat('de-CH', { maximumFractionDigits: 0 })

function chf(value) {
  if (value == null || !isFinite(value)) return '—'
  return _chf0.format(value)
}
function int(value) {
  if (value == null || !isFinite(value)) return '—'
  return _num0.format(value)
}
function pct(fraction, digits = 0) {
  if (fraction == null || !isFinite(fraction)) return '—'
  return `${(fraction * 100).toFixed(digits)}%`
}

/* ========================================================================== *
 * CANTONS
 * ========================================================================== */

const cantonOptions = Object.entries(DATA.cantons)
  .map(([code, c]) => ({ code, nameDe: c.name_de, nameEn: c.name_en, region: c.region }))
  .sort((a, b) => a.nameEn.localeCompare(b.nameEn))

function getCanton(code) {
  return DATA.cantons[code] || null
}

const eigenmietwert = DATA.eigenmietwert
const dataMeta = DATA.meta

/* ========================================================================== *
 * AFFORDABILITY ENGINE (Phase 1)
 * ========================================================================== */

const R = DATA.mortgage_rules
const MIN_DOWN = R.min_down_payment_pct / 100
const MIN_LIQUID = R.min_liquid_savings_pct / 100
const MAX_PILLAR2 = R.max_pillar2_pct / 100
const MAX_LTV = 1 - MIN_DOWN
const NOTIONAL_RATE = R.notional_interest_rate_pct / 100
const MAINTENANCE = R.maintenance_cost_pct_of_value / 100
const COST_RATIO = R.max_housing_cost_income_ratio
const AMORT_TARGET_LTV = R.amortization_target_pct / 100
const AMORT_YEARS = R.amortization_years

const HOUSING_COST_FRACTION =
  NOTIONAL_RATE * MAX_LTV +
  Math.max(0, MAX_LTV - AMORT_TARGET_LTV) / AMORT_YEARS +
  MAINTENANCE

function floorTo(value, step) {
  if (!isFinite(value) || value <= 0) return 0
  return Math.floor(value / step) * step
}

function num(v) {
  const n = typeof v === 'string' ? parseFloat(v.replace(/[^0-9.-]/g, '')) : v
  return isFinite(n) && n > 0 ? n : 0
}

function calculateAffordability(input) {
  const grossIncome = num(input.grossIncome)
  const savings = num(input.savings)
  const pillar2 = num(input.pillar2)

  const priceFromLiquid = savings / MIN_LIQUID
  const priceFromTotalEquity = (savings + pillar2) / MIN_DOWN
  const equityMaxPrice = Math.min(priceFromLiquid, priceFromTotalEquity)

  const affordabilityMaxPrice =
    HOUSING_COST_FRACTION > 0 ? (COST_RATIO * grossIncome) / HOUSING_COST_FRACTION : 0

  const rawMaxPrice = Math.min(equityMaxPrice, affordabilityMaxPrice)
  const maxPrice = floorTo(rawMaxPrice, 10000)
  const bindingConstraint = affordabilityMaxPrice <= equityMaxPrice ? 'income' : 'equity'

  const downPayment = maxPrice * MIN_DOWN
  const mortgage = maxPrice * MAX_LTV
  const pillar2Used = Math.min(pillar2, maxPrice * MAX_PILLAR2, downPayment)
  const savingsUsed = Math.max(0, downPayment - pillar2Used)

  const annualInterest = mortgage * NOTIONAL_RATE
  const annualAmortization =
    (Math.max(0, MAX_LTV - AMORT_TARGET_LTV) / AMORT_YEARS) * maxPrice
  const annualMaintenance = maxPrice * MAINTENANCE
  const annualHousingCost = annualInterest + annualAmortization + annualMaintenance
  const incomeShare = grossIncome > 0 ? annualHousingCost / grossIncome : 0

  const MEANINGFUL_PRICE = 200000
  const viable = maxPrice >= MEANINGFUL_PRICE && savings > 0

  const shortfall = computeShortfall({
    viable,
    bindingConstraint,
    savings,
    pillar2,
    grossIncome,
    maxPrice,
  })

  return {
    inputs: { grossIncome, savings, pillar2, canton: input.canton },
    maxPrice,
    bindingConstraint,
    viable,
    shortfall,
    constraints: {
      equityMaxPrice: floorTo(equityMaxPrice, 10000),
      affordabilityMaxPrice: floorTo(affordabilityMaxPrice, 10000),
      priceFromLiquid: floorTo(priceFromLiquid, 10000),
      priceFromTotalEquity: floorTo(priceFromTotalEquity, 10000),
    },
    downPaymentBreakdown: {
      total: downPayment,
      fromSavings: savingsUsed,
      fromPillar2: pillar2Used,
      mortgage,
      ltv: MAX_LTV,
    },
    annualCosts: {
      interest: annualInterest,
      amortization: annualAmortization,
      maintenance: annualMaintenance,
      total: annualHousingCost,
      incomeShare,
      affordabilityCeiling: COST_RATIO * grossIncome,
    },
    rules: {
      minDownPct: R.min_down_payment_pct,
      minLiquidPct: R.min_liquid_savings_pct,
      maxPillar2Pct: R.max_pillar2_pct,
      notionalRatePct: R.notional_interest_rate_pct,
      maintenancePct: R.maintenance_cost_pct_of_value,
      costRatio: COST_RATIO,
    },
  }
}

function computeShortfall({ viable, bindingConstraint, savings, pillar2, grossIncome, maxPrice }) {
  if (viable) return null
  const targetPrice = 200000

  if (bindingConstraint === 'equity' || savings <= 0) {
    const liquidNeeded = targetPrice * MIN_LIQUID
    const liquidGap = Math.max(0, liquidNeeded - savings)
    const usablePillar2 = Math.min(pillar2, targetPrice * MAX_PILLAR2)
    const totalEquityNeeded = targetPrice * MIN_DOWN
    const totalGap = Math.max(0, totalEquityNeeded - savings - usablePillar2)
    const savingsGap = Math.max(liquidGap, totalGap)
    return {
      type: 'equity',
      targetPrice,
      savingsGap,
      message:
        savingsGap > 0
          ? `You're about ${formatGap(savingsGap)} short on equity to buy a CHF 200,000 property — the minimum where the numbers start to work.`
          : `Your equity is close. Small changes in price or savings could tip this into viable territory.`,
    }
  }

  const incomeNeeded = (HOUSING_COST_FRACTION * targetPrice) / COST_RATIO
  const incomeGap = Math.max(0, incomeNeeded - grossIncome)
  return {
    type: 'income',
    targetPrice,
    incomeGap,
    message: `At your current income, the affordability rule caps you below the CHF 200,000 level. Roughly ${formatGap(incomeGap)} more in annual gross household income would change that.`,
  }
}

function formatGap(value) {
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(
    Math.round(value / 1000) * 1000,
  )
}

/* ========================================================================== *
 * EXPLORATION (Phase 2)
 * ========================================================================== */

function priceBand(cantonCode, propertyType) {
  const c = getCanton(cantonCode)
  if (!c) return null
  const ranges = c.property_price_ranges
  return propertyType === 'house' ? ranges.house_chf_per_m2 : ranges.apartment_chf_per_m2
}

function marketOverview(cantonCode, budget, propertyType) {
  const band = priceBand(cantonCode, propertyType)
  if (!band || !budget) return null
  return {
    pricePerM2: band,
    sizeM2: {
      low: Math.round(budget / band.high),
      mid: Math.round(budget / band.mid),
      high: Math.round(budget / band.low),
    },
    source: band.source || DATA.cantons[cantonCode].property_price_ranges.source,
  }
}

function impliedSize(cantonCode, budget, propertyType) {
  const band = priceBand(cantonCode, propertyType)
  if (!band || !budget) return 0
  return Math.max(1, Math.round(budget / band.mid))
}

function energyClassTable(sizeM2) {
  const size = sizeM2 || 100
  return Object.values(DATA.energy_classes.classes).map((c) => {
    const perYear = c.typical_heating_cost_chf_per_m2_per_year
    return {
      label: c.label,
      description: c.description,
      perM2Year: perYear,
      annual: Math.round(perYear * size),
      tenYear: Math.round(perYear * size * 10),
      co2PerYear: Math.round(c.co2_kg_per_m2_per_year * size),
      notes: c.notes,
    }
  })
}

function energyDelta(sizeM2, betterClass = 'A', worseClass = 'D') {
  const table = energyClassTable(sizeM2)
  const a = table.find((r) => r.label === betterClass)
  const b = table.find((r) => r.label === worseClass)
  if (!a || !b) return null
  return { better: a, worse: b, annualSaving: b.annual - a.annual, tenYearSaving: b.tenYear - a.tenYear }
}

function minergieStandards() {
  return Object.values(DATA.minergie.standards).map((s) => ({
    label: s.label,
    description: s.description,
    buildPremiumPct: s.construction_cost_premium_pct,
    renovationPremiumPct: s.renovation_cost_premium_pct,
    energySavingPct: s.annual_energy_saving_pct_vs_unrenovated,
    resalePremiumPct: s.resale_premium_pct,
    url: s.url,
  }))
}

function subsidyOverview(cantonCode) {
  const c = getCanton(cantonCode)
  if (!c) return null
  const fed = DATA.gebaeueprogramm_federal
  return {
    cantonal: {
      available: c.gebaeueprogramm.available,
      url: c.gebaeueprogramm.url,
      measures: c.gebaeueprogramm.key_measures,
      notes: c.gebaeueprogramm.notes,
    },
    federal: { url: fed.url, ranges: fed.typical_subsidy_ranges, eligibility: fed.eligibility },
  }
}

const SUSTAINABILITY_PRIORITIES = [
  { value: 'energy', label: 'Energy efficiency', blurb: 'Lower running costs and a better GEAK class. The biggest lever on the 10-year cost of owning.' },
  { value: 'solar', label: 'Solar potential', blurb: 'Roof orientation and local sunshine. In sunny cantons this is a real financial asset, not just a green badge.' },
  { value: 'heating', label: 'Heating type', blurb: 'Heat pump vs. oil/gas. Fossil systems carry rising cost and regulatory risk — replacement may become mandatory.' },
  { value: 'minergie', label: 'Minergie label', blurb: 'A certified standard with a known cost premium and resale advantage. Some banks offer better conditions for it.' },
]

/* ========================================================================== *
 * OPTIONS (Phase 3)
 * ========================================================================== */

const CLASS_UNRENOVATED = 'E'
const CLASS_MINERGIE = 'C'

function heatingCostPerM2(classLabel) {
  return DATA.energy_classes.classes[classLabel].typical_heating_cost_chf_per_m2_per_year
}
function tenYearHeating(sizeM2, classLabel) {
  return Math.round(heatingCostPerM2(classLabel) * sizeM2 * 10)
}

function optionRenovate(cantonCode, sizeM2, propertyType) {
  const size = sizeM2 || 100
  const reno = DATA.renovation_cost_benchmarks.measures
  const retrofit =
    propertyType === 'house' ? reno.full_minergie_retrofit_house : reno.full_minergie_retrofit_apartment

  const cost = {
    low: Math.round(retrofit.low * size),
    mid: Math.round(retrofit.mid * size),
    high: Math.round(retrofit.high * size),
  }

  const fed = DATA.gebaeueprogramm_federal.typical_subsidy_ranges
  const subsidy = {
    low: Math.round(fed.insulation_chf_per_m2.low * size + fed.heat_pump_replacement_chf.low),
    high: Math.round(fed.insulation_chf_per_m2.high * size + fed.heat_pump_replacement_chf.high),
  }

  const netCost = {
    low: Math.max(0, cost.low - subsidy.high),
    mid: Math.max(0, cost.mid - (subsidy.low + subsidy.high) / 2),
    high: Math.max(0, cost.high - subsidy.low),
  }

  const runningCost = {
    unrenovatedClass: CLASS_UNRENOVATED,
    minergieClass: CLASS_MINERGIE,
    unrenovatedTenYear: tenYearHeating(size, CLASS_UNRENOVATED),
    minergieTenYear: tenYearHeating(size, CLASS_MINERGIE),
    tenYearSaving: tenYearHeating(size, CLASS_UNRENOVATED) - tenYearHeating(size, CLASS_MINERGIE),
  }

  return { size, cost, subsidy, netCost, runningCost }
}

function optionNewBuild(cantonCode, budget, sizeM2) {
  const c = getCanton(cantonCode)
  if (!c || !budget) return null
  const ranges = c.property_price_ranges
  const size = sizeM2 || 100

  const newBuildPremiumPct = ranges.new_build_premium_pct
  const minergiePremiumPct = ranges.minergie_premium_pct
  const newBuildPremium = Math.round((budget * newBuildPremiumPct) / 100)
  const minergiePremium = Math.round((budget * minergiePremiumPct) / 100)
  const tenYearSaving = tenYearHeating(size, CLASS_UNRENOVATED) - tenYearHeating(size, CLASS_MINERGIE)

  return {
    newBuildPremiumPct,
    minergiePremiumPct,
    newBuildPremium,
    minergiePremium,
    newBuildPrice: budget + newBuildPremium,
    minergiePrice: budget + minergiePremium,
    tenYearSaving,
    availabilitySignal: c.minergie_context,
    marketNotes: c.market_notes,
    resalePremiumPct: DATA.minergie.standards.MINERGIE.resale_premium_pct,
  }
}

function optionBuild(cantonCode, sizeM2) {
  const size = sizeM2 || 120
  const b = DATA.build_cost_benchmarks
  const standards = [
    { key: 'standard_build', label: 'Standard build' },
    { key: 'minergie', label: 'Minergie' },
    { key: 'minergie_p', label: 'Minergie-P' },
    { key: 'minergie_a', label: 'Minergie-A (net zero)' },
  ].map((s) => {
    const r = b.standards[s.key]
    return {
      label: s.label,
      perM2: r,
      total: { low: Math.round(r.low * size), mid: Math.round(r.mid * size), high: Math.round(r.high * size) },
    }
  })

  const add = b.additional_costs
  return {
    size,
    standards,
    landIncluded: false,
    softCosts: {
      architectPct: add.architect_fees_pct_of_build_cost,
      engineerPct: add.engineer_fees_pct_of_build_cost,
      permitsPct: add.permits_and_fees_pct,
      contingencyPct: add.contingency_pct,
    },
    landProxy: priceBand(cantonCode, 'house'),
    planningPortal: getCanton(cantonCode)?.gebaeueprogramm.url,
    notes: b.notes,
  }
}

/* ========================================================================== *
 * ACTION PLAN (Phase 4)
 * ========================================================================== */

function buildActionPlan(profile) {
  const { phase1, explore } = profile
  const canton = getCanton(explore.canton)
  const steps = []

  if (!phase1.viable && phase1.shortfall) {
    if (phase1.shortfall.type === 'equity') {
      const gap = phase1.shortfall.savingsGap
      const monthlyAt15pct = Math.round((phase1.inputs.grossIncome * 0.15) / 12)
      const monthsToClose = monthlyAt15pct > 0 ? Math.ceil(gap / monthlyAt15pct) : null
      steps.push({
        title: 'Close your equity gap first',
        body:
          `You're about ${chf(gap)} short of the cash needed to buy at a meaningful level. Saving ~15% of your gross income` +
          (monthsToClose
            ? ` (≈ ${chf(monthlyAt15pct)}/month) would close it in roughly ${monthsToClose} months.`
            : `.`) +
          ` Building this in a 3a pillar can add a tax advantage along the way.`,
        tone: 'amber',
      })
    } else {
      steps.push({
        title: 'Grow income or adjust expectations',
        body: `Your savings are fine — the limit is the affordability rule. About ${chf(phase1.shortfall.incomeGap)} more in annual gross household income would move you into viable territory. A co-borrower can also change this calculation.`,
        tone: 'amber',
      })
    }
  } else {
    steps.push({
      title: 'Get a non-binding mortgage indication',
      body: `You're financially ready up to about ${chf(phase1.maxPrice)}. Ask 1–2 banks for a free, non-binding indication ("Finanzierungsbestätigung"). Bring proof of income, savings, and any 2nd-pillar statement. This is a soft check — it doesn't commit you to anything.`,
      tone: 'teal',
    })
  }

  if (canton?.gebaeueprogramm?.available) {
    const measures = canton.gebaeueprogramm.key_measures.slice(0, 3).join(', ')
    steps.push({
      title: `Check ${canton.name_en} subsidies before you commit`,
      body: `${canton.name_en} runs a Gebäudeprogramm covering ${measures}. If you buy something to renovate, these can cut net upgrade cost by 20–40%. Programmes have budgets and sometimes waiting lists — confirm current availability early.`,
      tone: 'teal',
      link: { label: `${canton.name_en} energy programme`, url: canton.gebaeueprogramm.url },
    })
  }

  if (explore.chosenOption === 'renovate') {
    steps.push({
      title: 'Get 3 renovation quotes before offering',
      body: `For the buy-and-renovate path, the upgrade cost swings widely by building condition. Get three contractor quotes on a candidate before you make an offer, and factor the net (post-subsidy) cost into your maximum price.`,
      tone: 'default',
    })
  } else if (explore.chosenOption === 'new') {
    steps.push({
      title: 'Confirm the Minergie certificate',
      body: `For a new / certified home, ask for the actual Minergie certificate and GEAK class in writing. The label affects running cost, resale, and sometimes mortgage conditions — don't take "energy efficient" on trust.`,
      tone: 'default',
    })
  } else if (explore.chosenOption === 'build') {
    steps.push({
      title: 'Verify what the plot allows',
      body: `Before any plot purchase, check the Nutzungszone (zoning) and Ausnützungsziffer (how much floor area you may build) with the cantonal/communal planning office. Land cost and buildability vary enormously and aren't captured by build-cost benchmarks alone.`,
      tone: 'default',
    })
  }

  steps.push({
    title: 'Pressure-test the numbers with someone neutral',
    body: `Take this summary to a fee-based (not commission-based) advisor, or a family member who's bought before. The goal is a second read on the assumptions — not a sales pitch.`,
    tone: 'default',
  })

  return steps.slice(0, 5)
}

/* ========================================================================== *
 * SHARE STATE (URL hash) — hardened for sandboxed iframes
 * ========================================================================== */

const SHARE_KEYS = [
  ['gi', 'grossIncome'],
  ['sv', 'savings'],
  ['p2', 'pillar2'],
  ['ct', 'canton'],
  ['hs', 'householdSize'],
  ['em', 'employmentType'],
  ['bg', 'budget'],
  ['pt', 'propertyType'],
  ['cd', 'condition'],
  ['su', 'sustainability'],
  ['op', 'chosenOption'],
  ['ph', 'phase'],
]

function encodeState(state) {
  const params = new URLSearchParams()
  for (const [short, full] of SHARE_KEYS) {
    const v = state[full]
    if (v !== undefined && v !== null && v !== '') params.set(short, String(v))
  }
  return params.toString()
}

function decodeState() {
  try {
    const hash = window.location.hash.replace(/^#/, '')
    const params = new URLSearchParams(hash)
    const out = {}
    for (const [short, full] of SHARE_KEYS) {
      if (params.has(short)) out[full] = params.get(short)
    }
    return out
  } catch {
    return {}
  }
}

function syncHash(state) {
  try {
    const hash = encodeState(state)
    const url = `${window.location.pathname}${window.location.search}#${hash}`
    window.history.replaceState(null, '', url)
  } catch {
    /* sandboxed iframe without history access — sharing simply no-ops */
  }
}

function shareableUrl(state) {
  try {
    return `${window.location.origin}${window.location.pathname}#${encodeState(state)}`
  } catch {
    return ''
  }
}

/* ========================================================================== *
 * UI PRIMITIVES
 * ========================================================================== */

function InfoTerm({ term, children }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <span className="relative inline-block">
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        className="cursor-help border-b border-dotted border-teal-500 text-teal-800 hover:text-teal-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded-sm"
      >
        {term}
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-3 text-left text-sm font-normal leading-relaxed text-slate-700 shadow-lg"
        >
          {children}
        </span>
      )}
    </span>
  )
}

const CARD_TONES = {
  default: 'border-slate-200 bg-white',
  teal: 'border-teal-200 bg-teal-50/60',
  amber: 'border-amber-200 bg-amber-50/60',
  slate: 'border-slate-200 bg-slate-50',
}

function Card({ title, children, tone = 'default', className = '' }) {
  return (
    <section className={`rounded-2xl border p-5 shadow-sm ${CARD_TONES[tone]} ${className}`}>
      {title && (
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      )}
      {children}
    </section>
  )
}

function Row({ label, value, sub, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className={'text-sm ' + (strong ? 'font-semibold text-slate-900' : 'text-slate-600')}>
        {label}
        {sub && <span className="ml-1 text-xs text-slate-400">{sub}</span>}
      </span>
      <span
        className={
          'tabular-nums ' +
          (strong ? 'text-base font-semibold text-slate-900' : 'text-sm text-slate-700')
        }
      >
        {value}
      </span>
    </div>
  )
}

function Pill({ children, tone = 'slate' }) {
  const map = {
    slate: 'bg-slate-100 text-slate-600',
    teal: 'bg-teal-100 text-teal-700',
    amber: 'bg-amber-100 text-amber-700',
  }
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[tone]}`}>{children}</span>
}

function Indicative({ children }) {
  return (
    <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-slate-400">
      <span aria-hidden>ⓘ</span>
      <span>{children || 'Indicative ranges only — not live listings or a quote.'}</span>
    </p>
  )
}

/* ========================================================================== *
 * PHASE 1 — FORM
 * ========================================================================== */

const EMPLOYMENT_TYPES = [
  { value: 'employed', label: 'Employed' },
  { value: 'self_employed', label: 'Self-employed' },
  { value: 'mixed', label: 'Mixed' },
]

function MoneyField({ id, label, value, onChange, placeholder, hint }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="mt-1.5 flex items-center rounded-lg border border-slate-300 bg-white focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
        <span className="select-none pl-3 pr-2 text-sm text-slate-400">CHF</span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9'.\s]/g, ''))}
          placeholder={placeholder}
          className="w-full rounded-r-lg bg-transparent py-2.5 pr-3 text-right tabular-nums text-slate-900 placeholder:text-slate-300 focus:outline-none"
        />
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

function AffordabilityForm({ values, onChange, onSubmit }) {
  const set = (key) => (val) => onChange({ ...values, [key]: val })
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="space-y-5"
    >
      <MoneyField
        id="grossIncome"
        label="Gross household income (per year)"
        value={values.grossIncome}
        onChange={set('grossIncome')}
        placeholder="120'000"
        hint="Combined annual gross income before tax and deductions."
      />
      <MoneyField
        id="savings"
        label="Liquid savings / equity"
        value={values.savings}
        onChange={set('savings')}
        placeholder="150'000"
        hint="Cash and easily-sold assets. Excludes your pension fund."
      />
      <div>
        <MoneyField
          id="pillar2"
          label="2nd pillar (pension fund) you could use — optional"
          value={values.pillar2}
          onChange={set('pillar2')}
          placeholder="80'000"
        />
        <p className="mt-1 text-xs text-slate-500">
          Your{' '}
          <InfoTerm term="2nd pillar (BVG/LPP)">
            Occupational pension savings. In Switzerland you may pledge some of it towards a home, but
            it can only cover up to half of the minimum down payment — at least 10% of the price must
            be real cash savings. Using it reduces your future pension.
          </InfoTerm>
          . Leave blank if you don't want to use it.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="canton" className="block text-sm font-medium text-slate-700">
            Canton of interest
          </label>
          <select
            id="canton"
            value={values.canton}
            onChange={(e) => set('canton')(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white py-2.5 px-3 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          >
            {cantonOptions.map((c) => (
              <option key={c.code} value={c.code}>
                {c.nameEn} ({c.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="householdSize" className="block text-sm font-medium text-slate-700">
            Household size
          </label>
          <select
            id="householdSize"
            value={values.householdSize}
            onChange={(e) => set('householdSize')(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white py-2.5 px-3 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'person' : 'people'}
                {n === 6 ? '+' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium text-slate-700">Employment type</span>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {EMPLOYMENT_TYPES.map((t) => {
            const active = values.employmentType === t.value
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => set('employmentType')(t.value)}
                className={
                  'rounded-lg border px-3 py-2.5 text-sm font-medium transition ' +
                  (active
                    ? 'border-teal-600 bg-teal-50 text-teal-800'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400')
                }
              >
                {t.label}
              </button>
            )
          })}
        </div>
        {values.employmentType === 'self_employed' && (
          <p className="mt-2 text-xs text-amber-700">
            Banks often assess self-employed income more conservatively (e.g. a 2–3 year average).
            Treat this estimate as optimistic.
          </p>
        )}
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-teal-700 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
      >
        Show what I can afford
      </button>
    </form>
  )
}

/* ========================================================================== *
 * PHASE 1 — RESULT
 * ========================================================================== */

function DPBar({ segments }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
      {segments.map((s, i) => (
        <div key={i} className={s.color} style={{ width: `${(s.value / total) * 100}%` }} title={`${s.label}: ${chf(s.value)}`} />
      ))}
    </div>
  )
}

function DPLegend({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  )
}

function AffordabilityResult({ result }) {
  const canton = getCanton(result.inputs.canton)
  const { downPaymentBreakdown: dp, annualCosts: ac, constraints } = result

  return (
    <div className="space-y-4">
      {result.viable ? (
        <Card tone="teal">
          <p className="text-sm font-medium text-teal-800">Your estimated maximum purchase price</p>
          <p className="mt-1 text-4xl font-bold tracking-tight text-teal-900">{chf(result.maxPrice)}</p>
          <p className="mt-2 text-sm leading-relaxed text-teal-900/80">
            {result.bindingConstraint === 'income' ? (
              <>
                You're limited by the{' '}
                <InfoTerm term="affordability rule">
                  Swiss banks require that your imputed annual housing costs (interest calculated at a
                  notional 5%, plus amortization and maintenance) stay under one third of your gross
                  income — even though real interest rates are lower today.
                </InfoTerm>
                , not by your savings. More equity alone won't raise this number; higher income would.
              </>
            ) : (
              <>
                You're limited by your <strong>available equity</strong>, not your income. You could
                carry a larger mortgage, but Swiss rules require at least {pct(result.rules.minDownPct / 100)} down — and at least{' '}
                {pct(result.rules.minLiquidPct / 100)} of the price in real cash savings.
              </>
            )}
          </p>
        </Card>
      ) : (
        <Card tone="amber">
          <p className="text-sm font-semibold text-amber-800">
            The numbers don't work yet — and that's worth knowing now.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-amber-900/90">{result.shortfall?.message}</p>
        </Card>
      )}

      <Card title="Where the money comes from">
        <Row label="Purchase price" value={chf(result.maxPrice)} strong />
        <div className="my-3">
          <DPBar
            segments={[
              { label: 'Cash savings', value: dp.fromSavings, color: 'bg-teal-600' },
              { label: '2nd pillar', value: dp.fromPillar2, color: 'bg-teal-300' },
              { label: 'Mortgage', value: dp.mortgage, color: 'bg-slate-300' },
            ]}
          />
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <DPLegend color="bg-teal-600" label="Cash savings" />
            <DPLegend color="bg-teal-300" label="2nd pillar" />
            <DPLegend color="bg-slate-300" label="Mortgage (debt)" />
          </div>
        </div>
        <Row label="From liquid savings" value={chf(dp.fromSavings)} />
        <Row
          label="From 2nd pillar (pension)"
          value={chf(dp.fromPillar2)}
          sub={dp.fromPillar2 > 0 ? '— reduces your pension' : undefined}
        />
        <div className="my-1 border-t border-slate-100" />
        <Row label="Down payment" value={chf(dp.total)} sub={`${pct(result.rules.minDownPct / 100)} of price`} />
        <Row label="Mortgage" value={chf(dp.mortgage)} sub={`${pct(dp.ltv)} loan-to-value`} />
      </Card>

      <Card title="Can you carry it? (annual costs)">
        <Row label="Notional interest" value={chf(ac.interest)} sub={`@ ${pct(result.rules.notionalRatePct / 100)} on the mortgage`} />
        <Row label="Amortization" value={chf(ac.amortization)} sub="2nd mortgage over 15y" />
        <Row label="Maintenance" value={chf(ac.maintenance)} sub={`${pct(result.rules.maintenancePct / 100)} of value`} />
        <div className="my-1 border-t border-slate-100" />
        <Row label="Total annual housing cost" value={chf(ac.total)} strong />
        <Row label="Affordability ceiling" value={chf(ac.affordabilityCeiling)} sub={`= ⅓ of income`} />
        <div className="mt-3">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={'h-full rounded-full ' + (ac.incomeShare > result.rules.costRatio ? 'bg-amber-500' : 'bg-teal-600')}
              style={{ width: `${Math.min(100, (ac.incomeShare / result.rules.costRatio) * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Housing costs use {pct(ac.incomeShare, 1)} of your gross income (the rule caps this at {pct(result.rules.costRatio)}).
          </p>
        </div>
      </Card>

      {!result.viable && result.shortfall && (
        <Card title="What would change this" tone="amber">
          {result.shortfall.type === 'equity' ? (
            <p className="text-sm leading-relaxed text-slate-700">
              The fastest lever is <strong>liquid savings</strong>. You need roughly{' '}
              <strong>{chf(result.shortfall.savingsGap)}</strong> more in cash to reach the entry
              point. Your 2nd pillar can help, but it can never cover the full down payment — at least{' '}
              {pct(result.rules.minLiquidPct / 100)} of the price must be real savings.
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-slate-700">
              Your savings are fine — the limit is the income-based affordability rule. Around{' '}
              <strong>{chf(result.shortfall.incomeGap)}</strong> more in annual gross household income
              would move you into viable territory.
            </p>
          )}
        </Card>
      )}

      <Card title="How this was calculated">
        <Row label="Max by your equity" value={chf(constraints.equityMaxPrice)} sub={result.bindingConstraint === 'equity' ? '← your limit' : undefined} />
        <Row label="Max by your income" value={chf(constraints.affordabilityMaxPrice)} sub={result.bindingConstraint === 'income' ? '← your limit' : undefined} />
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          We take the lower of the two. Figures are indicative estimates based on FINMA / Swiss Bankers
          Association self-regulation, not a binding mortgage offer.
        </p>
      </Card>

      <Card title="Tax note: Eigenmietwert">
        <p className="text-sm leading-relaxed text-slate-700">
          <InfoTerm term="Eigenmietwert (imputed rental value)">
            Historically, Swiss homeowners paid income tax on a notional "rent" for living in their own
            home (typically {canton ? canton.tax.eigenmietwert_rate_pct_of_market_rent : 60}–70% of market rent), partly offset by deducting mortgage interest.
          </InfoTerm>{' '}
          changed in 2025.
        </p>
        <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm leading-relaxed text-amber-900">
          <strong>Status update:</strong> Swiss voters abolished the Eigenmietwert by referendum on{' '}
          {new Date(eigenmietwert.referendum_date).toLocaleDateString('en-CH', { day: 'numeric', month: 'long', year: 'numeric' })}
          . Cantonal implementation timelines vary and mortgage-interest deductibility is being phased
          out alongside it.
          {canton && (
            <>
              {' '}In {canton.name_en}, the status is: <em>{canton.tax.eigenmietwert_status}</em>.
            </>
          )}{' '}
          Confirm the current position with a tax advisor before relying on it.
        </div>
      </Card>
    </div>
  )
}

/* ========================================================================== *
 * PHASE 2 — EXPLORATION
 * ========================================================================== */

function Segmented({ options, value, onChange, name }) {
  return (
    <div className="inline-flex flex-wrap gap-2" role="group" aria-label={name}>
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={
              'rounded-lg border px-3 py-2 text-sm font-medium transition ' +
              (active
                ? 'border-teal-600 bg-teal-50 text-teal-800'
                : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400')
            }
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function cantonName(code) {
  return cantonOptions.find((c) => c.code === code)?.nameEn || code
}

function MarketStat({ big, label }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xl font-bold tracking-tight text-slate-900">{big}</p>
      <p className="mt-1 text-xs leading-snug text-slate-500">{label}</p>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg border border-teal-100 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  )
}

const BADGE_COLORS = {
  A: 'bg-emerald-600',
  B: 'bg-green-600',
  C: 'bg-lime-600',
  D: 'bg-yellow-500',
  E: 'bg-amber-500',
  F: 'bg-orange-500',
  G: 'bg-red-600',
}

function ClassBadge({ label }) {
  return (
    <span className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white ${BADGE_COLORS[label] || 'bg-slate-500'}`}>
      {label}
    </span>
  )
}

function Phase2Exploration({ explore, onChange }) {
  const set = (key) => (val) => onChange({ ...explore, [key]: val })
  const budget = Number(String(explore.budget).replace(/[^0-9.]/g, '')) || 0

  const overview = marketOverview(explore.canton, budget, explore.propertyType)
  const size = impliedSize(explore.canton, budget, explore.propertyType)
  const table = energyClassTable(size)
  const delta = energyDelta(size, 'A', 'D')
  const minergie = minergieStandards()
  const subsidies = subsidyOverview(explore.canton)

  return (
    <div className="space-y-6">
      <Card title="Refine what you're looking for">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-slate-700">
              Budget
            </label>
            <div className="mt-1.5 flex items-center rounded-lg border border-slate-300 bg-white focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
              <span className="select-none pl-3 pr-2 text-sm text-slate-400">CHF</span>
              <input
                id="budget"
                type="text"
                inputMode="numeric"
                value={explore.budget}
                onChange={(e) => set('budget')(e.target.value.replace(/[^0-9'.\s]/g, ''))}
                className="w-full rounded-r-lg bg-transparent py-2.5 pr-3 text-right tabular-nums text-slate-900 focus:outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">Pre-filled from your Phase 1 maximum. Adjust to explore.</p>
          </div>

          <div>
            <label htmlFor="canton2" className="block text-sm font-medium text-slate-700">
              Canton / region
            </label>
            <select
              id="canton2"
              value={explore.canton}
              onChange={(e) => set('canton')(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white py-2.5 px-3 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            >
              {cantonOptions.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.nameEn} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-700">Property type</span>
            <div className="mt-1.5">
              <Segmented
                name="Property type"
                value={explore.propertyType}
                onChange={set('propertyType')}
                options={[
                  { value: 'apartment', label: 'Apartment' },
                  { value: 'house', label: 'House' },
                ]}
              />
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-700">Condition</span>
            <div className="mt-1.5">
              <Segmented
                name="Condition"
                value={explore.condition}
                onChange={set('condition')}
                options={[
                  { value: 'existing', label: 'Existing' },
                  { value: 'new', label: 'New build' },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="mt-5">
          <span className="block text-sm font-medium text-slate-700">What matters most to you?</span>
          <div className="mt-1.5">
            <Segmented
              name="Sustainability priority"
              value={explore.sustainability}
              onChange={set('sustainability')}
              options={SUSTAINABILITY_PRIORITIES.map((p) => ({ value: p.value, label: p.label }))}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {SUSTAINABILITY_PRIORITIES.find((p) => p.value === explore.sustainability)?.blurb}
          </p>
        </div>
      </Card>

      <Card title={`What ${chf(budget)} buys in ${cantonName(explore.canton)}`}>
        {overview ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MarketStat big={`${int(overview.sizeM2.low)}–${int(overview.sizeM2.high)} m²`} label={`Likely ${explore.propertyType} size at this budget`} />
              <MarketStat big={`≈ ${int(overview.sizeM2.mid)} m²`} label="Mid-market estimate" />
              <MarketStat big={`${chf(overview.pricePerM2.low)}–${chf(overview.pricePerM2.high)}`} label="Price per m² range here" />
            </div>
            <Indicative>
              Based on {overview.source}. Indicative price bands, not live listings — actual homes vary
              widely by condition and location within the canton.
            </Indicative>
          </>
        ) : (
          <p className="text-sm text-slate-500">Enter a budget above to see what it buys here.</p>
        )}
      </Card>

      <Card title="What an energy rating costs you (10-year view)">
        <p className="mb-3 text-sm leading-relaxed text-slate-600">
          The{' '}
          <InfoTerm term="GEAK class">
            The GEAK (Gebäudeenergieausweis der Kantone) rates a building's energy performance from A
            (best) to G (worst). It directly predicts your heating bills.
          </InfoTerm>{' '}
          drives your running costs. For a <strong>{int(size)} m² {explore.propertyType}</strong>, here's
          the heating-cost difference over 10 years:
        </p>

        {delta && (
          <div className="mb-4 rounded-xl bg-teal-50 p-4">
            <p className="text-sm text-teal-900">
              An <strong>A-rated</strong> home costs about <strong>{chf(delta.better.tenYear)}</strong> to
              heat over 10 years. A <strong>D-rated</strong> one costs <strong>{chf(delta.worse.tenYear)}</strong> — a
              difference of <strong className="text-teal-700">{chf(delta.tenYearSaving)}</strong>.
            </p>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Class</th>
                <th className="px-3 py-2 font-semibold">Per year</th>
                <th className="px-3 py-2 font-semibold">Over 10 years</th>
                <th className="hidden px-3 py-2 font-semibold sm:table-cell">CO₂ / year</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {table.map((r) => (
                <tr key={r.label} className="text-slate-700">
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-2">
                      <ClassBadge label={r.label} />
                      <span className="hidden text-xs text-slate-400 md:inline">{r.description}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{chf(r.annual)}</td>
                  <td className="px-3 py-2 tabular-nums font-medium text-slate-900">{chf(r.tenYear)}</td>
                  <td className="hidden px-3 py-2 tabular-nums sm:table-cell">{int(r.co2PerYear)} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Indicative>
          Heating-cost coefficients per GEAK class (SIA / Energieschweiz). Scaled to your implied {int(size)} m².
          Real bills depend on usage, tariffs, and the specific building.
        </Indicative>
      </Card>

      {subsidies && (
        <Card title={`Subsidies in ${cantonName(explore.canton)}`} tone="teal">
          <p className="text-sm leading-relaxed text-slate-700">
            The{' '}
            <InfoTerm term="Gebäudeprogramm">
              A federal + cantonal co-funded programme that pays towards insulation, window
              replacement, heat pumps and solar — for upgrading existing buildings (not new builds).
            </InfoTerm>{' '}
            here covers:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {subsidies.cantonal.measures.map((m) => (
              <Pill key={m} tone="teal">
                {m}
              </Pill>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
            <MiniStat label="Insulation" value={`${chf(subsidies.federal.ranges.insulation_chf_per_m2.low)}–${chf(subsidies.federal.ranges.insulation_chf_per_m2.high)} / m²`} />
            <MiniStat label="Heat-pump swap" value={`${chf(subsidies.federal.ranges.heat_pump_replacement_chf.low)}–${chf(subsidies.federal.ranges.heat_pump_replacement_chf.high)}`} />
            <MiniStat label="Solar thermal" value={`${chf(subsidies.federal.ranges.solar_thermal_chf.low)}–${chf(subsidies.federal.ranges.solar_thermal_chf.high)}`} />
          </div>
          {subsidies.cantonal.notes && <p className="mt-3 text-sm text-slate-600">{subsidies.cantonal.notes}</p>}
          <a href={subsidies.cantonal.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-900">
            Open the cantonal programme ↗
          </a>
        </Card>
      )}

      <Card title="Is Minergie worth it?">
        <p className="mb-3 text-sm leading-relaxed text-slate-600">
          <InfoTerm term="Minergie">
            A Swiss voluntary energy-performance label. It certifies that a building meets a defined
            comfort and efficiency standard, verified by an independent body.
          </InfoTerm>{' '}
          costs more upfront but cuts running costs and can lift resale value.
        </p>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Standard</th>
                <th className="px-3 py-2 font-semibold">Build premium</th>
                <th className="px-3 py-2 font-semibold">Energy saving</th>
                <th className="hidden px-3 py-2 font-semibold sm:table-cell">Resale uplift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {minergie.map((m) => (
                <tr key={m.label} className="text-slate-700">
                  <td className="px-3 py-2 font-medium text-slate-900">
                    {m.label}
                    <span className="hidden text-xs font-normal text-slate-400 md:inline"> — {m.description}</span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">+{m.buildPremiumPct}%</td>
                  <td className="px-3 py-2 tabular-nums text-teal-700">−{m.energySavingPct}%</td>
                  <td className="hidden px-3 py-2 tabular-nums sm:table-cell">+{m.resalePremiumPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Indicative>
          Premiums and savings from minergie.ch reference data. The energy saving is versus an
          unrenovated baseline; resale uplift varies by market segment.
        </Indicative>
      </Card>
    </div>
  )
}

/* ========================================================================== *
 * PHASE 3 — OPTIONS
 * ========================================================================== */

function OptionShell({ tag, title, subtitle, chosen, onChoose, children }) {
  return (
    <section
      className={
        'rounded-2xl border p-5 shadow-sm transition ' +
        (chosen ? 'border-teal-500 ring-2 ring-teal-200 bg-teal-50/40' : 'border-slate-200 bg-white')
      }
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Pill tone={chosen ? 'teal' : 'slate'}>{tag}</Pill>
            {chosen && <Pill tone="teal">Your pick</Pill>}
          </div>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onChoose}
          className={
            'shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ' +
            (chosen
              ? 'bg-teal-700 text-white'
              : 'border border-slate-300 bg-white text-slate-700 hover:border-teal-400 hover:text-teal-700')
          }
        >
          {chosen ? 'Selected' : 'Choose this path'}
        </button>
      </div>
      {children}
    </section>
  )
}

function Phase3Options({ explore, onChange }) {
  const budget = Number(String(explore.budget).replace(/[^0-9.]/g, '')) || 0
  const size = impliedSize(explore.canton, budget, explore.propertyType)
  const canton = getCanton(explore.canton)

  const reno = optionRenovate(explore.canton, size, explore.propertyType)
  const neu = optionNewBuild(explore.canton, budget, size)
  const build = optionBuild(explore.canton, size)

  const choose = (key) => () => onChange({ ...explore, chosenOption: key })

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-slate-600">
        Three realistic routes to a sustainable home at about <strong>{chf(budget)}</strong> in{' '}
        <strong>{canton?.name_en}</strong> (≈ {int(size)} m²). Pick the one that fits — it shapes your
        action plan in the next step.
      </p>

      <OptionShell
        tag="Option A"
        title="Buy existing & renovate to Minergie"
        subtitle="Lower entry price, upgrade on your terms, subsidies available."
        chosen={explore.chosenOption === 'renovate'}
        onChoose={choose('renovate')}
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <Row label="Renovation cost" value={`${chf(reno.cost.low)} – ${chf(reno.cost.high)}`} sub={`≈ ${chf(reno.cost.mid)}`} />
            <Row label="Less subsidies" value={`−${chf(reno.subsidy.low)} … −${chf(reno.subsidy.high)}`} />
            <div className="my-1 border-t border-slate-100" />
            <Row label="Net upgrade cost" value={`${chf(reno.netCost.low)} – ${chf(reno.netCost.high)}`} strong />
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">10-year heating cost</p>
            <Row label={`Unrenovated (class ${reno.runningCost.unrenovatedClass})`} value={chf(reno.runningCost.unrenovatedTenYear)} />
            <Row label={`After Minergie (class ${reno.runningCost.minergieClass})`} value={chf(reno.runningCost.minergieTenYear)} />
            <div className="my-1 border-t border-slate-200" />
            <Row label="You'd save" value={chf(reno.runningCost.tenYearSaving)} strong />
            <p className="mt-2 text-xs text-slate-500">Energy saving offsets part of the upgrade cost over time.</p>
          </div>
        </div>
        <Indicative>
          Retrofit benchmarks from SIA cost tables; subsidy baseline from the federal Gebäudeprogramm.
          Cantonal top-ups and building condition move these significantly — always get 3 quotes.
        </Indicative>
      </OptionShell>

      <OptionShell
        tag="Option B"
        title="Buy new / Minergie-certified"
        subtitle="Higher price, lower running cost, no renovation hassle."
        chosen={explore.chosenOption === 'new'}
        onChoose={choose('new')}
      >
        {neu ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <Row label="Equivalent existing home" value={chf(budget)} />
              <Row label="New build" value={chf(neu.newBuildPrice)} sub={`+${neu.newBuildPremiumPct}%`} />
              <Row label="Minergie-certified" value={chf(neu.minergiePrice)} sub={`+${neu.minergiePremiumPct}%`} />
              <p className="mt-2 text-xs text-slate-500">
                Premium ≈ {chf(neu.minergiePremium)} over the equivalent existing home — but it comes
                move-in ready to a high standard.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Long-term advantage</p>
              <Row label="10-year heating saving" value={chf(neu.tenYearSaving)} sub="vs typical existing" strong />
              <Row label="Resale uplift" value={`+${neu.resalePremiumPct}%`} />
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Availability here</p>
                <p className="mt-1 text-sm text-slate-600">{neu.availabilitySignal}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Enter a budget to compare.</p>
        )}
        <Indicative>
          New-build and Minergie premiums are canton-level indicative percentages (Wüest Partner /
          minergie.ch), applied to your Phase 2 budget.
        </Indicative>
      </OptionShell>

      <OptionShell
        tag="Option C"
        title="Build on a plot"
        subtitle="Most control, most complexity. Land cost is separate."
        chosen={explore.chosenOption === 'build'}
        onChoose={choose('build')}
      >
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Standard</th>
                <th className="px-3 py-2 font-semibold">Per m²</th>
                <th className="px-3 py-2 font-semibold">Build cost (≈ {int(build.size)} m²)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {build.standards.map((s) => (
                <tr key={s.label} className="text-slate-700">
                  <td className="px-3 py-2 font-medium text-slate-900">{s.label}</td>
                  <td className="px-3 py-2 tabular-nums">{chf(s.perM2.low)}–{chf(s.perM2.high)}</td>
                  <td className="px-3 py-2 tabular-nums font-medium text-slate-900">{chf(s.total.mid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Build cost is not the whole cost.</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-amber-900/90">
              <li>Land: separate, and not in this dataset — varies hugely.</li>
              <li>Architect fees ≈ {build.softCosts.architectPct.low}–{build.softCosts.architectPct.high}%</li>
              <li>Engineering ≈ {build.softCosts.engineerPct.low}–{build.softCosts.engineerPct.high}%</li>
              <li>Permits ≈ {build.softCosts.permitsPct.low}–{build.softCosts.permitsPct.high}%, plus a {build.softCosts.contingencyPct.low}–{build.softCosts.contingencyPct.high}% contingency</li>
            </ul>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Before you buy a plot</p>
            <p className="mt-1">
              Check the{' '}
              <InfoTerm term="Nutzungszone">
                The zoning category for a plot. It dictates what you may build — residential, mixed,
                density limits, height — set by the commune and canton.
              </InfoTerm>{' '}
              and{' '}
              <InfoTerm term="Ausnützungsziffer (GFZ)">
                The floor-area ratio: how much total floor area you may build relative to the plot
                size. A GFZ of 0.5 on a 600 m² plot allows ~300 m² of floor area.
              </InfoTerm>{' '}
              with the planning office.
            </p>
            {build.planningPortal && (
              <a href={build.planningPortal} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex text-sm font-medium text-teal-700 hover:text-teal-900">
                {canton?.name_en} cantonal portal ↗
              </a>
            )}
          </div>
        </div>
        <Indicative>
          Build-cost benchmarks per m² gross floor area (SIA). Land excluded. This option is
          informational in the MVP — treat it as a starting frame, not a budget.
        </Indicative>
      </OptionShell>
    </div>
  )
}

/* ========================================================================== *
 * PHASE 4 — ACTION PLAN
 * ========================================================================== */

const OPTION_LABELS = {
  renovate: 'Buy existing & renovate to Minergie',
  new: 'Buy new / Minergie-certified',
  build: 'Build on a plot',
}

const STEP_TONES = {
  teal: 'border-teal-200 bg-teal-50',
  amber: 'border-amber-200 bg-amber-50',
  default: 'border-slate-200 bg-white',
}

function RecapStat({ label, value }) {
  return (
    <div className="py-1">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  )
}

function Phase4ActionPlan({ phase1, explore, shareUrl }) {
  const [copied, setCopied] = useState(false)
  const canton = getCanton(explore.canton)
  const budget = Number(String(explore.budget).replace(/[^0-9.]/g, '')) || 0
  const size = impliedSize(explore.canton, budget, explore.propertyType)
  const steps = buildActionPlan({ phase1, explore })

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card title="Your situation at a glance" tone={phase1.viable ? 'teal' : 'amber'}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
          <RecapStat label="Max purchase price" value={chf(phase1.maxPrice)} />
          <RecapStat label="Status" value={phase1.viable ? 'Ready to explore' : 'Not yet — see step 1'} />
          <RecapStat label="Target canton" value={canton?.name_en || explore.canton} />
          <RecapStat label="Budget explored" value={chf(budget)} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <Pill>{explore.propertyType}</Pill>
          <Pill>{explore.condition}</Pill>
          {explore.chosenOption && <Pill tone="teal">{OPTION_LABELS[explore.chosenOption]}</Pill>}
          <span className="text-xs text-slate-400">≈ {int(size)} m²</span>
        </div>
      </Card>

      <div>
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Your next {steps.length} steps</h2>
        <p className="mb-4 text-sm text-slate-500">Ordered to tackle the most decision-blocking thing first.</p>
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={i} className={`rounded-2xl border p-5 shadow-sm ${STEP_TONES[step.tone] || STEP_TONES.default}`}>
              <div className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">{step.body}</p>
                  {step.link && (
                    <a href={step.link.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex text-sm font-medium text-teal-700 hover:text-teal-900">
                      {step.link.label} ↗
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <Card title="Take this with you" className="no-print">
        <p className="text-sm leading-relaxed text-slate-600">
          Nothing is stored on a server. Your link encodes your inputs so you can reopen or share this
          exact summary — bring it to a bank, broker, or family conversation.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={copyLink} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800">
            {copied ? '✓ Link copied' : 'Copy shareable link'}
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                window.print()
              } catch {
                /* print blocked in sandbox */
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
          >
            Download / print as PDF
          </button>
        </div>
        {shareUrl && <p className="mt-3 break-all text-xs text-slate-400">{shareUrl}</p>}
      </Card>
    </div>
  )
}

/* ========================================================================== *
 * APP SHELL
 * ========================================================================== */

const PHASES = [
  { n: 1, label: 'Can I buy?' },
  { n: 2, label: 'What to look for' },
  { n: 3, label: 'My real options' },
  { n: 4, label: 'Action plan' },
]

const PHASE_HEADINGS = {
  1: {
    title: 'Can I buy?',
    blurb:
      "Get an honest picture of your buying power under Swiss mortgage rules — before you talk to a bank, broker, or builder. No account needed, nothing saved, nothing sold to you.",
  },
  2: {
    title: 'What should I look for?',
    blurb:
      'See what your budget buys in your target canton, what an energy rating really costs over 10 years, and which subsidies apply.',
  },
  3: {
    title: 'What are my real options?',
    blurb:
      'Three realistic routes — renovate, buy new, or build — with indicative costs, subsidies, and long-term running-cost comparisons.',
  },
  4: {
    title: 'What do I do next?',
    blurb: 'A personalized action plan based on everything above, ready to download or share.',
  },
}

const DEFAULT_VALUES = {
  grossIncome: '',
  savings: '',
  pillar2: '',
  canton: 'ZH',
  householdSize: '2',
  employmentType: 'employed',
}

const DEFAULT_EXPLORE = {
  budget: '',
  canton: '',
  propertyType: 'apartment',
  condition: 'existing',
  sustainability: 'energy',
  chosenOption: '',
}

function calc(values) {
  return calculateAffordability({ ...values, householdSize: Number(values.householdSize) })
}

function PhaseNav({ current, maxVisited, onJump }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
      {PHASES.map((p, i) => {
        const active = p.n === current
        const done = p.n < current
        const reachable = p.n <= maxVisited
        return (
          <li key={p.n} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => reachable && onJump(p.n)}
              disabled={!reachable}
              className={'flex items-center gap-2 rounded-full py-0.5 pr-2 ' + (reachable ? 'cursor-pointer' : 'cursor-not-allowed')}
            >
              <span
                className={
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ' +
                  (active ? 'bg-teal-700 text-white' : done ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-400')
                }
              >
                {p.n}
              </span>
              <span className={active ? 'font-medium text-slate-900' : 'text-slate-400'}>{p.label}</span>
            </button>
            {i < PHASES.length - 1 && <span className="mx-1 hidden text-slate-300 sm:inline">→</span>}
          </li>
        )
      })}
    </ol>
  )
}

function EmptyResult() {
  return (
    <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12 L12 3 l9 9" />
          <path d="M5 10 v10 h14 V10" />
          <path d="M9 20 v-6 h6 v6" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-700">Your results will appear here</p>
      <p className="mt-1 max-w-xs text-sm text-slate-500">
        Fill in your income and savings, and we'll show your maximum purchase price, how the down
        payment breaks down, and an honest flag if it doesn't add up yet.
      </p>
    </div>
  )
}

function TrackCard({ title, desc }) {
  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-5 opacity-90">
      <span className="absolute right-4 top-4 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">Coming soon</span>
      <h3 className="pr-24 text-base font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
    </div>
  )
}

export default function App() {
  const [phase, setPhase] = useState(1)
  const [maxVisited, setMaxVisited] = useState(1)
  const [values, setValues] = useState(DEFAULT_VALUES)
  const [phase1, setPhase1] = useState(null)
  const [explore, setExplore] = useState(DEFAULT_EXPLORE)
  const restored = useRef(false)

  useEffect(() => {
    if (restored.current) return
    restored.current = true
    const s = decodeState()
    if (!s || Object.keys(s).length === 0) return

    const nextValues = {
      grossIncome: s.grossIncome ?? '',
      savings: s.savings ?? '',
      pillar2: s.pillar2 ?? '',
      canton: s.canton ?? DEFAULT_VALUES.canton,
      householdSize: s.householdSize ?? DEFAULT_VALUES.householdSize,
      employmentType: s.employmentType ?? DEFAULT_VALUES.employmentType,
    }
    setValues(nextValues)
    setExplore({
      budget: s.budget ?? '',
      canton: s.canton ?? DEFAULT_EXPLORE.canton,
      propertyType: s.propertyType ?? DEFAULT_EXPLORE.propertyType,
      condition: s.condition ?? DEFAULT_EXPLORE.condition,
      sustainability: s.sustainability ?? DEFAULT_EXPLORE.sustainability,
      chosenOption: s.chosenOption ?? '',
    })

    if (nextValues.grossIncome && nextValues.savings) {
      const result = calc(nextValues)
      setPhase1(result)
      const target = Math.min(4, Math.max(1, Number(s.phase) || 1))
      setPhase(target)
      setMaxVisited(target)
    }
  }, [])

  useEffect(() => {
    syncHash({
      ...values,
      canton: explore.canton || values.canton,
      budget: explore.budget,
      propertyType: explore.propertyType,
      condition: explore.condition,
      sustainability: explore.sustainability,
      chosenOption: explore.chosenOption,
      phase,
    })
  }, [values, explore, phase])

  const flatState = {
    ...values,
    canton: explore.canton || values.canton,
    budget: explore.budget,
    propertyType: explore.propertyType,
    condition: explore.condition,
    sustainability: explore.sustainability,
    chosenOption: explore.chosenOption,
    phase,
  }

  const runPhase1 = () => setPhase1(calc(values))

  const handleValuesChange = (next) => {
    setValues(next)
    if (phase1) setPhase1(calc(next))
  }

  const handleExploreChange = (next) => {
    setExplore(next)
    if (next.canton !== values.canton) {
      const nv = { ...values, canton: next.canton }
      setValues(nv)
      if (phase1) setPhase1(calc(nv))
    }
  }

  const goToPhase = (n) => {
    if (n < 1 || n > 4) return
    if (n > 1 && !phase1) return
    if (n === 2) {
      setExplore((e) => ({
        ...e,
        budget: e.budget || String(phase1?.maxPrice || ''),
        canton: e.canton || values.canton,
      }))
    }
    setPhase(n)
    setMaxVisited((m) => Math.max(m, n))
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      /* no-op */
    }
  }

  const canContinue = phase < 4 && (phase > 1 || !!phase1)
  const heading = PHASE_HEADINGS[phase]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white">P</span>
            <div>
              <p className="text-sm font-semibold leading-tight text-slate-900">Plinthly</p>
              <p className="text-xs leading-tight text-slate-500">Swiss Sustainable Real Estate Explorer</p>
            </div>
          </div>
          <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 sm:inline">
            No selling · No sign-up · Just honest numbers
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 no-print">
          <PhaseNav current={phase} maxVisited={maxVisited} onJump={goToPhase} />
        </div>

        <div className="mb-8 max-w-2xl no-print">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{heading.title}</h1>
          <p className="mt-2 text-base leading-relaxed text-slate-600">{heading.blurb}</p>
        </div>

        {phase === 1 && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-lg font-semibold text-slate-900">Your situation</h2>
                <AffordabilityForm values={values} onChange={handleValuesChange} onSubmit={runPhase1} />
              </div>
            </div>
            <div>{phase1 ? <AffordabilityResult result={phase1} /> : <EmptyResult />}</div>
          </div>
        )}

        {phase === 2 && <Phase2Exploration explore={explore} onChange={handleExploreChange} />}
        {phase === 3 && <Phase3Options explore={explore} onChange={handleExploreChange} />}
        {phase === 4 && phase1 && (
          <Phase4ActionPlan phase1={phase1} explore={explore} shareUrl={shareableUrl(flatState)} />
        )}

        <div className="mt-10 flex items-center justify-between no-print">
          <button
            type="button"
            onClick={() => goToPhase(phase - 1)}
            disabled={phase === 1}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition enabled:hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-0"
          >
            ← Back
          </button>

          {canContinue ? (
            <button
              type="button"
              onClick={() => goToPhase(phase + 1)}
              className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
            >
              {phase === 1 ? 'Continue to exploration →' : phase === 2 ? 'See my real options →' : 'Build my action plan →'}
            </button>
          ) : phase === 1 && !phase1 ? (
            <span className="text-sm text-slate-400">Run the calculator to continue →</span>
          ) : (
            <span />
          )}
        </div>

        {phase === 1 && (
          <div className="mt-12 border-t border-slate-200 pt-8 no-print">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Not a first-time buyer?</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TrackCard title="I already own property" desc="Rental yield, second-property tax, and sustainable-upgrade ROI." />
              <TrackCard title="I have land or want to build" desc="Build-cost estimator by standard and cantonal planning basics." />
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 text-xs leading-relaxed text-slate-400">
          Indicative estimates only — not financial, tax, or mortgage advice. Based on FINMA / Swiss
          Bankers Association self-regulation and publicly available cantonal data ({dataMeta.last_updated}).
          Always verify with a qualified advisor before making decisions.
        </div>
      </footer>
    </div>
  )
}
