import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaPrint, FaArrowLeft, FaSpinner } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id/';

const CetakSPK = () => {
  const { periode, id_mitra } = useParams();
  const navigate = useNavigate();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper Auth
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const headers = getAuthHeader();

        // 1. Ambil Data API
        const [resMitra, resSetting, resTasks] = await Promise.all([
          axios.get(`${API_URL}/api/mitra/${id_mitra}`, { headers }),
          axios.get(`${API_URL}/api/spk-setting/periode/${periode}`, { headers }),
          axios.get(`${API_URL}/api/penugasan/mitra/${id_mitra}/periode/${periode}`, { headers })
        ]);

        const mitraData = resMitra.data.data || resMitra.data;
        const settingData = resSetting.data.data || resSetting.data;
        const tasksResult = resTasks.data.data || resTasks.data;
        const tasksData = Array.isArray(tasksResult) ? tasksResult : [];

        // 2. Cek Apakah Ada Template ID di Setting
        let templateData = null;
        if (settingData && settingData.template_id) {
            try {
                const resTemplate = await axios.get(`${API_URL}/api/template-spk/${settingData.template_id}`, { headers });
                templateData = resTemplate.data.data || resTemplate.data;
            } catch (err) {
                console.warn("Template tidak ditemukan, menggunakan default.");
            }
        }

        // 3. LOGIKA NORMALISASI (MENENTUKAN PAKE TEMPLATE ATAU DEFAULT)
        let finalParts = {};
        let finalArticles = [];

        if (templateData) {
            // Opsi A: Data Template ada di dalam object 'bagian_teks'
            if (templateData.bagian_teks && typeof templateData.bagian_teks === 'object') {
                finalParts = { ...templateData.bagian_teks };
            } 
            // Opsi B: Data Template langsung di root (flat)
            else {
                finalParts = {
                    pembuka: templateData.pembuka,
                    pihak_pertama: templateData.pihak_pertama,
                    pihak_kedua: templateData.pihak_kedua,
                    kesepakatan: templateData.kesepakatan,
                    penutup: templateData.penutup
                };
            }

            // Ambil Pasal
            if (Array.isArray(templateData.pasal)) finalArticles = templateData.pasal;
            else if (Array.isArray(templateData.articles)) finalArticles = templateData.articles;
        }

        // 4. FALLBACK: JIKA TIDAK ADA TEMPLATE / BAGIAN TEKS KOSONG -> PAKAI DEFAULT
        if (!finalParts.pembuka) {
            finalParts = {
                pembuka: `Pada hari ini {{HARI_INI}}, tanggal {{TANGGAL_TERBILANG}}, bulan {{BULAN_INI}} tahun {{TAHUN_TERBILANG}}, bertempat di BPS Kota Salatiga, yang bertandatangan di bawah ini:`,
                
                pihak_pertama: `{{JABATAN_PPK}} Badan Pusat Statistik Kota Salatiga, berkedudukan di BPS Kota Salatiga, bertindak untuk dan atas nama Badan Pusat Statistik Kota Salatiga berkedudukan di Jl. Hasanudin KM 01, Dukuh, Sidomukti, Salatiga, selanjutnya disebut sebagai <b>PIHAK PERTAMA</b>.`,
                
                pihak_kedua: `Mitra Statistik, berkedudukan di {{ALAMAT_MITRA}}, bertindak untuk dan atas nama diri sendiri, selanjutnya disebut <b>PIHAK KEDUA</b>.`,
                
                kesepakatan: `Bahwa PIHAK PERTAMA dan PIHAK KEDUA yang secara bersama-sama disebut PARA PIHAK, sepakat untuk mengikatkan diri dalam Perjanjian Kerja Petugas Pendataan Lapangan Kegiatan Survei/Sensus Tahun {{TAHUN}}, dengan ketentuan-ketentuan sebagai berikut:`,
                
                penutup: `Demikian Perjanjian ini dibuat dan ditandatangani oleh PARA PIHAK dalam 2 (dua) rangkap asli bermeterai cukup, tanpa paksaan dari PIHAK manapun dan untuk dilaksanakan oleh PARA PIHAK.`
            };
        }

        if (finalArticles.length === 0) {
            finalArticles = [
                // HALAMAN 1 (Pasal 1-3)
                { nomor_pasal: '1', isi_pasal: 'PIHAK PERTAMA memberikan pekerjaan kepada PIHAK KEDUA dan PIHAK KEDUA menerima pekerjaan dari PIHAK PERTAMA sebagai Petugas Pendataan Lapangan, dengan lingkup pekerjaan yang ditetapkan oleh PIHAK PERTAMA.' },
                { nomor_pasal: '2', isi_pasal: 'Ruang lingkup pekerjaan sebagaimana dimaksud dalam Pasal 1 meliputi kegiatan pendataan lapangan sesuai dengan tugas dan target yang ditetapkan.' },
                { nomor_pasal: '3', isi_pasal: 'Jangka Waktu Perjanjian terhitung sejak tanggal {{TANGGAL_SURAT}} sampai dengan selesainya periode kegiatan bulan ini.' },

                // HALAMAN 2 (Pasal 4-9) -> Ada {{Break_Space}} di awal Pasal 4
                { nomor_pasal: '4', isi_pasal: '{{Break_Space}}PIHAK KEDUA berkewajiban melaksanakan seluruh pekerjaan yang diberikan oleh PIHAK PERTAMA sampai selesai, sesuai ruang lingkup pekerjaan sebagaimana dimaksud dalam Pasal 2 di wilayah kerja masing-masing.' },
                { nomor_pasal: '5', isi_pasal: '(1) PIHAK KEDUA berhak untuk mendapatkan honorarium petugas dari PIHAK PERTAMA sebesar {{TOTAL_HONOR}} ({{TERBILANG}}) untuk pekerjaan sebagaimana dimaksud dalam Pasal 2, termasuk {{KOMPONEN_HONOR}}.\n(2) PIHAK KEDUA tidak diberikan honorarium tambahan apabila melakukan kunjungan di luar jadwal atau terdapat tambahan waktu pelaksanaan pekerjaan lapangan.' },
                { nomor_pasal: '6', isi_pasal: '(1) Pembayaran honorarium sebagaimana dimaksud dalam Pasal 5 dilakukan setelah PIHAK KEDUA menyelesaikan dan menyerahkan seluruh hasil pekerjaan sebagaimana dimaksud dalam Pasal 2 kepada PIHAK PERTAMA.\n(2) Pembayaran sebagaimana dimaksud pada ayat (1) dilakukan oleh PIHAK PERTAMA kepada PIHAK KEDUA sesuai dengan ketentuan peraturan perundang-undangan.' },
                { nomor_pasal: '7', isi_pasal: 'Penyerahan hasil pekerjaan lapangan sebagaimana dimaksud dalam Pasal 2 dilakukan secara bertahap dan selambat-lambatnya seluruh hasil pekerjaan lapangan diserahkan sesuai jadwal yang tercantum dalam Lampiran, yang dinyatakan dalam Berita Acara Serah Terima Hasil Pekerjaan yang ditandatangani oleh PARA PIHAK.' },
                { nomor_pasal: '8', isi_pasal: 'PIHAK PERTAMA dapat memutuskan Perjanjian ini secara sepihak sewaktu-waktu dalam hal PIHAK KEDUA tidak dapat melaksanakan kewajibannya sebagaimana dimaksud dalam Pasal 4, dengan menerbitkan Surat Pemutusan Perjanjian Kerja.' },
                { nomor_pasal: '9', isi_pasal: '(1) Apabila PIHAK KEDUA mengundurkan diri pada saat/setelah pelaksanaan pekerjaan lapangan dengan tidak menyelesaikan pekerjaan yang menjadi tanggungjawabnya, maka PIHAK PERTAMA akan memberikan Surat Pemutusan Perjanjian Kerja kepada PIHAK KEDUA.\n(2) Dalam hal terjadi peristiwa sebagaimana dimaksud pada ayat (1), PIHAK PERTAMA membayarkan honorarium kepada PIHAK KEDUA secara proporsional sesuai pekerjaan yang telah dilaksanakan.' },

                // HALAMAN 3 (Pasal 10-12) -> Ada {{Break_Space}} di awal Pasal 10
                { nomor_pasal: '10', isi_pasal: '{{Break_Space}}(1) Apabila terjadi Keadaan Kahar, yang meliputi bencana alam dan bencana sosial, PIHAK KEDUA memberitahukan kepada PIHAK PERTAMA dalam waktu paling lambat 7 (tujuh) hari sejak mengetahui atas kejadian Keadaan Kahar dengan menyertakan bukti.\n(2) Pada saat terjadi Keadaan Kahar, pelaksanaan pekerjaan oleh PIHAK KEDUA dihentikan sementara dan dilanjutkan kembali setelah Keadaan Kahar berakhir, namun apabila akibat Keadaan Kahar tidak memungkinkan dilanjutkan/diselesaikannya pelaksanaan pekerjaan, PIHAK KEDUA berhak menerima honorarium secara proporsional sesuai pekerjaan yang telah dilaksanakan.' },
                { nomor_pasal: '11', isi_pasal: 'Segala sesuatu yang belum atau tidak cukup diatur dalam Perjanjian ini, dituangkan dalam perjanjian tambahan/addendum dan merupakan bagian tidak terpisahkan dari perjanjian ini.' },
                { nomor_pasal: '12', isi_pasal: '(1) Segala perselisihan atau perbedaan pendapat yang timbul sebagai akibat adanya Perjanjian ini akan diselesaikan secara musyawarah untuk mufakat.\n(2) Apabila perselisihan tidak dapat diselesaikan sebagaimana dimaksud pada ayat (1), PARA PIHAK sepakat menyelesaikan perselisihan dengan memilih kedudukan/domisili hukum di Panitera Pengadilan Negeri Kota Salatiga.' }
            ];
        }

        setData({
            mitra: mitraData,
            setting: settingData,
            tasks: tasksData,
            templateParts: finalParts,
            templateArticles: finalArticles
        });

      } catch (err) {
        console.error("Error:", err);
        setError("Gagal memuat data.");
      } finally {
        setLoading(false);
      }
    };

    if (id_mitra && periode) fetchData();
  }, [periode, id_mitra]);

  const handlePrint = () => window.print();

  // --- HELPER FORMATTERS ---
  const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);
  const formatDateIndo = (date) => date ? new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '...';
  
  const getTerbilang = (nilai) => {
    const angka = Math.abs(nilai);
    const baca = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
    if (angka < 12) return ' ' + baca[angka];
    if (angka < 20) return getTerbilang(angka - 10) + ' belas';
    if (angka < 100) return getTerbilang(Math.floor(angka / 10)) + ' puluh' + getTerbilang(angka % 10);
    if (angka < 200) return ' seratus' + getTerbilang(angka - 100);
    if (angka < 1000) return getTerbilang(Math.floor(angka / 100)) + ' ratus' + getTerbilang(angka % 100);
    if (angka < 1000000) return getTerbilang(Math.floor(angka / 1000)) + ' ribu' + getTerbilang(angka % 1000);
    return getTerbilang(Math.floor(angka / 1000000)) + ' juta' + getTerbilang(angka % 1000000);
  };
  const formatTerbilang = (nilai) => getTerbilang(nilai).trim() + ' rupiah';

  // --- REPLACE VARIABLES (Support {{...}} dan [...]) ---
  const replaceVariables = (text) => {
    if (!text || !data) return '';
    const { mitra, setting, tasks } = data;
    const totalHonor = tasks.reduce((acc, curr) => acc + Number(curr.total_honor || 0), 0);
    const today = new Date();
    
    const map = {
        'NAMA_PPK': `<b>${setting.nama_ppk || '...'}</b>`,
        'NIP_PPK': setting.nip_ppk || '...',
        'JABATAN_PPK': setting.jabatan_ppk || '...',
        'NAMA_MITRA': `<b>${mitra.nama_lengkap}</b>`,
        'NIK': mitra.nik || '-',
        'ALAMAT_MITRA': mitra.alamat || '-',
        'TOTAL_HONOR': `<b>${formatRupiah(totalHonor)}</b>`,
        'TERBILANG': `<i>${formatTerbilang(totalHonor)}</i>`,
        'TANGGAL_SURAT': formatDateIndo(setting.tanggal_surat),
        'TANGGAL_TERBILANG': getTerbilang(today.getDate()).trim(),
        'HARI_INI': ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][today.getDay()],
        'BULAN_INI': ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][today.getMonth()],
        'TAHUN_TERBILANG': getTerbilang(today.getFullYear()).trim(),
        'TAHUN': setting.tanggal_surat ? new Date(setting.tanggal_surat).getFullYear() : today.getFullYear(),
        'NOMOR_SURAT': setting.nomor_surat_format || '...'
    };

    let result = text;
    Object.keys(map).forEach(key => {
        // Regex ini akan menangkap {{KEY}} ATAU [KEY]
        // Jadi template lama atau baru dua-duanya jalan.
        const regex = new RegExp(`(\\{\\{${key}\\}\\}|\\[${key}\\])`, 'g');
        result = result.replace(regex, map[key]);
    });

    // Hapus lampiran dari teks utama
    result = result.replace(/(\{\{Lampiran\}\}|\[Lampiran\])/g, ''); 

    // Handle Manual Page Break
    result = result.replace(
        /(\{\{Break_Space\}\}|\[Break_Space\])/g, 
        '<div class="page-break-spacer"><span class="no-print text-gray-300 text-xs block text-center py-2 border-t border-dashed border-gray-300">-- Pindah Halaman Manual --</span></div>'
    );

    return result;
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen"><FaSpinner className="animate-spin text-4xl text-blue-600" /></div>;
  if (error || !data) return <div className="text-center mt-20 text-red-500">{error}</div>;

  const { templateParts, templateArticles, setting, tasks } = data;
  const totalHonor = tasks.reduce((acc, curr) => acc + Number(curr.total_honor || 0), 0);
  const tahunAnggaran = setting.tanggal_surat ? new Date(setting.tanggal_surat).getFullYear() : new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center font-sans print:p-0 print:bg-white print:block">
      
      <style>{`
        @media print {
            html, body { margin: 0 !important; padding: 0 !important; background: white; }
            .no-print { display: none !important; }
            @page { size: A4 portrait; margin: 0; }

            /* Jarak Atas saat pindah halaman */
            .page-break-spacer {
                page-break-before: always !important; 
                display: block !important;
                height: 20mm !important; 
                width: 100%;
                visibility: hidden;
            }

            /* Halaman baru untuk lampiran */
            .force-new-page {
                break-before: page;
                page-break-before: always;
            }
        }

        /* Container Dokumen (Portrait) */
        .document-container {
            width: 210mm;
            padding: 20mm; 
            box-sizing: border-box;
            background: white;
            font-family: "Times New Roman", serif;
            font-size: 11pt;
            line-height: 1.5;
            position: relative;
        }

        /* Container Lampiran (Landscape via Rotation) */
        .lampiran-wrapper-rotated {
            width: 210mm;
            height: 297mm;
            position: relative;
            overflow: hidden; 
            background: white;
        }

        .lampiran-content {
            width: 297mm;  
            height: 210mm; 
            padding: 15mm;
            box-sizing: border-box;
            font-family: "Times New Roman", serif;
            font-size: 10pt;
            position: absolute;
            top: 0;
            left: 0;
            transform-origin: top left;
            transform: translateX(210mm) rotate(90deg);
        }

        @media screen {
            .document-container { margin-bottom: 2rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .lampiran-wrapper-rotated {
                width: 297mm;
                height: 210mm;
                margin-bottom: 2rem;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                overflow: visible;
                break-before: auto;
            }
            .lampiran-content {
                width: 100%;
                height: 100%;
                position: static;
                transform: none;
            }
            .page-break-spacer { display: block; margin: 20px 0; color: #ccc; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="w-full max-w-[297mm] flex justify-between items-center mb-6 no-print">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded shadow font-bold transition">
          <FaArrowLeft /> Kembali
        </button>
        <button onClick={handlePrint} className="flex items-center gap-2 bg-[#1A2A80] hover:bg-blue-900 text-white px-6 py-2 rounded shadow font-bold transition">
          <FaPrint /> Cetak PDF
        </button>
      </div>

      {/* 1. KONTEN NASKAH (MENGALIR + MANUAL PAGE BREAK) */}
      <div className="document-container mx-auto">
        <div className="text-center font-bold mb-6"> 
            <h3 className="uppercase text-lg m-0 leading-tight">PERJANJIAN KERJA</h3>
            <h3 className="uppercase text-lg m-0 leading-tight">PETUGAS PENDATAAN LAPANGAN</h3>
            <h3 className="uppercase text-lg m-0 leading-tight">KEGIATAN SURVEI/SENSUS TAHUN {tahunAnggaran}</h3>
            <h3 className="uppercase m-0 leading-tight">PADA BADAN PUSAT STATISTIK KOTA SALATIGA</h3>
            <p className="font-normal mt-2">NOMOR: {setting.nomor_surat_format}</p>
        </div>

        <div className="text-justify mb-4" dangerouslySetInnerHTML={{ __html: replaceVariables(templateParts.pembuka) }}></div>

        <table className="w-full mb-6 align-top">
            <tbody>
                <tr>
                    <td className="w-6 text-center align-top font-bold">1.</td>
                    <td className="w-40 align-top font-bold" dangerouslySetInnerHTML={{ __html: replaceVariables('{{NAMA_PPK}}') }}></td>
                    <td className="w-4 align-top">:</td>
                    <td className="align-top text-justify" dangerouslySetInnerHTML={{ __html: replaceVariables(templateParts.pihak_pertama) }}></td>
                </tr>
                <tr><td colSpan="4" className="h-4"></td></tr>
                <tr>
                    <td className="w-6 text-center align-top font-bold">2.</td>
                    <td className="w-40 align-top font-bold" dangerouslySetInnerHTML={{ __html: replaceVariables('{{NAMA_MITRA}}') }}></td>
                    <td className="w-4 align-top">:</td>
                    <td className="align-top text-justify" dangerouslySetInnerHTML={{ __html: replaceVariables(templateParts.pihak_kedua) }}></td>
                </tr>
            </tbody>
        </table>

        <div className="text-justify mb-4" dangerouslySetInnerHTML={{ __html: replaceVariables(templateParts.kesepakatan) }}></div>

        <div className="space-y-4">
            {templateArticles.map((article, idx) => (
                <div key={idx}>
                    <div className="text-center font-bold">
                        Pasal {article.nomor_pasal}
                        {article.judul_pasal && <span className="block uppercase">{article.judul_pasal}</span>}
                    </div>
                    <div className="text-justify mt-1 whitespace-pre-line" dangerouslySetInnerHTML={{ __html: replaceVariables(article.isi_pasal) }}></div>
                </div>
            ))}
        </div>

        <div className="text-justify mt-6" dangerouslySetInnerHTML={{ __html: replaceVariables(templateParts.penutup) }}></div>

        <div className="mt-12 flex justify-between px-4">
            <div className="text-center w-64">
                <p className="font-bold mb-20">PIHAK KEDUA,</p>
                <p className="font-bold border-b border-black inline-block uppercase" dangerouslySetInnerHTML={{ __html: replaceVariables('{{NAMA_MITRA}}') }}></p>
            </div>
            <div className="text-center w-64">
                <p className="font-bold mb-20">PIHAK PERTAMA,</p>
                <p className="font-bold border-b border-black inline-block" dangerouslySetInnerHTML={{ __html: replaceVariables('{{NAMA_PPK}}') }}></p>
                <p>NIP. {setting.nip_ppk}</p>
            </div>
        </div>
      </div>

      {/* 2. LAMPIRAN (LANDSCAPE + OTOMATIS HALAMAN BARU) */}
      <div className="lampiran-wrapper-rotated force-new-page mx-auto">
          <div className="lampiran-content">
            <div className="text-center font-bold mb-6">
                <h3 className="uppercase text-lg">LAMPIRAN</h3>
                <h3 className="uppercase text-lg">PERJANJIAN KERJA PETUGAS PENDATAAN LAPANGAN</h3>
                <h3 className="uppercase text-lg">KEGIATAN SURVEI/SENSUS TAHUN {tahunAnggaran}</h3>
                <h3 className="uppercase text-lg">PADA BADAN PUSAT STATISTIK KOTA SALATIGA</h3>
                <p className="font-normal mt-1">NOMOR: {setting.nomor_surat_format}</p>
            </div>

            <h4 className="font-bold mb-4 uppercase text-center text-sm">DAFTAR URAIAN TUGAS, JANGKA WAKTU, NILAI PERJANJIAN, DAN BEBAN ANGGARAN</h4>

            <table className="w-full border-collapse border border-black text-sm">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black px-2 py-2 w-10 text-center">No</th>
                        {/* HEADER DIUBAH */}
                        <th className="border border-black px-2 py-2 text-left">Survei dan Kegiatan</th>
                        <th className="border border-black px-2 py-2 text-center w-24">Jabatan</th>
                        
                        <th className="border border-black px-2 py-2 text-center w-32">Jangka Waktu</th>
                        <th className="border border-black px-2 py-2 text-center w-12">Vol</th>
                        <th className="border border-black px-2 py-2 text-center w-24">Satuan</th>
                        <th className="border border-black px-2 py-2 text-right w-28">Harga Satuan</th>
                        <th className="border border-black px-2 py-2 text-right w-32">Nilai Perjanjian</th>
                        <th className="border border-black px-2 py-2 text-center w-24">Beban Anggaran</th>
                    </tr>
                </thead>
                <tbody>
                    {tasks.map((task, index) => (
                        <tr key={index}>
                            <td className="border border-black px-2 py-2 text-center align-top">{index + 1}</td>
                            
                            {/* KONTEN URAIAN TUGAS (SURVEI & KEGIATAN) */}
                            <td className="border border-black px-2 py-2 align-top">
                                <span className="font-bold block">{task.nama_kegiatan}</span>
                                <span className="block text-sm">{task.nama_sub_kegiatan}</span>
                            </td>

                            {/* KOLOM BARU JABATAN */}
                            <td className="border border-black px-2 py-2 text-center align-top">
                                {task.nama_jabatan || '-'}
                            </td>

                            <td className="border border-black px-2 py-2 text-center align-top whitespace-nowrap">
                                {formatDateIndo(task.tanggal_mulai)} s.d. <br/> {formatDateIndo(task.tanggal_selesai)}
                            </td>
                            <td className="border border-black px-2 py-2 text-center align-top">{task.target_volume}</td>
                            <td className="border border-black px-2 py-2 text-center align-top">{task.nama_satuan}</td>
                            <td className="border border-black px-2 py-2 text-right align-top">{formatRupiah(task.harga_satuan)}</td>
                            <td className="border border-black px-2 py-2 text-right align-top">{formatRupiah(task.total_honor)}</td>
                            <td className="border border-black px-2 py-2 text-center align-top">{task.beban_anggaran || '-'}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        {/* COLSPAN DISESUAIKAN JADI 7 */}
                        <td colSpan="7" className="border border-black px-3 py-3 font-bold text-center italic bg-gray-50">
                            Terbilang: {formatTerbilang(totalHonor)}
                        </td>
                        <td className="border border-black px-3 py-3 text-right font-bold bg-gray-50 whitespace-nowrap">
                            {formatRupiah(totalHonor)}
                        </td>
                        <td className="border border-black px-3 py-3 bg-gray-50"></td>
                    </tr>
                </tfoot>
            </table>

            <div className="mt-12 flex justify-between px-10 break-inside-avoid">
                <div className="text-center w-64">
                    <p className="font-bold mb-20">PIHAK KEDUA,</p>
                    <p className="font-bold border-b border-black inline-block uppercase" dangerouslySetInnerHTML={{ __html: replaceVariables('{{NAMA_MITRA}}') }}></p>
                </div>
                <div className="text-center w-64">
                    <p className="font-bold mb-20">PIHAK PERTAMA,</p>
                    <p className="font-bold border-b border-black inline-block" dangerouslySetInnerHTML={{ __html: replaceVariables('{{NAMA_PPK}}') }}></p>
                    <p>NIP. {setting.nip_ppk}</p>
                </div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default CetakSPK;