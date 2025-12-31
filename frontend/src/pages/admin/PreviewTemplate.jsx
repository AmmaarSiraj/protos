import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaPrint } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id/';

const PreviewTemplate = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [previewData, setPreviewData] = useState(null);

  // Dummy Data untuk Lampiran (Diupdate dengan nama_kegiatan)
  const sampleTasks = [
    { 
      nama_kegiatan: 'Survei Sosial Ekonomi Nasional',
      nama_sub_kegiatan: 'Pendataan Lapangan Susenas', 
      nama_jabatan: 'Pencacah Lapangan',
      tanggal_mulai: '2025-03-01', 
      tanggal_selesai: '2025-03-31', 
      target_volume: 50, 
      nama_satuan: 'Rumah Tangga', 
      harga_satuan: 20000, 
      total_honor: 1000000,
      beban_anggaran: '2990.xxx.xxx'
    },
    { 
      nama_kegiatan: 'Survei Sosial Ekonomi Nasional',
      nama_sub_kegiatan: 'Pengolahan Dokumen', 
      nama_jabatan: 'Pengawas',
      tanggal_mulai: '2025-04-01', 
      tanggal_selesai: '2025-04-15', 
      target_volume: 25, 
      nama_satuan: 'Dokumen', 
      harga_satuan: 15000, 
      total_honor: 375000,
      beban_anggaran: '2990.xxx.xxx'
    }
  ];

  // --- HELPER FUNGSI FORMATTING ---
  const getTerbilang = (nilai) => {
    const angka = Math.abs(nilai);
    const baca = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
    let terbilang = '';

    if (angka < 12) {
      terbilang = ' ' + baca[angka];
    } else if (angka < 20) {
      terbilang = getTerbilang(angka - 10) + ' belas';
    } else if (angka < 100) {
      terbilang = getTerbilang(Math.floor(angka / 10)) + ' puluh' + getTerbilang(angka % 10);
    } else if (angka < 200) {
      terbilang = ' seratus' + getTerbilang(angka - 100);
    } else if (angka < 1000) {
      terbilang = getTerbilang(Math.floor(angka / 100)) + ' ratus' + getTerbilang(angka % 100);
    } else if (angka < 2000) {
      terbilang = ' seribu' + getTerbilang(angka - 1000);
    } else if (angka < 1000000) {
      terbilang = getTerbilang(Math.floor(angka / 1000)) + ' ribu' + getTerbilang(angka % 1000);
    } else if (angka < 1000000000) {
      terbilang = getTerbilang(Math.floor(angka / 1000000)) + ' juta' + getTerbilang(angka % 1000000);
    }
    return terbilang;
  };

  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  const formatDateIndo = (dateStr) => {
    if (!dateStr) return '...';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatTerbilang = (nilai) => {
    return getTerbilang(nilai).trim() + ' rupiah';
  };

  const getTanggalTerbilangHariIni = () => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    const now = new Date();
    const hari = days[now.getDay()];
    const tanggal = getTerbilang(now.getDate()).trim();
    const bulan = months[now.getMonth()];
    const tahunAngka = now.getFullYear();
    const tahun = getTerbilang(tahunAngka).trim();

    return `${hari}, tanggal ${tanggal}, bulan ${bulan} tahun ${tahun}`;
  };

  useEffect(() => {
    // Redirect jika state kosong
    if (!state) {
        navigate('/admin/manajemen-spk');
        return;
    }

    const fetchSampleData = async () => {
        const now = new Date();
        const periode = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const token = localStorage.getItem('token');
        
        try {
            const res = await axios.get(`${API_URL}/api/spk-setting/periode/${periode}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const setting = res.data.data || res.data || {};

            setPreviewData({
                nama_ppk: setting.nama_ppk || '[NAMA PPK]',
                nip_ppk: setting.nip_ppk || '[NIP PPK]',
                jabatan_ppk: setting.jabatan_ppk || '[JABATAN PPK]',
                nomor_surat: setting.nomor_surat_format || '000/33730/SPK.MITRA/MM/YYYY',
                tanggal_surat: setting.tanggal_surat 
                    ? new Date(setting.tanggal_surat).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) 
                    : new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}),
                nama_mitra: 'BUDI SANTOSO',
                nik_mitra: '3373012345678901',
                alamat_mitra: 'Jl. Merdeka No. 45, Salatiga',
                total_honor: 'Rp 1.375.000',
                terbilang_honor: 'satu juta tiga ratus tujuh puluh lima ribu rupiah',
                tanggal_terbilang: getTanggalTerbilangHariIni(),
                tahun_anggaran: now.getFullYear()
            });

        } catch (err) {
            console.error("Gagal memuat setting simulasi:", err);
            setPreviewData({
                nama_ppk: '[NAMA PPK]',
                nip_ppk: '[NIP PPK]',
                jabatan_ppk: '[JABATAN PPK]',
                nomor_surat: '[NOMOR SURAT]',
                tanggal_surat: '[TANGGAL]',
                nama_mitra: '[NAMA MITRA]',
                nik_mitra: '[NIK]',
                alamat_mitra: '[ALAMAT]',
                total_honor: '[RP ...]',
                terbilang_honor: '[... rupiah]',
                tanggal_terbilang: getTanggalTerbilangHariIni(),
                tahun_anggaran: new Date().getFullYear()
            });
        }
    };

    fetchSampleData();
  }, [state, navigate]);

  if (!state) return null;

  const { parts, articles } = state;

  const handleBack = () => {
    navigate(-1);
  };

  const handlePrint = () => {
    window.print();
  };

  const replaceVariables = (text) => {
    if (!text || !previewData) return text;
    let result = text;

    result = result.replace(/{{NAMA_PPK}}/g, `<b>${previewData.nama_ppk}</b>`);
    result = result.replace(/{{NIP_PPK}}/g, previewData.nip_ppk);
    result = result.replace(/{{JABATAN_PPK}}/g, previewData.jabatan_ppk);
    result = result.replace(/{{NAMA_MITRA}}/g, `<b>${previewData.nama_mitra}</b>`);
    result = result.replace(/{{NIK}}/g, previewData.nik_mitra);
    result = result.replace(/{{ALAMAT_MITRA}}/g, previewData.alamat_mitra);
    result = result.replace(/{{TOTAL_HONOR}}/g, `<b>${previewData.total_honor}</b>`);
    result = result.replace(/{{TERBILANG}}/g, `<i>${previewData.terbilang_honor}</i>`);
    result = result.replace(/{{TANGGAL_SURAT}}/g, previewData.tanggal_surat);
    result = result.replace(/{{TANGGAL_TERBILANG}}/g, previewData.tanggal_terbilang);
    result = result.replace(/{{TAHUN}}/g, previewData.tahun_anggaran);
    result = result.replace(/{{NOMOR_SURAT}}/g, previewData.nomor_surat);
    
    result = result.replace(/{{Lampiran}}/g, '');

    result = result.replace(
        /{{Break_Space}}/g, 
        '<div class="page-break-spacer"><span class="no-print text-gray-300 text-xs block text-center py-2 border-t border-dashed border-gray-300">-- Halaman Baru --</span></div>'
    );

    return result;
  };

  const totalHonorLampiran = sampleTasks.reduce((acc, curr) => acc + curr.total_honor, 0);

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center font-sans print:p-0 print:bg-white print:block">
      
      <style>{`
        /* CSS SETUP UNTUK LANDSCAPE LAMPIRAN */
        @media print {
            html, body { margin: 0 !important; padding: 0 !important; background: white; }
            .no-print { display: none !important; }
            @page { size: A4 portrait; margin: 0; }

            .page-break-spacer {
                page-break-before: always !important; 
                display: block !important;
                height: 20mm !important; 
                width: 100%;
                visibility: hidden;
            }

            .force-new-page {
                break-before: page;
                page-break-before: always;
            }
        }

        .document-container {
            width: 210mm;
            min-height: 297mm;
            padding: 20mm; 
            box-sizing: border-box;
            background: white;
            font-family: "Times New Roman", serif;
            font-size: 11pt;
            line-height: 1.5;
            position: relative;
            margin: 0 auto;
        }

        /* Container Lampiran (Rotasi) */
        .lampiran-wrapper-rotated {
            width: 210mm;
            height: 297mm;
            position: relative;
            overflow: hidden; 
            background: white;
            margin: 0 auto;
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
        <button onClick={handleBack} className="flex items-center gap-2 text-gray-600 font-bold hover:text-[#1A2A80] bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 transition">
            <FaArrowLeft /> Kembali
        </button>
        
        <div className="flex gap-3 items-center">
            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg text-xs font-bold border border-blue-200 shadow-sm">
                MODE SIMULASI
            </div>
            <button 
                onClick={handlePrint} 
                className="flex items-center gap-2 bg-[#1A2A80] text-white font-bold px-5 py-2 rounded-lg shadow-md hover:bg-blue-900 transition"
            >
                <FaPrint /> Cetak Contoh
            </button>
        </div>
      </div>

      {/* 1. KONTEN NASKAH UTAMA */}
      <div className="document-container shadow-2xl text-black font-serif text-[11pt] leading-relaxed relative">
        <div className="text-center font-bold mb-6 pt-0 mt-0"> 
            <h3 className="uppercase text-lg m-0 leading-tight">PERJANJIAN KERJA</h3>
            <h3 className="uppercase text-lg m-0 leading-tight">PETUGAS PENDATAAN LAPANGAN</h3>
            <h3 className="uppercase text-lg m-0 leading-tight">KEGIATAN SURVEI/SENSUS TAHUN {previewData?.tahun_anggaran}</h3>
            <h3 className="uppercase m-0 leading-tight">PADA BADAN PUSAT STATISTIK KOTA SALATIGA</h3>
            <p className="font-normal mt-2">NOMOR: {previewData?.nomor_surat}</p>
        </div>

        <div className="text-justify mb-4" dangerouslySetInnerHTML={{ __html: replaceVariables(parts.pembuka) }}></div>

        <table className="w-full mb-6 align-top">
            <tbody>
                <tr>
                    <td className="w-6 text-center align-top font-bold">1.</td>
                    <td className="w-40 align-top font-bold" dangerouslySetInnerHTML={{ __html: replaceVariables('{{NAMA_PPK}}') }}></td>
                    <td className="w-4 align-top">:</td>
                    <td className="align-top text-justify" dangerouslySetInnerHTML={{ __html: replaceVariables(parts.pihak_pertama) }}></td>
                </tr>
                <tr><td colSpan="4" className="h-4"></td></tr>
                <tr>
                    <td className="w-6 text-center align-top font-bold">2.</td>
                    <td className="w-40 align-top font-bold" dangerouslySetInnerHTML={{ __html: replaceVariables('{{NAMA_MITRA}}') }}></td>
                    <td className="w-4 align-top">:</td>
                    <td className="align-top text-justify" dangerouslySetInnerHTML={{ __html: replaceVariables(parts.pihak_kedua) }}></td>
                </tr>
            </tbody>
        </table>

        <div className="text-justify mb-4" dangerouslySetInnerHTML={{ __html: replaceVariables(parts.kesepakatan) }}></div>

        <div className="space-y-4">
            {articles.map((article, idx) => (
                <div key={idx}>
                    <div className="text-center font-bold">
                        Pasal {article.nomor_pasal}
                        {article.judul_pasal && <span className="block uppercase">{article.judul_pasal}</span>}
                    </div>
                    <div className="text-justify mt-1 whitespace-pre-line" dangerouslySetInnerHTML={{ __html: replaceVariables(article.isi_pasal) }}></div>
                </div>
            ))}
        </div>

        <div className="text-justify mt-6" dangerouslySetInnerHTML={{ __html: replaceVariables(parts.penutup) }}></div>

        <div className="mt-12 flex justify-between px-4 break-inside-avoid">
            <div className="text-center w-64">
                <p className="font-bold mb-20">PIHAK KEDUA,</p>
                <p className="font-bold border-b border-black inline-block uppercase" dangerouslySetInnerHTML={{ __html: replaceVariables('{{NAMA_MITRA}}') }}></p>
            </div>
            <div className="text-center w-64">
                <p className="font-bold mb-20">PIHAK PERTAMA,</p>
                <p className="font-bold border-b border-black inline-block" dangerouslySetInnerHTML={{ __html: replaceVariables('{{NAMA_PPK}}') }}></p>
                <p>NIP. {previewData?.nip_ppk}</p>
            </div>
        </div>
      </div>

      {/* 2. LAMPIRAN (LANDSCAPE) */}
      <div className="lampiran-wrapper-rotated force-new-page mx-auto">
          <div className="lampiran-content">
            <div className="text-center font-bold mb-6">
                <h3 className="uppercase text-lg">LAMPIRAN</h3>
                <h3 className="uppercase text-lg">PERJANJIAN KERJA PETUGAS PENDATAAN LAPANGAN</h3>
                <h3 className="uppercase text-lg">KEGIATAN SURVEI/SENSUS TAHUN {previewData?.tahun_anggaran}</h3>
                <h3 className="uppercase text-lg">PADA BADAN PUSAT STATISTIK KOTA SALATIGA</h3>
                <p className="font-normal mt-1">NOMOR: {previewData?.nomor_surat}</p>
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
                    {sampleTasks.map((task, index) => (
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
                            Terbilang: {formatTerbilang(totalHonorLampiran)}
                        </td>
                        <td className="border border-black px-3 py-3 text-right font-bold bg-gray-50 whitespace-nowrap">
                            {formatRupiah(totalHonorLampiran)}
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
                    <p>NIP. {previewData?.nip_ppk}</p>
                </div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default PreviewTemplate;