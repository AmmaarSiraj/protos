// src/components/admin/PopupTambahAnggota.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2'; 
import { 
  FaSearch, 
  FaUserPlus, 
  FaTimes, 
  FaIdCard, 
  FaBriefcase,
  FaExclamationCircle,
  FaBoxOpen,
  FaFilter,
  FaChartPie
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://makinasik.web.bps.go.id';
const getToken = () => localStorage.getItem('token');

// Helper Format Rupiah
const formatRupiah = (num) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);
};

const PopupTambahAnggota = ({ 
  isOpen, 
  onClose, 
  id_penugasan, 
  existingAnggotaIds, 
  onAnggotaAdded,
  targetYear,     
  idSubKegiatan   
}) => {
  // Data State
  const [allMitra, setAllMitra] = useState([]);
  const [availableJobs, setAvailableJobs] = useState([]); 
  const [currentTeamData, setCurrentTeamData] = useState([]); 
  
  // State untuk Validasi Honor
  const [mitraIncomeMap, setMitraIncomeMap] = useState({}); // Map ID Mitra -> Pendapatan Bulan Ini
  const [monthlyLimit, setMonthlyLimit] = useState(0);      // Limit Bulanan (dari Aturan Tahun)

  // Form State
  const [selectedJob, setSelectedJob] = useState(''); 
  const [volume, setVolume] = useState(1); 
  const [searchTerm, setSearchTerm] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && id_penugasan && targetYear && idSubKegiatan) {
      const initData = async () => {
        setLoading(true);
        setError(null);
        try {
          const token = getToken();
          const headers = { Authorization: `Bearer ${token}` };

          // 1. Fetch Data Lengkap (Mitra, Honor, dan Data Global untuk Validasi)
          const [
            resAnggotaTim, 
            resMitra, 
            resHonor,
            resAturan,
            resKelompok,
            resAllPenugasan,
            resSubKegiatan
          ] = await Promise.all([
            axios.get(`${API_URL}/api/penugasan/${id_penugasan}/anggota`, { headers }),
            axios.get(`${API_URL}/api/mitra/aktif?tahun=${targetYear}`, { headers }),
            axios.get(`${API_URL}/api/honorarium`, { headers }),
            // Data Global untuk Validasi Limit
            axios.get(`${API_URL}/api/aturan-periode`, { headers }),
            axios.get(`${API_URL}/api/kelompok-penugasan`, { headers }),
            axios.get(`${API_URL}/api/penugasan`, { headers }),
            axios.get(`${API_URL}/api/subkegiatan`, { headers })
          ]);

          // --- A. Setup Data Dasar ---
          setCurrentTeamData(resAnggotaTim.data || []);

          let rawMitra = resMitra.data.data;
          if (rawMitra && !Array.isArray(rawMitra) && Array.isArray(rawMitra.data)) {
              rawMitra = rawMitra.data;
          }
          setAllMitra(Array.isArray(rawMitra) ? rawMitra : []);

          const honorList = resHonor.data.data || [];
          const validHonors = honorList.filter(h => String(h.id_subkegiatan) === String(idSubKegiatan));
          
          const jobs = validHonors.map(h => ({
            kode: h.kode_jabatan,
            nama: h.jabatan ? h.jabatan.nama_jabatan : h.kode_jabatan, 
            tarif: Number(h.tarif) || 0,
            satuan: h.nama_satuan || 'Kegiatan',
            basis_volume: Number(h.basis_volume) || 0 
          }));

          setAvailableJobs(jobs);
          if (jobs.length > 0) {
            setSelectedJob(jobs[0].kode);
          }
          setVolume(1);

          // --- B. Logika Hitung Limit & Income Map (Sama seperti EditPenugasan) ---
          
          // 1. Tentukan Limit (Berdasarkan Tahun)
          const aturanList = resAturan.data.data || [];
          const aturan = aturanList.find(a => String(a.periode) === String(targetYear));
          const limit = aturan ? Number(aturan.batas_honor) : 0;
          setMonthlyLimit(limit);

          // 2. Tentukan Bulan Target (YYYY-MM) dari SubKegiatan ini
          const subList = resSubKegiatan.data.data || [];
          const currentSub = subList.find(s => String(s.id) === String(idSubKegiatan));
          
          if (limit > 0 && currentSub && currentSub.tanggal_mulai) {
             const tglMulai = new Date(currentSub.tanggal_mulai);
             const targetMonth = `${tglMulai.getFullYear()}-${String(tglMulai.getMonth() + 1).padStart(2, '0')}`; // "2025-12"

             const incomeMap = {};
             const allKelompok = resKelompok.data.data || [];
             const allPenugasan = resAllPenugasan.data.data || [];

             // Loop semua riwayat tugas untuk menghitung akumulasi per mitra
             allKelompok.forEach(tugas => {
                // Cari info tanggal lewat parent penugasan
                const parentPenugasan = allPenugasan.find(p => String(p.id_penugasan) === String(tugas.id_penugasan));
                if (parentPenugasan) {
                    const parentSub = subList.find(s => String(s.id) === String(parentPenugasan.id_subkegiatan));
                    if (parentSub && parentSub.tanggal_mulai) {
                        const d = new Date(parentSub.tanggal_mulai);
                        const tugasMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

                        // Jika bulannya sama, tambahkan ke incomeMap mitra tersebut
                        if (tugasMonth === targetMonth) {
                            let honorItem = 0;
                            // Cari tarif di master honorarium (global)
                            const hInfo = honorList.find(rh => 
                                String(rh.id_subkegiatan) === String(parentSub.id) && 
                                String(rh.kode_jabatan) === String(tugas.kode_jabatan)
                            );

                            if (hInfo) {
                                honorItem = Number(hInfo.tarif) * (Number(tugas.volume_tugas) || 0);
                            } else {
                                honorItem = Number(tugas.total_honor) || 0;
                            }

                            const mId = String(tugas.id_mitra);
                            incomeMap[mId] = (incomeMap[mId] || 0) + honorItem;
                        }
                    }
                }
             });
             
             setMitraIncomeMap(incomeMap);
          } else {
             setMitraIncomeMap({});
          }

        } catch (err) {
          console.error(err);
          setError('Gagal memuat data.');
        } finally {
          setLoading(false);
        }
      };

      initData();
    }
  }, [isOpen, id_penugasan, targetYear, idSubKegiatan]); 

  // --- Logic Kuota Pekerjaan ---
  const quotaInfo = useMemo(() => {
    if (!selectedJob) return { sisa: 0, total: 0, terpakai: 0 };

    const jobInfo = availableJobs.find(j => j.kode === selectedJob);
    if (!jobInfo) return { sisa: 0, total: 0, terpakai: 0 };

    const totalQuota = jobInfo.basis_volume;
    
    const usedQuota = currentTeamData
      .filter(m => m.kode_jabatan === selectedJob)
      .reduce((acc, curr) => acc + (Number(curr.volume_tugas) || 0), 0);

    return {
        total: totalQuota,
        terpakai: usedQuota,
        sisa: Math.max(0, totalQuota - usedQuota)
    };
  }, [selectedJob, availableJobs, currentTeamData]);

  // --- Filter Mitra ---
  const availableMitra = useMemo(() => {
    if (!Array.isArray(allMitra)) return [];

    const excludedIds = new Set((existingAnggotaIds || []).map(id => String(id)));
    const term = searchTerm.toLowerCase();

    return allMitra.filter(mitra => {
        const notInTeam = !excludedIds.has(String(mitra.id));
        const matchSearch =
        mitra.nama_lengkap.toLowerCase().includes(term) ||
        (mitra.nik && mitra.nik.includes(term));

        return notInTeam && matchSearch;
    });
  }, [allMitra, existingAnggotaIds, searchTerm]);

  // --- Handler Tambah ---
  const handleAddAnggota = async (id_mitra) => {
      if (!selectedJob) {
        Swal.fire('Peringatan', 'Harap pilih posisi/jabatan terlebih dahulu!', 'warning');
        return;
      }
      
      const finalVolume = (!volume || volume <= 0) ? 1 : volume;

      if (quotaInfo.total > 0 && finalVolume > quotaInfo.sisa) {
          Swal.fire({
              title: 'Kuota Tidak Cukup',
              text: `Sisa kuota: ${quotaInfo.sisa}. Anda input: ${finalVolume}.`,
              icon: 'warning'
          });
          return;
      }

      // Validasi Limit Honor Sebelum Submit
      const mitraIncome = mitraIncomeMap[String(id_mitra)] || 0;
      const jobInfo = availableJobs.find(j => j.kode === selectedJob);
      const newIncome = (jobInfo ? jobInfo.tarif : 0) * finalVolume;
      
      if (monthlyLimit > 0 && (mitraIncome + newIncome) > monthlyLimit) {
          Swal.fire({
              title: 'Melebihi Batas Honor',
              html: `Total pendapatan mitra ini akan melebihi batas bulanan.<br/>
                     Limit: <b>${formatRupiah(monthlyLimit)}</b><br/>
                     Saat Ini + Baru: <b>${formatRupiah(mitraIncome + newIncome)}</b>`,
              icon: 'error'
          });
          return;
      }

      try {
        const token = getToken();
        
        const payload = { 
            id_penugasan: id_penugasan, 
            id_mitra: id_mitra,
            kode_jabatan: selectedJob,
            volume_tugas: finalVolume 
        };

        await axios.post(`${API_URL}/api/kelompok-penugasan`, payload, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        
        const mitraBaru = allMitra.find(m => m.id === id_mitra);
        setCurrentTeamData(prev => [
            ...prev, 
            { 
                id_mitra, 
                kode_jabatan: selectedJob, 
                volume_tugas: finalVolume,
                nama_lengkap: mitraBaru?.nama_lengkap 
            }
        ]);

        Swal.fire({
          title: 'Berhasil!',
          text: `${mitraBaru?.nama_lengkap} ditambahkan.`,
          icon: 'success',
          timer: 1000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });

        if (onAnggotaAdded) onAnggotaAdded();
        
      } catch (err) {
        console.error(err);
        const msg = err.response?.data?.message || err.response?.data?.error || 'Gagal menambahkan anggota.';
        Swal.fire('Gagal', msg, 'error');
      }
  };

  if (!isOpen) return null;

  return (
    // FIX: 
    // 1. z-index tinggi (z-[9999]) agar muncul di atas header layout user.
    // 2. items-start + pt-24 agar tidak tertutup header, ada jarak dari atas.
    <div className="fixed inset-0 bg-black/60 flex justify-center items-start pt-24 z-[9999] p-4 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-gray-200 animate-fade-in-up">
        
        {/* Header Component */}
        <div className="flex justify-between items-center p-5 bg-[#1A2A80] text-white">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FaUserPlus className="text-blue-200" /> Tambah Anggota Tim
          </h2>
          <button 
            onClick={onClose} 
            className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition"
          >
            <FaTimes size={18} />
          </button>
        </div>

        <div className="px-5 pt-5 pb-3 bg-white space-y-4">
            {/* Bagian Pilih Jabatan */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                    <FaBriefcase className="text-[#1A2A80]" /> Pilih Posisi Penugasan
                </label>
                
                {loading ? (
                    <div className="h-10 bg-gray-100 rounded animate-pulse w-full"></div>
                ) : availableJobs.length === 0 ? (
                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded border border-red-100 flex items-center gap-2">
                        <FaExclamationCircle /> 
                        <span>Tidak ada jabatan/honor yang diatur untuk sub kegiatan ini.</span>
                    </div>
                ) : (
                    <select
                        value={selectedJob}
                        onChange={(e) => setSelectedJob(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A2A80] outline-none text-sm font-medium bg-gray-50 focus:bg-white transition"
                    >
                        {availableJobs.map((job) => (
                            <option key={job.kode} value={job.kode}>
                                {job.nama} (Rp {Number(job.tarif).toLocaleString('id-ID')}) - Kuota: {job.basis_volume}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* Bagian Volume Tugas */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                        <FaBoxOpen className="text-[#1A2A80]" /> Volume Tugas
                    </label>
                    {selectedJob && (
                        <div className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border ${quotaInfo.sisa === 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                            <FaChartPie />
                            Sisa Kuota: {quotaInfo.sisa} / {quotaInfo.total}
                        </div>
                    )}
                </div>
                
                <div className="flex items-center">
                    <input 
                        type="number" 
                        min="1"
                        max={quotaInfo.total > 0 ? quotaInfo.sisa : undefined}
                        value={volume}
                        onFocus={(e) => e.target.select()} 
                        onChange={(e) => {
                            const val = e.target.value;
                            const intVal = parseInt(val);
                            if (val !== '' && quotaInfo.total > 0 && intVal > quotaInfo.sisa) {
                                return; 
                            }
                            setVolume(val === '' ? '' : intVal);
                        }}
                        onBlur={() => {
                            if (!volume || volume < 1) setVolume(1);
                        }}
                        className={`w-full px-4 py-2.5 border rounded-l-xl focus:ring-2 outline-none text-sm font-bold transition ${quotaInfo.sisa === 0 ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-gray-50 focus:bg-white border-gray-300 focus:ring-[#1A2A80]'}`}
                        placeholder="1"
                        disabled={quotaInfo.sisa === 0 && quotaInfo.total > 0}
                    />
                    <div className="bg-gray-100 border border-l-0 border-gray-300 px-4 py-2.5 rounded-r-xl text-sm font-medium text-gray-500">
                        Unit
                    </div>
                </div>
            </div>
        </div>

        {/* Bagian Search */}
        <div className="px-5 py-3 border-b border-t border-gray-100 bg-gray-50/50">
          {targetYear && (
            <div className="mb-2">
                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-[10px] px-2 py-1 rounded border border-blue-200 font-bold shadow-sm">
                    <FaFilter size={10} /> Mitra Aktif Thn {targetYear}
                </span>
            </div>
          )}
          <div className="relative">
            <span className="absolute left-4 top-3 text-gray-400">
                <FaSearch />
            </span>
            <input
                type="text"
                placeholder="Cari nama atau NIK mitra..."
                className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1A2A80] outline-none text-sm transition bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* List Mitra */}
        <div className="overflow-y-auto flex-grow p-4 bg-gray-50 space-y-3">
          {loading && <p className="text-center py-8 text-gray-500 italic">Memuat data...</p>}
          {error && <p className="text-center py-8 text-red-500 text-sm">{error}</p>}
          
          {!loading && !error && (
            <>
                {availableMitra.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 flex flex-col items-center">
                        <FaSearch size={30} className="mb-2 opacity-20" />
                        <p className="text-sm">Tidak ada mitra tersedia.</p>
                    </div>
                ) : (
                    availableMitra.map(mitra => {
                        // HITUNG PROGRES BAR PER MITRA
                        const currentIncome = mitraIncomeMap[String(mitra.id)] || 0;
                        const jobInfo = availableJobs.find(j => j.kode === selectedJob);
                        const potentialIncome = (jobInfo ? jobInfo.tarif : 0) * (volume || 0);
                        
                        const totalProjected = currentIncome + potentialIncome;
                        const isOver = monthlyLimit > 0 && totalProjected > monthlyLimit;
                        
                        // Persentase untuk visual
                        const pctCurrent = monthlyLimit > 0 ? (currentIncome / monthlyLimit) * 100 : 0;
                        const pctNew = monthlyLimit > 0 ? (potentialIncome / monthlyLimit) * 100 : 0;

                        return (
                            <div 
                                key={mitra.id} 
                                className={`bg-white p-3 rounded-xl shadow-sm border transition-colors group ${isOver ? 'border-red-300 bg-red-50' : 'border-gray-100 hover:border-blue-300'}`}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex-shrink-0 flex items-center justify-center text-[#1A2A80] font-bold text-sm border border-blue-100">
                                            {mitra.nama_lengkap.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-800 text-sm truncate">
                                                {mitra.nama_lengkap}
                                            </p>
                                            <p className="text-xs text-gray-500 font-mono flex items-center gap-1">
                                                <FaIdCard className="text-gray-300" /> {mitra.nik}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <button
                                        onClick={() => handleAddAnggota(mitra.id)}
                                        disabled={!selectedJob || (quotaInfo.sisa === 0 && quotaInfo.total > 0) || isOver}
                                        className={`text-xs font-bold py-2 px-4 rounded-lg shadow-sm flex items-center gap-2 flex-shrink-0 transition 
                                          ${selectedJob && !isOver && (quotaInfo.sisa > 0 || quotaInfo.total === 0)
                                            ? 'bg-[#1A2A80] hover:bg-blue-900 text-white hover:shadow' 
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                                    >
                                        <FaUserPlus /> Tambah
                                    </button>
                                </div>

                                {/* Progress Bar Pendapatan */}
                                {monthlyLimit > 0 && (
                                    <div className="mt-3 pt-2 border-t border-gray-100/50">
                                        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                            <span>
                                                Honor Bln Ini: <b>{formatRupiah(totalProjected)}</b>
                                            </span>
                                            <span>Limit: {formatRupiah(monthlyLimit)}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden flex">
                                            {/* Bar Hijau (Existing) */}
                                            <div 
                                                className="bg-green-500 h-full" 
                                                style={{ width: `${Math.min(pctCurrent, 100)}%` }} 
                                            />
                                            {/* Bar Biru/Merah (New) */}
                                            <div 
                                                className={`h-full ${isOver ? 'bg-red-500' : 'bg-blue-400'}`} 
                                                style={{ width: `${Math.min(pctNew, 100 - Math.min(pctCurrent, 100))}%` }} 
                                            />
                                        </div>
                                        {isOver && (
                                            <div className="text-[9px] text-red-600 font-bold mt-1 text-right">
                                                Melebihi Limit Bulanan!
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </>
          )}
        </div>

        <div className="p-3 bg-white border-t border-gray-200 text-center text-xs text-gray-400">
            {availableMitra.length} mitra tersedia untuk ditambahkan
        </div>

      </div>
    </div>
  );
};

export default PopupTambahAnggota;