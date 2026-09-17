/**
 * OIMS — Shared read-only Ocular Inspection summary renderer.
 * Used by InspectorWorkspace's History "View Summary" popup, the
 * pre-installation review gate, and the Installation Form's "Preview Ocular
 * Inspection" button — one definition of what "the ocular inspection
 * summary" looks like, so the three stay in sync.
 */

import { escapeHTML } from './security.js';

// A subset of ocular_inspections' FIELD_MAP (see supabaseService.js),
// organized for a human to scan rather than the raw column list.
// Signatures/photos are handled separately below since they render as
// images, not label/value rows.
const SUMMARY_SECTIONS = [
  ['Site & Client', [
    ['Client Name', 'clientName'], ['RN Number', 'rnNo'], ['Installation No.', 'installationNo'], ['Contact No.', 'contactNo'],
    ['Location Address', 'locationAddress'], ['Scope of Works', 'scopeOfWorks'],
    ['Date Submitted', 'dateTimeDisplay'], ['Time Start', 'timeStart'], ['Time End', 'timeEnd']
  ]],
  ['Electrical System', [
    ['Voltage System', 'voltageSystem'], ['Main Breaker', 'mainBreaker'],
    ['No. of Branches', 'noOfBranches'], ['Spare Breaker', 'spareBreaker'], ['Space Provision', 'spaceProvision'],
    ['Breaker Brand/Type', 'breakerBrandType'], ['Breaker Mounting', 'breakerMounting'],
    ['Breaker Design', 'breakerDesign'], ['Breaker Pole', 'breakerPole']
  ]],
  ['Grounding & NEMA3R', [
    ['Grounding System', 'groundingSystem'], ['Grounding Rod Location', 'groundingRodLocation'],
    ['Has NEMA3R', 'hasNema3r'], ['NEMA3R Breaker', 'nema3rBreaker'], ['NEMA3R Brand/Type', 'nema3rBrandType'],
    ['NEMA3R Mounting', 'nema3rMounting'], ['NEMA3R Design', 'nema3rDesign'], ['NEMA3R Pole', 'nema3rPole'],
    ['Charger Location', 'chargerLocation'], ['Estimated Distance', 'estimateDistance']
  ]],
  ['Conduit & Material Estimate', [
    ['PVC Conduit', 'conduitPvc'], ['EMT Conduit', 'conduitEmt'], ['IMC Conduit', 'conduitImc'],
    ['RSC Conduit', 'conduitRsc'], ['PVC Moulding', 'conduitPvcMoulding'], ['Black Flexible', 'conduitBlackFlexible'],
    ['PVC Flexible (Orange)', 'conduitPvcFlexibleOrange'], ['Other Conduit', 'conduitOtherType'], ['Other Conduit Qty', 'conduitOtherQty'],
    ['EMT Elbow 90°', 'elbowEmt90'], ['IMC Elbow 90°', 'elbowImc90'], ['RSC Elbow 90°', 'elbowRsc90'],
    ['Body LB', 'bodyLb'], ['Body LR', 'bodyLr'], ['Body LL', 'bodyLl'], ['Body C', 'bodyC'], ['Body T', 'bodyT'],
    ['Liquid-Tight Connector', 'liquidTightConnectorQty'], ['Liquid-Tight Flex Length', 'liquidTightFlexLength'],
    ['EMT Set-Screw Connector', 'connectorEmtSetScrew'], ['EMT Compression Connector', 'connectorEmtCompression'],
    ['EMT Set-Screw Coupling', 'couplingEmtSetScrew'], ['EMT Compression Coupling', 'couplingEmtCompression'],
    ['C-Clamp (2-Hole)', 'clampCTwoHole'], ['C-Clamp (1-Hole)', 'clampCOneHole'], ['Strap Clamp', 'clampStrapMalleable'],
    ['Utility Box', 'boxUtility'], ['Square Box', 'boxSquare'], ['Octagon Box', 'boxOctagon'], ['Junction Box', 'boxJunction'],
    ['Other Boxes', 'boxOthers']
  ]],
  ['Work Scope', [
    ['Retrofitting', 'workRetrofitting'], ['Replacement', 'workReplacement'], ['New Installation', 'workNewInstallation']
  ]],
  ['QA Status', [
    ['Status', 'status'], ['QA Notes', 'qaNotes'], ['QA Reviewed At', 'qaReviewedAt']
  ]]
];

const SUMMARY_CHECKBOX_KEYS = new Set(['hasNema3r', 'workRetrofitting', 'workReplacement', 'workNewInstallation']);

// Fields whose dropdown offers an "OTHER" choice backed by a free-text
// *Other field (see ocularForm.js's renderDropdownWithOther) — resolved so
// the summary shows the technician's actual typed answer instead of the
// literal word "OTHER".
const SUMMARY_OTHER_PAIRS = {
  mainBreaker: 'mainBreakerOther',
  breakerBrandType: 'breakerBrandTypeOther',
  breakerMounting: 'breakerMountingOther',
  breakerDesign: 'breakerDesignOther',
  breakerPole: 'breakerPoleOther',
  nema3rBrandType: 'nema3rBrandTypeOther',
  nema3rMounting: 'nema3rMountingOther',
  nema3rDesign: 'nema3rDesignOther',
  nema3rPole: 'nema3rPoleOther'
};

