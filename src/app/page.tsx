import JawirMapApp from '@/components/JawirMapApp';
import { LangProvider } from '@/lib/i18n';

// Static: pin previews live on /p/[id], and old /?tag=<id> links are read on the client.
export default function Page() {
  return (
    <LangProvider>
      <JawirMapApp />
    </LangProvider>
  );
}
