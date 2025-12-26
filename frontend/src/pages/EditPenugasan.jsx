// src/pages/EditPenugasan.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
    FaArrowLeft, FaCheck, FaIdCard, FaSearch, FaTimes,
    FaUsers, FaMoneyBillWave, FaExclamationCircle,
    FaChartBar, FaFilter, FaCheckCircle, FaEdit, FaCalendarDay, FaPlus
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.id';

const normalizeKodeJabatan = (kode) => {
    return String(kode)
        .replace(/[^\w-]/g, '')
        .replace(/\s/g, '')
        .toUpperCase();
};

const safeExtractData = (res) => {
    if (res.data && res.data.data) {
        if (Array.isArray(res.data.data)) return res.data.data;
    }
    if (res.data && Array.isArray(res.data)) return res.data;
    return [];
};

const EditPenugasan = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Data State
    const [penugasanInfo, setPenugasanInfo] = useState(null);
    const [subKegiatanInfo, setSubKegiatanInfo] = useState(null);

    const [listKegiatan, setListKegiatan] = useState([]);
    const [allSubKegiatan, setAllSubKegiatan] = useState([]);
    const [listMitra, setListMitra] = useState([]);
    const [listHonorarium, setListHonorarium] = useState([]);
    const [listAturan, setListAturan] = useState([]);
    const [listKelompok, setListKelompok] = useState([]);
    const [listPenugasan, setListPenugasan] = useState([]);

    const [selectedSubId, setSelectedSubId] = useState('');
    const [currentMembers, setCurrentMembers] = useState([]);
    const [selectedMitras, setSelectedMitras] = useState([]);

    // UI State
    const [mitraSearch, setMitraSearch] = useState('');
    const [showMitraDropdown, setShowMitraDropdown] = useState(false);

    // Finance State
    const [batasHonorPeriode, setBatasHonorPeriode] = useState(0);
    const [mitraIncomeMap, setMitraIncomeMap] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}` };

                const resPenugasanExist = await axios.get(`${API_URL}/api/penugasan/${id}`, { headers });
                const penugasanData = resPenugasanExist.data.data;
                const idSub = penugasanData.id_subkegiatan;

                const [resKeg, resMitra, resHonor, resAturan, resKelompok, resAllPenugasan, resAllSub, resAnggota] = await Promise.all([
                    axios.get(`${API_URL}/api/kegiatan`, { headers }),
                    axios.get(`${API_URL}/api/mitra`, { headers }),
                    axios.get(`${API_URL}/api/honorarium`, { headers }),
                    axios.get(`${API_URL}/api/aturan-periode`, { headers }),
                    axios.get(`${API_URL}/api/kelompok-penugasan`, { headers }),
                    axios.get(`${API_URL}/api/penugasan`, { headers }),
                    axios.get(`${API_URL}/api/subkegiatan`, { headers }),
                    axios.get(`${API_URL}/api/penugasan/${id}/anggota`, { headers }),
                ]);

                const subKegiatanList = safeExtractData(resAllSub);
                const honorList = safeExtractData(resHonor);
                const anggotaList = safeExtractData(resAnggota);

                setListKegiatan(resKeg.data.data || resKeg.data);
                setListMitra(resMitra.data.data || resMitra.data);
                setAllSubKegiatan(subKegiatanList);
                setListAturan(resAturan.data.data || resAturan.data);
                setListKelompok(resKelompok.data.data || resKelompok.data);
                setListPenugasan(resAllPenugasan.data.data || resAllPenugasan.data);

                const subKegiatanData = subKegiatanList.find(s => String(s.id) === String(idSub));
                setPenugasanInfo(penugasanData);
                setSubKegiatanInfo(subKegiatanData);
                setSelectedSubId(idSub);

                const filteredHonorList = honorList.filter(h => String(h.id_subkegiatan) === String(idSub));
                setListHonorarium(filteredHonorList);

                const formattedMembers = anggotaList.map(m => ({
                    id: m.id_mitra,
                    nama_lengkap: m.nama_lengkap,
                    nik: m.nik,
                    assignedJabatan: normalizeKodeJabatan(m.kode_jabatan),
                    assignedVolume: m.volume_tugas,
                    isExisting: true,
                    id_kelompok: m.id_kelompok
                }));
                setCurrentMembers(formattedMembers);
                setSelectedMitras(formattedMembers);

                // --- LOGIKA HITUNG BATAS HONOR & PENDAPATAN ---
                if (subKegiatanData && subKegiatanData.tanggal_mulai) {
                    const tgl = new Date(subKegiatanData.tanggal_mulai);
                    const tahunKegiatan = tgl.getFullYear().toString();
                    // Penugasan biasanya dihitung limit TAHUNAN, beda dengan perencanaan yg bulanan
                    // Namun agar konsisten, kita gunakan aturan periode yang ada (biasanya tahunan)

                    const aturan = resAturan.data.data.find(r =>
                        String(r.tahun) === tahunKegiatan || String(r.periode) === tahunKegiatan
                    );
                    setBatasHonorPeriode(aturan ? Number(aturan.batas_honor) : 0);

                    const incomeMap = {};
                    const allKelompokData = resKelompok.data.data || resKelompok.data;

                    allKelompokData.forEach(k => {
                        if (String(k.id_penugasan) === String(id)) return; // Skip current

                        const parentPenugasan = resAllPenugasan.data.data.find(p => p.id_penugasan === k.id_penugasan);
                        if (!parentPenugasan) return;

                        const sub = subKegiatanList.find(s => s.id === parentPenugasan.id_subkegiatan);
                        if (!sub || !sub.tanggal_mulai) return;

                        const subYear = new Date(sub.tanggal_mulai).getFullYear().toString();

                        // Hitung akumulasi dalam TAHUN yang sama
                        if (subYear !== tahunKegiatan) return;

                        const honor = honorList.find(h =>
                            h.id_subkegiatan === sub.id &&
                            normalizeKodeJabatan(h.kode_jabatan) === normalizeKodeJabatan(k.kode_jabatan)
                        );

                        let nominal = 0;
                        if (honor) {
                            nominal = Number(honor.tarif) * (Number(k.volume_tugas) || 0);
                        } else {
                            nominal = Number(k.total_honor) || 0;
                        }

                        const mId = String(k.id_mitra);
                        incomeMap[mId] = (incomeMap[mId] || 0) + nominal;
                    });

                    setMitraIncomeMap(incomeMap);
                }

            } catch (err) {
                console.error("Error saat memuat data:", err);
                Swal.fire('Error', 'Gagal memuat data penugasan.', 'error');
                navigate('/penugasan');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, navigate]);

    const targetYear = useMemo(() => {
        if (!subKegiatanInfo || !subKegiatanInfo.tanggal_mulai) return null;
        return new Date(subKegiatanInfo.tanggal_mulai).getFullYear().toString();
    }, [subKegiatanInfo]);

    const availableJabatan = useMemo(() => {
        return listHonorarium.filter(h => String(h.id_subkegiatan) === String(selectedSubId));
    }, [listHonorarium, selectedSubId]);

    const getVolumeStats = (kodeJabatan, basisVolume) => {
        const normalizedKodeJabatan = normalizeKodeJabatan(kodeJabatan);

        const relatedPenugasanIds = listPenugasan
            .filter(p => String(p.id_subkegiatan) === String(selectedSubId) && String(p.id_penugasan) !== String(id))
            .map(p => p.id_penugasan);

        const usedInOtherDB = listKelompok
            .filter(k => relatedPenugasanIds.includes(k.id_penugasan) && normalizeKodeJabatan(k.kode_jabatan) === normalizedKodeJabatan)
            .reduce((acc, curr) => acc + (Number(curr.volume_tugas) || 0), 0);

        const usedInDraft = selectedMitras
            .filter(m => normalizeKodeJabatan(m.assignedJabatan) === normalizedKodeJabatan)
            .reduce((acc, curr) => acc + (Number(curr.assignedVolume) || 0), 0);

        return {
            used: usedInOtherDB + usedInDraft,
            max: basisVolume || 0
        };
    };

    const formatRupiah = (num) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
    };

    const handleAddMitra = (mitra) => {
        if (selectedMitras.some(m => m.id === mitra.id)) return;
        setSelectedMitras([...selectedMitras, {
            ...mitra,
            assignedJabatan: '',
            assignedVolume: 1,
            isExisting: false
        }]);
        setMitraSearch('');
        setShowMitraDropdown(false);
    };

    const handleRemoveMitra = (mitraId) => {
        setSelectedMitras(selectedMitras.filter(m => m.id !== mitraId));
    };

    const handleUpdateMitraData = (mitraId, field, value) => {
        const normalizedValue = field === 'assignedJabatan' ? normalizeKodeJabatan(value) : value;
        setSelectedMitras(prev => prev.map(m =>
            m.id === mitraId ? { ...m, [field]: normalizedValue } : m
        ));
    };

    const handleSubmit = async () => {
        if (selectedMitras.length === 0) {
            return Swal.fire('Perhatian', 'Daftar anggota tim tidak boleh kosong.', 'warning');
        }

        const incompleteMitra = selectedMitras.find(m => !m.assignedJabatan || m.assignedVolume <= 0);
        if (incompleteMitra) {
            return Swal.fire('Data Belum Lengkap', `Harap pilih jabatan dan isi volume tugas (> 0) untuk mitra: ${incompleteMitra.nama_lengkap}`, 'warning');
        }

        setSubmitting(true);
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        try {
            const selectedIds = new Set(selectedMitras.map(m => m.id));
            const toDelete = currentMembers.filter(m => !selectedIds.has(m.id));

            if (toDelete.length > 0) {
                await Promise.all(toDelete.map(m =>
                    axios.delete(`${API_URL}/api/kelompok-penugasan/${m.id_kelompok}`, { headers })
                ));
            }

            const promises = selectedMitras.map(m => {
                const payloadJabatan = normalizeKodeJabatan(m.assignedJabatan);
                if (m.isExisting) {
                    return axios.put(`${API_URL}/api/kelompok-penugasan/${m.id_kelompok}`, {
                        kode_jabatan: payloadJabatan,
                        volume_tugas: m.assignedVolume
                    }, { headers });
                } else {
                    return axios.post(`${API_URL}/api/kelompok-penugasan`, {
                        id_penugasan: id,
                        id_mitra: m.id,
                        kode_jabatan: payloadJabatan,
                        volume_tugas: m.assignedVolume
                    }, { headers });
                }
            });

            await Promise.all(promises);

            Swal.fire({
                title: 'Berhasil',
                text: 'Perubahan penugasan berhasil disimpan.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            }).then(() => navigate('/penugasan'));

        } catch (err) {
            console.error(err);
            Swal.fire('Gagal', err.response?.data?.error || 'Terjadi kesalahan saat menyimpan.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredMitra = listMitra.filter(m => {
        const term = mitraSearch.toLowerCase();
        const matchSearch = m.nama_lengkap.toLowerCase().includes(term) || m.nik.includes(term);
        const notSelected = !selectedMitras.some(selected => selected.id === m.id);

        let isActiveInYear = false;
        if (targetYear && m.riwayat_tahun) {
            const years = m.riwayat_tahun.split(', ');
            isActiveInYear = years.includes(targetYear);
        } else if (!targetYear) {
            isActiveInYear = true;
        }

        return matchSearch && notSelected && isActiveInYear;
    });

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-10 h-10 border-4 border-blue-100 border-t-[#1A2A80] rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-medium">Memuat data penugasan...</p>
        </div>
    );

    return (
        // Container aligned with Design System (max-w-7xl)
        <div className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-20">

            {/* HEADER SECTION */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <Link to="/penugasan" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#1A2A80] transition font-bold text-xs mb-3">
                            <FaArrowLeft size={10} /> KEMBALI KE DAFTAR
                        </Link>
                        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
                            <div className="bg-blue-50 text-[#1A2A80] p-2.5 rounded-lg">
                                <FaEdit size={20} />
                            </div>
                            Edit Penugasan Tim
                        </h1>
                        <p className="text-sm text-gray-500 mt-2 ml-1">
                            Atur ulang anggota tim dan alokasi tugas (SPK) untuk kegiatan ini.
                        </p>
                    </div>

                    {/* Context Info Card */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 min-w-[300px]">
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Sub Kegiatan</p>
                        <p className="font-bold text-[#1A2A80] text-sm md:text-base leading-tight">
                            {subKegiatanInfo?.nama_sub_kegiatan}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <FaCalendarDay />
                            {subKegiatanInfo?.tanggal_mulai
                                ? new Date(subKegiatanInfo.tanggal_mulai).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
                                : '-'}
                        </p>
                    </div>
                </div>
            </div>

            {/* KUOTA & HONORARIUM SECTION */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2 mb-6">
                    <FaChartBar className="text-[#1A2A80]" /> Informasi Kuota & Honorarium
                </h3>

                {availableJabatan.length === 0 ? (
                    <div className="p-8 bg-gray-50 rounded-xl text-sm border border-dashed border-gray-300 text-center text-gray-400 italic">
                        Belum ada data jabatan/honorarium untuk sub kegiatan ini.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {availableJabatan.map(h => {
                            const { used, max } = getVolumeStats(h.kode_jabatan, h.basis_volume);
                            const percent = max > 0 ? (used / max) * 100 : 0;

                            let barColor = 'bg-blue-500';
                            if (percent >= 100) barColor = 'bg-green-500';
                            if (percent > 100) barColor = 'bg-red-500';

                            return (
                                <div key={h.id_honorarium} className="bg-gray-50 p-5 rounded-2xl border border-gray-200 relative overflow-hidden group hover:border-blue-200 transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="font-bold text-sm text-gray-800 leading-tight mb-1">{h.nama_jabatan}</p>
                                            <span className="text-[10px] font-mono font-bold bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-500">
                                                {normalizeKodeJabatan(h.kode_jabatan)}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-extrabold text-[#1A2A80] font-mono">{formatRupiah(h.tarif)}</p>
                                            <p className="text-[10px] text-gray-400">/ {h.nama_satuan}</p>
                                        </div>
                                    </div>

                                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-2">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                            style={{ width: `${Math.min(percent, 100)}%` }}
                                        ></div>
                                    </div>

                                    <div className="flex justify-between text-[10px] font-medium text-gray-500">
                                        <span>Terpakai: <strong className={percent > 100 ? 'text-red-600' : 'text-gray-700'}>{used}</strong></span>
                                        <span>Kuota Max: <strong>{max}</strong></span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* MAIN CONTENT SPLIT */}
            <div className="flex flex-col lg:flex-row gap-6">

                {/* LEFT: SEARCH MITRA */}
                <div className="lg:w-1/3">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full">
                        <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase flex items-center gap-2">
                            <FaSearch className="text-[#1A2A80]" /> Cari & Tambah Mitra
                        </h3>

                        {targetYear && (
                            <div className="mb-4">
                                <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-[10px] px-3 py-1.5 rounded-lg border border-blue-100 font-bold">
                                    <FaFilter size={10} /> Menampilkan Mitra Aktif Tahun {targetYear}
                                </span>
                            </div>
                        )}

                        <div className="relative">
                            <input
                                type="text"
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-[#1A2A80] outline-none transition text-sm text-gray-800"
                                placeholder="Ketik nama atau NIK..."
                                value={mitraSearch}
                                onChange={(e) => { setMitraSearch(e.target.value); setShowMitraDropdown(true); }}
                                onFocus={() => setShowMitraDropdown(true)}
                            />
                            <FaSearch className="absolute left-3.5 top-3.5 text-gray-400" />

                            {showMitraDropdown && mitraSearch && (
                                <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl shadow-xl mt-2 max-h-[350px] overflow-y-auto custom-scrollbar">
                                    {filteredMitra.length === 0 ? (
                                        <div className="p-4 text-xs text-gray-500 text-center italic">
                                            Tidak ditemukan / Sudah dipilih / Tidak aktif.
                                        </div>
                                    ) : (
                                        filteredMitra.map(m => {
                                            const currentIncome = mitraIncomeMap[String(m.id)] || 0;
                                            const limit = batasHonorPeriode;
                                            const isFull = limit > 0 && currentIncome >= limit;
                                            const percent = limit > 0 ? (currentIncome / limit) * 100 : 0;

                                            return (
                                                <div
                                                    key={m.id}
                                                    onClick={() => handleAddMitra(m)}
                                                    className="px-4 py-3 border-b border-gray-50 last:border-none cursor-pointer hover:bg-blue-50 transition-colors"
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-800">{m.nama_lengkap}</p>
                                                            <p className="text-xs text-gray-500 font-mono">{m.nik}</p>
                                                        </div>
                                                        {isFull ? (
                                                            <span className="text-[9px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">LIMIT</span>
                                                        ) : (
                                                            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100"><FaPlus size={8} /></span>
                                                        )}
                                                    </div>

                                                    {limit > 0 && (
                                                        <div className="mt-2 pt-2 border-t border-gray-50">
                                                            <div className="flex justify-between text-[9px] mb-1 text-gray-400 uppercase font-bold">
                                                                <span>Honor Tahunan</span>
                                                                <span>{Math.round(percent)}%</span>
                                                            </div>
                                                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                                <div
                                                                    className={`h-1.5 rounded-full ${percent > 90 ? 'bg-red-500' : 'bg-green-500'}`}
                                                                    style={{ width: `${Math.min(percent, 100)}%` }}
                                                                ></div>
                                                            </div>
                                                            <p className="text-[9px] text-gray-400 mt-0.5 text-right">
                                                                Rp {currentIncome.toLocaleString('id-ID')} / {limit.toLocaleString('id-ID')}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT: MEMBER LIST */}
                <div className="lg:w-2/3">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2">
                                <FaUsers className="text-[#1A2A80]" /> Daftar Anggota Terpilih ({selectedMitras.length})
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto max-h-[600px] space-y-4 pr-1 custom-scrollbar">
                            {selectedMitras.length === 0 ? (
                                <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    <FaUsers className="mx-auto text-4xl text-gray-300 mb-3" />
                                    <p className="text-sm text-gray-500 font-medium">Belum ada mitra yang ditambahkan ke tim ini.</p>
                                    <p className="text-xs text-gray-400">Gunakan kolom pencarian di sebelah kiri untuk menambah anggota.</p>
                                </div>
                            ) : (
                                selectedMitras.map((mitra, idx) => {
                                    const normalizedAssignedJabatan = normalizeKodeJabatan(mitra.assignedJabatan);
                                    const honorInfo = availableJabatan.find(h => normalizeKodeJabatan(h.kode_jabatan) === normalizedAssignedJabatan);
                                    const tarif = honorInfo ? Number(honorInfo.tarif) : 0;
                                    const vol = Number(mitra.assignedVolume) || 0;
                                    const totalHonorBaru = tarif * vol;

                                    const currentIncome = mitraIncomeMap[String(mitra.id)] || 0;
                                    const totalProjected = currentIncome + totalHonorBaru;
                                    const limit = batasHonorPeriode;

                                    const percentCurrent = limit > 0 ? (currentIncome / limit) * 100 : 0;
                                    const percentNew = limit > 0 ? (totalHonorBaru / limit) * 100 : 0;
                                    const isOverLimit = limit > 0 && totalProjected > limit;

                                    return (
                                        <div key={mitra.id} className={`bg-white p-5 rounded-2xl border shadow-sm transition-all relative group ${isOverLimit ? 'border-red-200 shadow-red-50' : 'border-gray-200 hover:border-blue-200 hover:shadow-md'}`}>

                                            {/* Row Header */}
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${mitra.isExisting ? 'bg-[#1A2A80]' : 'bg-green-500'}`}>
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-800">{mitra.nama_lengkap}</p>
                                                        <p className="text-xs text-gray-500 font-mono flex items-center gap-2">
                                                            <span className="flex items-center gap-1"><FaIdCard className="text-gray-300" /> {mitra.nik}</span>
                                                            {mitra.isExisting ? (
                                                                <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide">Existing</span>
                                                            ) : (
                                                                <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide">Baru</span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveMitra(mitra.id)}
                                                    className="text-gray-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition"
                                                    title="Hapus dari daftar"
                                                >
                                                    <FaTimes />
                                                </button>
                                            </div>

                                            {/* Row Inputs */}
                                            <div className="grid grid-cols-12 gap-4 items-end bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                                <div className="col-span-5">
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Jabatan</label>
                                                    <select
                                                        className={`w-full text-xs border rounded-lg px-3 py-2 outline-none transition bg-white ${isOverLimit ? 'border-red-300 text-red-700' : 'border-gray-300 focus:border-[#1A2A80] focus:ring-1 focus:ring-blue-100'}`}
                                                        value={mitra.assignedJabatan}
                                                        onChange={(e) => handleUpdateMitraData(mitra.id, 'assignedJabatan', e.target.value)}
                                                    >
                                                        <option value="">-- Pilih Jabatan --</option>
                                                        {availableJabatan.map(h => {
                                                            const normalizedCode = normalizeKodeJabatan(h.kode_jabatan);
                                                            return (
                                                                <option key={h.kode_jabatan} value={normalizedCode}>
                                                                    {normalizedCode} - {h.nama_jabatan}
                                                                </option>
                                                            )
                                                        })}
                                                    </select>
                                                </div>

                                                <div className="col-span-3">
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Volume</label>
                                                    <div className="flex items-center">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            className="w-full text-xs border border-gray-300 border-r-0 rounded-l-lg px-2 py-2 outline-none text-center font-bold text-gray-700 focus:ring-1 focus:ring-[#1A2A80] focus:border-[#1A2A80]"
                                                            value={mitra.assignedVolume}
                                                            onChange={(e) => handleUpdateMitraData(mitra.id, 'assignedVolume', parseInt(e.target.value) || 0)}
                                                        />
                                                        <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-2 rounded-r-lg border border-gray-300 font-bold">
                                                            {honorInfo
                                                                ? (honorInfo.nama_satuan || honorInfo.satuan_alias || <FaBoxOpen />)
                                                                : <FaBoxOpen />
                                                            }
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="col-span-4 text-right">
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Estimasi Honor</label>
                                                    <div className={`text-sm font-extrabold flex items-center justify-end gap-1 ${isOverLimit ? 'text-red-600' : 'text-[#1A2A80]'}`}>
                                                        {formatRupiah(totalHonorBaru)}
                                                    </div>
                                                    {honorInfo && <span className="text-[9px] text-gray-400">(@ {formatRupiah(tarif)})</span>}
                                                </div>
                                            </div>

                                            {/* Progress Bar Pendapatan */}
                                            {limit > 0 && (
                                                <div className={`mt-4 pt-3 border-t border-gray-100 ${isOverLimit ? 'bg-red-50/30 -mx-5 px-5 -mb-5 pb-5 rounded-b-2xl border-t-red-100' : ''}`}>
                                                    <div className="flex justify-between text-[10px] text-gray-500 mb-1.5 uppercase font-bold tracking-wide">
                                                        <span>Limit Honor (Tahun Ini)</span>
                                                        <span>{formatRupiah(totalProjected)} / {formatRupiah(limit)}</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden flex shadow-inner">
                                                        {/* Bar Hijau (Existing) */}
                                                        <div
                                                            className={`h-full transition-all duration-300 ${percentCurrent > 90 ? 'bg-yellow-400' : 'bg-emerald-400'}`}
                                                            style={{ width: `${Math.min(percentCurrent, 100)}%` }}
                                                            title={`Pendapatan Lain: ${formatRupiah(currentIncome)}`}
                                                        ></div>
                                                        {/* Bar Biru/Merah (New) */}
                                                        <div
                                                            className={`h-full transition-all duration-300 ${isOverLimit ? 'bg-red-500' : 'bg-blue-500'}`}
                                                            style={{ width: `${Math.min(percentNew, 100 - Math.min(percentCurrent, 100))}%` }}
                                                            title={`Tambahan Honor: ${formatRupiah(totalHonorBaru)}`}
                                                        ></div>
                                                    </div>
                                                    {isOverLimit ? (
                                                        <div className="mt-2 text-[10px] text-red-600 font-bold flex items-center gap-1 animate-pulse">
                                                            <FaExclamationCircle /> Melebihi Batas Honor Tahunan!
                                                        </div>
                                                    ) : (
                                                        <div className="mt-2 text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                                            <FaCheckCircle /> Masih dalam batas aman
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="mt-auto pt-6 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || selectedMitras.length === 0}
                                className="px-8 py-3 bg-[#1A2A80] text-white rounded-xl font-bold hover:bg-blue-900 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? (
                                    <>Memproses...</>
                                ) : (
                                    <><FaCheck /> Simpan Perubahan Penugasan</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default EditPenugasan;