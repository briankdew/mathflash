(() => {
  const WORD_TO_VAL = {
    zero: 0, oh: 0,
    one: 1, two: 2, to: 2, too: 2,
    three: 3, four: 4, for: 4,
    five: 5, six: 6, seven: 7,
    eight: 8, ate: 8, nine: 9,
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
    fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19
  };

  const UNITS = {
    zero: 0, oh: 0,
    one: 1, two: 2, to: 2, too: 2,
    three: 3, four: 4, for: 4,
    five: 5, six: 6, seven: 7,
    eight: 8, ate: 8, nine: 9
  };

  const TEENS = {
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
    fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19
  };

  const TENS = {
    twenty: 20, thirty: 30, forty: 40, fifty: 50,
    sixty: 60, seventy: 70, eighty: 80, ninety: 90
  };

  function detectDuplicateOrMixedTokens(raw) {
    if (raw == null) return null;
    const s = String(raw).trim().toLowerCase();
    if (!s) return null;

    const digitTokens = s.match(/\b\d+\b/g);
    const wordTokens = s.split(/[^a-z]+/).filter(Boolean);
    const vals = [];

    if (digitTokens) {
      for (const t of digitTokens) vals.push(parseInt(t, 10));
    }
    if (wordTokens.length > 0) {
      for (const t of wordTokens) {
        if (WORD_TO_VAL[t] == null) return null;
        vals.push(WORD_TO_VAL[t]);
      }
    }

    if (vals.length > 1) {
      const allSame = vals.every((v) => v === vals[0]);
      return allSame ? { type: 'duplicate', value: vals[0] } : { type: 'mixed' };
    }

    return null;
  }

  function stitchTokenDigits(raw) {
    if (raw == null) return null;
    const s = String(raw).trim().toLowerCase();
    if (!s) return null;

    const digitTokens = s.match(/\b\d+\b/g);
    const wordTokens = s.split(/[^a-z]+/).filter(Boolean);
    const parts = [];

    if (digitTokens) {
      for (const t of digitTokens) parts.push(String(parseInt(t, 10)));
    }
    if (wordTokens.length > 0) {
      for (const t of wordTokens) {
        if (WORD_TO_VAL[t] == null) return null;
        parts.push(String(WORD_TO_VAL[t]));
      }
    }

    if (!parts.length) return null;
    return parts.join('');
  }

  function normalizeToNumber(raw) {
    if (raw == null) return null;
    const s = String(raw).trim().toLowerCase();

    const m = s.match(/\b\d+\b/);
    if (m) {
      const cleaned = m[0].replace(/[,\s]/g, '');
      const val = parseInt(cleaned, 10);
      return val >= 0 && val <= 1000 ? String(val) : null;
    }

    const tokens = s.split(/[^a-z]+/).filter(Boolean);
    if (!tokens.length) return null;

    let total = 0;
    let current = 0;
    let found = false;
    let onlyUnits = true;
    const unitDigits = [];

    for (const t of tokens) {
      if (t === 'and') continue;
      if (TEENS[t] != null) {
        current += TEENS[t];
        found = true;
        onlyUnits = false;
      } else if (TENS[t] != null) {
        current += TENS[t];
        found = true;
        onlyUnits = false;
      } else if (UNITS[t] != null) {
        current += UNITS[t];
        unitDigits.push(UNITS[t]);
        found = true;
      } else if (t === 'hundred') {
        if (current === 0) current = 1;
        current *= 100;
        found = true;
        onlyUnits = false;
      } else if (t === 'thousand') {
        if (current === 0) current = 1;
        total += current * 1000;
        current = 0;
        found = true;
        onlyUnits = false;
      } else {
        return null;
      }
    }

    if (onlyUnits && unitDigits.length > 1) {
      const combined = parseInt(unitDigits.join(''), 10);
      return combined >= 0 && combined <= 1000 ? String(combined) : null;
    }

    total += current;
    return found && total >= 0 && total <= 1000 ? String(total) : null;
  }

  window.SpeechProcessing = {
    detectDuplicateOrMixedTokens,
    stitchTokenDigits,
    normalizeToNumber
  };
})();
