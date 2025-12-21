import React, { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import bpsLogo from '../../assets/bpslogo.png'; // Pastikan path ini benar

const TemplatePenugasan = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Mengambil data yang dikirim dari halaman TambahPenugasan
  // data = { mitra: object, activities: array }
  const { mitra, activities } = location.state || {};

  const printAreaRef = useRef();

  // Jika halaman diakses langsung tanpa data, kembalikan ke dashboard
  if (!mitra || !activities) {
    return (
      <div className="p-10 text-center">
        <p className="text-red-500 mb-4">Data penugasan tidak ditemukan.</p>
        <button onClick={() => navigate('/admin/penugasan')} className="bg-indigo-600 text-white px-4 py-2 rounded">
          Kembali ke Daftar
        </button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  // Format Tanggal Hari Ini
  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      
      {/* --- TOOLBAR (TOMBOL AKSI) --- */}
      <div className="w-full max-w-[210mm] flex justify-between mb-6 print:hidden">
        <button 
          onClick={() => navigate('/admin/penugasan')}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded shadow flex items-center gap-2"
        >
          &larr; Kembali
        </button>
        <div className="flex gap-3">
          <button 
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow font-bold flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            Cetak / Simpan PDF
          </button>
        </div>
      </div>

      {/* --- KERTAS A4 (PREVIEW SURAT) --- */}
      <div 
        ref={printAreaRef}
        className="bg-white w-[210mm] min-h-[297mm] p-[20mm] shadow-2xl text-black font-serif leading-relaxed print:shadow-none print:w-full print:h-auto"
      >
        {/* KOP SURAT (Berdasarkan PDF Referensi) */}
        <div className="flex items-center border-b-4 border-double border-black pb-4 mb-6">
          <img src={bpsLogo} alt="Logo BPS" className="w-24 h-auto mr-4" />
          <div className="text-center flex-1">
            <h1 className="text-xl font-bold tracking-wide text-gray-900 uppercase">BADAN PUSAT STATISTIK</h1>
            <h2 className="text-lg font-bold text-gray-900 uppercase">KOTA SALATIGA</h2>
            <p className="text-sm text-gray-800 mt-1">
              Jl. Hasanudin Km.1 Kel. Dukuh Salatiga 50722. Telp. (0298) 326319
            </p>
            <p className="text-sm text-gray-800">
              Website: salatigakota.bps.go.id &nbsp;|&nbsp; E-mail: bps3373@bps.go.id
            </p>
          </div>
        </div>

        {/* JUDUL SURAT */}
        <div className="text-center mb-8">
          <h3 className="text-lg font-bold underline uppercase">SURAT PERINTAH TUGAS</h3>
          <p className="text-sm">NOMOR: B-_____/33730/___/2025</p>
        </div>

        {/* PEMBUKA */}
        <div className="mb-6 text-justify">
          <p className="mb-4">Yang bertanda tangan di bawah ini:</p>
          <table className="w-full mb-6">
            <tbody>
              <tr>
                <td className="w-32 align-top">Nama</td>
                <td className="w-4 align-top">:</td>
                <td className="font-bold">AGUSKADARYANTO, SST</td>
              </tr>
              <tr>
                <td className="align-top">NIP</td>
                <td className="align-top">:</td>
                <td>196808301992031005</td>
              </tr>
              <tr>
                <td className="align-top">Jabatan</td>
                <td className="align-top">:</td>
                <td>Kepala BPS Kota Salatiga</td>
              </tr>
            </tbody>
          </table>

          <p className="mb-4">Memberikan tugas kepada Mitra Statistik di bawah ini:</p>

          {/* DATA MITRA */}
          <table className="w-full mb-6">
            <tbody>
              <tr>
                <td className="w-32 align-top">Nama</td>
                <td className="w-4 align-top">:</td>
                <td className="font-bold uppercase">{mitra.nama_lengkap}</td>
              </tr>
              <tr>
                <td className="align-top">NIK</td>
                <td className="align-top">:</td>
                <td>{mitra.nik}</td>
              </tr>
              <tr>
                <td className="align-top">Alamat</td>
                <td className="align-top">:</td>
                <td>{mitra.alamat}</td>
              </tr>
            </tbody>
          </table>

          <p className="mb-4">Untuk melaksanakan kegiatan statistik sebagai berikut:</p>
        </div>

        {/* TABEL KEGIATAN */}
        <table className="w-full border-collapse border border-black mb-8 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black px-2 py-2 text-center w-12">No.</th>
              <th className="border border-black px-4 py-2 text-left">Nama Kegiatan / Sub Kegiatan</th>
              <th className="border border-black px-4 py-2 text-left">Jabatan / Peran</th>
              <th className="border border-black px-4 py-2 text-center">Periode</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((item, index) => {
              // Mencari nama jabatan yang user friendly
              const namaJabatan = item.jabatanList?.find(j => j.kode_jabatan === item.jabatan)?.nama_jabatan || item.jabatan || '-';
              
              return (
                <tr key={index}>
                  <td className="border border-black px-2 py-2 text-center align-top">{index + 1}</td>
                  <td className="border border-black px-4 py-2 align-top">
                    <span className="font-bold block">{item.searchActivity}</span>
                    <span className="text-xs italic text-gray-600">Induk: {item.penugasan?.nama_kegiatan}</span>
                  </td>
                  <td className="border border-black px-4 py-2 align-top">
                    {namaJabatan}
                  </td>
                  <td className="border border-black px-4 py-2 text-center align-top">
                    {/* Simulasi tanggal, idealnya dari DB */}
                    {new Date().getFullYear()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* PENUTUP */}
        <div className="mb-8 text-justify">
          <p>
            Surat perintah tugas ini berlaku efektif pada periode kegiatan yang disebutkan di atas.
            Demikian surat perintah tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.
          </p>
        </div>

        {/* TANDA TANGAN */}
        <div className="flex justify-end mt-12">
          <div className="text-center w-64">
            <p className="mb-2">Salatiga, {currentDate}</p>
            <p className="font-bold mb-20">Kepala BPS Kota Salatiga,</p>
            {/* Space Tanda Tangan */}
            <p className="font-bold underline">AGUSKADARYANTO, SST</p>
            <p>NIP. 196808301992031005</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TemplatePenugasan;