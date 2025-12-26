// src/pages/DetailPerencanaan.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import PopupTambahAnggotaPerencanaan from '../components/admin/PopupTambahAnggotaPerencanaan';
import { 
  FaArrowLeft, FaTrash, FaPlus, FaUserTie, FaChartPie, 
  FaClipboardList, FaMoneyBillWave, FaChartBar, FaTasks, 
  FaEdit, FaExclamationCircle, FaBoxOpen, FaCheckCircle, FaUsers
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.id';
const getToken = () => localStorage.getItem('token');

// --- KOMPONEN DIAGRAM LINGKARAN (PIE CHART) ---
const SimplePieChart = ({ percentage, colorHex }) => {
  const visualPercent = Math.min(Math.max(percentage || 0, 0), 100);
  return (
    <div className="relative w-16 h-16 rounded-full shadow-inner flex items-center justify-center bg-white border-4 border-gray-100"
         style={{ background: `conic-gradient(${colorHex} ${visualPercent * 3.6}deg, transparent 0deg)` }}>
       {/* Background circle fix for conic-gradient transparency if needed, or just use white bg container */}
       <div className="absolute inset-0 rounded-full" style={{ zIndex: -1, background: '#e5e7eb' }}></div>
       
      <div className="w-12 h-12 bg-white rounded-full flex flex-col items-center justify-center z-10 shadow-sm">
        <span className="text-[10px] font-extrabold" style={{ color: colorHex }}>
            {Math.round(percentage || 0)}%
        </span>
      </div>
    </div>
  );
};

// Helper Format Rupiah
const formatRupiah = (num) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);
};