// data-photo-id values from ocularForm.js's photo dropzones — see
// downloadAllPhotos() there for the same label set.
const SUMMARY_PHOTO_LABELS = {
  proposed_layout: 'Proposed Layout',
  tapping_point: 'Tapping Point',
  wiring_conduit: 'Wiring/Conduit Layout',
  ev_charging_location: 'EV Charging Location'
};

function formatSummaryValue(key, data) {
  const value = data[key];
  if (SUMMARY_CHECKBOX_KEYS.has(key)) {
    const truthy = value === 'on' || value === true || value === 'YES' || value === 'yes';
    return truthy ? 'Yes' : '';
  }
  if (key === 'voltageSystem') {
    return value === '220_ll' ? '220V 1Ø L-L' : value === '220_lg' ? '220V 1Ø L-G' : (value || '');
  }
  if (key === 'qaReviewedAt' && value) {
    return new Date(value).toLocaleString();
  }
  const otherKey = SUMMARY_OTHER_PAIRS[key];
  if (otherKey && value === 'OTHER') {
    return data[otherKey] || 'Other (not specified)';
  }
  return value;
}

// Renders one docket-style section, or '' if every field in it is empty —
// keeps the summary from showing 70+ mostly-blank rows for a simple audit.
function renderSummarySection(title, fields, data) {
  const rows = fields
    .map(([label, key]) => [label, formatSummaryValue(key, data)])
    .filter(([, val]) => val !== null && val !== undefined && val !== '');
  if (rows.length === 0) return '';
  return `
    <div class="docket-title" style="margin-top: 1.25rem;">${escapeHTML(title)}</div>
    <div class="docket-grid">
      ${rows.map(([label, val]) => `
        <div class="docket-item">
          <span class="docket-label">${escapeHTML(label)}</span>
          <span class="docket-value">${escapeHTML(String(val))}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderSummaryPhotos(photos) {
  if (!photos || typeof photos !== 'object') return '';
  const entries = Object.entries(SUMMARY_PHOTO_LABELS).filter(([id]) => photos[id]);
  if (entries.length === 0) return '';
  return `
    <div class="docket-title" style="margin-top: 1.25rem;">Site Photos</div>
    <div class="docket-grid">
      ${entries.map(([id, label]) => `
        <div class="docket-item docket-full">
          <span class="docket-label">${escapeHTML(label)}</span>
          <img src="${photos[id]}" alt="${escapeHTML(label)}" style="max-width: 100%; max-height: 260px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 6px; margin-top: 0.35rem; display: block;" />
        </div>
      `).join('')}
    </div>
  `;
}

function renderSummarySignOff(item) {
  const hasSignOff = item.inspectedByName || item.inspectorSigImg || item.witnessedByName || item.witnessSigImg;
  if (!hasSignOff) return '';
  return `
    <div class="docket-title" style="margin-top: 1.25rem;">Inspector &amp; Witness Sign-off</div>
    <div class="docket-grid">
      <div class="docket-item">
        <span class="docket-label">Inspected By</span>
        <span class="docket-value">${escapeHTML(item.inspectedByName || 'N/A')}</span>
      </div>
      <div class="docket-item">
        <span class="docket-label">Witnessed By</span>
        <span class="docket-value">${escapeHTML(item.witnessedByName || 'N/A')}</span>
      </div>
      ${item.inspectorSigImg ? `
        <div class="docket-item docket-full">
          <span class="docket-label">Inspector Signature</span>
          <img src="${item.inspectorSigImg}" alt="Inspector signature" style="max-width: 220px; border: 1px solid #e2e8f0; border-radius: 6px; margin-top: 0.35rem; display: block;" />
        </div>
      ` : ''}
      ${item.witnessSigImg ? `
        <div class="docket-item docket-full">
          <span class="docket-label">Witness Signature</span>
          <img src="${item.witnessSigImg}" alt="Witness signature" style="max-width: 220px; border: 1px solid #e2e8f0; border-radius: 6px; margin-top: 0.35rem; display: block;" />
        </div>
      ` : ''}
    </div>
  `;
}

// Full read-only body for an ocular inspection record — title, RN, every
// non-empty section, site photos, and sign-off. Callers wrap this in their
// own modal shell (.modal-overlay/.modal-dialog) with their own footer
// buttons, since what happens next (Close vs Cancel/Proceed) differs by
// where it's shown.
export function buildInspectionSummaryHtml(item) {
  const sectionsHtml = SUMMARY_SECTIONS
    .map(([title, fields]) => renderSummarySection(title, fields, item))
    .join('');

  return `
    <h3 class="modal-title">${escapeHTML(item.clientName || 'Inspection Summary')}</h3>
    <p class="modal-subtitle">RN: ${escapeHTML(item.rnNo || 'N/A')}</p>
    ${sectionsHtml}
    ${renderSummaryPhotos(item.photos)}
    ${renderSummarySignOff(item)}
  `;
}
