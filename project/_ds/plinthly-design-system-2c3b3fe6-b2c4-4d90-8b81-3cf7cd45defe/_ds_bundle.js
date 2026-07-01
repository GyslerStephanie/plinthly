/* @ds-bundle: {"format":3,"namespace":"PlinthlyDesignSystem_2c3b3f","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"EyebrowLabel","sourcePath":"components/core/EyebrowLabel.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"StatBlock","sourcePath":"components/data/StatBlock.jsx"},{"name":"Takeaway","sourcePath":"components/data/Takeaway.jsx"},{"name":"FieldRow","sourcePath":"components/forms/FieldRow.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"SegmentedControl","sourcePath":"components/forms/SegmentedControl.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"c2925ed41656","components/core/Button.jsx":"7f6b5af33ca2","components/core/Card.jsx":"c27a17f9cc1b","components/core/EyebrowLabel.jsx":"85fa6947107b","components/core/Icon.jsx":"082e1733925d","components/core/IconButton.jsx":"9b34ef3404f7","components/data/StatBlock.jsx":"86b3f6ef71fe","components/data/Takeaway.jsx":"8b98f7aab232","components/forms/FieldRow.jsx":"c769acfb7e1c","components/forms/Input.jsx":"6f8f4722e37b","components/forms/SegmentedControl.jsx":"6ab9a19fb69c","ui_kits/explorer/ExplorerApp.jsx":"fd2a67bacb14","ui_kits/explorer/ResultPanel.jsx":"63d4d521f386","ui_kits/explorer/SituationForm.jsx":"67d78db21b9b","ui_kits/explorer/TopBar.jsx":"2fc561152eb8"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.PlinthlyDesignSystem_2c3b3f = window.PlinthlyDesignSystem_2c3b3f || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Small status pill. 'success' for affordable/positive, 'cost' for the coral
 * cost/attention signal, 'accent' for the solid-coral emphasis pill.
 */
