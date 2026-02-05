import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTrash, FaPlus, FaCoins, FaTag } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'https://makinasik.web.bps.go.id';

const PartAddHonor = ({ honorList, onChange }) => {
  const [jabatanOptions, setJabatanOptions] = useState([]);
  const [satuanOptions, setSatuanOptions] = useState([]);

  // Fetch Data Master (Jabatan & Satuan)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        const [resJab, resSat] = await Promise.all([
          axios.get(`${API_URL}/api/jabatan`, config),
          axios.get(`${API_URL}/api/satuan-kegiatan`, config)
        ]);
        
        setJabatanOptions(resJab.data.data);
        setSatuanOptions(resSat.data.data);
      } catch (err) {
        console.error("Gagal load master data honor", err);
      }
    };
    fetchData();
  }, []);

  const addRow = () => {
    const newHonor = {
      id: Date.now(),
      kode_jabatan: '',
      tarif: 0,
      id_satuan: satuanOptions.length > 0 ? satuanOptions[0].id : 1,
      basis_volume: 1,
      beban_anggaran: '' // Field Baru
    };
    onChange([...honorList, newHonor]);
  };

  // PERBAIKAN: Gunakan index untuk menghapus agar lebih akurat jika ID duplikat/missing
  const removeRow = (index) => {
    const newList = [...honorList];
    newList.splice(index, 1);
    onChange(newList);
  };

  // PERBAIKAN: Gunakan index untuk update agar hanya baris target yang berubah
  const updateRow = (index, field, value) => {
    const newList = [...honorList];
    newList[index] = { ...newList[index], [field]: value };
    onChange(newList);
  };

  return (
    <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
          <FaCoins className="text-yellow-600" /> Aturan Honorarium & Anggaran
        </h4>
        <button 
          type="button" 
          onClick={addRow}
          className="text-[#1A2A80] hover:text-blue-700 text-xs font-bold flex items-center gap-1 border border-blue-100 bg-white px-3 py-1 rounded shadow-sm hover:shadow transition"
        >
          <FaPlus size={10} /> Tambah Jabatan
        </button>
      </div>

      {honorList.length === 0 ? (
        <div className="text-center py-4 text-xs text-gray-400 italic border border-dashed border-gray-300 rounded bg-white">
          Belum ada tarif honor diatur untuk sub kegiatan ini.
        </div>
      ) : (
        <div className="space-y-4">
          {honorList.map((honor, index) => (
            // Gunakan fallback index pada key untuk mencegah masalah rendering jika honor.id duplikat
            <div key={honor.id || index} className="bg-white p-4 rounded border border-gray-200 shadow-sm relative group hover:border-blue-300 transition">
              
              {/* BARIS 1: Jabatan, Tarif, Volume */}
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                {/* Jabatan */}
                <div className="w-full md:w-1/3">
                  <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Jabatan</label>
                  <select
                    value={honor.kode_jabatan}
                    onChange={(e) => updateRow(index, 'kode_jabatan', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-[#1A2A80] focus:border-[#1A2A80] outline-none bg-gray-50 focus:bg-white"
                  >
                    <option value="">-- Pilih Jabatan --</option>
                    {jabatanOptions.map(j => (
                      <option key={j.kode_jabatan} value={j.kode_jabatan}>{j.nama_jabatan}</option>
                    ))}
                  </select>
                </div>

                {/* Tarif */}
                <div className="w-full md:w-1/3">
                  <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Tarif (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={honor.tarif}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateRow(index, 'tarif', val === '' ? '' : parseFloat(val));
                    }}
                    onBlur={() => {
                      if (honor.tarif === '' || honor.tarif === null) updateRow(index, 'tarif', 0);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-[#1A2A80] focus:border-[#1A2A80] outline-none font-bold text-gray-700"
                  />
                </div>

                {/* Volume & Satuan */}
                <div className="w-full md:w-1/3 flex gap-2">
                  <div className="flex-1">
                     <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Per Vol</label>
                     <input
                      type="number"
                      min="1"
                      value={honor.basis_volume}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                          const val = e.target.value;
                          updateRow(index, 'basis_volume', val === '' ? '' : parseInt(val));
                      }}
                      onBlur={() => { if (!honor.basis_volume) updateRow(index, 'basis_volume', 1); }}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-xs text-center outline-none focus:border-[#1A2A80]"
                    />
                  </div>
                  <div className="flex-[2]">
                     <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Satuan</label>
                     <select
                      value={honor.id_satuan}
                      onChange={(e) => updateRow(index, 'id_satuan', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-xs outline-none focus:border-[#1A2A80]"
                    >
                      {satuanOptions.map(s => (
                        <option key={s.id} value={s.id}>{s.nama_satuan} ({s.alias})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* BARIS 2: Beban Anggaran & Tombol Hapus */}
              <div className="flex items-end gap-3">
                  <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase flex items-center gap-1">
                        <FaTag size={10} /> Kode Beban Anggaran
                      </label>
                      <input 
                        type="text"
                        placeholder="Contoh: 2903.BMA.009.005.521213"
                        value={honor.beban_anggaran || ''}
                        onChange={(e) => updateRow(index, 'beban_anggaran', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-xs font-mono text-gray-600 focus:ring-1 focus:ring-[#1A2A80] focus:border-[#1A2A80] outline-none"
                      />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => removeRow(index)}
                    className="text-gray-400 hover:text-red-500 p-2 transition bg-gray-50 hover:bg-red-50 rounded border border-gray-200"
                    title="Hapus baris honor ini"
                  >
                    <FaTrash size={14} />
                  </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PartAddHonor;