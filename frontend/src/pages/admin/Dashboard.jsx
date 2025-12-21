// src/pages/admin/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { 
  FaChartLine, 
  FaUsers, 
  FaPlus,
  FaBriefcase,
  FaBell,
  FaChevronRight,
  FaArrowRight,
  FaCalendarCheck,
  FaTasks
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://makinasik.web.bps.go.id';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    activeMitraMonth: 0,
    activeKegiatan: 0,
    totalMitra: 0,
    totalKegiatan: 0
  });

  const [activeMitraList, setActiveMitraList] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [subKegiatanProgress, setSubKegiatanProgress] = useState([]);
  const [expandedRowId, setExpandedRowId] = useState(null);

  // Helper Format Tanggal
  const formatDate = (date) => new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        // 1. Fetch data (Hapus manajemen-mitra)
        const [resKegiatan, resMitra, resPenugasan, resKelompok, resHonor] = await Promise.all([
          axios.get(`${API_URL}/api/kegiatan`, { headers }),
          axios.get(`${API_URL}/api/mitra`, { headers }),
          axios.get(`${API_URL}/api/penugasan`, { headers }),
          axios.get(`${API_URL}/api/kelompok-penugasan`, { headers }),
          axios.get(`${API_URL}/api/honorarium`, { headers })
        ]);

        // --- HANDLING DATA STRUCTURE (data.data) ---
        // Menggunakan fallback (|| []) agar tidak error jika data kosong/null
        const kegiatanData = resKegiatan.data.data || [];
        const mitraData = resMitra.data.data || [];
        const penugasanData = resPenugasan.data.data || [];
        const kelompokData = resKelompok.data.data || [];
        const honorData = resHonor.data.data || [];

        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth(); 
        const startOfMonth = new Date(currentYear, currentMonth, 1);
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

        // --- A. PERSIAPAN DATA VOLUME ---
        
        // 1. Hitung Target Volume per Sub Kegiatan (Dari Honorarium)
        const targetVolumeMap = {};
        honorData.forEach(h => {
            if (!targetVolumeMap[h.id_subkegiatan]) targetVolumeMap[h.id_subkegiatan] = 0;
            targetVolumeMap[h.id_subkegiatan] += Number(h.basis_volume || 0);
        });

        // 2. Hitung Volume Terisi/Assigned (Dari Kelompok Penugasan)
        const assignedVolumeMap = {};
        kelompokData.forEach(kp => {
            if (!assignedVolumeMap[kp.id_penugasan]) assignedVolumeMap[kp.id_penugasan] = 0;
            assignedVolumeMap[kp.id_penugasan] += Number(kp.volume_tugas || 0);
        });

        // --- B. PROSES DATA PROGRESS SUB KEGIATAN ---
        const processedProgress = penugasanData.map(task => {
            if (!task.tanggal_mulai) return null;
            
            const start = new Date(task.tanggal_mulai);
            const end = new Date(task.tanggal_selesai || task.tanggal_mulai);
            
            // Filter: Hanya yang aktif/mulai bulan ini
            const isRunning = today >= start && today <= end;
            const isStartingThisMonth = start >= startOfMonth && start <= endOfMonth;

            if (!isRunning && !isStartingThisMonth) return null;

            // Logika Persentase Berbasis VOLUME
            const targetVol = targetVolumeMap[task.id_subkegiatan] || 0;
            const assignedVol = assignedVolumeMap[task.id_penugasan] || 0;
            
            let percent = 0;
            if (targetVol > 0) {
                percent = Math.round((assignedVol / targetVol) * 100);
            }
            if (percent > 100) percent = 100;

            return {
                id: task.id_penugasan,
                nama: task.nama_sub_kegiatan,
                induk: task.nama_kegiatan,
                start: start,
                end: end,
                percent: percent,
                assigned: assignedVol,
                target: targetVol,
                pengawas: task.nama_pengawas
            };
        })
        .filter(item => item !== null)
        .sort((a, b) => b.percent - a.percent);

        setSubKegiatanProgress(processedProgress);

        // --- C. HITUNG STATISTIK UTAMA ---
        
        // Mitra Aktif Bulan Ini
        const activeTaskIdsMonth = new Set();
        penugasanData.forEach(task => {
            const start = new Date(task.tanggal_mulai);
            const end = new Date(task.tanggal_selesai);
            if (start <= endOfMonth && end >= startOfMonth) {
                activeTaskIdsMonth.add(task.id_penugasan);
            }
        });

        const activeMitraMonthSet = new Set();
        kelompokData.forEach(k => {
            if (activeTaskIdsMonth.has(k.id_penugasan)) {
                activeMitraMonthSet.add(k.id_mitra);
            }
        });

        setStats({
          activeMitraMonth: activeMitraMonthSet.size,
          activeKegiatan: processedProgress.length,
          totalMitra: mitraData.length,
          totalKegiatan: kegiatanData.length
        });

        // --- D. DATA TABEL MITRA AKTIF (TAHUNAN) ---
        const activePenugasanIdsYear = new Set();
        const penugasanMap = {}; 

        penugasanData.forEach(task => {
            const start = new Date(task.tanggal_mulai);
            const end = new Date(task.tanggal_selesai);
            if (start.getFullYear() === currentYear || end.getFullYear() === currentYear) {
                activePenugasanIdsYear.add(task.id_penugasan);
                penugasanMap[task.id_penugasan] = {
                    nama_sub_kegiatan: task.nama_sub_kegiatan,
                    tanggal: `${start.toLocaleDateString('id-ID')} - ${end.toLocaleDateString('id-ID')}`,
                    role_pengawas: task.nama_pengawas
                };
            }
        });

        const mitraActivityMap = {};
        kelompokData.forEach(kelompok => {
            if (activePenugasanIdsYear.has(kelompok.id_penugasan)) {
                const mitraId = kelompok.id_mitra;
                if (!mitraActivityMap[mitraId]) {
                    mitraActivityMap[mitraId] = {
                        id: mitraId,
                        nama_mitra: kelompok.nama_mitra, 
                        kegiatan: []
                    };
                }
                if (penugasanMap[kelompok.id_penugasan]) {
                    mitraActivityMap[mitraId].kegiatan.push(penugasanMap[kelompok.id_penugasan]);
                }
            }
        });

        const mitraList = Object.values(mitraActivityMap);
        if (mitraList.length > 0 && !mitraList[0].nama_mitra) {
             const mitraDbMap = {};
             mitraData.forEach(m => mitraDbMap[m.id] = m.nama_lengkap);
             mitraList.forEach(m => m.nama_mitra = mitraDbMap[m.id] || 'Unknown Mitra');
        }
        
        mitraList.sort((a, b) => b.kegiatan.length - a.kegiatan.length);
        setActiveMitraList(mitraList);

        // --- E. DATA TIMELINE (Hanya Penugasan) ---
        const activities = [];
        // Removed: Logika pengajuan mitra baru
        
        penugasanData.slice(0, 10).forEach(t => {
            activities.push({
                id: `t-${t.id_penugasan}`,
                type: 'tugas',
                text: `Penugasan baru: ${t.nama_sub_kegiatan}`,
                time: new Date(t.penugasan_created_at || t.created_at || new Date()),
            });
        });
        
        activities.sort((a, b) => b.time - a.time);
        setRecentActivities(activities.slice(0, 6));

      } catch (err) {
        console.error("Gagal memuat dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const toggleRow = (id) => {
    if (expandedRowId === id) setExpandedRowId(null); 
    else setExpandedRowId(id); 
  };

  const WelcomeBanner = () => {
    const hours = new Date().getHours();
    let greeting = 'Selamat Pagi';
    if (hours >= 12) greeting = 'Selamat Siang';
    if (hours >= 15) greeting = 'Selamat Sore';
    if (hours >= 18) greeting = 'Selamat Malam';

    return (
      <div className="bg-gradient-to-r from-[#1A2A80] to-[#2a45d4] rounded-2xl p-8 text-white shadow-lg mb-8 relative overflow-hidden">
        <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">{greeting}, Admin! 👋</h1>
            <p className="opacity-90">Selamat datang kembali di SIKINERJA. Berikut adalah ringkasan aktivitas bulan ini.</p>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-white opacity-5 transform skew-x-12 translate-x-10"></div>
        <div className="absolute right-20 bottom-0 h-32 w-32 bg-yellow-400 rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
      </div>
    );
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-[#1A2A80] rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Menyiapkan Dashboard...</p>
    </div>
  );

  return (
    <div className="w-full pb-10 animate-fade-in-up">
      <WelcomeBanner />

      {/* === BAGIAN 1: STATS CARDS === */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Mitra Aktif (Bulan Ini)</p>
                    <h3 className="text-2xl font-extrabold text-gray-800 mt-1">{stats.activeMitraMonth}</h3>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <FaBriefcase size={20} />
                </div>
            </div>
            <div className="mt-4 pt-3 border-t border-dashed border-gray-100">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">Orang</span>
            </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Tugas Berjalan</p>
                    <h3 className="text-2xl font-extrabold text-gray-800 mt-1">{stats.activeKegiatan}</h3>
                </div>
                <div className="p-3 bg-green-50 text-green-600 rounded-lg group-hover:bg-green-100 transition-colors">
                    <FaTasks size={20} />
                </div>
            </div>
            <div className="mt-4 pt-3 border-t border-dashed border-gray-100">
                <Link to="/admin/penugasan" className="text-xs font-bold text-green-600 hover:underline flex items-center gap-1">
                    Kelola Penugasan <FaArrowRight size={10} />
                </Link>
            </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#1A2A80]"></div>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Mitra</p>
                    <h3 className="text-2xl font-extrabold text-gray-800 mt-1">{stats.totalMitra}</h3>
                </div>
                <div className="p-3 bg-indigo-50 text-[#1A2A80] rounded-lg group-hover:bg-indigo-100 transition-colors">
                    <FaUsers size={20} />
                </div>
            </div>
            <div className="mt-4 pt-3 border-t border-dashed border-gray-100">
                <span className="text-xs text-gray-400">Database Mitra</span>
            </div>
        </div>

        {/* Card 4 */}
        <div className="bg-[#1A2A80] p-5 rounded-xl shadow-lg text-white flex flex-col justify-center items-center text-center transform hover:scale-[1.02] transition-transform relative overflow-hidden">
            <FaPlus className="absolute -right-4 -bottom-4 text-white opacity-10 text-8xl" />
            <h3 className="font-bold mb-3 text-lg relative z-10">Buat Tugas Baru?</h3>
            <Link to="/admin/penugasan/tambah" className="px-5 py-2 bg-white text-[#1A2A80] rounded-full text-sm font-bold hover:bg-blue-50 transition shadow-sm relative z-10 flex items-center gap-2">
                <FaPlus size={12} /> Tambah Sekarang
            </Link>
        </div>
      </div>

      {/* === BAGIAN 2: GRID KONTEN === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* KOLOM KIRI (2/3) */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* 1. TABEL PROGRESS PENUGASAN (VOLUME BASED) */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <FaCalendarCheck className="text-[#1A2A80]" /> Progress Penugasan
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">Status pemenuhan target volume bulan ini.</p>
                    </div>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">Real-time</span>
                </div>

                {subKegiatanProgress.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        <p className="text-gray-400 text-sm">Tidak ada tugas/sub kegiatan aktif bulan ini.</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {/* Max 5 Rows */}
                        {subKegiatanProgress.slice(0, 5).map((task) => (
                            <div key={task.id}>
                                <div className="flex justify-between items-end mb-1">
                                    <div className="max-w-[70%]">
                                        <h4 className="text-sm font-bold text-gray-700 truncate" title={task.nama}>{task.nama}</h4>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                                            <span className="uppercase tracking-wide font-semibold">{task.induk}</span>
                                            <span>•</span>
                                            <span>{formatDate(task.start)} - {formatDate(task.end)}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-bold text-[#1A2A80] bg-blue-50 px-2 py-1 rounded block mb-1">
                                            {task.percent}%
                                        </span>
                                        <span className="text-[10px] text-gray-500 block">
                                            Vol: <b>{task.assigned}</b> / {task.target > 0 ? task.target : '?'}
                                        </span>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                    <div 
                                        className={`h-2.5 rounded-full transition-all duration-1000 ease-out ${task.percent >= 100 ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-[#1A2A80]'}`}
                                        style={{ width: `${task.percent}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                    <Link to="/admin/penugasan" className="text-sm font-bold text-[#1A2A80] hover:text-blue-700 flex items-center justify-center gap-1 transition">
                        Lihat Selengkapnya <FaArrowRight size={12} />
                    </Link>
                </div>
            </div>

            {/* 2. TABEL MITRA AKTIF */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-fit">
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <FaBriefcase className="text-[#1A2A80]" /> Mitra Aktif Periode Ini
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">Daftar mitra dengan tugas terbanyak di tahun {new Date().getFullYear()}.</p>
                    </div>
                </div>
                
                <div className="flex-1 overflow-x-auto">
                    {activeMitraList.length === 0 ? (
                        <div className="p-10 text-center text-gray-400 italic bg-gray-50/30 m-4 rounded-lg border border-dashed border-gray-200">
                            Belum ada mitra yang aktif bekerja tahun ini.
                        </div>
                    ) : (
                        <table className="min-w-full">
                            <thead className="bg-white border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nama Mitra</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Beban Kerja</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Detail</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                            {/* Max 5 Rows */}
                            {activeMitraList.slice(0, 5).map((item) => {
                                const isExpanded = expandedRowId === item.id;
                                return (
                                <React.Fragment key={item.id}>
                                    <tr 
                                        onClick={() => toggleRow(item.id)} 
                                        className={`cursor-pointer transition-colors duration-200 ${isExpanded ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                                    >
                                        <td className="px-6 py-4 text-sm font-bold text-gray-800 flex items-center gap-3">
                                            <div className={`p-1 rounded-full transition-transform duration-200 ${isExpanded ? 'rotate-90 bg-blue-100 text-[#1A2A80]' : 'text-gray-400 bg-gray-100'}`}>
                                            <FaChevronRight size={10} />
                                            </div>
                                            {item.nama_mitra}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                {item.kegiatan.length} Kegiatan
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs text-gray-400 italic">
                                            {isExpanded ? 'Tutup' : 'Lihat'}
                                        </td>
                                    </tr>

                                    {isExpanded && (
                                        <tr className="bg-gray-50/30 animate-fade-in-down">
                                            <td colSpan="3" className="px-6 py-4 pl-12 border-b border-gray-100">
                                                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                                    <p className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider border-b border-gray-100 pb-2">Daftar Pekerjaan:</p>
                                                    {item.kegiatan.length === 0 ? (
                                                        <p className="text-sm text-gray-500 italic">Tidak ada data detail.</p>
                                                    ) : (
                                                        <div className="grid gap-3">
                                                            {item.kegiatan.map((keg, idx) => (
                                                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-50 p-3 rounded hover:bg-blue-50 transition-colors">
                                                                    <div>
                                                                        <h4 className="text-sm font-bold text-[#1A2A80]">{keg.nama_sub_kegiatan}</h4>
                                                                        <p className="text-xs text-gray-500 mt-1">
                                                                            <span className="font-semibold text-gray-700">Pengawas:</span> {keg.role_pengawas || '-'}
                                                                        </p>
                                                                    </div>
                                                                    <div className="mt-2 sm:mt-0">
                                                                        <span className="text-[10px] font-mono bg-white border border-gray-200 px-2 py-1 rounded text-gray-600">
                                                                            {keg.tanggal}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                                );
                            })}
                            </tbody>
                        </table>
                    )}
                </div>
                
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-center">
                    <Link to="/admin/transaksi-mitra" className="text-sm font-bold text-[#1A2A80] hover:text-blue-700 flex items-center justify-center gap-1 transition">
                        Lihat Selengkapnya <FaArrowRight size={12} />
                    </Link>
                </div>
            </div>

        </div>

        {/* KOLOM KANAN (1/3) */}
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 h-full">
                <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <FaBell className="text-yellow-500" /> Aktivitas Terbaru
                </h2>

                <div className="relative border-l-2 border-gray-100 ml-3 space-y-8 pb-4">
                    {recentActivities.length === 0 ? (
                        <p className="text-sm text-gray-400 italic pl-6">Belum ada aktivitas tercatat.</p>
                    ) : (
                        recentActivities.map((act) => (
                            <div key={act.id} className="relative pl-6 group">
                                <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-4 border-white bg-blue-500 shadow-sm"></span>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                                        {act.time.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • {act.time.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                    <p className="text-sm text-gray-700 font-medium group-hover:text-[#1A2A80] transition-colors leading-snug">
                                        {act.text}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                    <Link to="/admin/penugasan" className="text-xs font-bold text-gray-500 hover:text-[#1A2A80] transition">
                        Lihat Selengkapnya
                    </Link>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;