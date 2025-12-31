// src/pages/Home.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { 
  FaClipboardList, FaUsers, FaArrowDown, FaChartLine, FaArrowRight,
  FaPoll, FaBriefcase, FaFileSignature, FaChartPie, FaExchangeAlt,
  FaCalendarAlt, FaCheckCircle, FaDatabase, FaMoneyBillWave, FaFileAlt
} from 'react-icons/fa';

// Components
import Footer from '../components/Footer';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id/';

// --- GAMBAR DEFAULT (FALLBACK) ---
const DEFAULT_BG = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop";
const DEFAULT_LOGO = "/src/assets/logo.png"; 

const Home = () => {
  // --- STATE MANAGEMENT ---
  const [dashboardData, setDashboardData] = useState({
    raw: {
        subkegiatan: [], 
        penugasan: [],
        mitra: [], 
        mitraAktifList: [], 
        transaksi: [],
        templateSpk: []
    },
    counts: {
        kegiatanStartThisMonth: 0, 
        mitraAktifYear: 0,        
        mitraAktifMonth: 0,        
        
        subkegiatanTotal: 0, 
        perencanaanTotal: 0,
        penugasanTotal: 0, 
        penugasanBulanIni: 0,
        mitraTotal: 0, 
        transaksiTotal: 0,
        spkTotal: 0
    },
    tables: {
        topSubKegiatan: [], 
        topPenugasan: [],
        topMitra: [],
        topTransaksi: [],
        topTemplateSPK: []
    }
  });

  // State untuk Pengaturan Tampilan (Background & Logo)
  const [systemSettings, setSystemSettings] = useState({
      home_background: DEFAULT_BG,
      app_logo: DEFAULT_LOGO
  });

  const [isLoading, setIsLoading] = useState(true);
  const currentYear = new Date().getFullYear().toString(); 
  const currentMonthName = new Date().toLocaleString('id-ID', { month: 'long' });

  const scrollToContent = () => {
    const element = document.getElementById('content-area');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' });
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  // --- HELPER: CONSTRUCT IMAGE URL ---
  // Fungsi ini memperbaiki URL gambar dari database
  const getImageUrl = (path, defaultVal) => {
    if (!path) return defaultVal;
    
    // Jika path sudah berupa URL lengkap (misal dari unsplash atau asset() backend yang benar), pakai langsung
    if (path.startsWith('http') || path.startsWith('https') || path.startsWith('data:')) {
        return path;
    }

    // Jika path dari database (misal: uploads/system/foto.jpg), tambahkan prefix storage
    // Hapus leading slash jika ada untuk menghindari double slash
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    // Hasil: https://makinasik.web.bps.go.id//storage/uploads/system/foto.jpg
    return `${API_URL}/storage/${cleanPath}`;
  };

  // --- FETCH & PROCESS DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

        // Request API Paralel
        const responses = await Promise.all([
          axios.get(`${API_URL}/api/subkegiatan`, config).catch(() => ({ data: { data: [] } })), 
          axios.get(`${API_URL}/api/perencanaan`, config).catch(() => ({ data: { data: [] } })),
          axios.get(`${API_URL}/api/penugasan`, config).catch(() => ({ data: { data: [] } })),
          axios.get(`${API_URL}/api/kelompok-penugasan`, config).catch(() => ({ data: { data: [] } })),
          axios.get(`${API_URL}/api/mitra`, config).catch(() => ({ data: { data: [] } })), 
          axios.get(`${API_URL}/api/mitra/aktif?tahun=${currentYear}`, config).catch(() => ({ data: { data: [] } })),
          
          // Transaksi dengan parameter tahun
          axios.get(`${API_URL}/api/transaksi?tahun=${currentYear}`, config).catch((err) => {
              console.error("Gagal load transaksi:", err);
              return { data: [] }; 
          }),
          
          axios.get(`${API_URL}/api/template-spk`, config).catch(() => ({ data: { data: [] } })),

          // Fetch System Settings (Public) untuk mengambil gambar yang diupload
          axios.get(`${API_URL}/api/system-settings`).catch(() => ({ data: { data: {} } })) 
        ]);

        const [resSubKeg, resRencana, resTugas, resKelompok, resMitra, resMitraAktif, resTrans, resSpk, resSettings] = responses;
        
        const rawSubKeg = resSubKeg.data.data || [];
        const rawTugas = resTugas.data.data || [];
        const rawKelompok = resKelompok.data.data || [];
        const rawMitraData = resMitra.data.data || []; 
        const rawMitraAktifData = resMitraAktif.data.data || []; 
        const rawTrans = Array.isArray(resTrans.data) ? resTrans.data : (resTrans.data?.data || []);
        const rawSpk = resSpk.data.data || [];
        
        // --- PROSES SETTINGS ---
        const settingsData = resSettings.data.data || {};
        
        // Gunakan helper getImageUrl untuk memastikan link benar
        const bgImage = getImageUrl(settingsData.home_background, DEFAULT_BG);
        const logoImage = getImageUrl(settingsData.app_logo, DEFAULT_LOGO);

        setSystemSettings({
            home_background: bgImage,
            app_logo: logoImage
        });

        // --- MAP DATA HELPERS ---
        const mitraMap = rawMitraData.reduce((acc, curr) => {
            acc[curr.id] = curr.nama_lengkap || curr.nama; 
            return acc;
        }, {});

        // --- LOGIKA STATISTIK ---
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        // 1. Kegiatan (Subkegiatan) Mulai Bulan Ini
        const kegMulaiBulanIni = rawSubKeg.filter(k => {
            if (!k.tanggal_mulai) return false;
            const start = new Date(k.tanggal_mulai);
            return start >= startOfMonth && start <= endOfMonth;
        }).length;

        // 2. Mitra Aktif Bulan Ini
        const activeTaskIds = new Set();
        rawTugas.forEach(t => {
             if (!t.tanggal_mulai || !t.tanggal_selesai) return;
             const start = new Date(t.tanggal_mulai);
             const end = new Date(t.tanggal_selesai);
             
             if (start <= endOfMonth && end >= startOfMonth) {
                activeTaskIds.add(t.id_penugasan); 
             }
        });

        const mitraAktifBulanIniSet = new Set();
        rawKelompok.forEach(k => {
            if (activeTaskIds.has(k.id_penugasan)) {
                mitraAktifBulanIniSet.add(k.id_mitra);
            }
        });
        const mitraAktifMonthCount = mitraAktifBulanIniSet.size;

        // --- SORTING & SLICING ---
        const sortedSubKegiatan = [...rawSubKeg].sort((a, b) => new Date(b.tanggal_mulai) - new Date(a.tanggal_mulai)).slice(0, 5);
        const sortedPenugasan = [...rawTugas].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
        const sortedMitraAktif = [...rawMitraAktifData].sort((a, b) => b.id - a.id).slice(0, 5);
        const sortedTemplate = [...rawSpk].slice(0, 5);
        
        // Data transaksi sudah di-sort dari backend (total_pendapatan desc), kita ambil top 5
        const enrichedTransaksi = rawTrans.slice(0, 5).map(t => ({
            ...t,
            nama_mitra: t.nama_lengkap || mitraMap[t.id] || 'Mitra Tidak Dikenal'
        }));

        setDashboardData({
            raw: { 
                subkegiatan: rawSubKeg, penugasan: rawTugas, mitra: rawMitraData, mitraAktifList: rawMitraAktifData,
                transaksi: rawTrans, templateSpk: rawSpk 
            },
            counts: {
                kegiatanStartThisMonth: kegMulaiBulanIni,
                mitraAktifYear: rawMitraAktifData.length,
                mitraAktifMonth: mitraAktifMonthCount,
                
                subkegiatanTotal: rawSubKeg.length,
                perencanaanTotal: resRencana.data.data?.length || 0,
                penugasanTotal: rawTugas.length, 
                penugasanBulanIni: activeTaskIds.size,
                mitraTotal: rawMitraData.length, 
                transaksiTotal: rawTrans.length,
                spkTotal: rawSpk.length
            },
            tables: {
                topSubKegiatan: sortedSubKegiatan,
                topPenugasan: sortedPenugasan,
                topMitra: sortedMitraAktif,
                topTransaksi: enrichedTransaksi,
                topTemplateSPK: sortedTemplate
            }
        });

      } catch (error) {
        console.error("Gagal memuat data dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentYear]);

  // --- COMPONENT: FEATURE CARD ---
  const features = [
    { title: "Survei & Kegiatan", icon: FaPoll, color: "blue", path: "/daftar-kegiatan" },
    { title: "Perencanaan", icon: FaClipboardList, color: "indigo", path: "/perencanaan" },
    { title: "Rekapitulasi", icon: FaChartPie, color: "purple", path: "/rekap" },
    { title: "Penugasan", icon: FaBriefcase, color: "emerald", path: "/penugasan" },
    { title: "Generate SPK", icon: FaFileSignature, color: "rose", path: "/spk" },
    { title: "Database Mitra", icon: FaUsers, color: "amber", path: "/daftar-mitra" },
    { title: "Riwayat Transaksi", icon: FaExchangeAlt, color: "orange", path: "/transaksi-mitra" }
  ];

  const FeatureCard = ({ item }) => {
    const Icon = item.icon;
    const colorClasses = {
        blue: "text-blue-600 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white border-blue-100",
        indigo: "text-indigo-600 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white border-indigo-100",
        purple: "text-purple-600 bg-purple-50 group-hover:bg-purple-600 group-hover:text-white border-purple-100",
        emerald: "text-emerald-600 bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white border-emerald-100",
        rose: "text-rose-600 bg-rose-50 group-hover:bg-rose-600 group-hover:text-white border-rose-100",
        amber: "text-amber-600 bg-amber-50 group-hover:bg-amber-600 group-hover:text-white border-amber-100",
        orange: "text-orange-600 bg-orange-50 group-hover:bg-orange-600 group-hover:text-white border-orange-100",
    };
    const styleClass = colorClasses[item.color] || colorClasses.blue;

    return (
        <Link to={item.path} className="group relative flex items-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300 mr-4 ${styleClass}`}>
                <Icon size={24} />
            </div>
            <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-700 group-hover:text-gray-900 transition-colors">{item.title}</h3>
            </div>
            <FaArrowRight className="text-gray-300 group-hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" size={14} />
        </Link>
    );
  };

  return (
    <div className="relative w-full min-h-screen font-sans bg-gray-50 overflow-x-hidden">
      
      <style>{`
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-15px); } 100% { transform: translateY(0px); } }
        .animate-float { animation: float 6s ease-in-out infinite; }
      `}</style>

      {/* --- BACKGROUND --- */}
      <div className="fixed inset-0 z-0">
        <img 
            src={systemSettings.home_background} 
            alt="Background" 
            className="w-full h-full object-cover transition-opacity duration-700"
            onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_BG; }} 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-blue-900/80"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
      </div>

      {/* --- CONTENT --- */}
      <div className="relative z-10 flex flex-col min-h-screen">

        {/* HERO */}
        <div className="relative min-h-[75vh] flex flex-col justify-center items-center px-4 text-center pb-32">
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md shadow-lg">
              <img 
                  src={systemSettings.app_logo} 
                  alt="BPS" 
                  className="h-4 w-auto opacity-90"
                  onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_LOGO; }} 
              />
              <span className="text-blue-100 text-[10px] md:text-xs font-bold tracking-widest uppercase">Badan Pusat Statistik</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none drop-shadow-2xl">
              MAKIN<span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200">ASIK</span>
            </h1>
            <p className="text-base md:text-xl text-gray-200 max-w-2xl mx-auto font-light leading-relaxed drop-shadow-md">
              Sistem Informasi Manajemen Kinerja dan Administrasi <br className="hidden md:block"/> Mitra Statistik Terintegrasi
            </p>
            <div className="pt-8 animate-float">
              <button onClick={scrollToContent} className="group relative inline-flex items-center gap-3 px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-bold uppercase tracking-widest rounded-full hover:from-blue-500 hover:to-blue-600 transition-all duration-300 shadow-[0_0_40px_rgba(37,99,235,0.4)] border border-white/20">
                Akses Dashboard <FaArrowDown className="group-hover:translate-y-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* FLOATING STATS */}
        <div className="relative container mx-auto px-4 md:px-8 -mt-32 mb-12 z-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* CARD 1: KEGIATAN MULAI BULAN INI (DARI SUBKEGIATAN) */}
            <div className="bg-white/90 backdrop-blur-xl border border-white/50 p-6 rounded-3xl shadow-2xl flex flex-col relative overflow-hidden group hover:-translate-y-1 transition-all">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><FaClipboardList className="text-6xl text-blue-600" /></div>
                 <span className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-2">Kegiatan {currentMonthName}</span>
                 <div className="flex items-baseline gap-2"><span className="text-5xl font-black text-gray-800">{isLoading ? '-' : dashboardData.counts.kegiatanStartThisMonth}</span><span className="text-gray-500 font-medium">Kegiatan</span></div>
            </div>

            {/* CARD 2: MITRA AKTIF TAHUN INI */}
            <div className="bg-white/90 backdrop-blur-xl border border-white/50 p-6 rounded-3xl shadow-2xl flex flex-col relative overflow-hidden group hover:-translate-y-1 transition-all">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><FaUsers className="text-6xl text-yellow-500" /></div>
                 <span className="text-sm font-bold text-yellow-600 uppercase tracking-wider mb-2">Mitra Aktif {currentYear}</span>
                 <div className="flex items-baseline gap-2"><span className="text-5xl font-black text-gray-800">{isLoading ? '-' : dashboardData.counts.mitraAktifYear}</span><span className="text-gray-500 font-medium">Orang</span></div>
            </div>

            {/* CARD 3: MITRA AKTIF BULAN INI */}
            <div className="bg-white/90 backdrop-blur-xl border border-white/50 p-6 rounded-3xl shadow-2xl flex flex-col relative overflow-hidden group hover:-translate-y-1 transition-all">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><FaChartLine className="text-6xl text-emerald-600" /></div>
                 <span className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-2">Mitra Aktif Bulan Ini</span>
                 <div className="flex items-baseline gap-2"><span className="text-5xl font-black text-gray-800">{isLoading ? '-' : dashboardData.counts.mitraAktifMonth}</span><span className="text-gray-500 font-medium">Orang</span></div>
            </div>

          </div>
        </div>

        {/* MAIN DATA SECTION */}
        <div id="content-area" className="relative z-10 bg-white pt-20 pb-24 shadow-[0_-20px_60px_rgba(0,0,0,0.05)] -mt-16">
          <div className="container mx-auto px-4 md:px-8 space-y-12">
            
            {/* 1. GRID FITUR */}
            <div>
                <div className="text-center max-w-2xl mx-auto mb-10">
                    <span className="text-blue-600 font-bold tracking-widest text-xs uppercase mb-2 block">Modul Aplikasi</span>
                    <h2 className="text-3xl font-black text-slate-800">Akses Fitur Unggulan</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {features.map((item, index) => (
                        <FeatureCard key={index} item={item} />
                    ))}
                </div>
            </div>

            {/* 2. DATA TABLES */}
            <div>
                <div className="flex items-center gap-3 mb-8">
                    <div className="h-1 w-10 bg-blue-600 rounded-full"></div>
                    <h2 className="text-2xl font-black text-slate-800">Ringkasan Data Terbaru</h2>
                </div>

                {/* ROW 1: KEGIATAN */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                    <div className="p-5 border-b border-gray-100 bg-gray-50/80 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700 flex items-center gap-2"><FaCalendarAlt className="text-blue-500"/> Monitoring Kegiatan Terkini</h3>
                        <Link to="/daftar-kegiatan" className="text-xs font-bold text-blue-600 uppercase tracking-wider hover:underline">Lihat Semua</Link>
                    </div>
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
                            <tr><th className="px-6 py-3">Nama Sub Kegiatan</th><th className="px-6 py-3">Periode</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? <tr><td colSpan="2" className="px-6 py-4 text-center">Loading...</td></tr> :
                             dashboardData.tables.topSubKegiatan.length === 0 ? <tr><td colSpan="2" className="px-6 py-4 text-center italic">Kosong</td></tr> :
                             dashboardData.tables.topSubKegiatan.map((item, idx) => (
                                <tr key={idx} className="hover:bg-blue-50/20">
                                    <td className="px-6 py-4 font-medium text-gray-800">
                                        {item.nama_sub_kegiatan}
                                        {item.kegiatan && <div className="text-[10px] text-gray-400 mt-0.5">{item.kegiatan.nama_kegiatan}</div>}
                                    </td>
                                    <td className="px-6 py-4 text-xs">{formatDate(item.tanggal_mulai)} - {formatDate(item.tanggal_selesai)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ROW 2: PENUGASAN & MITRA */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Penugasan */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-gray-100 bg-gray-50/80 flex justify-between items-center">
                             <h3 className="font-bold text-gray-700 flex items-center gap-2"><FaCheckCircle className="text-emerald-500"/> Penugasan Baru</h3>
                             <Link to="/penugasan" className="text-xs font-bold text-emerald-600 uppercase tracking-wider hover:underline">Log Penugasan</Link>
                        </div>
                        <table className="w-full text-sm text-left text-gray-600 flex-grow">
                            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500"><tr><th className="px-5 py-3">Kegiatan</th><th className="px-5 py-3">Dibuat</th></tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                 {isLoading ? <tr><td colSpan="2" className="px-5 py-4 text-center">Loading...</td></tr> :
                                  dashboardData.tables.topPenugasan.length === 0 ? <tr><td colSpan="2" className="px-5 py-4 text-center italic">Kosong</td></tr> :
                                  dashboardData.tables.topPenugasan.map((p, idx) => (
                                    <tr key={idx} className="hover:bg-emerald-50/20"><td className="px-5 py-3 truncate max-w-[180px]" title={p.nama_kegiatan}>{p.nama_kegiatan || '-'}</td><td className="px-5 py-3 text-xs">{formatDate(p.created_at)}</td></tr>
                                 ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Mitra */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-gray-100 bg-gray-50/80 flex justify-between items-center">
                             <h3 className="font-bold text-gray-700 flex items-center gap-2"><FaDatabase className="text-yellow-500"/> Mitra Aktif {currentYear}</h3>
                             <Link to="/daftar-mitra" className="text-xs font-bold text-yellow-600 uppercase tracking-wider hover:underline">Semua Mitra</Link>
                        </div>
                        <table className="w-full text-sm text-left text-gray-600 flex-grow">
                            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500"><tr><th className="px-5 py-3">ID Sobat</th><th className="px-5 py-3">Nama Lengkap</th></tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                 {isLoading ? <tr><td colSpan="2" className="px-5 py-4 text-center">Loading...</td></tr> :
                                  dashboardData.tables.topMitra.length === 0 ? <tr><td colSpan="2" className="px-5 py-4 text-center italic">Tidak ada mitra aktif tahun {currentYear}</td></tr> :
                                  dashboardData.tables.topMitra.map((m, idx) => (
                                    <tr key={idx} className="hover:bg-yellow-50/20"><td className="px-5 py-3 font-mono text-xs font-bold text-blue-600">{m.sobat_id}</td><td className="px-5 py-3 font-medium">{m.nama_lengkap}</td></tr>
                                 ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ROW 3: TRANSAKSI & SPK */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Transaksi */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-gray-100 bg-gray-50/80 flex justify-between items-center">
                             <h3 className="font-bold text-gray-700 flex items-center gap-2"><FaMoneyBillWave className="text-orange-500"/> Riwayat Transaksi</h3>
                             <Link to="/transaksi-mitra" className="text-xs font-bold text-orange-600 uppercase tracking-wider hover:underline">Lihat Transaksi</Link>
                        </div>
                        <table className="w-full text-sm text-left text-gray-600 flex-grow">
                            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500"><tr><th className="px-5 py-3">Mitra</th><th className="px-5 py-3">Nominal (Net)</th></tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                 {isLoading ? <tr><td colSpan="2" className="px-5 py-4 text-center">Loading...</td></tr> :
                                  dashboardData.tables.topTransaksi.length === 0 ? <tr><td colSpan="2" className="px-5 py-4 text-center italic">Belum ada transaksi</td></tr> :
                                  dashboardData.tables.topTransaksi.map((t, idx) => (
                                    <tr key={idx} className="hover:bg-orange-50/20">
                                        <td className="px-5 py-3">
                                            <div className="font-medium text-gray-800">{t.nama_mitra}</div>
                                            <div className="text-[10px] text-gray-400">Total Akumulasi {currentYear}</div>
                                        </td>
                                        <td className="px-5 py-3 font-bold text-gray-700">{formatRupiah(t.total_pendapatan)}</td>
                                    </tr>
                                 ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Template SPK */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-gray-100 bg-gray-50/80 flex justify-between items-center">
                             <h3 className="font-bold text-gray-700 flex items-center gap-2"><FaFileAlt className="text-rose-500"/> Daftar Template SPK</h3>
                             <Link to="/spk" className="text-xs font-bold text-rose-600 uppercase tracking-wider hover:underline">Manajemen SPK</Link>
                        </div>
                        <table className="w-full text-sm text-left text-gray-600 flex-grow">
                            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500"><tr><th className="px-5 py-3">Nama Template</th><th className="px-5 py-3">Nomor Surat</th></tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                 {isLoading ? <tr><td colSpan="2" className="px-5 py-4 text-center">Loading...</td></tr> :
                                  dashboardData.tables.topTemplateSPK.length === 0 ? <tr><td colSpan="2" className="px-5 py-4 text-center italic">Template Kosong</td></tr> :
                                  dashboardData.tables.topTemplateSPK.map((s, idx) => (
                                    <tr key={idx} className="hover:bg-rose-50/20">
                                        <td className="px-5 py-3 font-medium text-gray-800">{s.nama_template}</td>
                                        <td className="px-5 py-3 font-mono text-xs text-gray-500 truncate max-w-[150px]">{s.nomor_surat || '-'}</td>
                                    </tr>
                                 ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

          </div>
        </div>

        <div className="bg-white">
            <Footer />
        </div>

      </div>
    </div>
  );
};

export default Home;