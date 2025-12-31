<?php

namespace App\Http\Controllers;

use App\Models\Honorarium;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class HonorariumController extends Controller
{
   public function index()
    {
        // Ambil data dengan relasi lengkap (Kegiatan -> Sub -> Honor)
        $honor = Honorarium::with(['jabatan', 'subkegiatan.kegiatan', 'satuan'])
                            ->latest()
                            ->get();

        $mappedData = $honor->map(function($item) {
            $sub = $item->subkegiatan;
            $keg = $sub ? $sub->kegiatan : null;
            $jab = $item->jabatan;
            $sat = $item->satuan;

            // --- 1. FORMAT JABATAN: Nama (Kode) ---
            $namaJab = $jab->nama_jabatan ?? 'Jabatan Tidak Dikenal';
            $kodeJab = $item->kode_jabatan ?? '-';
            $item->nama_jabatan = "$namaJab ($kodeJab)";

            // --- 2. FORMAT SATUAN: Nama (Alias) ---
            $namaSat = $sat->nama_satuan ?? 'Satuan Tidak Dikenal';
            $aliasSat = $sat->alias ?? '-';
            $item->nama_satuan = "$namaSat ($aliasSat)";

            // Data Lainnya (Flatten ke root object)
            $item->nama_sub_kegiatan = $sub->nama_sub_kegiatan ?? '-';
            $item->tanggal_mulai     = $sub->tanggal_mulai ?? null;
            $item->tanggal_selesai   = $sub->tanggal_selesai ?? null;
            $item->nama_kegiatan     = $keg->nama_kegiatan ?? '-';
            $item->deskripsi         = $sub->deskripsi ?? '';

            // Bersihkan objek relasi agar respon API lebih ringan
            unset($item->jabatan);
            unset($item->subkegiatan); 
            unset($item->satuan);
            
            return $item;
        });

        return response()->json(['status' => 'success', 'data' => $mappedData]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id_subkegiatan' => 'required|exists:subkegiatan,id',
            'kode_jabatan'   => 'required|exists:jabatan_mitra,kode_jabatan',
            'tarif'          => 'required|numeric|min:0',
            'id_satuan'      => 'required|integer',
            'basis_volume'   => 'required|integer|min:1',
            'beban_anggaran' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $honor = Honorarium::create($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Honorarium berhasil ditambahkan',
            'data' => $honor
        ], 201);
    }

    public function show($id)
    {
        $honor = Honorarium::with(['jabatan', 'subkegiatan'])->find($id);

        if (!$honor) {
            return response()->json(['message' => 'Data Honorarium tidak ditemukan'], 404);
        }

        return response()->json(['status' => 'success', 'data' => $honor]);
    }

    public function update(Request $request, $id)
    {
        $honor = Honorarium::find($id);

        if (!$honor) {
            return response()->json(['message' => 'Data Honorarium tidak ditemukan'], 404);
        }

        $validator = Validator::make($request->all(), [
            'id_subkegiatan' => 'sometimes|exists:subkegiatan,id',
            'kode_jabatan'   => 'sometimes|exists:jabatan_mitra,kode_jabatan',
            'tarif'          => 'sometimes|numeric|min:0',
            'id_satuan'      => 'sometimes|integer',
            'basis_volume'   => 'sometimes|integer|min:1',
            'beban_anggaran' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $honor->update($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Honorarium berhasil diperbarui',
            'data' => $honor
        ]);
    }

    public function destroy($id)
    {
        $honor = Honorarium::find($id);

        if (!$honor) {
            return response()->json(['message' => 'Data Honorarium tidak ditemukan'], 404);
        }

        $honor->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Honorarium berhasil dihapus'
        ]);
    }

    /**
     * Fitur Tambahan: Mengambil semua honor berdasarkan ID Subkegiatan tertentu
     * Route: GET /api/subkegiatan/{id}/honorarium
     */
    public function getBySubkegiatan($idSubkegiatan)
    {
        // 1. Eager load relasi 'jabatan' dan 'satuan'
        $honor = Honorarium::where('id_subkegiatan', $idSubkegiatan)
            ->with(['jabatan', 'satuan']) // Tambahkan relasi 'satuan'
            ->get()
            // 2. Transformasi koleksi untuk meratakan (flatten) data
            ->map(function ($item) {
                // Menambahkan properti yang diperlukan dari relasi ke tingkat atas objek
                $item->nama_jabatan = $item->jabatan->nama_jabatan ?? 'Jabatan Tidak Dikenal';
                $item->nama_satuan = $item->satuan->nama_satuan ?? 'Satuan Tidak Dikenal';

                // *** PERBAIKAN DI SINI ***
                // Jika satuan_alias kosong, gunakan nama_satuan, jika nama_satuan juga kosong, baru gunakan 'N/A'
                $item->satuan_alias = $item->satuan->alias;

                // Hapus properti relasi objek penuh untuk menghemat payload dan mencocokkan format frontend
                unset($item->jabatan);
                unset($item->satuan);

                return $item;
            });

        return response()->json([
            'status' => 'success',
            'data' => $honor
        ]);
    }
}
