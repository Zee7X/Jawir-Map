import { ID_CHROME } from './i18n/id-chrome';
import { ID_FORM } from './i18n/id-form';
import { ID_MAP } from './i18n/id-map';
import { ID_PANELS } from './i18n/id-panels';
import { ID_PATTERNS_LIST } from './i18n/id-patterns';

// Indonesian dictionary, split by UI area so each file stays readable.
export const ID: Record<string, string> = { ...ID_MAP, ...ID_FORM, ...ID_PANELS, ...ID_CHROME };
export const ID_PATTERNS = ID_PATTERNS_LIST;
