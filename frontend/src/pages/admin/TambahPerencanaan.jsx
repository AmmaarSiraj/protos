import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom'; // Tambahkan useLocation
import Swal from 'sweetalert2';
import {
  FaArrowRight, FaArrowLeft, FaCheck, FaClipboardList,
  FaIdCard, FaSearch, FaTimes, FaUsers, FaMoneyBillWave,
  FaExclamationCircle, FaChartBar, FaBoxOpen, FaFilter, FaCalendarDay
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id/';

const TambahPerencanaan = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Hook untuk menangkap data import

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
  const [listPerencanaan, setListPerencanaan] = useState([]);

  // Form State
  const [selectedKegiatanId, setSelectedKegiatanId] = useState('');
  const [selectedSubId, setSelectedSubId] = useState('');
  const [selectedMitras, setSelectedMitras] = useState([]);

  const [mitraSearch, setMitraSearch] = useState('');
  const [showMitraDropdown, setShowMitraDropdown] = useState(false);

  // Finance State
  const [batasHonorPeriode, setBatasHonorPeriode] = useState(0);
  const [mitraIncomeMap, setMitraIncomeMap] = useState({});

  // 1. FETCH DATA MASTER
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const [resKeg, resMitra, resHonor, resAturan, resKelompok, resPerencanaan, resAllSub] = await Promise.all([
          axios.get(`${API_URL}/api/kegiatan`, { headers }),
          axios.get(`${API_URL}/api/mitra`, { headers }),
          axios.get(`${API_URL}/api/honorarium`, { headers }),
          axios.get(`${API_URL}/api/aturan-periode`, { headers }),
          axios.get(`${API_URL}/api/kelompok-perencanaan`, { headers }),
          axios.get(`${API_URL}/api/perencanaan`, { headers }),
          axios.get(`${API_URL}/api/subkegiatan`, { headers })
        ]);

        setListKegiatan(resKeg.data.data || resKeg.data);
        setListMitra(resMitra.data.data || resMitra.data);
        setListHonorarium(resHonor.data.data || resHonor.data);
        setListAturan(resAturan.data.data || resAturan.data);
        setListKelompok(resKelompok.data.data || resKelompok.data);
        setListPerencanaan(resPerencanaan.data.data || resPerencanaan.data);
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

  // 2. FILTER SUB KEGIATAN DROPDOWN
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

  // 3. [BARU] LOGIKA MENANGKAP DATA IMPORT
  useEffect(() => {
    if (!loading && location.state) {
        const { preSelectedSubKegiatan, importedMembers } = location.state;

        // A. Auto Select Kegiatan & Sub
        if (preSelectedSubKegiatan) {
            setSelectedKegiatanId(preSelectedSubKegiatan.id_kegiatan);
            setSelectedSubId(preSelectedSubKegiatan.id);
            setStep(2); // Langsung ke step 2
        }

        // B. Auto Fill Mitra
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

  // 4. HITUNG PENDAPATAN & LIMIT (BULANAN)
  useEffect(() => {
    if (!selectedSubId) {
      setBatasHonorPeriode(0);
      setMitraIncomeMap({});
      return;
    }

    const subInfo = allSubKegiatan.find(s => String(s.id) === String(selectedSubId));
    if (!subInfo || !subInfo.tanggal_mulai) return;

    const targetDate = new Date(subInfo.tanggal_mulai);
    const targetYear = targetDate.getFullYear().toString();
    const targetMonth = targetDate.getMonth(); 

    const aturan = listAturan.find(r =>
      String(r.tahun) === String(targetYear) ||
      String(r.periode) === String(targetYear)
    );

    if (aturan) {
      setBatasHonorPeriode(Number(aturan.batas_honor));
    } else {
      setBatasHonorPeriode(0);
    }

    const incomeMap = {};

    listKelompok.forEach(k => {
      const perencanaan = listPerencanaan.find(p => p.id_perencanaan === k.id_perencanaan);
      if (!perencanaan) return;

      const sub = allSubKegiatan.find(s => s.id === perencanaan.id_subkegiatan);
      if (!sub || !sub.tanggal_mulai) return;

      const itemDate = new Date(sub.tanggal_mulai);
      const itemYear = itemDate.getFullYear().toString();
      const itemMonth = itemDate.getMonth();

      if (itemYear !== targetYear || itemMonth !== targetMonth) return;

      const honor = listHonorarium.find(h => h.id_subkegiatan === sub.id && h.kode_jabatan === k.kode_jabatan);
      const tarif = honor ? Number(honor.tarif) : 0;
      const vol = k.volume_tugas ? Number(k.volume_tugas) : 0;

      const mId = String(k.id_mitra);
      const multiplier = vol > 0 ? vol : 1;

      incomeMap[mId] = (incomeMap[mId] || 0) + (tarif * multiplier);
    });

    setMitraIncomeMap(incomeMap);

  }, [selectedSubId, allSubKegiatan, listAturan, listKelompok, listPerencanaan, listHonorarium]);

  // 5. MENGHITUNG TAHUN TARGET
  const targetYear = useMemo(() => {
    if (!selectedSubId) return null;
    const sub = allSubKegiatan.find(s => String(s.id) === String(selectedSubId));
    if (!sub || !sub.tanggal_mulai) return null;
    return new Date(sub.tanggal_mulai).getFullYear().toString();
  }, [selectedSubId, allSubKegiatan]);

  // 6. FILTER MITRA SUDAH BERTUGAS
  const unavailableMitraIds = useMemo(() => {
    if (!selectedSubId) return new Set();

    const relatedPerencanaanIds = listPerencanaan
      .filter(p => String(p.id_subkegiatan) === String(selectedSubId))
      .map(p => p.id_perencanaan);

    const assignedIds = listKelompok
      .filter(k => relatedPerencanaanIds.includes(k.id_perencanaan))
      .map(k => String(k.id_mitra));

    return new Set(assignedIds);
  }, [selectedSubId, listPerencanaan, listKelompok]);

  // 7. DATA JABATAN & PROGRESS VOLUME
  const availableJabatan = useMemo(() => {
    return listHonorarium.filter(h => String(h.id_subkegiatan) === String(selectedSubId));
  }, [listHonorarium, selectedSubId]);

  const getVolumeStats = (kodeJabatan, basisVolume) => {
    const relatedPerencanaanIds = listPerencanaan
      .filter(p => String(p.id_subkegiatan) === String(selectedSubId))
      .map(p => p.id_perencanaan);

    const usedInDB = listKelompok
      .filter(k => relatedPerencanaanIds.includes(k.id_perencanaan) && k.kode_jabatan === kodeJabatan)
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

  const handleNextStep = () => {
    if (!selectedKegiatanId || !selectedSubId) {
      Swal.fire('Perhatian', 'Silakan pilih Kegiatan dan Sub Kegiatan terlebih dahulu.', 'warning');
      return;
    }
    // Cek Duplikasi Perencanaan di SubKegiatan yang sama (jika ingin membatasi 1 planning per sub)
    const exist = listPerencanaan.find(p => String(p.id_subkegiatan) === String(selectedSubId));
    if (exist) {
        Swal.fire({
            title: 'Sudah Ada',
            text: 'Perencanaan untuk sub kegiatan ini sudah dibuat. Anda akan diarahkan ke mode Edit.',
            icon: 'info',
            confirmButtonText: 'Ke Halaman Edit'
        }).then(() => {
            navigate(`/admin/perencanaan/edit/${exist.id_perencanaan}`);
        });
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

    setSubmitting(true);
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    const headers = { Authorization: `Bearer ${token}` };

    const rawIdPengawas = user?.id; // AMBIL OTOMATIS DARI LOGIN
    const idPengawas = parseInt(rawIdPengawas); 

    if (isNaN(idPengawas) || idPengawas < 1) { 
        setSubmitting(false);
        return Swal.fire('Gagal', 'ID Pengawas tidak ditemukan atau tidak valid. Pastikan Anda sudah login.', 'error');
    }

    try {
        const payload = {
          id_subkegiatan: selectedSubId,
          id_pengawas: idPengawas, 
          anggota: selectedMitras.map(m => ({
            id_mitra: m.id,
            kode_jabatan: m.assignedJabatan,
            volume_tugas: m.assignedVolume
          }))
        };
        await axios.post(`${API_URL}/api/perencanaan`, payload, { headers });

        Swal.fire({
          title: 'Berhasil',
          text: 'Perencanaan baru dan tim berhasil disimpan.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        }).then(() => navigate('/admin/perencanaan'));

    } catch (err) {
      console.error(err);
      
      let errorMessage = 'Terjadi kesalahan saat menyimpan.';

      if (err.response?.status === 422) {
          const errors = err.response.data.errors;
          if (Object.keys(errors).length > 0) {
            const firstErrorField = Object.keys(errors)[0];
            const firstErrorMessage = errors[firstErrorField][0];
            errorMessage = `Validasi Gagal pada field <b>${firstErrorField}</b>: ${firstErrorMessage}`;
          } else {
            errorMessage = err.response.data.message || 'Validasi Gagal! Periksa kembali data Anda.';
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
    const matchSearch = m.nama_lengkap.toLowerCase().includes(mitraSearch.toLowerCase()) || m.nik.includes(mitraSearch);
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

  if (loading) return <div className="text-center py-20 text-gray-500">Memuat formulir...</div>;

  return (
    <div className="max-w-6xl mx-auto pb-20">

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Wizard Perencanaan Mitra</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
          <span className={`px-3 py-1 rounded-full ${step === 1 ? 'bg-[#1A2A80] text-white font-bold' : 'bg-gray-200'}`}>1. Pilih Kegiatan</span>
          <span className="text-gray-300">-----</span>
          <span className={`px-3 py-1 rounded-full ${step === 2 ? 'bg-[#1A2A80] text-white font-bold' : 'bg-gray-200'}`}>2. Mitra & Alokasi</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden min-h-[400px] flex flex-col">

        {step === 1 && (
          <div className="p-8 animate-fade-in-up flex-1 flex flex-col">
            <h2 className="text-lg font-bold text-gray-700 mb-6 flex items-center gap-2">
              <FaClipboardList className="text-[#1A2A80]" /> Tentukan Sasaran Kegiatan
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">Pilih Kegiatan Utama</label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none"
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
                <label className="block text-sm font-bold text-gray-600 mb-2">Pilih Sub Kegiatan</label>
                <select
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none ${!selectedKegiatanId ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
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

            <div className="mt-auto pt-8 flex justify-end">
              <button onClick={handleNextStep} className="px-8 py-3 bg-[#1A2A80] text-white rounded-xl font-bold hover:bg-blue-900 transition shadow-lg flex items-center gap-2">
                Lanjut <FaArrowRight />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="p-8 animate-fade-in-up flex-1 flex flex-col">

            <div className="flex justify-between items-center mb-6">
              <div className='text-sm text-gray-600'>
                Perencanaan untuk: <span className="font-bold text-[#1A2A80] text-lg block">{allSubKegiatan.find(s => String(s.id) === String(selectedSubId))?.nama_sub_kegiatan}</span>
                {selectedSubId && (
                    <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <FaCalendarDay /> Periode: {new Date(allSubKegiatan.find(s => String(s.id) === String(selectedSubId))?.tanggal_mulai).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                    </span>
                )}
              </div>
              <button onClick={() => setStep(1)} className="text-xs text-blue-600 underline hover:text-blue-800">Ganti Kegiatan</button>
            </div>

            {/* INFO KUOTA */}
            <div className="mb-8 p-5 bg-gray-50 border border-gray-200 rounded-xl">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FaChartBar /> Informasi Kuota & Honorarium
              </h3>
              {availableJabatan.length === 0 ? (
                <p className="text-sm text-red-500 italic">Belum ada data honorarium (Jabatan) untuk sub kegiatan ini.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableJabatan.map(h => {
                    const { used, max } = getVolumeStats(h.kode_jabatan, h.basis_volume);
                    const percent = max > 0 ? (used / max) * 100 : 0;
                    let color = 'bg-green-500';
                    if (percent > 80) color = 'bg-yellow-500';
                    if (percent >= 100) color = 'bg-red-500';

                    return (
                      <div key={h.id_honorarium} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-sm text-gray-800">{h.nama_jabatan}</p>
                            <p className="text-xs text-gray-500 font-mono">{h.kode_jabatan}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-green-600">{formatRupiah(h.tarif)}</p>
                            <p className="text-[10px] text-gray-400">per {h.nama_satuan}</p>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-1">
                          <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-gray-500">
                          <span>Terpakai: {used}</span>
                          <span>Kuota: {max}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-8 h-full">

              {/* KIRI: PENCARIAN */}
              <div className="md:w-1/3">
                <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase flex items-center gap-2">
                  <FaSearch /> Tambah Mitra
                </h3>
                {targetYear && (
                  <div className="mb-2">
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] px-2 py-1 rounded border border-blue-200 font-bold">
                      <FaFilter size={10} /> Menampilkan Mitra Aktif Tahun {targetYear}
                    </span>
                  </div>
                )}
                <div className="relative">
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A2A80] outline-none"
                    placeholder="Cari nama / NIK..."
                    value={mitraSearch}
                    onChange={(e) => { setMitraSearch(e.target.value); setShowMitraDropdown(true); }}
                    onFocus={() => setShowMitraDropdown(true)}
                  />
                  {showMitraDropdown && mitraSearch && (
                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-80 overflow-y-auto">
                      {filteredMitra.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500">
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
                              onClick={() => handleAddMitra(m)}
                              className={`px-4 py-3 border-b last:border-none transition cursor-pointer hover:bg-blue-50`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-bold text-gray-800">{m.nama_lengkap}</p>
                                  <p className="text-xs text-gray-500">{m.nik}</p>
                                </div>
                                {isFull && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">LIMIT</span>}
                              </div>

                              {limit > 0 && (
                                <div className="mt-2">
                                  <div className="flex justify-between text-[10px] mb-1 text-gray-500">
                                    <span>Rp {currentIncome.toLocaleString('id-ID')}</span>
                                    <span>Limit Bln: Rp {limit.toLocaleString('id-ID')}</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                    <div className={`h-1.5 rounded-full ${percent > 90 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
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

              {/* KANAN: DAFTAR SELEKSI */}
              <div className="md:w-2/3 bg-gray-50 rounded-xl border border-gray-200 p-5 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2">
                    <FaUsers /> Daftar Seleksi ({selectedMitras.length})
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[500px] space-y-3 pr-1">
                  {selectedMitras.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 italic border-2 border-dashed border-gray-200 rounded-lg">
                      Belum ada mitra yang ditambahkan.
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
                        <div key={mitra.id} className={`bg-white p-4 rounded-lg border shadow-sm relative group transition ${isOverLimit ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200 hover:border-blue-300'}`}>

                          <div className="flex justify-between items-start gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#1A2A80] text-white flex items-center justify-center text-xs font-bold">
                                {idx + 1}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-800">{mitra.nama_lengkap}</p>
                                <p className="text-xs text-gray-500 font-mono flex items-center gap-1">
                                  <FaIdCard className="text-gray-300" /> {mitra.nik}
                                </p>
                              </div>
                            </div>
                            <button onClick={() => handleRemoveMitra(mitra.id)} className="text-gray-300 hover:text-red-500 p-1" title="Hapus"><FaTimes /></button>
                          </div>

                          <div className="mt-4 grid grid-cols-12 gap-3 items-end bg-gray-50 p-3 rounded-lg">
                            <div className="col-span-5">
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Jabatan</label>
                              <select
                                className={`w-full text-xs border rounded px-2 py-1.5 outline-none ${isOverLimit ? 'border-red-500 text-red-700 bg-red-50' : 'border-gray-300 focus:ring-[#1A2A80]'}`}
                                value={mitra.assignedJabatan}
                                onChange={(e) => handleUpdateMitraData(mitra.id, 'assignedJabatan', e.target.value)}
                              >
                                <option value="">-- Pilih --</option>
                                {availableJabatan.map(h => (
                                  <option key={h.kode_jabatan} value={h.kode_jabatan}>{h.nama_jabatan || 'Nama Jabatan Tidak Ditemukan'}</option>
                                ))}
                              </select>
                            </div>

                            <div className="col-span-3">
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Jumlah Tugas</label>
                              <div className="flex items-center">
                                <input
                                  type="number"
                                  min="1"
                                  className="w-full text-xs border border-gray-300 rounded-l px-2 py-1.5 outline-none text-center font-bold text-gray-700 focus:ring-1 focus:ring-[#1A2A80]"
                                  value={mitra.assignedVolume}
                                  onChange={(e) => handleUpdateMitraData(mitra.id, 'assignedVolume', parseInt(e.target.value) || 0)}
                                />
                                <span className="bg-gray-200 text-gray-500 text-[10px] px-2 py-1.5 rounded-r border border-l-0 border-gray-300 font-medium">
                                  {honorInfo
                                    ? (honorInfo.satuan_alias || honorInfo.nama_satuan)
                                    : <FaBoxOpen />
                                  }
                                </span>
                              </div>
                            </div>

                            <div className="col-span-4 text-right">
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Total Honor</label>
                              <div className={`text-sm font-bold flex items-center justify-end gap-1 ${isOverLimit ? 'text-red-600' : 'text-green-600'}`}>
                                <FaMoneyBillWave size={12} /> {formatRupiah(totalHonorBaru)}
                              </div>
                              {honorInfo && <span className="text-[10px] text-gray-400">(@ {formatRupiah(tarif)})</span>}
                            </div>
                          </div>

                          {limit > 0 && (
                            <div className="mt-3 border-t border-gray-100 pt-2">
                              <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                <span>Total Proyeksi: {formatRupiah(totalProjected)}</span>
                                <span>Batas Bln: {formatRupiah(limit)}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden flex">
                                <div
                                  className={`h-full ${percentCurrent > 90 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                  style={{ width: `${Math.min(percentCurrent, 100)}%` }}
                                  title="Pendapatan Saat Ini"
                                ></div>
                                <div
                                  className={`h-full ${isOverLimit ? 'bg-red-500' : 'bg-blue-400'}`}
                                  style={{ width: `${Math.min(percentNew, 100 - Math.min(percentCurrent, 100))}%` }}
                                  title="Tambahan Honor Ini"
                                ></div>
                              </div>
                            </div>
                          )}

                          {isOverLimit && (
                            <div className="mt-2 text-[10px] text-red-600 font-bold flex items-center gap-1 animate-pulse justify-end">
                              <FaExclamationCircle /> Melebihi batas bulanan!
                            </div>
                          )}

                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="mt-auto pt-8 flex justify-between border-t border-gray-100">
              <button onClick={() => setStep(1)} className="px-6 py-3 border border-gray-300 text-gray-600 rounded-xl font-bold hover:bg-gray-50 flex items-center gap-2">
                <FaArrowLeft /> Kembali
              </button>
              <button onClick={handleSubmit} disabled={submitting || selectedMitras.length === 0} className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg flex items-center gap-2 disabled:opacity-50">
                {submitting ? 'Menyimpan...' : <><FaCheck /> Simpan Semua</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TambahPerencanaan;