const DetailPerencanaan = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State Data Utama
  const [Perencanaan, setPerencanaan] = useState(null);
  const [anggota, setAnggota] = useState([]);
  const [listHonorarium, setListHonorarium] = useState([]); 
  
  // State Data Global untuk Validasi Limit
  const [rawHonorarium, setRawHonorarium] = useState([]);
  const [allAturan, setAllAturan] = useState([]);
  const [allKelompok, setAllKelompok] = useState([]); 
  const [allPenugasan, setAllPenugasan] = useState([]);
  const [allSubKegiatan, setAllSubKegiatan] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  // State untuk Edit Member
  const [editingMember, setEditingMember] = useState(null);
  const [editForm, setEditForm] = useState({ kode_jabatan: '', volume_tugas: 1 });

  // 1. FETCH DATA DETAIL & GLOBAL
  const fetchDetailData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const token = getToken();
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [
        perencanaanRes, 
        anggotaRes, 
        honorRes,
        aturanRes,
        kelompokRes,
        allPenugasanRes,
        allSubRes
      ] = await Promise.all([
        axios.get(`${API_URL}/api/perencanaan/${id}`, config),
        axios.get(`${API_URL}/api/perencanaan/${id}/anggota`, config),
        axios.get(`${API_URL}/api/honorarium`, config),
        axios.get(`${API_URL}/api/aturan-periode`, config),
        axios.get(`${API_URL}/api/kelompok-penugasan`, config), 
        axios.get(`${API_URL}/api/penugasan`, config),
        axios.get(`${API_URL}/api/subkegiatan`, config)
      ]);

      const detailPerencanaan = perencanaanRes.data.data; 
      setPerencanaan(detailPerencanaan);
      setAnggota(anggotaRes.data || []);
      
      const allHonor = honorRes.data.data || []; 
      setRawHonorarium(allHonor);

      // Filter Honorarium sesuai SubKegiatan saat ini
      const currentSubId = detailPerencanaan?.id_subkegiatan;
      if (currentSubId) {
          const filteredHonor = allHonor.filter(h => String(h.id_subkegiatan) === String(currentSubId));
          setListHonorarium(filteredHonor);
      }

      // Set Data Global
      setAllAturan(aturanRes.data.data || []);
      setAllKelompok(kelompokRes.data.data || []);
      setAllPenugasan(allPenugasanRes.data.data || []);
      setAllSubKegiatan(allSubRes.data.data || []);

    } catch (err) { 
      console.error("Detail Error:", err);
      if (err.response && err.response.status !== 404) {
         Swal.fire('Error', 'Gagal memuat data detail.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetailData();
  }, [id]);

  // 2. LOGIKA HITUNG PROGRES (QUOTA)
  const getJobStats = (kodeJabatan, basisVolume) => {
    const totalAssigned = anggota
      .filter(a => a.kode_jabatan === kodeJabatan)
      .reduce((acc, curr) => acc + (Number(curr.volume_tugas) || 0), 0);
    
    const target = basisVolume || 0;
    const remaining = target - totalAssigned;
    const percentage = target > 0 ? (totalAssigned / target) * 100 : 0;
    
    return { assigned: totalAssigned, target: target, remaining: remaining, percentage: percentage };
  };

  // 3. HANDLER EDIT MEMBER
  const openEditModal = (member) => {
    setEditingMember(member);
    setEditForm({
        kode_jabatan: member.kode_jabatan,
        volume_tugas: member.volume_tugas
    });
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
        const token = getToken();
        // Update ke endpoint Kelompok Perencanaan
        await axios.put(`${API_URL}/api/kelompok-perencanaan/${editingMember.id_kelompok}`, editForm, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        Swal.fire({
            icon: 'success', title: 'Tersimpan',
            text: 'Data anggota diperbarui.', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end'
        });
        
        setEditingMember(null);
        fetchDetailData(); 
    } catch (err) {
        Swal.fire('Gagal Update', err.response?.data?.error || 'Terjadi kesalahan.', 'error');
    }
  };

  // --- 4. LOGIKA HITUNG PENDAPATAN (VALIDASI BAR) ---
  const calculateFinalStats = useMemo(() => {
    if (!editingMember || !Perencanaan || !Perencanaan.tanggal_mulai) {
        return { otherIncome: 0, currentInputIncome: 0, total: 0, limit: 0, isOver: false };
    }

    try {
        const tglMulai = new Date(Perencanaan.tanggal_mulai);
        
        // A. Ambil LIMIT berdasarkan TAHUN
        const targetYear = tglMulai.getFullYear().toString(); 
        const aturan = allAturan.find(a => String(a.periode) === String(targetYear));
        const limit = aturan ? Number(aturan.batas_honor) : 0;

        // B. Tentukan BULAN Target (Format: 2025-12)
        const targetMonth = `${tglMulai.getFullYear()}-${String(tglMulai.getMonth() + 1).padStart(2, '0')}`;

        if (limit <= 0) return { otherIncome: 0, currentInputIncome: 0, total: 0, limit: 0, isOver: false };

        // C. Hitung Pendapatan Lain (Bar Hijau) dari KELOMPOK PENUGASAN (Realisasi)
        let otherIncome = 0;
        const targetMitraId = String(editingMember.id_mitra);

        allKelompok.forEach(tugas => {
            // Hanya cek tugas milik mitra ini
            if (String(tugas.id_mitra) !== targetMitraId) return;

            // Cari parent penugasan untuk cek tanggal
            const parentPenugasan = allPenugasan.find(p => String(p.id_penugasan) === String(tugas.id_penugasan));
            if (!parentPenugasan) return;

            // Cari subkegiatan untuk cek tanggal mulai
            const parentSub = allSubKegiatan.find(s => String(s.id) === String(parentPenugasan.id_subkegiatan));
            
            if (parentSub && parentSub.tanggal_mulai) {
                const d = new Date(parentSub.tanggal_mulai);
                const tugasMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

                // Jika bulannya sama, hitung sebagai pendapatan
                if (tugasMonth === targetMonth) {
                    let honorItem = 0;
                    
                    const hInfo = rawHonorarium.find(rh => 
                        String(rh.id_subkegiatan) === String(parentSub.id) && 
                        String(rh.kode_jabatan) === String(tugas.kode_jabatan)
                    );

                    if (hInfo) {
                        honorItem = Number(hInfo.tarif) * (Number(tugas.volume_tugas) || 0);
                    } else {
                        honorItem = Number(tugas.total_honor) || 0;
                    }
                    otherIncome += honorItem;
                }
            }
        });

        // D. Hitung Pendapatan Inputan Saat Ini (Bar Biru/Merah)
        const currentHonorInfo = listHonorarium.find(h => String(h.kode_jabatan) === String(editForm.kode_jabatan));
        const tarifBaru = currentHonorInfo ? Number(currentHonorInfo.tarif) : 0;
        const volBaru = Number(editForm.volume_tugas) || 0;
        const currentInputIncome = tarifBaru * volBaru;

        // E. Total & Validasi
        const totalProjected = otherIncome + currentInputIncome;
        const isOver = totalProjected > limit;

        return { otherIncome, currentInputIncome, total: totalProjected, limit, isOver };
    } catch (e) {
        console.error("Error calculating stats:", e);
        return { otherIncome: 0, currentInputIncome: 0, total: 0, limit: 0, isOver: false };
    }

  }, [editingMember, editForm, allAturan, allKelompok, allPenugasan, allSubKegiatan, rawHonorarium, listHonorarium, Perencanaan]);


  // 5. HANDLER DELETE
  const handleRemoveAnggota = async (id_kelompok, nama_mitra) => {
    const result = await Swal.fire({
      title: 'Keluarkan Anggota?', 
      text: `Yakin ingin mengeluarkan "${nama_mitra}"?`,
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Ya, Keluarkan!'
    });

    if (result.isConfirmed) {
      try {
        const token = getToken();
        await axios.delete(`${API_URL}/api/kelompok-perencanaan/${id_kelompok}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchDetailData(); 
        Swal.fire({ icon: 'success', title: 'Terhapus', text: 'Anggota berhasil dikeluarkan.', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
      } catch (err) {
        Swal.fire('Gagal!', 'Gagal menghapus anggota.', 'error');
      }
    }
  };

  const handleDeletePerencanaan = async () => {
    const result = await Swal.fire({
      title: 'Bubarkan Tim?', text: "Seluruh data Perencanaan ini akan dihapus permanen!",
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Ya, Bubarkan!'
    });

    if (result.isConfirmed) {
      try {
        const token = getToken();
        await axios.delete(`${API_URL}/api/perencanaan/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        navigate('/perencanaan');
        Swal.fire('Dibubarkan!', 'Tim berhasil dibubarkan.', 'success');
      } catch (err) {
        Swal.fire('Gagal!', 'Gagal membubarkan tim.', 'error');
      }
    }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-blue-100 border-t-[#1A2A80] rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Memuat detail tim...</p>
    </div>
  );

  if (!Perencanaan) return <div className="text-center py-20 text-red-500 font-bold">Data Perencanaan tidak ditemukan.</div>;

  const totalHonorTim = anggota.reduce((acc, curr) => acc + (Number(curr.total_honor) || 0), 0);

  const popupData = {
    year: Perencanaan?.tanggal_mulai 
      ? new Date(Perencanaan.tanggal_mulai).getFullYear().toString() 
      : new Date().getFullYear().toString(),
    idSubKegiatan: Perencanaan?.id_subkegiatan
  };

  return (
    // Container Utama
    <div className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* HEADER SECTION */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                    <Link to="/perencanaan" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#1A2A80] transition font-bold text-xs mb-3">
                        <FaArrowLeft size={10} /> KEMBALI KE DAFTAR
                    </Link>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
                        <div className="bg-blue-50 text-[#1A2A80] p-2.5 rounded-lg">
                            <FaUsers size={20} />
                        </div>
                        {Perencanaan.nama_sub_kegiatan}
                    </h1>
                    <p className="text-sm text-gray-500 mt-2 ml-1">
                        Survei Induk: <span className="font-bold text-gray-700">{Perencanaan.nama_kegiatan}</span>
                    </p>
                </div>
                <button 
                    onClick={handleDeletePerencanaan} 
                    className="flex items-center gap-2 bg-white text-red-600 px-4 py-2.5 rounded-xl hover:bg-red-50 text-sm font-bold border border-red-200 transition shadow-sm"
                >
                    <FaTrash size={12} /> Bubarkan Tim
                </button>
            </div>

            <hr className="border-gray-100 my-6" />

            {/* INFO CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-[#1A2A80] text-xl">
                        <FaUserTie />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Ketua Tim / Pengawas</p>
                        <p className="text-sm font-bold text-gray-900 truncate max-w-[200px]" title={Perencanaan.nama_pengawas}>{Perencanaan.nama_pengawas}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">{Perencanaan.email_pengawas}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xl">
                        <FaChartPie />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Total Anggota</p>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-xl">{anggota.length}</span>
                            <span className="text-xs font-medium text-gray-500">Orang Terdaftar</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-xl">
                        <FaMoneyBillWave />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Total Anggaran Honor</p>
                        <span className="font-bold text-gray-900 text-xl">{formatRupiah(totalHonorTim)}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* PROGRES JABATAN (CARD PUTIH BARU) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2 mb-6">
                <FaChartBar className="text-[#1A2A80]"/> Progres & Kuota Jabatan
            </h3>
            {listHonorarium.length === 0 ? (
                <div className="p-8 bg-gray-50 rounded-xl text-sm border border-dashed border-gray-300 text-center text-gray-400 italic">
                    Belum ada data jabatan untuk kegiatan ini.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {listHonorarium.map(job => {
                        const stats = getJobStats(job.kode_jabatan, job.basis_volume);
                        const isOver = stats.assigned > stats.target;
                        let chartColor = '#3b82f6';
                        if (stats.percentage >= 100 && !isOver) chartColor = '#10b981'; // Green
                        if (isOver) chartColor = '#ef4444'; // Red

                        return (
                            <div key={job.id_honorarium} className="bg-gray-50 p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-5 relative overflow-hidden group hover:border-blue-200 transition-all">
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-sm leading-tight">{job.nama_jabatan}</h4>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[10px] font-mono font-bold text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                                                {job.kode_jabatan}
                                            </span>
                                            <span className="text-[10px] text-gray-400">Target: <b>{stats.target}</b></span>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-600 space-y-1 pt-3 border-t border-gray-200">
                                        <div className="flex justify-between items-center">
                                            <span>Terisi:</span>
                                            <span className={`font-bold ${isOver ? 'text-red-600' : 'text-[#1A2A80]'}`}>{stats.assigned}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span>Sisa:</span>
                                            <span className="font-medium text-gray-500">{stats.remaining < 0 ? 0 : stats.remaining}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center justify-center pl-4 border-l border-gray-200">
                                    <SimplePieChart percentage={stats.percentage} colorHex={chartColor} />
                                    {isOver ? (
                                        <span className="mt-2 text-[9px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold border border-red-200">Overlimit</span>
                                    ) : stats.percentage >= 100 ? (
                                        <span className="mt-2 text-[9px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold border border-green-200">Penuh</span>
                                    ) : (
                                        <span className="mt-2 text-[9px] text-gray-400 font-medium">Progress</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        {/* TABEL ANGGOTA */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/30">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wide">
                <FaTasks className="text-[#1A2A80]" /> Daftar Anggota Tim
            </h3>
            <button 
                onClick={() => setIsPopupOpen(true)} 
                className="flex items-center gap-2 bg-[#1A2A80] hover:bg-blue-900 text-white py-2 px-4 rounded-xl text-sm font-bold transition shadow-md hover:shadow-lg"
            >
                <FaPlus size={12} /> Tambah Anggota
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-white text-gray-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4 text-left">Nama Mitra</th>
                  <th className="px-6 py-4 text-left">Detail Jabatan</th>
                  <th className="px-6 py-4 text-center">Volume Tugas</th>
                  <th className="px-6 py-4 text-right">Total Honor</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {anggota.length === 0 ? (
                    <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-400 italic bg-gray-50/30">
                            Belum ada anggota yang ditambahkan.
                        </td>
                    </tr>
                ) : (
                    anggota.map((item) => (
                    <tr key={item.id_kelompok} className="hover:bg-blue-50/20 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#1A2A80] font-bold text-xs border border-blue-100 shadow-sm">
                                {item.nama_lengkap ? item.nama_lengkap.charAt(0) : '?'}
                            </div>
                            <div>
                                <div className="font-bold text-gray-900">{item.nama_lengkap}</div>
                                <div className="text-xs text-gray-500 font-mono">{item.nik}</div>
                            </div>
                        </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                                <span className="font-bold text-gray-700 text-xs uppercase">{item.nama_jabatan}</span>
                                <span className="text-[10px] text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200 w-fit mt-1">
                                    {item.kode_jabatan}
                                </span>
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="inline-flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1 rounded-lg text-gray-700 font-bold shadow-sm">
                            {item.volume_tugas || 0} <FaBoxOpen className="text-gray-300 text-xs"/>
                        </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-[#1A2A80] font-bold font-mono">{formatRupiah(item.total_honor)}</div>
                        {Number(item.harga_satuan) > 0 && (
                            <div className="text-[10px] text-gray-400 mt-0.5">@ {formatRupiah(item.harga_satuan)} / vol</div>
                        )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => openEditModal(item)} 
                                className="text-blue-500 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition border border-transparent hover:border-blue-100" 
                                title="Edit"
                            >
                                <FaEdit />
                            </button>
                            <button 
                                onClick={() => handleRemoveAnggota(item.id_kelompok, item.nama_lengkap)} 
                                className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition border border-transparent hover:border-red-100" 
                                title="Hapus"
                            >
                                <FaTrash />
                            </button>
                        </div>
                        </td>
                    </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- MODAL EDIT ANGGOTA --- */}
        {editingMember && (
            <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in-up">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 overflow-hidden">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <FaEdit className="text-blue-500" /> Edit Tugas Anggota
                        </h3>
                        <button onClick={() => setEditingMember(null)} className="text-gray-400 hover:text-red-500 transition">
                            <FaTasks size={18} />
                        </button>
                    </div>
                    
                    <div className="mb-5 bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white text-[#1A2A80] flex items-center justify-center font-bold text-sm shadow-sm border border-blue-50">
                            {editingMember.nama_lengkap.charAt(0)}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-900">{editingMember.nama_lengkap}</p>
                            <p className="text-xs text-gray-500 font-mono">{editingMember.nik}</p>
                        </div>
                    </div>

                    <form onSubmit={handleUpdateMember} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Pilih Jabatan</label>
                            <select 
                                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1A2A80] focus:border-transparent outline-none transition bg-gray-50 focus:bg-white" 
                                value={editForm.kode_jabatan} 
                                onChange={(e) => setEditForm({...editForm, kode_jabatan: e.target.value})}
                            >
                                {listHonorarium.map(h => (
                                    <option key={h.kode_jabatan} value={h.kode_jabatan}>
                                        {h.nama_jabatan} (Rp {Number(h.tarif).toLocaleString('id-ID')})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Volume Tugas</label>
                            <div className="flex items-center shadow-sm rounded-xl overflow-hidden">
                                <input 
                                    type="number" 
                                    min="1" 
                                    className="w-full border border-gray-300 border-r-0 rounded-l-xl px-4 py-2.5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[#1A2A80] outline-none" 
                                    value={editForm.volume_tugas} 
                                    onChange={(e) => setEditForm({...editForm, volume_tugas: e.target.value})}
                                />
                                <span className="bg-gray-100 text-gray-500 px-4 py-2.5 border border-gray-300 text-sm font-bold">
                                    Unit
                                </span>
                            </div>
                        </div>

                        {/* BAR PROGRES VALIDASI LIMIT */}
                        {calculateFinalStats.limit > 0 && (
                            <div className={`mt-4 pt-4 border-t border-gray-100 ${calculateFinalStats.isOver ? 'bg-red-50 -mx-6 px-6 pb-4 border-t-red-100' : ''}`}>
                                 <div className="flex justify-between items-end mb-2">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Limit Honor (Bulan Ini)</span>
                                    <span className={`text-[10px] font-mono font-bold ${calculateFinalStats.isOver ? 'text-red-600' : 'text-gray-500'}`}>
                                        {formatRupiah(calculateFinalStats.total)} / {formatRupiah(calculateFinalStats.limit)}
                                    </span>
                                 </div>
                                 <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden flex mb-2 shadow-inner">
                                    {/* Bar Hijau: Pendapatan Lain (Locked) */}
                                    <div 
                                        className="bg-emerald-400 h-full transition-all duration-300" 
                                        style={{ width: `${Math.min((calculateFinalStats.otherIncome / calculateFinalStats.limit) * 100, 100)}%` }} 
                                        title="Pendapatan dari proyek lain"
                                    ></div>
                                    {/* Bar Biru/Merah: Pendapatan Inputan (Dynamic) */}
                                    <div 
                                        className={`h-full transition-all duration-300 ${calculateFinalStats.isOver ? 'bg-red-500' : 'bg-blue-500'}`} 
                                        style={{ width: `${Math.min((calculateFinalStats.currentInputIncome / calculateFinalStats.limit) * 100, 100 - Math.min((calculateFinalStats.otherIncome / calculateFinalStats.limit) * 100, 100))}%` }} 
                                        title="Pendapatan dari tugas ini"
                                    ></div>
                                 </div>
                                 {calculateFinalStats.isOver ? (
                                     <div className="text-[10px] text-red-600 font-bold flex items-center gap-1 animate-pulse">
                                         <FaExclamationCircle /> Melebihi Batas Honor!
                                     </div>
                                 ) : (
                                     <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                         <FaCheckCircle /> Masih Aman
                                     </div>
                                 )}
                            </div>
                        )}
                        
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                            <button 
                                type="button" 
                                onClick={() => setEditingMember(null)} 
                                className="px-5 py-2.5 text-gray-600 text-sm font-bold hover:bg-gray-100 rounded-xl transition"
                            >
                                Batal
                            </button>
                            <button 
                                type="submit" 
                                className="px-6 py-2.5 bg-[#1A2A80] text-white text-sm font-bold rounded-xl hover:bg-blue-900 transition shadow-lg hover:shadow-xl"
                            >
                                Simpan Perubahan
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

      {/* POPUP TAMBAH ANGGOTA KHUSUS PERENCANAAN */}
      <PopupTambahAnggotaPerencanaan 
        isOpen={isPopupOpen} 
        onClose={() => setIsPopupOpen(false)} 
        id_perencanaan={id} 
        existingAnggotaIds={anggota.map(a => a.id_mitra)} 
        onAnggotaAdded={fetchDetailData}
        targetYear={popupData.year} 
        idSubKegiatan={popupData.idSubKegiatan}
      />
    </div>
  );
};

export default DetailPerencanaan;