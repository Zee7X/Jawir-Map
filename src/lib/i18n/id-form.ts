// Indonesian for the form strings. Keys are the exact Javanese source strings; {name} placeholders must match.
export const ID_FORM: Record<string, string> = {
  // TagModal: header
  'Blangko Pendhaftaran Sedulur': 'Formulir Pendaftaran Saudara',
  'Siji piranti, siji pin, salawase urip. Ojo ngapusi.': 'Satu perangkat, satu pin, seumur hidup. Jangan bohong.',

  // TagModal: fields
  'Jeneng celukan': 'Nama panggilan',
  'Jeneng sing arep dicithak neng paspor': 'Nama yang mau dicetak di paspor',
  'Trah asal': 'Trah asal',
  'Saiki lagi ngapa?': 'Lagi ngapain sekarang?',
  'Semboyan neng paspor': 'Semboyan di paspor',
  'Salam utawa kabarmu kanggo sedulur rantau': 'Salam atau kabarmu buat saudara perantauan',
  'Titik panggonan': 'Titik lokasi',
  'Satelit lagi nggoleki kosanmu…': 'Satelit lagi nyari kosanmu…',
  'Nganggo GPS': 'Pakai GPS',
  'Pilih neng peta': 'Pilih di peta',
  '{km} km saka Lawu': '{km} km dari Lawu',
  'Ganti titik': 'Ganti titik',
  '🏠 Isih neng kandang dhewe.': '🏠 Masih di kandang sendiri.',
  'Titikmu digeser acak sawetara atus meter, dadi ibu kos ora iso nglacak kowe.':
    'Titikmu digeser acak beberapa ratus meter, jadi ibu kos nggak bisa melacakmu.',
  'Durung ana titik. GPS-an utawa tutul langsung neng peta.': 'Belum ada titik. Pakai GPS atau ketuk langsung di peta.',
  'Lagi nyithak paspor…': 'Lagi nyetak paspor…',
  'Tancepke pin lan terbitke paspor': 'Tancapkan pin & terbitkan paspor',

  // TagModal: client-side messages
  'Browsermu ora iso GPS-an, lur. Pilih neng peta wae.': 'Browsermu nggak bisa GPS, bro. Pilih di peta aja.',
  'Satelite bingung golek kosanmu. Pilih titike neng peta wae, lur.':
    'Satelitnya bingung nyari kosanmu. Pilih titiknya di peta aja, ya.',
  'Jenengmu kependeken utawa kedawan. 2 nganti 40 aksara wae, lur.':
    'Namamu kependekan atau kepanjangan. 2 sampai 40 huruf aja, bro.',
  'Semboyane 3 nganti 120 aksara. Ojo kaya nulis skripsi.': 'Semboyannya 3 sampai 120 huruf. Jangan kayak nulis skripsi.',
  'Titikmu durung ono, lur. Nganggo GPS utawa tutul peta dhisik.': 'Titikmu belum ada. Pakai GPS atau ketuk peta dulu.',
  'Sedhela, pirantimu lagi dicap. Jajal kirim maneh.': 'Bentar, perangkatmu lagi dicap. Coba kirim lagi.',
  'Pine mencelat, gagal disimpen. Jajal maneh.': 'Pinnya mental, gagal disimpan. Coba lagi.',
  'Waduh, ana sing ora beres. Jajal maneh, lur.': 'Waduh, ada yang nggak beres. Coba lagi, gaes.',

  // Filter reasons (src/lib/filter.ts)
  'Ojo nyebar link, lur. Iki peta, dudu grup WA.': 'Jangan nyebar link, bro. Ini peta, bukan grup WA.',
  'Ojo nyelipke nomer HP utawa akun medsos, lur. Iki peta, dudu papan iklan.':
    'Jangan nyelipin nomor HP atau akun medsos. Ini peta, bukan papan iklan.',
  'Ana mambu promosi utawa judol. Ditolak.': 'Kecium bau promosi atau judol. Ditolak.',
  'Ojo nyebut barang haram neng kene, lur. Ditolak.': 'Jangan sebut barang haram di sini, bro. Ditolak.',
  'Ojo ngina suku, agama, utawa wong liya, lur. Peta iki kanggo kabeh sedulur.':
    'Jangan menghina suku, agama, atau orang lain. Peta ini buat semua saudara.',
  'Ana tembung sing saru. Mbok yo sing sopan, lur.': 'Ada kata yang jorok. Yang sopan dong, bro.',

  // Heads of "Head: reason" server messages
  Jeneng: 'Nama',
  Semboyan: 'Semboyan',

  // Server messages (src/app/api/tags/route.ts)
  'Woi, jatahmu mung sepisan salawase urip! Ojo srakah kaya pejabat.':
    'Woi, jatahmu cuma sekali seumur hidup! Jangan serakah kayak pejabat.',
  'Piranti iki wis tau nancep pin. Siji piranti mung oleh siji pin, lur. Yen iki pinmu, bukak saka browser sing biyen.':
    'Perangkat ini sudah pernah nancap pin. Satu perangkat cuma boleh satu pin. Kalau ini pinmu, buka dari browser yang dulu.',
  'Pinmu wis kekirim, lur. Tutup terus bukak maneh petane.': 'Pinmu sudah terkirim. Tutup terus buka lagi petanya.',
  'Data pin gagal dijupuk, server lagi ngelamun.': 'Data pin gagal diambil, servernya lagi bengong.',
  'Golongane ora ono neng daftar, lur.': 'Golongannya nggak ada di daftar, bro.',
  'Koordinate aneh, kowe neng planet ngendi?': 'Koordinatnya aneh, kamu di planet mana?',
  'Pirantimu durung dicap. Refresh terus jajal maneh.': 'Perangkatmu belum dicap. Refresh terus coba lagi.',
  'Pine mencelat, gagal ditancepke. Jajal maneh.': 'Pinnya mental, gagal ditancapkan. Coba lagi.',
};
