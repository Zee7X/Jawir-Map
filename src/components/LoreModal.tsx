'use client';

import React from 'react';
import Dossier from './Dossier';
import { LAWU_CENTER, REGION_BADGE_MAP } from '@/lib/geo';
import { useLang } from '@/lib/i18n';

interface LoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoreModal({ isOpen, onClose }: LoreModalProps) {
  const { t } = useLang();
  if (!isOpen) return null;

  return (
    <Dossier
      title={t('Kenging menapa Titik 0 wonten ing Lawu?')}
      subtitle={t('Pucak Gunung Lawu, {elevation}, {lat}, {lng}', {
        elevation: t(LAWU_CENTER.elevation),
        lat: LAWU_CENTER.lat,
        lng: LAWU_CENTER.lng,
      })}
      onClose={onClose}
      maxWidth="sm:max-w-xl"
    >
      <article className="p-5 sm:p-6 space-y-6 text-[15px] leading-relaxed text-ink">
        <p className="font-display text-lg leading-snug">
          {t(
            'Gunung Lawu jumeneng pas wonten ing tapel wates Karanganyar (Jateng) kaliyan Magetan (Jatim). Saking mriki, tebihipun dhateng sedulur Ngapak ing kilen lan sedulur Arekan ing wetan kirang langkung sami.'
          )}
        </p>

        <p>
          {t(
            'Redi punika ugi kawentar dados petilasan Prabu Brawijaya V, kreteg cariyos saking Majapahit dhateng Mataram. Pramila saben pin ing peta dipuntarik benang abritipun mriki, lan tebihipun dipunetang saking pucakipun.'
          )}
        </p>

        <section>
          <h3 className="font-display text-xl font-extrabold mb-1">{t('Papat kasta panggonan')}</h3>
          <p className="text-sm text-ink-soft mb-3">
            {t(
              'Jawa Barat lan Banten iku tanah Pasundan. Isih neng Jateng, DIY, Jatim utawa Madura, kowe jenenge isih neng kandang. Pindhah menyang Jabodetabek utawa Bandung wae, kowe wis resmi rantau level 1. Selamat, lur.'
            )}
          </p>
          <ol className="space-y-3">
            {Object.values(REGION_BADGE_MAP).map((r, i) => (
              <li key={r.label} className="flex gap-3">
                <span className="font-type font-bold text-terra-deep w-5 shrink-0">{i + 1}.</span>
                <div>
                  <p className="font-bold">
                    <span aria-hidden>{r.icon}</span> {t(r.label)}
                  </p>
                  <p className="text-sm text-ink-soft">{t(r.desc)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t border-amber-900/15 pt-5">
          <h3 className="font-display text-xl font-extrabold mb-1">{t('Siji piranti, siji pin')}</h3>
          <p className="text-sm text-ink-soft">
            {t(
              'Ben peta ora kebak spam, saben piranti mung oleh nancepke siji pin salawase urip. Koordinatmu digeser acak sawetara atus meter, dadi ibu kos ora iso nglacak kowe.'
            )}
          </p>
        </section>
      </article>
    </Dossier>
  );
}
