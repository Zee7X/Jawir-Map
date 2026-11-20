// Indonesian for the panels strings. Keys are the exact Javanese source strings; {name} placeholders must match.
// Strings that read the same in Indonesian (Perang Trah, Juru Kunci, Kopi, Trah, Reset, Bangsa, {n} kopi, ...) have no entry
// and fall back to the source text.
export const ID_PANELS: Record<string, string> = {
  // LeaderboardModal: header and tabs
  'Klasemen Sedulur': 'Klasemen Saudara',
  '{total} Jawir kacathet neng peta': '{total} Jawir tercatat di peta',
  'Golongan klasemen': 'Kategori klasemen',
  'Paling Adoh': 'Terjauh',

  // LeaderboardModal: boards
  'Diukur garis lurus saka Pucak Lawu. Sapa sing paling nekat minggat.':
    'Diukur garis lurus dari Puncak Lawu. Siapa yang paling nekat kabur.',
  'Penguasa Pojok Donya': 'Penguasa Pojok Dunia',
  'Lali Dalan Mulih': 'Lupa Jalan Pulang',
  'Sing paling mepet kawah. Mulih mung sak lompatan.': 'Yang paling mepet kawah. Pulang cuma selompatan.',
  'Penjaga Sego Pecel Mbok Yem': 'Penjaga Nasi Pecel Mbok Yem',
  'Tanggane Kawah': 'Tetangga Kawah',
  'Isih Mambu Belerang': 'Masih Bau Belerang',
  'Pin sing paling kerep dititipi kopi. Sugih relasi, sugih kafein.':
    'Pin yang paling sering dititipi kopi. Kaya relasi, kaya kafein.',
  'Juragan Kopi Sedonya': 'Juragan Kopi Sedunia',

  // LeaderboardModal: podium and medals
  'Telu paling dhuwur': 'Tiga teratas',
  Salaka: 'Perak',
  Prunggu: 'Perunggu',

  // LeaderboardModal: Perang Trah
  'Trah endi sing paling akeh balane?': 'Trah mana yang pasukannya paling banyak?',
  'Saben pin dadi siji bala kanggo trahe. Ajak sedulur sak trah ben trahmu menang.':
    'Tiap pin jadi satu pasukan buat trahnya. Ajak saudara se-trah biar trahmu menang.',
  'Kari {gap} bala maneh nyusul {trah}!': 'Tinggal {gap} pasukan lagi buat nyusul {trah}!',
  'Kutha paling rame': 'Kota paling ramai',
  'Kutha sing paling akeh Jawir-e. Kuthamu durung mlebu? Ajak konco nancep.':
    'Kota dengan Jawir paling banyak. Kotamu belum masuk? Ajak teman nancap pin.',
  'Durung ana kutha sing rame. Dadia sing kapisan.': 'Belum ada kota yang ramai. Jadilah yang pertama.',

  // LeaderboardModal: census and empty states
  'Kasta tlatah': 'Kasta wilayah',
  'Tutul barise kanggo ndeleng tegese.': 'Ketuk barisnya buat lihat artinya.',
  '{n} wong': '{n} orang',
  'Klasemene ngadat, lur. Tutup, terus bukak maneh.': 'Klasemennya macet, bro. Tutup, terus buka lagi.',
  'Durung ana sing dititipi kopi. Bukak pin sedulur, titipna kopi sing kapisan.':
    'Belum ada yang dititipi kopi. Buka pin saudara, titipkan kopi pertama.',
  'Klasemene isih kosong melompong. Tancepke pinmu, dadi juara tanpa saingan.':
    'Klasemennya masih kosong melompong. Tancapkan pinmu, jadi juara tanpa saingan.',

  // LoreModal
  'Kenging menapa Titik 0 wonten ing Lawu?': 'Kenapa Titik 0 ada di Lawu?',
  'Pucak Gunung Lawu, {elevation}, {lat}, {lng}': 'Puncak Gunung Lawu, {elevation}, {lat}, {lng}',
  'Gunung Lawu jumeneng pas wonten ing tapel wates Karanganyar (Jateng) kaliyan Magetan (Jatim). Saking mriki, tebihipun dhateng sedulur Ngapak ing kilen lan sedulur Arekan ing wetan kirang langkung sami.':
    'Gunung Lawu berdiri tepat di perbatasan Karanganyar (Jateng) dan Magetan (Jatim). Dari sini, jarak ke saudara Ngapak di barat dan saudara Arekan di timur kurang lebih sama.',
  'Redi punika ugi kawentar dados petilasan Prabu Brawijaya V, kreteg cariyos saking Majapahit dhateng Mataram. Pramila saben pin ing peta dipuntarik benang abritipun mriki, lan tebihipun dipunetang saking pucakipun.':
    'Gunung ini juga terkenal sebagai petilasan Prabu Brawijaya V, jembatan kisah dari Majapahit ke Mataram. Makanya setiap pin di peta ditarik benang merah ke sini, dan jaraknya dihitung dari puncaknya.',
  'Papat kasta panggonan': 'Empat kasta wilayah',
  'Jawa Barat lan Banten iku tanah Pasundan. Isih neng Jateng, DIY, Jatim utawa Madura, kowe jenenge isih neng kandang. Pindhah menyang Jabodetabek utawa Bandung wae, kowe wis resmi rantau level 1. Selamat, lur.':
    'Jawa Barat dan Banten itu tanah Pasundan. Selama masih di Jateng, DIY, Jatim atau Madura, kamu masih di kandang. Pindah ke Jabodetabek atau Bandung aja, kamu sudah resmi rantau level 1. Selamat, bro.',
  'Siji piranti, siji pin': 'Satu perangkat, satu pin',
  'Ben peta ora kebak spam, saben piranti mung oleh nancepke siji pin salawase urip. Koordinatmu digeser acak sawetara atus meter, dadi ibu kos ora iso nglacak kowe.':
    'Biar peta nggak penuh spam, tiap perangkat cuma boleh nancap satu pin seumur hidup. Koordinatmu digeser acak beberapa ratus meter, jadi ibu kos nggak bisa melacakmu.',

  // JawirIdCardModal: header and card
  'Paspor Panjenengan sampun medal': 'Paspor Anda sudah terbit',
  'Simpen kertune, pamerke neng Story. Ben kanca-kancamu iri.': 'Simpan kartunya, pamerin di Story. Biar teman-temanmu iri.',
  'Paguyuban Jawir Sedonya': 'Paguyuban Jawir Sedunia',
  'Asma samaran': 'Nama samaran',
  'Tebihipun saking Titik 0': 'Jarak dari Titik 0',
  'Tanggal medal': 'Tanggal terbit',
  'Lumampah ngantos': 'Berlaku sampai',
  'Salaminipun gesang': 'Seumur hidup',
  'Cap: kasahaken dening Juru Kunci Gunung Lawu': 'Cap: disahkan oleh Juru Kunci Gunung Lawu',
  'KASAHAKEN DENING': 'DISAHKAN OLEH',

  // JawirIdCardModal: below the card
  'Kopi saka sedulur': 'Kopi dari saudara',
  'Pinmu lagi didhelikake saka peta amarga dilaporke sawetara sedulur. Admin bakal mriksa. Yen ana sing salah, busak terus pasang maneh.':
    'Pinmu lagi disembunyikan dari peta karena dilaporkan beberapa saudara. Admin bakal memeriksa. Kalau ada yang salah, hapus terus pasang lagi.',
  'Waduh, gambare gagal dicithak. Jajal maneh, utawa screenshot wae, lur.':
    'Waduh, gambarnya gagal dicetak. Coba lagi, atau screenshot aja, bro.',
  'Simpen PNG kanggo Story': 'Simpan PNG buat Story',
  'Wis disalin': 'Sudah disalin',
  Kirimke: 'Kirim',

  // JawirIdCardModal: visa page
  'Kaca visa': 'Halaman visa',
  'Kaca Visa': 'Halaman Visa',
  'Kabeh juru kunci wis disowani. Paspormu lengkap, lur!': 'Semua juru kunci sudah disambangi. Paspormu lengkap, bro!',
  'Sowan menyang Situs Legendha neng peta kanggo ngumpulke cap.': 'Sambangi Situs Legenda di peta buat ngumpulin cap.',
  '{title}: wis disowani': '{title}: sudah disambangi',
  '{title}: durung disowani, tutul kanggo mabur mrana': '{title}: belum disambangi, ketuk buat terbang ke sana',
  DISOWANI: 'DISAMBANGI',
  DURUNG: 'BELUM',

  // JawirIdCardModal: delete pin
  'Busak pinku': 'Hapus pinku',
  'Busak pin': 'Hapus pin',
  'Pin, paspor, lan kabeh kopi sing wis mlebu bakal ilang salawase. Nomer Jawirmu ora iso dibalekake.':
    'Pin, paspor, dan semua kopi yang sudah masuk bakal hilang selamanya. Nomor Jawirmu nggak bisa dikembalikan.',
  'Ora sida': 'Nggak jadi',
  'Lagi mbusak…': 'Lagi menghapus…',
  'Iya, busak pinku': 'Iya, hapus pinku',

  // FilterModal
  'Golek lan Saring': 'Cari & Saring',
  'Golek sedulur miturut jeneng, utawa saring peta miturut trah lan golongan.':
    'Cari saudara lewat nama, atau saring peta berdasarkan trah dan golongan.',
  'Golek jeneng utawa semboyan': 'Cari nama atau semboyan',
  'Contone: Budi, Toronto, sego pecel': 'Contoh: Budi, Toronto, nasi pecel',
  'Asil golek': 'Hasil pencarian',
  'Ora ketemu, lur. Jajal tembung liyane.': 'Nggak ketemu, bro. Coba kata lain.',
  'Lagi ngapa': 'Lagi ngapain',
  'Tampilke {n} pin neng peta': 'Tampilkan {n} pin di peta',

  // Server messages (src/app/api/tags/me/route.ts)
  'Pinmu gagal digoleki.': 'Pinmu gagal dicari.',
  'Kunci pin iki ora ketemu neng browser iki, dadi ora iso dibusak saka kene.':
    'Kunci pin ini nggak ketemu di browser ini, jadi nggak bisa dihapus dari sini.',
};