function Badge({
  tone = 'neutral',
  icon = null,
  className = '',
  children,
  ...rest
}) {
  const cls = ['plly-badge', `plly-badge--${tone}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), icon ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      display: 'inline-flex'
    }
  }, icon) : null, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Plinthly primary action button. Solid moss primary, white secondary,
 * transparent ghost, coral danger. Grounded hover/press (darken + 1px nudge).
 */
function Button({
  variant = 'primary',
  size = 'md',
  iconLeft = null,
  iconRight = null,
  fullWidth = false,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const cls = ['plly-btn', `plly-btn--${variant}`, `plly-btn--${size}`, fullWidth ? 'plly-btn--full' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    className: cls,
    disabled: disabled
  }, rest), iconLeft ? /*#__PURE__*/React.createElement("span", {
    className: "plly-btn-icon",
    "aria-hidden": "true",
    style: {
      display: 'inline-flex'
    }
  }, iconLeft) : null, children ? /*#__PURE__*/React.createElement("span", null, children) : null, iconRight ? /*#__PURE__*/React.createElement("span", {
    className: "plly-btn-icon",
    "aria-hidden": "true",
    style: {
      display: 'inline-flex'
    }
  }, iconRight) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Surface container. The brand's signature is a white card resting on the
 * voxel landscape — use elevation="float" for hero/result cards over imagery.
 */
function Card({
  elevation = 'flat',
  size = 'md',
  as = 'div',
  className = '',
  style,
  children,
  ...rest
}) {
  const Tag = as;
  const cls = ['plly-card', size === 'lg' ? 'plly-card--lg' : '', `plly-card--${elevation}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: cls,
    style: style
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/EyebrowLabel.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Uppercase mono eyebrow label — the brand's only uppercase text. */
function EyebrowLabel({
  as = 'div',
  className = '',
  children,
  ...rest
}) {
  const Tag = as;
  const cls = ['plly-eyebrow', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: cls
  }, rest), children);
}
Object.assign(__ds_scope, { EyebrowLabel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/EyebrowLabel.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Plinthly icon set — inline Lucide geometry (https://lucide.dev), MIT.
   Self-contained SVG so icons always render in cards, kits, screenshots and
   PDF export with no webfont or CDN dependency. 24×24 grid, 2px stroke,
   round caps/joins, currentColor — so icons inherit text colour. */
const PATHS = {
  'check': '<path d="M20 6 9 17l-5-5"/>',
  'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'info': '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  'printer': '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14" rx="1"/>',
  'pencil': '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  'coins': '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>',
  'gauge': '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  'alert-triangle': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  'arrow-down': '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  'message-circle': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  'home': '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  'piggy-bank': '<path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z"/><path d="M2 9v1c0 1.1.9 2 2 2h1"/><path d="M16 11h.01"/>',
  'sprout': '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>'
};
PATHS['triangle-alert'] = PATHS['alert-triangle'];

/**
 * Plinthly icon — inline Lucide SVG, inherits currentColor.
 */
function Icon({
  name,
  size = 18,
  strokeWidth = 2,
  style,
  ...rest
}) {
  const inner = PATHS[name] || PATHS['info'];
  return /*#__PURE__*/React.createElement("svg", _extends({
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    style: {
      display: 'block',
      flex: 'none',
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: inner
    }
  }, rest));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Square/round icon-only button. Use for toolbar actions, the floating
 * chat launcher, close buttons, etc. Always pass an accessible label.
 */
function IconButton({
  size = 'md',
  bordered = false,
  round = false,
  label,
  className = '',
  children,
  ...rest
}) {
  const cls = ['plly-iconbtn', `plly-iconbtn--${size}`, bordered ? 'plly-iconbtn--bordered' : '', className].filter(Boolean).join(' ');
  const style = round ? {
    borderRadius: 'var(--radius-full)'
  } : undefined;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    className: cls,
    "aria-label": label,
    title: label,
    style: style
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/data/StatBlock.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * A labelled figure: optional eyebrow, big mono number, optional caption.
 * The core money readout of the product (e.g. "CHF 750'000").
 */
function StatBlock({
  eyebrow = null,
  figure,
  size = 'md',
  caption = null,
  className = '',
  ...rest
}) {
  const cls = ['plly-stat', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls
  }, rest), eyebrow ? /*#__PURE__*/React.createElement(__ds_scope.EyebrowLabel, null, eyebrow) : null, /*#__PURE__*/React.createElement("div", {
    className: `plly-stat-figure plly-stat-figure--${size}`
  }, figure), caption ? /*#__PURE__*/React.createElement("div", {
    className: "plly-stat-caption"
  }, caption) : null);
}
Object.assign(__ds_scope, { StatBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatBlock.jsx", error: String((e && e.message) || e) }); }

// components/data/Takeaway.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * A single "key takeaway" row — status icon in a soft round chip + a line of
 * text. Use bold (<b>) inside the text for the figure/verb that matters.
 */
function Takeaway({
  tone = 'success',
  icon = null,
  className = '',
  children,
  ...rest
}) {
  const cls = ['plly-takeaway', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: `plly-takeaway-icon plly-takeaway-icon--${tone}`,
    "aria-hidden": "true"
  }, icon), /*#__PURE__*/React.createElement("div", {
    className: "plly-takeaway-text"
  }, children));
}
Object.assign(__ds_scope, { Takeaway });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Takeaway.jsx", error: String((e && e.message) || e) }); }

// components/forms/FieldRow.jsx
try { (() => {
/**
 * Label + control + helper/error stack. The helper line explains *why* a
 * field matters in one calm sentence — the Plinthly form pattern.
 */
function FieldRow({
  label,
  htmlFor,
  optional = false,
  help = null,
  error = null,
  className = '',
  children
}) {
  const cls = ['plly-field', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    className: cls
  }, label ? /*#__PURE__*/React.createElement("label", {
    className: "plly-field-label",
    htmlFor: htmlFor
  }, label, optional ? /*#__PURE__*/React.createElement("span", {
    className: "plly-field-optional"
  }, " \u2014 optional") : null) : null, children, error ? /*#__PURE__*/React.createElement("div", {
    className: "plly-field-help plly-field-help--error"
  }, error) : help ? /*#__PURE__*/React.createElement("div", {
    className: "plly-field-help"
  }, help) : null);
}
Object.assign(__ds_scope, { FieldRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FieldRow.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Text / number input. For money use prefix="CHF" and figure so the value
 * renders in tabular mono, right-aligned — the Plinthly money input.
 */
function Input({
  prefix = null,
  suffix = null,
  figure = false,
  invalid = false,
  className = '',
  ...rest
}) {
  const cls = ['plly-input', prefix ? 'plly-input--has-prefix' : '', suffix ? 'plly-input--has-suffix' : '', figure ? 'plly-input--figure' : '', invalid ? 'plly-input--invalid' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", {
    className: "plly-input-wrap"
  }, prefix ? /*#__PURE__*/React.createElement("span", {
    className: "plly-input-prefix"
  }, prefix) : null, /*#__PURE__*/React.createElement("input", _extends({
    className: cls,
    "aria-invalid": invalid || undefined
  }, rest)), suffix ? /*#__PURE__*/React.createElement("span", {
    className: "plly-input-suffix"
  }, suffix) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/SegmentedControl.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Segmented control for 2–4 short, mutually exclusive options
 * (e.g. Buy / Build / Renovate, Apartment / House).
 */
function SegmentedControl({
  options = [],
  value,
  onChange,
  className = '',
  ...rest
}) {
  const cls = ['plly-segmented', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls,
    role: "tablist"
  }, rest), options.map(opt => {
    const val = typeof opt === 'string' ? opt : opt.value;
    const label = typeof opt === 'string' ? opt : opt.label;
    const selected = val === value;
    return /*#__PURE__*/React.createElement("button", {
      key: val,
      type: "button",
      role: "tab",
      "aria-selected": selected,
      className: "plly-segmented-opt",
      onClick: () => onChange && onChange(val)
    }, label);
  }));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// ui_kits/explorer/ExplorerApp.jsx
try { (() => {
/* Plinthly Explorer — app shell, state, affordability calc, render */
(function () {
  const DS = window.PlinthlyDesignSystem_2c3b3f;
  const {
    Button,
    IconButton,
    Card,
    Badge,
    EyebrowLabel,
    Icon
  } = DS;
  const {
    swiss
  } = window.PXfmt;
  const Ic = ({
    n
  }) => /*#__PURE__*/React.createElement(Icon, {
    name: n
  });
  const chf = n => 'CHF ' + swiss(Math.round(n));

  // ---- Swiss affordability model (simplified, illustrative) ----
  function compute(s) {
    const totalEquity = s.hardCash + s.pillar3a + s.pillar2;
    const hardEquity = s.hardCash + s.pillar3a; // counts to 10% hard-cash floor
    const ceilDeposit = totalEquity / 0.20; // need 20% down
    const ceilHardCash = hardEquity / 0.10; // ≥10% in real cash
    const ceilIncome = s.income * 6.6; // 33%-of-income affordability test
    const maxPrice = Math.max(0, Math.min(ceilDeposit, ceilHardCash, ceilIncome));
    const down = maxPrice * 0.20;
    const mortgage = maxPrice * 0.80;
    const annualCarry = mortgage * 0.014 + maxPrice * 0.01 + Math.max(0, mortgage - maxPrice * 0.6645) / 15;
    const monthly = annualCarry / 12;

    // carry vs a 33%-of-income budget → headroom
    const budgetMonthly = s.income * 0.33 / 12;
    const usedPct = budgetMonthly > 0 ? Math.round(monthly / budgetMonthly * 100) : 0;
    const cappedBy = ceilIncome <= ceilDeposit && ceilIncome <= ceilHardCash ? 'income' : 'deposit';
    let verdict;
    if (maxPrice <= 0) verdict = {
      tone: 'cost',
      icon: 'x',
      label: 'Not yet',
      headroom: 'Not yet'
    };else if (usedPct < 85) verdict = {
      tone: 'success',
      icon: 'check',
      label: 'Affordable',
      headroom: 'Comfortable headroom'
    };else if (usedPct <= 100) verdict = {
      tone: 'accent',
      icon: 'gauge',
      label: 'Tight',
      headroom: 'Tight headroom'
    };else verdict = {
      tone: 'cost',
      icon: 'alert-triangle',
      label: 'Over budget',
      headroom: 'Over budget'
    };
    return {
      maxPrice,
      down,
      monthly,
      headroomPct: Math.min(100, usedPct),
      cappedBy,
      verdict,
      maxPriceF: chf(maxPrice),
      downF: chf(down),
      monthlyF: chf(monthly) + '/mo'
    };
  }
  function SnapshotModal({
    calc,
    state,
    onClose
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "px-overlay",
      onClick: onClose
    }, /*#__PURE__*/React.createElement("div", {
      className: "px-snapshot px-fadein",
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      className: "px-snapshot-head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(EyebrowLabel, null, "Plinthly snapshot"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 26,
        marginTop: 6,
        color: 'var(--text-strong)'
      }
    }, calc.maxPriceF)), /*#__PURE__*/React.createElement(IconButton, {
      label: "Close",
      onClick: onClose
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "x"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "px-snapshot-body"
    }, /*#__PURE__*/React.createElement("div", {
      className: "px-snapshot-row"
    }, /*#__PURE__*/React.createElement("span", {
      className: "k"
    }, "Intent"), /*#__PURE__*/React.createElement("span", {
      className: "v"
    }, state.intent)), /*#__PURE__*/React.createElement("div", {
      className: "px-snapshot-row"
    }, /*#__PURE__*/React.createElement("span", {
      className: "k"
    }, "Max purchase price"), /*#__PURE__*/React.createElement("span", {
      className: "v"
    }, calc.maxPriceF)), /*#__PURE__*/React.createElement("div", {
      className: "px-snapshot-row"
    }, /*#__PURE__*/React.createElement("span", {
      className: "k"
    }, "Down payment (20%)"), /*#__PURE__*/React.createElement("span", {
      className: "v"
    }, calc.downF)), /*#__PURE__*/React.createElement("div", {
      className: "px-snapshot-row"
    }, /*#__PURE__*/React.createElement("span", {
      className: "k"
    }, "Est. monthly carry"), /*#__PURE__*/React.createElement("span", {
      className: "v"
    }, calc.monthlyF)), /*#__PURE__*/React.createElement("div", {
      className: "px-snapshot-row"
    }, /*#__PURE__*/React.createElement("span", {
      className: "k"
    }, "Capped by"), /*#__PURE__*/React.createElement("span", {
      className: "v",
      style: {
        textTransform: 'capitalize'
      }
    }, calc.cappedBy)), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 18,
        display: 'flex',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      iconLeft: /*#__PURE__*/React.createElement(Ic, {
        n: "download"
      }),
      fullWidth: true
    }, "Download PDF")), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 12,
        color: 'var(--text-muted)',
        marginTop: 14,
        lineHeight: 1.5
      }
    }, "Indicative only \u2014 based on current Swiss affordability rules. Nothing is saved or sold."))));
  }
  function App() {
    const [state, setState] = React.useState({
      intent: 'Buy',
      income: 200000,
      hardCash: 150000,
      pillar3a: 0,
      pillar2: 0
    });
    const [snap, setSnap] = React.useState(false);
    const set = patch => setState(s => ({
      ...s,
      ...patch
    }));
    const calc = compute(state);
    return /*#__PURE__*/React.createElement("div", {
      className: "px-app"
    }, /*#__PURE__*/React.createElement(window.PXTopBar, {
      maxPrice: calc.maxPriceF,
      downPayment: calc.downF,
      monthly: calc.monthlyF,
      verdict: calc.verdict
    }), /*#__PURE__*/React.createElement("section", {
      className: "px-hero"
    }, /*#__PURE__*/React.createElement("img", {
      className: "px-hero-land",
      src: "../../assets/voxel-landscape-hero.png",
      alt: ""
    }), /*#__PURE__*/React.createElement("div", {
      className: "px-hero-inner"
    }, /*#__PURE__*/React.createElement("h1", null, "Can I buy?"), /*#__PURE__*/React.createElement("p", null, "Get an honest picture of your buying power under Swiss mortgage rules \u2014 before you talk to a bank, broker, or builder. No account needed, nothing saved, nothing sold to you."), /*#__PURE__*/React.createElement("div", {
      className: "px-hero-cta"
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      iconLeft: /*#__PURE__*/React.createElement(Ic, {
        n: "arrow-down"
      })
    }, "See what I could buy"), /*#__PURE__*/React.createElement("span", {
      className: "px-hero-note"
    }, "Takes about 2 minutes.")))), /*#__PURE__*/React.createElement("main", {
      className: "px-main"
    }, /*#__PURE__*/React.createElement("div", {
      className: "px-grid"
    }, /*#__PURE__*/React.createElement(window.PXSituationForm, {
      state: state,
      set: set
    }), /*#__PURE__*/React.createElement(window.PXResultPanel, {
      calc: calc,
      onSnapshot: () => setSnap(true)
    }))), /*#__PURE__*/React.createElement("footer", {
      className: "px-footer"
    }, /*#__PURE__*/React.createElement("div", {
      className: "px-footer-band"
    }), /*#__PURE__*/React.createElement("div", {
      className: "px-footer-bar"
    }, /*#__PURE__*/React.createElement("div", {
      className: "px-brand"
    }, /*#__PURE__*/React.createElement("img", {
      src: "../../assets/plinthly-mark-flat.png",
      alt: "",
      style: {
        width: 24,
        height: 24
      }
    }), /*#__PURE__*/React.createElement("b", null, "Plinthly")), /*#__PURE__*/React.createElement("small", null, "Built on solid ground \xB7 Swiss sustainable property planning \xB7 Not a bank, broker, or listing."))), /*#__PURE__*/React.createElement("div", {
      className: "px-floating"
    }, /*#__PURE__*/React.createElement(IconButton, {
      label: "Ask Plinthly",
      round: true,
      size: "lg",
      bordered: true,
      style: {
        boxShadow: 'var(--shadow-md)'
      }
    }, /*#__PURE__*/React.createElement(Ic, {
      n: "message-circle"
    }))), snap ? /*#__PURE__*/React.createElement(SnapshotModal, {
      calc: calc,
      state: state,
      onClose: () => setSnap(false)
    }) : null);
  }
  ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/explorer/ExplorerApp.jsx", error: String((e && e.message) || e) }); }

// ui_kits/explorer/ResultPanel.jsx
try { (() => {
/* Plinthly Explorer — result panel + key takeaways */
(function () {
  const DS = window.PlinthlyDesignSystem_2c3b3f;
  const {
    Card,
    Button,
    Badge,
    StatBlock,
    Takeaway,
    EyebrowLabel,
    Icon
  } = DS;
  const Ic = ({
    n
  }) => /*#__PURE__*/React.createElement(Icon, {
    name: n
  });
  function ResultPanel({
    calc,
    onSnapshot
  }) {
    const {
      maxPriceF,
      downF,
      monthlyF,
      headroomPct,
      verdict,
      cappedBy
    } = calc;
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Card, {
      elevation: "float",
      size: "lg",
      as: "section"
    }, /*#__PURE__*/React.createElement("div", {
      className: "px-result-figure"
    }, /*#__PURE__*/React.createElement(StatBlock, {
      eyebrow: "Your estimated max purchase price",
      figure: maxPriceF,
      size: "lg"
    }), /*#__PURE__*/React.createElement(Badge, {
      tone: verdict.tone,
      icon: /*#__PURE__*/React.createElement(Ic, {
        n: verdict.icon
      })
    }, verdict.headroom)), /*#__PURE__*/React.createElement("div", {
      className: "px-meter"
    }, /*#__PURE__*/React.createElement("div", {
      className: "px-meter-track"
    }, /*#__PURE__*/React.createElement("div", {
      className: "px-meter-fill",
      style: {
        width: `${Math.min(100, headroomPct)}%`
      }
    })), /*#__PURE__*/React.createElement("div", {
      className: "px-meter-labels"
    }, /*#__PURE__*/React.createElement("span", null, "Buying power used"), /*#__PURE__*/React.createElement("span", null, headroomPct, "%"))), /*#__PURE__*/React.createElement("p", {
      className: "px-result-copy"
    }, "You're capped by your ", /*#__PURE__*/React.createElement("b", null, cappedBy), ", not your income \u2014 the monthly carry sits comfortably within budget. Growing your savings raises this ceiling."), /*#__PURE__*/React.createElement("p", {
      className: "px-result-fine"
    }, "Held by your equity ceiling, not your income. Swiss rules require at least ", /*#__PURE__*/React.createElement("b", null, "20% down"), " \u2014 and at least ", /*#__PURE__*/React.createElement("b", null, "10% of the price in real cash"), " savings."), /*#__PURE__*/React.createElement("div", {
      className: "px-result-actions"
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      iconLeft: /*#__PURE__*/React.createElement(Ic, {
        n: "printer"
      }),
      onClick: onSnapshot
    }, "Save snapshot (PDF)"), /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "sm",
      iconLeft: /*#__PURE__*/React.createElement(Ic, {
        n: "pencil"
      })
    }, "Edit your numbers"))), /*#__PURE__*/React.createElement(Card, {
      elevation: "raised",
      as: "section",
      className: "px-takeaways"
    }, /*#__PURE__*/React.createElement(EyebrowLabel, null, "Key takeaways"), /*#__PURE__*/React.createElement("div", {
      className: "px-tk-stack",
      style: {
        marginTop: 16
      }
    }, /*#__PURE__*/React.createElement(Takeaway, {
      tone: "success",
      icon: /*#__PURE__*/React.createElement(Ic, {
        n: "check"
      })
    }, "You can afford up to ", /*#__PURE__*/React.createElement("b", null, maxPriceF), "."), /*#__PURE__*/React.createElement(Takeaway, {
      tone: "success",
      icon: /*#__PURE__*/React.createElement(Ic, {
        n: "check"
      })
    }, "You're capped by your ", cappedBy, " \u2014 more savings lifts this."), /*#__PURE__*/React.createElement(Takeaway, {
      tone: "info",
      icon: /*#__PURE__*/React.createElement(Ic, {
        n: "info"
      })
    }, "Bring ", /*#__PURE__*/React.createElement("b", null, downF), " up front \u2014 at least half of it in real cash."), /*#__PURE__*/React.createElement(Takeaway, {
      tone: "cost",
      icon: /*#__PURE__*/React.createElement(Ic, {
        n: "coins"
      })
    }, "Real cost = ", /*#__PURE__*/React.createElement("b", null, monthlyF), " today."))));
  }
  window.PXResultPanel = ResultPanel;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/explorer/ResultPanel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/explorer/SituationForm.jsx
try { (() => {
/* Plinthly Explorer — "Your situation" form */
(function () {
  const DS = window.PlinthlyDesignSystem_2c3b3f;
  const {
    Card,
    FieldRow,
    Input,
    SegmentedControl,
    EyebrowLabel
  } = DS;

  // Parse "200'000" / "200000" -> 200000
  function num(s) {
    return parseInt(String(s).replace(/[^0-9]/g, ''), 10) || 0;
  }
  // Format 200000 -> "200'000"
  function swiss(n) {
    return n.toLocaleString('de-CH').replace(/\u2019|,/g, "'");
  }
  function MoneyField({
    id,
    label,
    optional,
    help,
    error,
    value,
    onChange,
    placeholder
  }) {
    return /*#__PURE__*/React.createElement(FieldRow, {
      label: label,
      htmlFor: id,
      optional: optional,
      help: help,
      error: error
    }, /*#__PURE__*/React.createElement(Input, {
      id: id,
      prefix: "CHF",
      figure: true,
      inputMode: "numeric",
      invalid: !!error,
      value: value ? swiss(value) : '',
      placeholder: placeholder,
      onChange: e => onChange(num(e.target.value))
    }));
  }
  function SituationForm({
    state,
    set
  }) {
    const cashError = state.downStarted && state.hardCash < state.price * 0.2 ? 'At least 20% of the price must be hard cash.' : null;
    return /*#__PURE__*/React.createElement(Card, {
      elevation: "raised",
      size: "lg",
      as: "section"
    }, /*#__PURE__*/React.createElement("div", {
      className: "px-section-head"
    }, /*#__PURE__*/React.createElement("h2", null, "Your situation"), /*#__PURE__*/React.createElement(EyebrowLabel, null, state.intent)), /*#__PURE__*/React.createElement(SegmentedControl, {
      value: state.intent,
      onChange: v => set({
        intent: v
      }),
      options: [{
        value: 'Buy',
        label: 'Buy'
      }, {
        value: 'Build',
        label: 'Build'
      }, {
        value: 'Renovate',
        label: 'Renovate'
      }]
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 22
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "px-form-stack"
    }, /*#__PURE__*/React.createElement(MoneyField, {
      id: "gi",
      label: "Gross household income (per year)",
      help: "Combined annual gross income before tax and deductions. Self-employed? Use a 2-year average \u2014 treat as optimistic.",
      value: state.income,
      onChange: v => set({
        income: v
      }),
      placeholder: "200'000"
    }), /*#__PURE__*/React.createElement(MoneyField, {
      id: "hc",
      label: "Hard cash (savings, gifts \u2014 not pension)",
      help: "Cash and easily-sold assets. Counts toward the 10% hard-cash minimum.",
      value: state.hardCash,
      onChange: v => set({
        hardCash: v
      }),
      placeholder: "150'000"
    }), /*#__PURE__*/React.createElement(MoneyField, {
      id: "p3a",
      label: "Pillar 3a",
      optional: true,
      help: "Your Pillar 3a counts as hard equity, same as cash.",
      value: state.pillar3a,
      onChange: v => set({
        pillar3a: v
      }),
      placeholder: "40'000"
    }), /*#__PURE__*/React.createElement(MoneyField, {
      id: "p2",
      label: "2nd pillar (pension fund) you could use",
      optional: true,
      help: "Pension capital you could pledge or withdraw. Cannot cover the 10% hard-cash minimum.",
      value: state.pillar2,
      onChange: v => set({
        pillar2: v
      }),
      placeholder: "80'000"
    })));
  }
  window.PXSituationForm = SituationForm;
  window.PXfmt = {
    num,
    swiss
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/explorer/SituationForm.jsx", error: String((e && e.message) || e) }); }

// ui_kits/explorer/TopBar.jsx
try { (() => {
/* Plinthly Explorer — Top bar */
(function () {
  const DS = window.PlinthlyDesignSystem_2c3b3f;
  const {
    Badge,
    Icon
  } = DS;
  function TopBar({
    maxPrice,
    downPayment,
    monthly,
    verdict
  }) {
    return /*#__PURE__*/React.createElement("header", {
      className: "px-topbar"
    }, /*#__PURE__*/React.createElement("div", {
      className: "px-brand"
    }, /*#__PURE__*/React.createElement("img", {
      src: "../../assets/plinthly-mark.png",
      alt: ""
    }), /*#__PURE__*/React.createElement("b", null, "Plinthly")), /*#__PURE__*/React.createElement("span", {
      className: "px-topbar-eyebrow"
    }, "What you could buy"), /*#__PURE__*/React.createElement("div", {
      className: "px-topstats"
    }, /*#__PURE__*/React.createElement("div", {
      className: "px-topstat"
    }, /*#__PURE__*/React.createElement("span", {
      className: "k"
    }, "Max price"), /*#__PURE__*/React.createElement("span", {
      className: "v"
    }, maxPrice)), /*#__PURE__*/React.createElement("div", {
      className: "px-topstat"
    }, /*#__PURE__*/React.createElement("span", {
      className: "k"
    }, "Down payment"), /*#__PURE__*/React.createElement("span", {
      className: "v"
    }, downPayment)), /*#__PURE__*/React.createElement("div", {
      className: "px-topstat"
    }, /*#__PURE__*/React.createElement("span", {
      className: "k"
    }, "Est. monthly"), /*#__PURE__*/React.createElement("span", {
      className: "v"
    }, monthly)), /*#__PURE__*/React.createElement(Badge, {
      tone: verdict.tone,
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: verdict.icon
      })
    }, verdict.label)));
  }
  window.PXTopBar = TopBar;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/explorer/TopBar.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.EyebrowLabel = __ds_scope.EyebrowLabel;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.StatBlock = __ds_scope.StatBlock;

__ds_ns.Takeaway = __ds_scope.Takeaway;

__ds_ns.FieldRow = __ds_scope.FieldRow;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

})();
