/**
 * Centralized Prompt Intent Parser & Domain Entity Matcher for Brynex HR Intelligence.
 *
 * Handles retail brand prefixes:
 * - Brand 'G': "G-", "G.", "G ", "Suitor Guy", "SG", "Suitor"
 * - Brand 'Z': "Z-", "Z.", "Z ", "Zorucci", "Zeness", "Zubar"
 *
 * Handles location variations and common user typos:
 * - 'edappally': "edappally", "edapally", "edaplly", "edapallu", "edapy", "edapalli", "edapaly"
 * - 'edappal': "edappal", "edapal" (distinct town from Edappally)
 * - and all other Kerala retail branch locations.
 */

export const parsePromptIntent = (prompt = '') => {
  if (!prompt || typeof prompt !== 'string') {
    return { isFiltered: false, raw: '', cleaned: '' };
  }

  const raw = prompt.toLowerCase().trim();
  if (
    !raw ||
    raw === 'all' ||
    raw === 'all data' ||
    raw === 'show all' ||
    raw === 'no prompt' ||
    raw === 'reset' ||
    raw === 'default'
  ) {
    return { isFiltered: false, raw, cleaned: '' };
  }

  // Strip conversational filler phrases and prepositions
  const cleaned = raw
    .replace(/\b(only\s+show|show\s+me|show|focus\s+on|filter\s+by|data\s+of|data\s+for|data|employees?\s+in|employees?\s+at|employees?\s+of|employees?|staff\s+in|staff\s+at|staff\s+of|staff|profiles?\s+in|profiles?\s+at|profiles?|please|all|about|information\s+about|details\s+of|details|in|at|for|from|of|the|branch|store|location|unit)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Detect Brand: G (Suitor Guy) vs Z (Zorucci / Zeness / Zubar)
  let brand = null;
  // Match 'g' as standalone word, prefix 'g-', 'g.', 'g ', or 'suitor guy', 'suitor', 'sg'
  if (
    /\b(suitor\s*guy|suitor|sg)\b/i.test(raw) ||
    /\bg[-.\s]/i.test(raw) ||
    /^g\s+/i.test(raw) ||
    /\s+g$/i.test(raw) ||
    /\bg\b/i.test(cleaned)
  ) {
    brand = 'G';
  } else if (
    /\b(zorucci|zeness|zubar)\b/i.test(raw) ||
    /\bz[-.\s]/i.test(raw) ||
    /^z\s+/i.test(raw) ||
    /\s+z$/i.test(raw) ||
    /\bz\b/i.test(cleaned)
  ) {
    brand = 'Z';
  }

  // 2. Detect Location (with support for common typos)
  let location = null;
  if (
    /edap+al+[yi]/i.test(raw) ||
    /edap+l+[yi]/i.test(raw) ||
    /edap+a?l+u/i.test(raw) ||
    /edapy/i.test(raw) ||
    /edappally/i.test(raw) ||
    /edapally/i.test(raw)
  ) {
    location = 'edappally';
  } else if (/edap+al\b/i.test(raw) || /edapal\b/i.test(raw)) {
    location = 'edappal';
  } else if (/perinthalmanna|perinthalamanna/i.test(raw)) {
    location = 'perinthalmanna';
  } else if (/kottakkal/i.test(raw)) {
    location = 'kottakkal';
  } else if (/kottayam/i.test(raw)) {
    location = 'kottayam';
  } else if (/trivandrum|thiruvananthapuram|tvm/i.test(raw)) {
    location = 'trivandrum';
  } else if (/perumbavoor|perumbavur/i.test(raw)) {
    location = 'perumbavoor';
  } else if (/thrissur|trichur/i.test(raw)) {
    location = 'thrissur';
  } else if (/palakkad|palghat/i.test(raw)) {
    location = 'palakkad';
  } else if (/chavakkad/i.test(raw)) {
    location = 'chavakkad';
  } else if (/calicut|kozhikode/i.test(raw)) {
    location = 'calicut';
  } else if (/vadakara|badagara/i.test(raw)) {
    location = 'vadakara';
  } else if (/manjeri/i.test(raw)) {
    location = 'manjeri';
  } else if (/kannur|cananore/i.test(raw)) {
    location = 'kannur';
  } else if (/kalpetta/i.test(raw)) {
    location = 'kalpetta';
  } else if (/mg\s*road/i.test(raw)) {
    location = 'mg road';
  } else if (/kollam/i.test(raw)) {
    location = 'kollam';
  }

  // 3. Detect Role
  let role = null;
  if (/fashion\s*consultant|consultant/i.test(raw)) {
    role = 'fashion consultant';
  } else if (/store\s*manager/i.test(raw)) {
    role = 'store manager';
  } else if (/assistant\s*store\s*manager|asm/i.test(raw)) {
    role = 'assistant store manager';
  } else if (/billing/i.test(raw)) {
    role = 'billing staff';
  } else if (/tailor/i.test(raw)) {
    role = 'tailor';
  } else if (/quality\s*control|qc/i.test(raw)) {
    role = 'quality control';
  }

  // 4. Detect Specific Topics / Conditions
  const isOvertime = /\b(overtime|ot)\b/i.test(raw);
  const isExitOrNotice = /\b(exit|resigned|resignation|notice|attrition)\b/i.test(raw);
  const isProbation = /\b(probation|unconfirmed)\b/i.test(raw);
  const isQuotaDeficit = /\b(lagging|deficit|quota|< 80|below 80)\b/i.test(raw);
  const isCameraAudit = /\b(camera|audit|discrepanc)/i.test(raw);

  const isFiltered = Boolean(
    brand || location || role || isOvertime || isExitOrNotice || isProbation || isQuotaDeficit || isCameraAudit || cleaned.length > 0
  );

  return {
    isFiltered,
    raw,
    cleaned,
    brand,
    location,
    role,
    isOvertime,
    isExitOrNotice,
    isProbation,
    isQuotaDeficit,
    isCameraAudit
  };
};

/**
 * Checks if a store branch string matches the parsed intent.
 */
export const matchesBranch = (branchStr = '', intent = null) => {
  if (!intent || !intent.isFiltered) return true;
  if (!branchStr) return false;

  const b = String(branchStr).toLowerCase().trim();

  // Ignore multi-branch HQ strings if a single store branch is specified
  if (b.includes(',') && (intent.brand || intent.location)) {
    // If the record has 20 stores listed, only match if no specific single store requested
    return false;
  }

  // 1. Check Location Match
  if (intent.location) {
    if (intent.location === 'edappally') {
      const isEdappally = (
        /edap+al+[yi]/i.test(b) ||
        /edap+l+[yi]/i.test(b) ||
        /edap+a?l+u/i.test(b) ||
        /edapy/i.test(b) ||
        b.includes('edappally') ||
        b.includes('edapally')
      ) && !(/\bedap+al\b/i.test(b) && !/edap+al+[yi]/i.test(b));

      if (!isEdappally) return false;
    } else if (intent.location === 'edappal') {
      const isEdappal = /\bedap+al\b/i.test(b) && !/edap+al+[yi]/i.test(b);
      if (!isEdappal) return false;
    } else {
      if (!b.includes(intent.location)) return false;
    }
  }

  // 2. Check Brand Match
  if (intent.brand) {
    const isBrandG =
      b.startsWith('g-') ||
      b.startsWith('g.') ||
      b.startsWith('g ') ||
      b.includes('suitor guy') ||
      b.includes('suitor') ||
      b.startsWith('sg ') ||
      b.includes('sg edappally');

    const isBrandZ =
      b.startsWith('z-') ||
      b.startsWith('z.') ||
      b.startsWith('z ') ||
      b.includes('zorucci') ||
      b.includes('zeness') ||
      b.includes('zubar');

    if (intent.brand === 'G') {
      if (isBrandZ) return false;
      return isBrandG;
    } else if (intent.brand === 'Z') {
      if (isBrandG) return false;
      return isBrandZ;
    }
  }

  // 3. Cleaned free-text fallback check
  if (!intent.brand && !intent.location && intent.cleaned) {
    const terms = intent.cleaned.split(/\s+/).filter((t) => t.length > 2);
    if (terms.length > 0) {
      return terms.some((t) => b.includes(t));
    }
  }

  return true;
};

/**
 * Checks if a tabular row or employee object matches the prompt intent.
 */
export const recordMatchesPrompt = (row = {}, intent = null) => {
  if (!intent || !intent.isFiltered) return true;
  if (!row || typeof row !== 'object') return false;

  const branchVal = row.branch || row.workingBranch || row.location || row.Storename || row.Location || row.Costcenter || '';
  const roleVal = (row.role || row.designation || row.Designation || '').toLowerCase();
  const statusVal = (row.status || row.EmploymentStatus || row['Employment Status'] || row.risk || '').toLowerCase();
  const otVal = parseFloat(String(row.ot || row.overtime_hours || row['Overtime Hours'] || 0).replace(/[^0-9.]/g, '')) || 0;

  // 1. Branch match
  if (intent.brand || intent.location) {
    if (!matchesBranch(branchVal, intent)) {
      return false;
    }
  }

  // 2. Role match
  if (intent.role && !roleVal.includes(intent.role)) {
    return false;
  }

  // 3. Condition flags
  if (intent.isOvertime && otVal <= 0) {
    return false;
  }

  if (intent.isExitOrNotice && !/exit|resigned|notice|terminated|left/i.test(statusVal)) {
    return false;
  }

  if (intent.isProbation && !/probation|unconfirmed/i.test(statusVal)) {
    return false;
  }

  // 4. Free-text matching if no brand or location
  if (!intent.brand && !intent.location && intent.cleaned) {
    const rowStr = JSON.stringify(row).toLowerCase();
    const tokens = intent.cleaned.split(/\s+/).filter((t) => t.length > 2);
    if (tokens.length > 0 && !tokens.some((t) => rowStr.includes(t))) {
      return false;
    }
  }

  return true;
};

/**
 * Checks if a generated or baseline attention item strictly aligns with the prompt intent.
 * Used to guard against cross-branch leakage (e.g. Z-Edappally leaking into G-Edappally).
 */
export const itemMatchesPrompt = (item = {}, intent = null) => {
  if (!intent || !intent.isFiltered) return true;
  if (!item || typeof item !== 'object') return false;

  const itemBranch = item.branch || '';
  const itemTitle = (item.title || '').toLowerCase();
  const itemDesc = (item.description || '').toLowerCase();
  const itemSource = (item.sourceFile || '').toLowerCase();

  // If intent has a brand, enforce that the item doesn't mention conflicting brand in its branch/title/desc
  if (intent.brand === 'G') {
    // Must NOT mention Zorucci, Zeness, Zubar, Z-Edappally, Z-
    if (
      /\b(zorucci|zeness|zubar)\b/i.test(itemTitle) ||
      /\b(zorucci|zeness|zubar)\b/i.test(itemDesc) ||
      /\bz-edap/i.test(itemTitle) ||
      /\bz-edap/i.test(itemDesc) ||
      /\bz-edap/i.test(itemBranch) ||
      itemBranch.startsWith('Z-') ||
      itemBranch.startsWith('Z.')
    ) {
      return false;
    }
  } else if (intent.brand === 'Z') {
    // Must NOT mention Suitor Guy, SG, G-Edappally, G-
    if (
      /\b(suitor\s*guy|sg)\b/i.test(itemTitle) ||
      /\b(suitor\s*guy|sg)\b/i.test(itemDesc) ||
      /\bg-edap/i.test(itemTitle) ||
      /\bg-edap/i.test(itemDesc) ||
      /\bg-edap/i.test(itemBranch) ||
      itemBranch.startsWith('G-') ||
      itemBranch.startsWith('G.')
    ) {
      return false;
    }
  }

  // If intent has a location (e.g. edappally)
  if (intent.location) {
    // If the item specifies a branch, that branch MUST match the location
    if (itemBranch && itemBranch !== 'All Branches' && itemBranch !== 'Store Network') {
      if (!matchesBranch(itemBranch, intent)) {
        return false;
      }
    } else {
      // If item doesn't have a branch or says All Branches, check if title or desc mentions the location
      const text = `${itemTitle} ${itemDesc} ${itemSource}`;
      if (intent.location === 'edappally') {
        const hasEdappally = /edap+al+[yi]/i.test(text) || /edap+l+[yi]/i.test(text) || /edap+a?l+u/i.test(text) || /edapy/i.test(text) || /edappally/i.test(text) || /edapally/i.test(text);
        if (!hasEdappally) return false;
      } else {
        if (!text.includes(intent.location)) return false;
      }
    }
  }

  return true;
};
