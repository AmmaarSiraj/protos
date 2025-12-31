// src/pages/DetailMitraUserNew.jsx (REVISI)
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    FaUser,
    FaIdCard,
    FaMapMarkerAlt,
    FaPhone,
    FaEnvelope,
    FaArrowLeft,
    FaBriefcase,
    FaCalendarAlt,
    FaChevronDown,
    FaExclamationTriangle,
    FaCheckCircle,
    FaListAlt,
    FaCoins
} from 'react-icons/fa';

// Sesuaikan URL API
const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.sidome.id';

const DetailMitraUserNew = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Data State
    const [mitra, setMitra] = useState(null);
    const [groupedHistory, setGroupedHistory] = useState({});
    const [currentMonthTasks, setCurrentMonthTasks] = useState([]);
    const [stats, setStats] = useState({
        tasksThisMonth: 0,
        incomeThisMonth: 0,
        incomeThisYear: 0,
        totalTasks: 0,
        limitThisMonth: 0,
        limitAnnual: 0
    });

    // UI State
    const [expandedMonth, setExpandedMonth] = useState(null);

    // Helper: Format Rupiah
    const formatRupiah = (num) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
    };

    // Helper: Format Tanggal
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };
    
    // Helper: Get Month Name
    const getMonthName = (index) => {
        const months = [
            "Januari", "Februari", "Maret", "April", "Mei", "Juni",
            "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];
        return months[Number(index)];
    };
    
    // Helper: Get Array
    const getArray = (res) => {
        if (res?.data?.data && Array.isArray(res.data.data)) return res.data.data;
        if (res?.data && Array.isArray(res.data)) return res.data;
        return [];
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}` };

                // Fetch Semua Data
                const [resMitra, resKelompok, resPenugasan, resHonor, resAturan] = await Promise.all([
                    axios.get(`${API_URL}/api/mitra/${id}`, { headers }).catch(e => ({ data: null })),
                    axios.get(`${API_URL}/api/kelompok-penugasan`, { headers }).catch(e => ({ data: { data: [] } })),
                    axios.get(`${API_URL}/api/penugasan`, { headers }).catch(e => ({ data: { data: [] } })),
                    axios.get(`${API_URL}/api/honorarium`, { headers }).catch(e => ({ data: { data: [] } })),
                    axios.get(`${API_URL}/api/aturan-periode`, { headers }).catch(e => ({ data: { data: [] } }))
                ]);
                
                // Cek jika data mitra utama tidak ditemukan
                if (!resMitra.data || resMitra.data.status === 'error' || resMitra.data.data === null) {
                    setError('Data mitra tidak ditemukan atau akses ditolak.');
                    setLoading(false);
                    return;
                }

                const mitraData = resMitra.data.data || resMitra.data;
                setMitra(mitraData);

                const kelompokData = getArray(resKelompok);
                const penugasanData = getArray(resPenugasan);
                const honorData = getArray(resHonor);
                const aturanData = getArray(resAturan);

                // Mapping Data Penunjang
                const honorMap = {};
                honorData.forEach(h => {
                    honorMap[`${h.id_subkegiatan}-${h.kode_jabatan}`] = {
                        tarif: Number(h.tarif),
                        nama_satuan: h.nama_satuan || 'Kegiatan'
                    };
                });

                // Mapping Aturan (batas_honor dianggap sebagai batas bulanan dasar)
                const aturanMap = {};
                aturanData.forEach(a => {
                    const thn = a.tahun || (a.periode ? String(a.periode).substring(0, 4) : null);
                    if (thn) aturanMap[thn] = Number(a.batas_honor);
                });

                // Proses Data Penugasan Mitra
                const myTasksRaw = kelompokData.filter(k => String(k.id_mitra) === String(id));

                const processedTasks = myTasksRaw.map(k => {
                    const detailTugas = penugasanData.find(p => p.id_penugasan === k.id_penugasan);
                    if (!detailTugas || !detailTugas.tanggal_mulai) return null;

                    const honorInfo = honorMap[`${detailTugas.id_subkegiatan}-${k.kode_jabatan}`] || { tarif: 0, nama_satuan: 'Kegiatan' };
                    const tarif = honorInfo.tarif;
                    const namaSatuan = honorInfo.nama_satuan;

                    const totalHonor = tarif * (Number(k.volume_tugas) || 0);
                    const tgl = new Date(detailTugas.tanggal_mulai);

                    return {
                        ...k,
                        nama_kegiatan: detailTugas.nama_kegiatan,
                        nama_sub_kegiatan: detailTugas.nama_sub_kegiatan,
                        tanggal_mulai: detailTugas.tanggal_mulai,
                        jabatan: k.kode_jabatan || 'Anggota',
                        tarifSatuan: tarif,
                        namaSatuan: namaSatuan,
                        totalHonor: totalHonor,
                        bulan: tgl.getMonth(), // 0-11
                        tahun: tgl.getFullYear()
                    };
                }).filter(item => item !== null);

                // Hitung Statistik & Filter "Bulan Ini"
                const now = new Date();
                const currentMonthIdx = now.getMonth();
                const currentYear = now.getFullYear();
                
                // Batas Bulanan Dasar (nilai dari API)
                const limitMonthlyBase = aturanMap[String(currentYear)] || 0; 
                // Batas Tahunan = Batas Bulanan Dasar * 12 (Sesuai permintaan revisi)
                const limitAnnualCalc = limitMonthlyBase * 12;

                let tasksThisMonthList = [];
                let tasksThisMonthCount = 0;
                let incomeThisMonth = 0;
                let incomeThisYear = 0;

                processedTasks.forEach(t => {
                    if (t.tahun === currentYear) {
                        incomeThisYear += t.totalHonor;
                        if (t.bulan === currentMonthIdx) {
                            tasksThisMonthCount++;
                            incomeThisMonth += t.totalHonor;
                            tasksThisMonthList.push(t);
                        }
                    }
                });
                
                tasksThisMonthList.sort((a, b) => new Date(a.tanggal_mulai) - new Date(b.tanggal_mulai));


                setCurrentMonthTasks(tasksThisMonthList);

                setStats({
                    tasksThisMonth: tasksThisMonthCount,
                    incomeThisMonth,
                    incomeThisYear,
                    totalTasks: processedTasks.length,
                    limitThisMonth: limitMonthlyBase, // Batas bulanan dasar
                    limitAnnual: limitAnnualCalc // Batas tahunan (dikali 12)
                });

                // Grouping Data (Tahun -> Bulan)
                const grouped = {};
                processedTasks.forEach(t => {
                    if (!grouped[t.tahun]) grouped[t.tahun] = {};
                    if (!grouped[t.tahun][t.bulan]) {
                        grouped[t.tahun][t.bulan] = {
                            tasks: [],
                            totalIncome: 0,
                            // Di sini, kita menggunakan limit bulanan dasar untuk pengecekan per bulan di riwayat
                            limit: aturanMap[String(t.tahun)] || 0 
                        };
                    }
                    grouped[t.tahun][t.bulan].tasks.push(t);
                    grouped[t.tahun][t.bulan].totalIncome += t.totalHonor;
                });

                // Sort tasks in history
                Object.keys(grouped).forEach(thn => {
                    Object.keys(grouped[thn]).forEach(bln => {
                        grouped[thn][bln].tasks.sort((a, b) => new Date(b.tanggal_mulai) - new Date(a.tanggal_mulai));
                    });
                });

                setGroupedHistory(grouped);
                
                // Expand bulan saat ini secara default
                if (grouped[currentYear] && grouped[currentYear][currentMonthIdx]) {
                    setExpandedMonth(`${currentYear}-${currentMonthIdx}`);
                }


            } catch (err) {
                console.error("Gagal memuat detail mitra:", err);
                setError('Gagal memuat detail profil.');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

    const toggleMonth = (key) => {
        setExpandedMonth(expandedMonth === key ? null : key);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-[#1A2A80] rounded-full animate-spin"></div>
            <p className="text-gray-500 font-medium">Memuat Data Mitra...</p>
        </div>
    );

    if (error) return <div className="text-center py-20 text-red-600">{error}</div>;
    if (!mitra) return (
        <div className="text-center py-12">
            <h3 className="text-lg font-bold text-gray-700">Mitra tidak ditemukan.</h3>
            <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline">Kembali</button>
        </div>
    );

    const sortedYears = Object.keys(groupedHistory).sort((a, b) => b - a);

    // Cek Status Limit TAHUNAN
    const isOverLimitYear = stats.limitAnnual > 0 && stats.incomeThisYear > stats.limitAnnual;
    const currentMonthName = getMonthName(new Date().getMonth());
    const currentYearNum = new Date().getFullYear();

    return (
        <div className="max-w-7xl mx-auto w-full px-4 py-8 pt-14 px-8 pb-10 animate-fade-in-up">

            {/* HEADER (Kembali Button Saja) */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition"
                    >
                        <FaArrowLeft />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Detail Profil Mitra</h1>
                        <p className="text-sm text-gray-500">Informasi pribadi dan riwayat kinerja Anda.</p>
                    </div>
                </div>

                {/* TOMBOL EDIT DIHAPUS - KARENA INI VERSI USER */}
                
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* KOLOM KIRI: INFO MITRA */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        {/* Header Biru */}
                        <div className="h-24 bg-gradient-to-r from-blue-500 to-[#1A2A80]"></div>

                        <div className="px-6 pb-6">
                            {/* AVATAR/LOGO */}
                            <div className="relative -mt-12 mb-4">
                                <div className="w-24 h-24 bg-white rounded-full p-1 shadow-md inline-block">
                                    <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center text-gray-400 text-3xl">
                                        <FaUser />
                                    </div>
                                </div>
                            </div>

                            {/* KONTEN TEXT */}
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">{mitra.nama_lengkap}</h2>
                                <p className="text-sm text-gray-500 mb-4">{mitra.pekerjaan || 'Mitra Statistik'}</p>
                                
                                <div className="space-y-3 pt-4 border-t border-gray-100">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Data Kontak & Identitas</h3>
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <FaIdCard className="text-gray-400 w-4" />
                                        <span>NIK: {mitra.nik}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <FaEnvelope className="text-gray-400 w-4" />
                                        <span>{mitra.email || '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <FaPhone className="text-gray-400 w-4" />
                                        <span>{mitra.nomor_hp || '-'}</span>
                                    </div>
                                    <div className="flex items-start gap-3 text-sm text-gray-600">
                                        <FaMapMarkerAlt className="text-gray-400 w-4 mt-1" />
                                        <span className="leading-snug">{mitra.alamat || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* KOLOM KANAN: STATISTIK & RIWAYAT */}
                <div className="lg:col-span-2 space-y-6">

                    {/* 1. STATUS LIMIT & PENDAPATAN UMUM */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Total Pendapatan (Th. {currentYearNum})</p>
                                    <h3 className="text-2xl font-extrabold text-[#1A2A80] mt-1">{formatRupiah(stats.incomeThisYear)}</h3>
                                </div>
                                <div className={`p-2 rounded-lg ${isOverLimitYear ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                    <FaCoins />
                                </div>
                            </div>
                            <div className="mt-2 text-xs">
                                Status Limit: <span className={`font-bold ${isOverLimitYear ? 'text-red-600' : 'text-green-600'}`}>
                                    {isOverLimitYear ? 'MELEBIHI BATAS' : 'AMAN'}
                                </span>
                                <span className="text-gray-400 mx-1">|</span>
                                Batas Tahunan: {formatRupiah(stats.limitAnnual)}
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
                            <p className="text-xs text-gray-500 font-bold uppercase">Total Penugasan (Semua Waktu)</p>
                            <h3 className="text-2xl font-extrabold text-gray-800 mt-1">{stats.totalTasks}</h3>
                            <p className="text-xs text-gray-400 mt-1">Kegiatan Selesai / Sedang Berjalan</p>
                        </div>
                    </div>

                    {/* 2. CARD RINCIAN PENDAPATAN BULAN INI */}
                    <div className="bg-white rounded-xl border border-blue-200 shadow-md p-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#1A2A80]"></div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <FaListAlt className="text-[#1A2A80]" /> Rincian Tugas & Honor {currentMonthName} {currentYearNum}
                            </h3>
                            <span className="bg-blue-100 text-[#1A2A80] text-xs font-bold px-2 py-1 rounded">
                                {currentMonthTasks.length} Kegiatan
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2">Nama Survei / Sub Kegiatan</th>
                                        <th className="px-4 py-2">Kegiatan Induk</th>
                                        <th className="px-4 py-2">Jabatan</th>
                                        <th className="px-4 py-2 text-center">Vol</th>
                                        <th className="px-4 py-2 text-center">Satuan</th>
                                        <th className="px-4 py-2 text-right">Honor Satuan</th>
                                        <th className="px-4 py-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {currentMonthTasks.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-4 py-6 text-center text-gray-400 italic">
                                                Tidak ada penugasan di bulan ini.
                                            </td>
                                        </tr>
                                    ) : (
                                        currentMonthTasks.map((task, idx) => (
                                            <tr key={idx} className="bg-white hover:bg-gray-50 transition">
                                                <td className="px-4 py-2 font-medium text-gray-900">
                                                    {task.nama_sub_kegiatan}
                                                    <div className="text-[10px] text-gray-400 font-normal mt-0.5">{task.tanggal_mulai ? formatDate(task.tanggal_mulai) : '-'}</div>
                                                </td>
                                                <td className="px-4 py-2">{task.nama_kegiatan}</td>
                                                <td className="px-4 py-2">
                                                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold">{task.jabatan}</span>
                                                </td>
                                                <td className="px-4 py-2 text-center font-bold">{task.volume_tugas}</td>
                                                <td className="px-4 py-2 text-center text-xs">{task.namaSatuan}</td>
                                                <td className="px-4 py-2 text-right">{formatRupiah(task.tarifSatuan)}</td>
                                                <td className="px-4 py-2 text-right font-bold text-gray-800">{formatRupiah(task.totalHonor)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                {/* FOOTER TOTAL */}
                                {currentMonthTasks.length > 0 && (
                                    <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                                        <tr>
                                            <td colSpan="6" className="px-4 py-3 text-right font-bold text-gray-700 uppercase">
                                                Total Honor Bulan Ini
                                            </td>
                                            <td className="px-4 py-3 text-right font-extrabold text-[#1A2A80] text-base">
                                                {formatRupiah(stats.incomeThisMonth)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>

                    {/* 3. RIWAYAT PENUGASAN (Dropdown per Bulan) */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <FaCalendarAlt className="text-gray-500" /> Arsip Riwayat Penugasan
                        </h3>

                        {sortedYears.length === 0 ? (
                            <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                <p className="text-gray-500">Belum ada riwayat penugasan.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {sortedYears.map(year => {
                                    const monthsInYear = Object.keys(groupedHistory[year]).sort((a, b) => b - a);

                                    return (
                                        <div key={year} className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                                                <span className="text-lg font-extrabold text-gray-600">{year}</span>
                                            </div>

                                            <div className="space-y-0 divide-y divide-gray-100">
                                                {monthsInYear.map(monthIdx => {
                                                    const monthData = groupedHistory[year][monthIdx];
                                                    const monthKey = `${year}-${monthIdx}`;
                                                    const isExpanded = expandedMonth === monthKey;
                                                    
                                                    // monthData.limit di sini adalah Batas Honor BULANAN DASAR (aturanMap[tahun])
                                                    const limitMonthlyBaseForDisplay = monthData.limit > 0 ? monthData.limit : 0;
                                                    // Pengecekan: apakah pendapatan bulan ini melebihi batas bulanan dasar?
                                                    const isOverLimit = monthData.totalIncome > limitMonthlyBaseForDisplay && limitMonthlyBaseForDisplay > 0;

                                                    return (
                                                        <div key={monthKey} className={`transition-all ${isExpanded ? 'bg-blue-50/30' : 'bg-white'}`}>
                                                            <button
                                                                onClick={() => toggleMonth(monthKey)}
                                                                className={`w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-white border-l-4 border-[#1A2A80]' : 'bg-white'}`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`transition-transform duration-200 text-sm ${isExpanded ? 'rotate-180 text-[#1A2A80]' : 'text-gray-400'}`}>
                                                                        <FaChevronDown />
                                                                    </div>
                                                                    <div className="text-left">
                                                                        <h4 className="font-bold text-gray-800">{getMonthName(monthIdx)}</h4>
                                                                        <p className="text-xs text-gray-500">{monthData.tasks.length} Kegiatan</p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className={`block font-bold ${isOverLimit ? 'text-red-600' : 'text-gray-800'}`}>
                                                                        {formatRupiah(monthData.totalIncome)}
                                                                    </span>
                                                                    {limitMonthlyBaseForDisplay > 0 && (
                                                                        <div className="text-[10px] text-gray-400 flex flex-col items-end mt-0.5">
                                                                            <span>Batas Bln: {formatRupiah(limitMonthlyBaseForDisplay)}</span>
                                                                            {isOverLimit && <span className="text-red-500 flex items-center gap-1"><FaExclamationTriangle size={8} /> Over Batas Bulanan</span>}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </button>

                                                            {/* RINCIAN PENUGASAN */}
                                                            {isExpanded && (
                                                                <div className="bg-gray-50 px-5 py-4 border-t border-gray-100 space-y-3 animate-fade-in-down">
                                                                    {monthData.tasks.map((task, idx) => (
                                                                        <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                                                            <div>
                                                                                <h5 className="text-sm font-bold text-[#1A2A80]">{task.nama_sub_kegiatan}</h5>
                                                                                <div className="text-xs text-gray-500 flex flex-wrap gap-2 mt-1">
                                                                                    <span className="bg-gray-100 px-2 py-0.5 rounded">{task.nama_kegiatan}</span>
                                                                                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-semibold">{task.jabatan}</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-right w-full sm:w-auto mt-1 sm:mt-0 border-t sm:border-0 border-dashed border-gray-200 pt-2 sm:pt-0">
                                                                                <p className="font-bold text-gray-800">{formatRupiah(task.totalHonor)}</p>
                                                                                <p className="text-[10px] text-gray-500">Vol: {task.volume_tugas} {task.namaSatuan}</p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DetailMitraUserNew;