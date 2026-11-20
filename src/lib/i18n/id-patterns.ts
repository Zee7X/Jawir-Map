// API messages that carry numbers or names, matched by pattern. Each replacement uses $1, $2 for the captured parts.
export const ID_PATTERNS_LIST: [RegExp, string][] = [
  // src/app/api/tags/route.ts IP_LIMIT_MESSAGE
  [
    /^Alon-alon, lur\. Siji jaringan mung oleh nancep (\d+) pin sedina\.$/,
    'Pelan-pelan, bro. Satu jaringan cuma boleh nancap $1 pin sehari.',
  ],
];
