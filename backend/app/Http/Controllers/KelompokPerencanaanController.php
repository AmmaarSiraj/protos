<?php

namespace App\Http\Controllers;

use App\Models\KelompokPerencanaan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class KelompokPerencanaanController extends Controller
{
    /**
     * 1. GET ALL KELOMPOK PERENCANAAN
     * Menyamakan format output menjadi flat agar mudah dikonsumsi Frontend.
     */
    public function index()
    {
        $data = KelompokPerencanaan::with([
            'mitra', 
            'perencanaan.subkegiatan.kegiatan', 
            'perencanaan.pengawas',
            'jabatan' // Sesuaikan dengan nama relasi di model (biasanya 'jabatan' atau 'jabatanMitra')
        ])->latest()->get();

        $formatted = $data->map(function($item) {
            return [
                'id_kelompok'       => $item->id,
                'id_perencanaan'    => $item->id_perencanaan,
                'id_mitra'          => $item->id_mitra,
                'nama_mitra'        => $item->mitra ? $item->mitra->nama_lengkap : 'Mitra Terhapus',
                'nama_lengkap'      => $item->mitra ? $item->mitra->nama_lengkap : 'Mitra Terhapus',
                'nik_mitra'         => $item->mitra ? $item->mitra->nik : '-',
                'kode_jabatan'      => $item->kode_jabatan,
                'nama_jabatan'      => $item->jabatan ? $item->jabatan->nama_jabatan : ($item->kode_jabatan ?? '-'),
                'volume_tugas'      => $item->volume_tugas,
                'nama_sub_kegiatan' => $item->perencanaan && $item->perencanaan->subkegiatan ? $item->perencanaan->subkegiatan->nama_sub_kegiatan : '-',
                'nama_kegiatan'     => $item->perencanaan && $item->perencanaan->subkegiatan && $item->perencanaan->subkegiatan->kegiatan 
                                        ? $item->perencanaan->subkegiatan->kegiatan->nama_kegiatan 
                                        : '-',
                'nama_pengawas'     => $item->perencanaan && $item->perencanaan->pengawas ? $item->perencanaan->pengawas->username : '-',
            ];
        });

        return response()->json(['status' => 'success', 'data' => $formatted]);
    }

    /**
     * 2. STORE KELOMPOK PERENCANAAN
     * Menyamakan validasi dan response error.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id_perencanaan' => 'required|exists:perencanaan,id',
            'id_mitra'       => 'required|exists:mitra,id',
            'kode_jabatan'   => 'required|exists:jabatan_mitra,kode_jabatan',
            'volume_tugas'   => 'required|integer|min:1', // Menyamakan min:1 seperti penugasan
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $exists = KelompokPerencanaan::where('id_perencanaan', $request->id_perencanaan)
                                     ->where('id_mitra', $request->id_mitra)
                                     ->first();

        if ($exists) {
            return response()->json([
                'status' => 'error', 
                'message' => 'Mitra ini sudah ada dalam tim perencanaan tersebut.'
            ], 400);
        }

        try {
            $kp = KelompokPerencanaan::create([
                'id_perencanaan' => $request->id_perencanaan,
                'id_mitra'       => $request->id_mitra,
                'kode_jabatan'   => $request->kode_jabatan,
                'volume_tugas'   => $request->volume_tugas
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Mitra berhasil ditambahkan ke perencanaan',
                'data' => $kp
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error', 
                'message' => 'Gagal menyimpan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * 3. UPDATE KELOMPOK PERENCANAAN
     */
    public function update(Request $request, $id)
    {
        $kp = KelompokPerencanaan::find($id);
        if (!$kp) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        $validator = Validator::make($request->all(), [
            'kode_jabatan' => 'sometimes|exists:jabatan_mitra,kode_jabatan',
            'volume_tugas' => 'sometimes|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $kp->update($request->only(['kode_jabatan', 'volume_tugas']));

        return response()->json([
            'status' => 'success', 
            'message' => 'Data berhasil diperbarui',
            'data' => $kp
        ]);
    }

    /**
     * 4. DESTROY KELOMPOK PERENCANAAN
     */
    public function destroy($id)
    {
        $kp = KelompokPerencanaan::find($id);
        if (!$kp) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        $kp->delete();

        return response()->json([
            'status' => 'success', 
            'message' => 'Mitra berhasil dihapus dari perencanaan.'
        ]);
    }

    /**
     * 5. GET BY PERENCANAAN ID
     * Tambahan jika diperlukan untuk memfilter anggota per kegiatan tertentu.
     */
    public function getByPerencanaan($idPerencanaan)
    {
        $data = KelompokPerencanaan::where('id_perencanaan', $idPerencanaan)
                                   ->with(['mitra', 'jabatan'])
                                   ->get();

        return response()->json(['status' => 'success', 'data' => $data]);
    }
}