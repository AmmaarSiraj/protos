// src/pages/admin/EditPerencanaan.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  FaArrowLeft, FaCheck, FaIdCard, FaSearch, FaTimes, 
  FaUsers, FaMoneyBillWave, FaExclamationCircle, 
  FaChartBar, FaBoxOpen, FaFilter
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id/';

const normalizeKodeJabatan = (kode) => {
    return String(kode)
        .replace(/[^\w-]/g, '')
        .replace(/\s/g, '')
        .toUpperCase();
};

const safeExtractData = (res, endpointName) => {
    if (res.data && res.data.data) {
        if (Array.isArray(res.data.data)) {
            return res.data.data;
        }
    }
    
    if (res.data && Array.isArray(res.data)) {
        return res.data;
    }
    
    return [];
};

const EditPerencanaan = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [perencanaanInfo, setPerencanaanInfo] = useState(null);
  const [subKegiatanInfo, setSubKegiatanInfo] = useState(null);

  const [listKegiatan, setListKegiatan] = useState([]);
  const [allSubKegiatan, setAllSubKegiatan] = useState([]);
  const [listMitra, setListMitra] = useState([]);
  const [listHonorarium, setListHonorarium] = useState([]); 
  const [listAturan, setListAturan] = useState([]);
  const [listKelompok, setListKelompok] = useState([]); // Kelompok Perencanaan
  const [listPerencanaan, setListPerencanaan] = useState([]);

  const [selectedSubId, setSelectedSubId] = useState('');

  const [currentMembers, setCurrentMembers] = useState([]); 
  const [selectedMitras, setSelectedMitras] = useState([]);

  const [mitraSearch, setMitraSearch] = useState('');
  const [showMitraDropdown, setShowMitraDropdown] = useState(false);

  const [batasHonorPeriode, setBatasHonorPeriode] = useState(0);
  const [mitraIncomeMap, setMitraIncomeMap] = useState({});
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const resPerencanaanExist = await axios.get(`${API_URL}/api/perencanaan/${id}`, { headers });
        const perencanaanData = resPerencanaanExist.data.data;
        
        const idSub = perencanaanData.id_subkegiatan;

        const [resKeg, resMitra, resHonor, resAturan, resKelompok, resAllPerencanaan, resAllSub, resAnggota] = await Promise.all([
          axios.get(`${API_URL}/api/kegiatan`, { headers }),
          axios.get(`${API_URL}/api/mitra`, { headers }),
          axios.get(`${API_URL}/api/honorarium`, { headers }), 
          axios.get(`${API_URL}/api/aturan-periode`, { headers }),
          axios.get(`${API_URL}/api/kelompok-perencanaan`, { headers }),
          axios.get(`${API_URL}/api/perencanaan`, { headers }),
          axios.get(`${API_URL}/api/subkegiatan`, { headers }),
          axios.get(`${API_URL}/api/perencanaan/${id}/anggota`, { headers }),
        ]);
        
        const subKegiatanList = safeExtractData(resAllSub, 'Semua Sub Kegiatan');
        const honorList = safeExtractData(resHonor, 'Honorarium');
        const anggotaList = safeExtractData(resAnggota, 'Perencanaan Anggota');

        setListKegiatan(resKeg.data.data);
        setListMitra(resMitra.data.data);
        setAllSubKegiatan(subKegiatanList);
        setListAturan(resAturan.data.data);
        setListKelompok(resKelompok.data.data);
        setListPerencanaan(resAllPerencanaan.data.data);
        
        const subKegiatanData = subKegiatanList.find(s => String(s.id) === String(idSub));
        setPerencanaanInfo(perencanaanData);
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
            
            // 1. Tentukan Tahun (untuk Cari Limit)
            const tahunKegiatan = tgl.getFullYear().toString();
            
            // 2. Tentukan Bulan YYYY-MM (untuk Cari Pendapatan)
            const bulanKegiatan = `${tgl.getFullYear()}-${String(tgl.getMonth() + 1).padStart(2, '0')}`;

            // 3. Ambil Limit dari Aturan Periode (Tahun)
            const aturan = resAturan.data.data.find(r => 
              String(r.tahun) === tahunKegiatan || String(r.periode) === tahunKegiatan
            );
            setBatasHonorPeriode(aturan ? Number(aturan.batas_honor) : 0);

            // 4. Hitung Pendapatan Mitra (Hanya Perencanaan Lain di Bulan yang Sama)
            const incomeMap = {};
            const allKelompokData = resKelompok.data.data; // Kelompok Perencanaan

            allKelompokData.forEach(k => {
                // SKIP Perencanaan ini (karena sedang diedit nilainya)
                if (String(k.id_perencanaan) === String(id)) return;

                // Cari parent Perencanaan -> SubKegiatan untuk cek tanggal
                const parentPerencanaan = resAllPerencanaan.data.data.find(p => p.id_perencanaan === k.id_perencanaan);
                if (!parentPerencanaan) return;

                const sub = subKegiatanList.find(s => s.id === parentPerencanaan.id_subkegiatan);
                if (!sub || !sub.tanggal_mulai) return;

                // Cek apakah BULANNYA sama
                const subDate = new Date(sub.tanggal_mulai);
                const subMonth = `${subDate.getFullYear()}-${String(subDate.getMonth() + 1).padStart(2, '0')}`;
                
                if (subMonth !== bulanKegiatan) return; // Skip jika beda bulan

                // Jika bulan sama, hitung honornya
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
        console.error("Error saat memuat data:", err.response?.data || err.message, err);
        Swal.fire('Error', 'Gagal memuat data perencanaan.', 'error');
        navigate('/admin/perencanaan');
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
    
    const relatedPerencanaanIds = listPerencanaan
        .filter(p => String(p.id_subkegiatan) === String(selectedSubId) && String(p.id_perencanaan) !== String(id))
        .map(p => p.id_perencanaan);

    const usedInOtherDB = listKelompok
        .filter(k => relatedPerencanaanIds.includes(k.id_perencanaan) && normalizeKodeJabatan(k.kode_jabatan) === normalizedKodeJabatan)
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

    // CATATAN: Validasi limit honor dihapus (Non-Blocking) sesuai permintaan
    // Tombol tetap bisa diklik walau merah

    setSubmitting(true);
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
        const selectedIds = new Set(selectedMitras.map(m => m.id));
        const toDelete = currentMembers.filter(m => !selectedIds.has(m.id));
        
        if (toDelete.length > 0) {
            await Promise.all(toDelete.map(m => 
                axios.delete(`${API_URL}/api/kelompok-perencanaan/${m.id_kelompok}`, { headers })
            ));
        }

        const promises = selectedMitras.map(m => {
            const payloadJabatan = normalizeKodeJabatan(m.assignedJabatan);

            if (m.isExisting) {
                return axios.put(`${API_URL}/api/kelompok-perencanaan/${m.id_kelompok}`, {
                    kode_jabatan: payloadJabatan,
                    volume_tugas: m.assignedVolume
                }, { headers });
            } else {
                return axios.post(`${API_URL}/api/kelompok-perencanaan`, {
                    id_perencanaan: id,
                    id_mitra: m.id,
                    kode_jabatan: payloadJabatan,
                    volume_tugas: m.assignedVolume
                }, { headers });
            }
        });

        await Promise.all(promises);

        Swal.fire({
            title: 'Berhasil',
            text: 'Perubahan perencanaan berhasil disimpan.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        }).then(() => navigate('/admin/perencanaan'));

    } catch (err) {
      console.error(err);
      let errorMessage = 'Terjadi kesalahan saat menyimpan.';
      errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || errorMessage;

      Swal.fire('Gagal', errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMitra = listMitra.filter(m => {
    const matchSearch = m.nama_lengkap.toLowerCase().includes(mitraSearch.toLowerCase()) || m.nik.includes(mitraSearch);
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

  if (loading) return <div className="text-center py-20 text-gray-500">Memuat data perencanaan eksisting...</div>;
  
  return (
    <div className="max-w-6xl mx-auto pb-20">

      <div className="mb-8">
        <div className="flex items-center gap-4">
            <Link to="/admin/perencanaan" className="text-gray-500 hover:text-[#1A2A80] transition"><FaArrowLeft size={20}/></Link>
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Edit Perencanaan Tim</h1>
                <p className="text-sm text-gray-500">ID Perencanaan: {id}</p>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 min-h-[400px] p-8 flex flex-col">
        
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
            <div className='text-sm text-gray-600'>
                Edit Anggota untuk Sub Kegiatan: 
                <span className="font-bold text-[#1A2A80] text-lg block">{subKegiatanInfo?.nama_sub_kegiatan}</span>
                <span className="text-xs text-gray-500">
                    {subKegiatanInfo?.tanggal_mulai ? `Periode: ${new Date(subKegiatanInfo.tanggal_mulai).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}` : ''}
                </span>
            </div>
        </div>

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
                        <p className="text-xs text-gray-500 font-mono">{normalizeKodeJabatan(h.kode_jabatan)}</p>
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
                      <span>Total Digunakan (Termasuk Draft): {used}</span>
                      <span>Kuota: {max}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-8 h-full">

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
                      Tidak ditemukan / Sudah dipilih / Tidak aktif di tahun {targetYear}.
                    </div>
                  ) : (
                    filteredMitra.map(m => {
                      const currentIncome = mitraIncomeMap[String(m.id)] || 0;
                      const limit = batasHonorPeriode;
                      // Tampilan saja, tidak block
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

          <div className="md:w-2/3 bg-gray-50 rounded-xl border border-gray-200 p-5 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2">
                <FaUsers /> Daftar Anggota Tim ({selectedMitras.length})
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[500px] space-y-3 pr-1">
              {selectedMitras.length === 0 ? (
                <div className="text-center py-10 text-gray-400 italic border-2 border-dashed border-gray-200 rounded-lg">
                  Belum ada mitra yang ditambahkan.
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
                    <div key={mitra.id} className={`bg-white p-4 rounded-lg border shadow-sm relative group transition ${isOverLimit ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200 hover:border-blue-300'}`}>

                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${mitra.isExisting ? 'bg-blue-600' : 'bg-green-500'}`}>
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">{mitra.nama_lengkap}</p>
                            <p className="text-xs text-gray-500 font-mono flex items-center gap-1">
                              <FaIdCard className="text-gray-300" /> {mitra.nik}
                              {mitra.isExisting ? <span className="ml-2 bg-gray-100 text-gray-500 px-1.5 rounded text-[10px]">Lama</span> : <span className="ml-2 bg-green-100 text-green-700 px-1.5 rounded text-[10px]">Baru</span>}
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
                                ? (honorInfo.satuan_alias || honorInfo.nama_satuan || <FaBoxOpen />)
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

                      {/* --- PROGRESS BAR PENDAPATAN --- */}
                      {limit > 0 && (
                        <div className="mt-3 border-t border-gray-100 pt-2">
                          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                            <span>Total Proyeksi: {formatRupiah(totalProjected)}</span>
                            <span>Batas Bln: {formatRupiah(limit)}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden flex">
                            {/* Bar Hijau (Pendapatan Lain) */}
                            <div
                              className={`h-full ${percentCurrent > 90 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(percentCurrent, 100)}%` }}
                              title={`Pendapatan Lain Bulan Ini: ${formatRupiah(currentIncome)}`}
                            ></div>
                            {/* Bar Biru/Merah (Pendapatan Inputan) */}
                            <div
                              className={`h-full ${isOverLimit ? 'bg-red-500' : 'bg-blue-400'}`}
                              style={{ width: `${Math.min(percentNew, 100 - Math.min(percentCurrent, 100))}%` }}
                              title={`Tambahan Honor Ini: ${formatRupiah(totalHonorBaru)}`}
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

        <div className="mt-auto pt-8 flex justify-end border-t border-gray-100">
          <button onClick={handleSubmit} disabled={submitting || selectedMitras.length === 0} className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg flex items-center gap-2 disabled:opacity-50">
            {submitting ? 'Menyimpan...' : <><FaCheck /> Simpan Perubahan</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPerencanaan;