<?php

namespace App\Http\Controllers;

use App\Models\SatuanKegiatan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SatuanKegiatanController extends Controller
{
    /**
     * Tampilkan semua daftar satuan
     */
    public function index()
    {
        $data = SatuanKegiatan::orderBy('nama_satuan', 'asc')->get();
        return response()->json(['status' => 'success', 'data' => $data]);
    }

    /**
     * Tambah Satuan Baru
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nama_satuan' => 'required|string|max:50|unique:satuan_kegiatan,nama_satuan',
            'alias'       => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $satuan = SatuanKegiatan::create($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Satuan kegiatan berhasil ditambahkan',
            'data' => $satuan
        ], 201);
    }

    /**
     * Detail Satuan
     */
    public function show($id)
    {
        $satuan = SatuanKegiatan::find($id);

        if (!$satuan) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        return response()->json(['status' => 'success', 'data' => $satuan]);
    }

    /**
     * Update Satuan
     */
    public function update(Request $request, $id)
    {
        $satuan = SatuanKegiatan::find($id);

        if (!$satuan) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        $validator = Validator::make($request->all(), [
            // Unique abaikan ID sendiri saat update
            'nama_satuan' => 'required|string|max:50|unique:satuan_kegiatan,nama_satuan,'.$id,
            'alias'       => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $satuan->update($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Satuan kegiatan berhasil diperbarui',
            'data' => $satuan
        ]);
    }

    /**
     * Hapus Satuan
     */
    public function destroy($id)
    {
        $satuan = SatuanKegiatan::find($id);

        if (!$satuan) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        // Opsional: Cek apakah satuan sedang dipakai di honorarium sebelum hapus
        // Jika dipakai, sebaiknya block delete agar data konsisten.
        // try {
        //     $satuan->delete();
        // } catch (\Exception $e) {
        //     return response()->json(['message' => 'Gagal menghapus. Satuan sedang digunakan.'], 409);
        // }
        
        $satuan->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Satuan kegiatan berhasil dihapus'
        ]);
    }
}