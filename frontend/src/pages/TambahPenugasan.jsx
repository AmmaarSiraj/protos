// src/pages/TambahPenugasan.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaArrowRight, FaArrowLeft, FaCheck, FaClipboardList,
  FaIdCard, FaSearch, FaTimes, FaUsers, FaMoneyBillWave,
  FaExclamationCircle, FaChartBar, FaBoxOpen, FaFilter,
  FaLayerGroup, FaCalendarDay, FaCheckCircle
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id';

const TambahPenugasan = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Data Master
  const [listKegiatan, setListKegiatan] = useState([]);
  const [listSubKegiatan, setListSubKegiatan] = useState([]);
  const [allSubKegiatan, setAllSubKegiatan] = useState([]);
  const [listMitra, setListMitra] = useState([]);
  const [listHonorarium, setListHonorarium] = useState([]);
  const [listAturan, setListAturan] = useState([]);
  const [listKelompok, setListKelompok] = useState([]);
  const [listPenugasan, setListPenugasan] = useState([]);

  // Form State
  const [selectedKegiatanId, setSelectedKegiatanId] = useState('');
  const [selectedSubId, setSelectedSubId] = useState('');
  const [selectedMitras, setSelectedMitras] = useState([]);

  const [mitraSearch, setMitraSearch] = useState('');
  const [showMitraDropdown, setShowMitraDropdown] = useState(false);

  // Finance State
  const [batasHonorPeriode, setBatasHonorPeriode] = useState(0);
  const [mitraIncomeMap, setMitraIncomeMap] = useState({});

  // 1. Fetch Data Master
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const [resKeg, resMitra, resHonor, resAturan, resKelompok, resPenugasan, resAllSub] = await Promise.all([
          axios.get(`${API_URL}/api/kegiatan`, { headers }),
          axios.get(`${API_URL}/api/mitra`, { headers }),
          axios.get(`${API_URL}/api/honorarium`, { headers }),
          axios.get(`${API_URL}/api/aturan-periode`, { headers }),
          axios.get(`${API_URL}/api/kelompok-penugasan`, { headers }),
          axios.get(`${API_URL}/api/penugasan`, { headers }),
          axios.get(`${API_URL}/api/subkegiatan`, { headers })
        ]);

        setListKegiatan(resKeg.data.data || resKeg.data);
        setListMitra(resMitra.data.data || resMitra.data);
        setListHonorarium(resHonor.data.data || resHonor.data);
        setListAturan(resAturan.data.data || resAturan.data);
        setListKelompok(resKelompok.data.data || resKelompok.data);
        setListPenugasan(resPenugasan.data.data || resPenugasan.data);
        setAllSubKegiatan(resAllSub.data.data || resAllSub.data);

      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Gagal memuat data master', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 2. Fetch Sub Kegiatan Dropdown saat Kegiatan Berubah
  useEffect(() => {
    const fetchSubDropdown = async () => {
      if (!selectedKegiatanId) {
        setListSubKegiatan([]);
        return;
      }
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/subkegiatan/kegiatan/${selectedKegiatanId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setListSubKegiatan(res.data.data || res.data);
      } catch (err) {
        console.error("Gagal load sub kegiatan:", err);
      }
    };
    fetchSubDropdown();
  }, [selectedKegiatanId]);

  // 3. Handle Data dari Import (Auto-Fill)
  useEffect(() => {
    if (!loading && location.state) {
        const { preSelectedSubKegiatan, importedMembers } = location.state;

        // A. Auto-select Kegiatan & Subkegiatan
        if (preSelectedSubKegiatan) {
            setSelectedKegiatanId(preSelectedSubKegiatan.id_kegiatan);
            setSelectedSubId(preSelectedSubKegiatan.id);
            setStep(2); 
        }

        // B. Auto-fill Mitra dari Import
        if (importedMembers && Array.isArray(importedMembers) && listMitra.length > 0) {
            const mappedMembers = importedMembers.map(imp => {
                const fullMitra = listMitra.find(m => m.id === imp.id_mitra);
                return {
                    ...(fullMitra || {}),
                    id: imp.id_mitra,
                    nama_lengkap: imp.nama_lengkap || fullMitra?.nama_lengkap,
                    nik: fullMitra?.nik || imp.sobat_id || '-',
                    assignedJabatan: imp.kode_jabatan,
                    assignedVolume: imp.volume_tugas
                };
            });

            setSelectedMitras(prev => prev.length === 0 ? mappedMembers : prev);

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: `${importedMembers.length} Mitra berhasil diimpor`,
                showConfirmButton: false,
                timer: 3000
            });
        }
    }
  }, [loading, location.state, listMitra]);

  // 4. Hitung Batas Honor & Pendapatan Mitra
  useEffect(() => {
    if (!selectedSubId) {
      setBatasHonorPeriode(0);
      setMitraIncomeMap({});
      return;
    }

    const subInfo = allSubKegiatan.find(s => String(s.id) === String(selectedSubId));
    if (!subInfo || !subInfo.tanggal_mulai) return;

    const tahunKegiatan = new Date(subInfo.tanggal_mulai).getFullYear().toString();

    const aturan = listAturan.find(r =>
      String(r.tahun) === String(tahunKegiatan) ||
      String(r.periode) === String(tahunKegiatan)
    );

    if (aturan) {
      setBatasHonorPeriode(Number(aturan.batas_honor));
    } else {
      setBatasHonorPeriode(0);
    }

    const incomeMap = {};

    listKelompok.forEach(k => {
      const penugasan = listPenugasan.find(p => p.id_penugasan === k.id_penugasan);
      if (!penugasan) return;

      const sub = allSubKegiatan.find(s => s.id === penugasan.id_subkegiatan);
      if (!sub || !sub.tanggal_mulai) return;

      const subYear = new Date(sub.tanggal_mulai).getFullYear().toString();

      if (subYear !== tahunKegiatan) return;

      const honor = listHonorarium.find(h => h.id_subkegiatan === sub.id && h.kode_jabatan === k.kode_jabatan);
      const tarif = honor ? Number(honor.tarif) : 0;
      const vol = k.volume_tugas ? Number(k.volume_tugas) : 0;

      const mId = String(k.id_mitra);
      const multiplier = vol > 0 ? vol : 1;

      incomeMap[mId] = (incomeMap[mId] || 0) + (tarif * multiplier);
    });

    setMitraIncomeMap(incomeMap);

  }, [selectedSubId, allSubKegiatan, listAturan, listKelompok, listPenugasan, listHonorarium]);

  // 5. Helpers & Derived State
  const targetYear = useMemo(() => {
    if (!selectedSubId) return null;
    const sub = allSubKegiatan.find(s => String(s.id) === String(selectedSubId));
    if (!sub || !sub.tanggal_mulai) return null;
    return new Date(sub.tanggal_mulai).getFullYear().toString();
  }, [selectedSubId, allSubKegiatan]);

  const unavailableMitraIds = useMemo(() => {
    if (!selectedSubId) return new Set();
    const relatedPenugasanIds = listPenugasan
      .filter(p => String(p.id_subkegiatan) === String(selectedSubId))
      .map(p => p.id_penugasan);
    const assignedIds = listKelompok
      .filter(k => relatedPenugasanIds.includes(k.id_penugasan))
      .map(k => String(k.id_mitra));
    return new Set(assignedIds);
  }, [selectedSubId, listPenugasan, listKelompok]);

  const availableJabatan = useMemo(() => {
    return listHonorarium.filter(h => String(h.id_subkegiatan) === String(selectedSubId));
  }, [listHonorarium, selectedSubId]);

  const getVolumeStats = (kodeJabatan, basisVolume) => {
    const relatedPenugasanIds = listPenugasan
      .filter(p => String(p.id_subkegiatan) === String(selectedSubId))
      .map(p => p.id_penugasan);

    const usedInDB = listKelompok
      .filter(k => relatedPenugasanIds.includes(k.id_penugasan) && k.kode_jabatan === kodeJabatan)
      .reduce((acc, curr) => acc + (Number(curr.volume_tugas) || 0), 0);

    const usedInDraft = selectedMitras
      .filter(m => m.assignedJabatan === kodeJabatan)
      .reduce((acc, curr) => acc + (Number(curr.assignedVolume) || 0), 0);

    return {
      used: usedInDB + usedInDraft,
      max: basisVolume || 0
    };
  };

  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  // 6. Handlers
  const handleNextStep = () => {
    if (!selectedKegiatanId || !selectedSubId) {
      Swal.fire('Perhatian', 'Silakan pilih Kegiatan dan Sub Kegiatan terlebih dahulu.', 'warning');
      return;
    }
    setStep(2);
  };

  const handleAddMitra = (mitra) => {
    if (selectedMitras.some(m => m.id === mitra.id)) return;
    setSelectedMitras([...selectedMitras, { ...mitra, assignedJabatan: '', assignedVolume: 1 }]);
    setMitraSearch('');
    setShowMitraDropdown(false);
  };

  const handleRemoveMitra = (mitraId) => {
    setSelectedMitras(selectedMitras.filter(m => m.id !== mitraId));
  };

  const handleUpdateMitraData = (mitraId, field, value) => {
    setSelectedMitras(prev => prev.map(m =>
      m.id === mitraId ? { ...m, [field]: value } : m
    ));
  };

  const handleSubmit = async () => {
    if (selectedMitras.length === 0) {
      return Swal.fire('Perhatian', 'Belum ada mitra yang dipilih.', 'warning');
    }

    const incompleteMitra = selectedMitras.find(m => !m.assignedJabatan || m.assignedVolume <= 0);
    if (incompleteMitra) {
      return Swal.fire('Data Belum Lengkap', `Harap pilih jabatan dan isi volume tugas (> 0) untuk mitra: ${incompleteMitra.nama_lengkap}`, 'warning');
    }

    if (batasHonorPeriode > 0) {
      const overLimitUser = selectedMitras.find(m => {
        const hInfo = availableJabatan.find(h => h.kode_jabatan === m.assignedJabatan);
        const tarif = hInfo ? Number(hInfo.tarif) : 0;
        const totalHonorBaru = tarif * Number(m.assignedVolume);
        const current = mitraIncomeMap[String(m.id)] || 0;
        return (current + totalHonorBaru) > batasHonorPeriode;
      });

      if (overLimitUser) {
        return Swal.fire(
          'Gagal Menyimpan',
          `Mitra <b>${overLimitUser.nama_lengkap}</b> melebihi batas honor tahunan ini. Silakan kurangi volume/honor atau hapus dari daftar.`,
          'error'
        );
      }
    }

    for (const jabatan of availableJabatan) {
      const stats = getVolumeStats(jabatan.kode_jabatan, jabatan.basis_volume);
      if (stats.max > 0 && stats.used > stats.max) {
        return Swal.fire(
          'Kuota Terlampaui',
          `Total penugasan untuk jabatan <b>${jabatan.nama_jabatan}</b> melebihi batas kuota!<br/><br/>
           Maksimal: ${stats.max}<br/>
           Terpakai (termasuk baru): ${stats.used}<br/><br/>
           Silakan kurangi jumlah petugas atau volume tugasnya.`,
          'warning'
        );
      }
    }

    setSubmitting(true);
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    const headers = { Authorization: `Bearer ${token}` };

    const rawIdPengawas = user?.id;
    const idPengawas = parseInt(rawIdPengawas); 

    if (isNaN(idPengawas) || idPengawas < 1) { 
        setSubmitting(false);
        return Swal.fire('Gagal', 'ID Pengawas tidak valid. Pastikan Anda sudah login.', 'error');
    }

    try {
      const existingPenugasan = listPenugasan.find(
        p => String(p.id_subkegiatan) === String(selectedSubId)
      );
      
      if (existingPenugasan) {
        const idPenugasanExist = existingPenugasan.id_penugasan;
        const promises = selectedMitras.map(m => {
          return axios.post(`${API_URL}/api/kelompok-penugasan`, {
            id_penugasan: idPenugasanExist,
            id_mitra: m.id,
            kode_jabatan: m.assignedJabatan,
            volume_tugas: m.assignedVolume
          }, { headers });
        });
        await Promise.all(promises);

        Swal.fire({
          title: 'Berhasil',
          text: `Mitra berhasil ditambahkan ke penugasan (ID: ${idPenugasanExist}).`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        }).then(() => navigate('/penugasan'));

      } else {
        const payload = {
          id_subkegiatan: selectedSubId,
          id_pengawas: idPengawas, 
          anggota: selectedMitras.map(m => ({
            id_mitra: m.id,
            kode_jabatan: m.assignedJabatan,
            volume_tugas: m.assignedVolume
          }))
        };
        await axios.post(`${API_URL}/api/penugasan`, payload, { headers });

        Swal.fire({
          title: 'Berhasil',
          text: 'Penugasan baru dan tim berhasil disimpan.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        }).then(() => navigate('/penugasan'));
      }

    } catch (err) {
      console.error(err);
      let errorMessage = 'Terjadi kesalahan saat menyimpan.';
      if (err.response?.status === 422) {
          const errors = err.response.data.errors;
          if (Object.keys(errors).length > 0) {
            const firstErrorField = Object.keys(errors)[0];
            errorMessage = `Validasi Gagal pada field <b>${firstErrorField}</b>: ${errors[firstErrorField][0]}`;
          } else {
            errorMessage = err.response.data.message || 'Validasi Gagal!';
          }
      } else {
        errorMessage = err.response?.data?.error || err.message || errorMessage;
      }
      Swal.fire('Gagal', errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMitra = listMitra.filter(m => {
    const term = mitraSearch.toLowerCase();
    const matchSearch = m.nama_lengkap.toLowerCase().includes(term) || m.nik.includes(term);
    const notSelected = !selectedMitras.some(selected => selected.id === m.id);
    const notAlreadyAssigned = !unavailableMitraIds.has(String(m.id));

    let isActiveInYear = false;
    if (targetYear && m.riwayat_tahun) {
      const years = m.riwayat_tahun.split(', ');
      isActiveInYear = years.includes(targetYear);
    } else if (!targetYear) {
      isActiveInYear = true;
    }

    return matchSearch && notSelected && notAlreadyAssigned && isActiveInYear;
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-blue-100 border-t-[#1A2A80] rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Memuat data...</p>
    </div>
  );

  return (
    // Container disesuaikan dengan Layout
    <div className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-20">

      {/* HEADER SECTION */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
               <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
                  <div className="bg-blue-50 text-[#1A2A80] p-2.5 rounded-lg">
                      <FaLayerGroup size={20} />
                  </div>
                  Wizard Penugasan Mitra
               </h1>
               <p className="text-sm text-gray-500 mt-2 ml-1">
                  Buat Surat Perintah Kerja (SPK) dan alokasi tugas mitra.
               </p>
            </div>
            
            {/* Step Indicator */}
            <div className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded-xl border border-gray-200">
               <span className={`px-4 py-2 rounded-lg transition-all font-bold ${step === 1 ? 'bg-[#1A2A80] text-white shadow-md' : 'text-gray-400'}`}>
                  1. Kegiatan
               </span>
               <span className="text-gray-300">/</span>
               <span className={`px-4 py-2 rounded-lg transition-all font-bold ${step === 2 ? 'bg-[#1A2A80] text-white shadow-md' : 'text-gray-400'}`}>
                  2. Alokasi
               </span>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px] flex flex-col">

        {step === 1 && (
          <div className="p-8 animate-fade-in-up flex-1 flex flex-col">
            <h2 className="text-lg font-bold text-gray-700 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
              <FaClipboardList className="text-[#1A2A80]" /> Pilih Target Kegiatan
            </h2>

            <div className="space-y-6 max-w-3xl">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2 uppercase tracking-wide">Kegiatan Utama</label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A2A80] outline-none transition bg-gray-50 focus:bg-white"
                  value={selectedKegiatanId}
                  onChange={(e) => { setSelectedKegiatanId(e.target.value); setSelectedSubId(''); }}
                >
                  <option value="">-- Pilih Kegiatan --</option>
                  {listKegiatan.map(k => (
                    <option key={k.id} value={k.id}>{k.nama_kegiatan}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2 uppercase tracking-wide">Sub Kegiatan</label>
                <select
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A2A80] outline-none transition ${!selectedKegiatanId ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'bg-gray-50 focus:bg-white'}`}
                  value={selectedSubId}
                  onChange={(e) => setSelectedSubId(e.target.value)}
                  disabled={!selectedKegiatanId}
                >
                  <option value="">-- Pilih Sub Kegiatan --</option>
                  {listSubKegiatan.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.nama_sub_kegiatan}
                      {sub.tanggal_mulai ? ` (${new Date(sub.tanggal_mulai).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-auto pt-10 flex justify-end">
              <button 
                onClick={handleNextStep} 
                disabled={!selectedSubId}
                className="px-8 py-3 bg-[#1A2A80] text-white rounded-xl font-bold hover:bg-blue-900 transition shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Lanjut <FaArrowRight />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="p-8 animate-fade-in-up flex-1 flex flex-col">

            {/* HEADER STEP 2 */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-gray-100 pb-6">
              <div className='text-sm text-gray-600'>
                Penugasan untuk: <span className="font-bold text-[#1A2A80] text-lg block">{allSubKegiatan.find(s => String(s.id) === String(selectedSubId))?.nama_sub_kegiatan}</span>
                {selectedSubId && (
                    <span className="text-xs text-gray-500 flex items-center gap-1 mt-1 font-medium bg-gray-50 w-fit px-2 py-1 rounded border border-gray-200">
                        <FaCalendarDay /> Periode: {new Date(allSubKegiatan.find(s => String(s.id) === String(selectedSubId))?.tanggal_mulai).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                    </span>
                )}
              </div>
              <button onClick={() => setStep(1)} className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition border border-blue-100">
                 <FaArrowLeft className="inline mr-1"/> Ganti Kegiatan
              </button>
            </div>

            {/* INFO KUOTA JABATAN */}
            <div className="mb-8 p-6 bg-gray-50 border border-gray-100 rounded-2xl">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FaChartBar /> Informasi Kuota & Honorarium
              </h3>
              {availableJabatan.length === 0 ? (
                <div className="text-center py-6 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400 italic">
                    Belum ada data jabatan/honorarium untuk sub kegiatan ini.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableJabatan.map(h => {
                    const { used, max } = getVolumeStats(h.kode_jabatan, h.basis_volume);
                    const percent = max > 0 ? (used / max) * 100 : 0;
                    
                    let barColor = 'bg-blue-500';
                    if (percent >= 100) barColor = 'bg-green-500';
                    if (percent > 100) barColor = 'bg-red-500';

                    return (
                      <div key={h.id_honorarium} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-blue-200 transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-sm text-gray-800">{h.nama_jabatan}</p>
                            <span className="text-[10px] text-gray-500 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 group-hover:border-blue-100 transition">{h.kode_jabatan}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-extrabold text-[#1A2A80]">{formatRupiah(h.tarif)}</p>
                            <p className="text-[10px] text-gray-400">per {h.nama_satuan}</p>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-2">
                          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[10px] font-medium text-gray-500">
                          <span>Terisi: <strong className={percent > 100 ? 'text-red-600' : 'text-gray-700'}>{used}</strong></span>
                          <span>Max: <strong>{max}</strong></span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* SPLIT VIEW: SEARCH & LIST */}
            <div className="flex flex-col lg:flex-row gap-8 h-full">

              {/* KIRI: PENCARIAN */}
              <div className="lg:w-1/3">
                <div className="bg-white border border-gray-200 rounded-2xl p-5 h-full shadow-sm flex flex-col">
                    <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase flex items-center gap-2">
                        <FaSearch className="text-[#1A2A80]"/> Tambah Mitra
                    </h3>
                    
                    {targetYear && (
                    <div className="mb-4">
                        <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-[10px] px-3 py-1.5 rounded-lg border border-blue-100 font-bold">
                            <FaFilter size={10} /> Menampilkan Mitra Aktif Th. {targetYear}
                        </span>
                    </div>
                    )}
                    
                    <div className="relative">
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-[#1A2A80] outline-none transition text-sm text-gray-800 placeholder-gray-400"
                            placeholder="Cari nama atau NIK..."
                            value={mitraSearch}
                            onChange={(e) => { setMitraSearch(e.target.value); setShowMitraDropdown(true); }}
                            onFocus={() => setShowMitraDropdown(true)}
                        />
                        <FaSearch className="absolute left-3.5 top-3.5 text-gray-400" />
                        
                        {showMitraDropdown && mitraSearch && (
                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-xl mt-2 max-h-80 overflow-y-auto custom-scrollbar">
                            {filteredMitra.length === 0 ? (
                                <div className="p-4 text-xs text-gray-500 text-center italic">
                                    Tidak ditemukan / Tidak aktif di tahun {targetYear}.
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
                                        onClick={() => !isFull && handleAddMitra(m)}
                                        className={`px-4 py-3 border-b border-gray-50 last:border-none transition cursor-pointer ${isFull ? 'bg-gray-50 opacity-60 cursor-not-allowed' : 'hover:bg-blue-50'}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">{m.nama_lengkap}</p>
                                                <p className="text-xs text-gray-500 font-mono">{m.nik}</p>
                                            </div>
                                            {isFull ? (
                                                <span className="text-[9px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">PENUH</span>
                                            ) : (
                                                <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100"><FaCheckCircle /></span>
                                            )}
                                        </div>

                                        {limit > 0 && (
                                            <div className="mt-2 pt-2 border-t border-gray-50">
                                                <div className="flex justify-between text-[9px] mb-1 text-gray-400 font-bold uppercase">
                                                    <span>Honor Akumulasi</span>
                                                    <span>{Math.round(percent)}%</span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                    <div className={`h-1.5 rounded-full ${percent > 90 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                                                </div>
                                                <div className="flex justify-between mt-1 text-[9px] text-gray-400">
                                                    <span>{formatRupiah(currentIncome)}</span>
                                                    <span>Limit: {formatRupiah(limit)}</span>
                                                </div>
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

              {/* KANAN: DAFTAR SELEKSI */}
              <div className="lg:w-2/3"> 
                <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 flex flex-col h-full shadow-inner">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2">
                            <FaUsers className="text-[#1A2A80]" /> Daftar Anggota Terpilih ({selectedMitras.length})
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[500px] space-y-3 pr-1 custom-scrollbar">
                    {selectedMitras.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                            <FaUsers className="mx-auto text-4xl text-gray-200 mb-3" />
                            <p className="text-sm text-gray-500 italic font-medium">Belum ada mitra yang ditambahkan.</p>
                            <p className="text-xs text-gray-400">Gunakan kolom pencarian di kiri untuk menambahkan.</p>
                        </div>
                    ) : (
                        selectedMitras.map((mitra, idx) => {
                        const honorInfo = availableJabatan.find(h => h.kode_jabatan === mitra.assignedJabatan);
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
                            <div key={mitra.id} className={`bg-white p-5 rounded-2xl border shadow-sm relative group transition-all ${isOverLimit ? 'border-red-200 ring-1 ring-red-50' : 'border-gray-200 hover:border-blue-200'}`}>

                                <div className="flex justify-between items-start gap-4 mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-[#1A2A80] text-white flex items-center justify-center text-xs font-bold shadow-sm">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{mitra.nama_lengkap}</p>
                                            <p className="text-xs text-gray-500 font-mono flex items-center gap-1">
                                                <FaIdCard className="text-gray-300" /> {mitra.nik}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveMitra(mitra.id)} 
                                        className="text-gray-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition" 
                                        title="Hapus"
                                    >
                                        <FaTimes />
                                    </button>
                                </div>

                                <div className="grid grid-cols-12 gap-3 items-end bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                    <div className="col-span-5">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Jabatan</label>
                                        <select
                                            className={`w-full text-xs border rounded-lg px-3 py-2 outline-none transition bg-white ${isOverLimit ? 'border-red-500 text-red-700 bg-red-50' : 'border-gray-300 focus:ring-1 focus:ring-[#1A2A80]'}`}
                                            value={mitra.assignedJabatan}
                                            onChange={(e) => handleUpdateMitraData(mitra.id, 'assignedJabatan', e.target.value)}
                                        >
                                            <option value="">-- Pilih --</option>
                                            {availableJabatan.map(h => (
                                                <option key={h.kode_jabatan} value={h.kode_jabatan}>{h.nama_jabatan}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-span-3">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Volume</label>
                                        <div className="flex items-center">
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-full text-xs border border-gray-300 rounded-l-lg px-2 py-2 outline-none text-center font-bold text-gray-700 focus:ring-1 focus:ring-[#1A2A80]"
                                                value={mitra.assignedVolume}
                                                onChange={(e) => handleUpdateMitraData(mitra.id, 'assignedVolume', parseInt(e.target.value) || 0)}
                                            />
                                            <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-2 rounded-r-lg border border-l-0 border-gray-300 font-bold truncate">
                                                {honorInfo ? (honorInfo.satuan_alias || honorInfo.nama_satuan) : <FaBoxOpen />}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="col-span-4 text-right">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Estimasi</label>
                                        <div className={`text-sm font-extrabold flex items-center justify-end gap-1 ${isOverLimit ? 'text-red-600' : 'text-[#1A2A80]'}`}>
                                            {formatRupiah(totalHonorBaru)}
                                        </div>
                                        {honorInfo && <span className="text-[9px] text-gray-400">(@ {formatRupiah(tarif)})</span>}
                                    </div>
                                </div>

                                {limit > 0 && (
                                    <div className={`mt-4 pt-3 border-t border-gray-100 ${isOverLimit ? 'bg-red-50/30 -mx-5 px-5 -mb-5 pb-5 rounded-b-2xl border-t-red-100' : ''}`}>
                                        <div className="flex justify-between text-[10px] text-gray-500 mb-1.5 uppercase font-bold tracking-wide">
                                            <span>Limit Honor (Tahun Ini)</span>
                                            <span>{formatRupiah(totalProjected)} / {formatRupiah(limit)}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden flex shadow-inner">
                                            <div
                                                className={`h-full transition-all duration-300 ${percentCurrent > 90 ? 'bg-yellow-400' : 'bg-emerald-400'}`}
                                                style={{ width: `${Math.min(percentCurrent, 100)}%` }}
                                                title={`Pendapatan Sebelumnya: ${formatRupiah(currentIncome)}`}
                                            ></div>
                                            <div
                                                className={`h-full transition-all duration-300 ${isOverLimit ? 'bg-red-500' : 'bg-blue-500'}`}
                                                style={{ width: `${Math.min(percentNew, 100 - Math.min(percentCurrent, 100))}%` }}
                                                title={`Tambahan Honor: ${formatRupiah(totalHonorBaru)}`}
                                            ></div>
                                        </div>
                                        {isOverLimit ? (
                                            <div className="mt-2 text-[10px] text-red-600 font-bold flex items-center gap-1 animate-pulse">
                                                <FaExclamationCircle /> Akumulasi pendapatan melebihi batas tahunan!
                                            </div>
                                        ) : (
                                            <div className="mt-2 text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                                <FaCheckCircle /> Masih Aman
                                            </div>
                                        )}
                                    </div>
                                )}

                            </div>
                        );
                        })
                    )}
                    </div>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-8 flex justify-between border-t border-gray-100">
              <button onClick={() => setStep(1)} className="px-6 py-3 border border-gray-300 text-gray-600 rounded-xl font-bold hover:bg-gray-50 flex items-center gap-2 transition">
                <FaArrowLeft /> Kembali
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={submitting || selectedMitras.length === 0} 
                className="px-8 py-3 bg-[#1A2A80] text-white rounded-xl font-bold hover:bg-blue-900 shadow-lg hover:shadow-xl transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Menyimpan...' : <><FaCheck /> Simpan Penugasan</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TambahPenugasan;