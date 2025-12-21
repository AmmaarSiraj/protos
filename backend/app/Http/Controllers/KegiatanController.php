<?php

namespace App\Http\Controllers;

use App\Models\Kegiatan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class KegiatanController extends Controller
{
    /**
     * Tampilkan semua kegiatan beserta subkegiatannya
     */
    public function index()
    {
        // Mengambil kegiatan diurutkan terbaru, dan sertakan data subkegiatan (eager loading)
        $kegiatan = Kegiatan::with('subkegiatan')->latest()->get();

        return response()->json([
            'status' => 'success',
            'data' => $kegiatan
        ]);
    }

    /**
     * Simpan kegiatan baru
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nama_kegiatan' => 'required|string|max:255',
            'deskripsi'     => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $kegiatan = Kegiatan::create([
            'nama_kegiatan' => $request->nama_kegiatan,
            'deskripsi'     => $request->deskripsi,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Kegiatan berhasil dibuat',
            'data' => $kegiatan
        ], 201);
    }

    /**
     * Tampilkan detail 1 kegiatan spesifik
     */
    public function show($id)
    {
        $kegiatan = Kegiatan::with('subkegiatan')->find($id);

        if (!$kegiatan) {
            return response()->json(['message' => 'Kegiatan tidak ditemukan'], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $kegiatan
        ]);
    }

    /**
     * Update kegiatan
     */
    public function update(Request $request, $id)
    {
        $kegiatan = Kegiatan::find($id);

        if (!$kegiatan) {
            return response()->json(['message' => 'Kegiatan tidak ditemukan'], 404);
        }

        $validator = Validator::make($request->all(), [
            'nama_kegiatan' => 'required|string|max:255',
            'deskripsi'     => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $kegiatan->update($request->only(['nama_kegiatan', 'deskripsi']));

        return response()->json([
            'status' => 'success',
            'message' => 'Kegiatan berhasil diperbarui',
            'data' => $kegiatan
        ]);
    }

    /**
     * Hapus kegiatan (Subkegiatan akan otomatis terhapus karena CASCADE di database)
     */
    public function destroy($id)
    {
        $kegiatan = Kegiatan::find($id);

        if (!$kegiatan) {
            return response()->json(['message' => 'Kegiatan tidak ditemukan'], 404);
        }

        $kegiatan->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Kegiatan berhasil dihapus'
        ]);
    }
}