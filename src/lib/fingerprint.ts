import FingerprintJS from '@fingerprintjs/fingerprintjs';

// One FingerprintJS load per page, shared by pin creation and coffee votes. A failure clears the cache so the next call retries.
let fingerprintPromise: Promise<string> | null = null;

export function getFingerprintId(): Promise<string> {
  if (!fingerprintPromise) {
    fingerprintPromise = FingerprintJS.load()
      .then((fp) => fp.get())
      .then((result) => result.visitorId)
      .catch((err) => {
        fingerprintPromise = null;
        throw err;
      });
  }
  return fingerprintPromise;
}
