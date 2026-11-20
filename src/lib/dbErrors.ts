type DbError = { code?: unknown; errno?: unknown; message?: string; cause?: { message?: string } };

const errorText = (err: unknown) => {
  const e = err as DbError;
  return `${e?.message ?? ''} ${e?.cause?.message ?? ''}`;
};

// MySQL/TiDB error 1062 (ER_DUP_ENTRY); the driver wraps it, so check message too.
export function isDuplicateKeyError(err: unknown): boolean {
  const e = err as DbError;
  return e?.code === 'ER_DUP_ENTRY' || e?.errno === 1062 || /1062|duplicate entry/i.test(errorText(err));
}

// True for a 1062 raised by the given unique key, e.g. "... for key 'jawir_tags.idx_jawir_number'".
export function isDuplicateOnKey(err: unknown, keyName: string): boolean {
  return isDuplicateKeyError(err) && errorText(err).includes(keyName);
}
