<?php

namespace App\Http\Controllers;

use App\Models\TahunAktif;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TahunAktifController extends Controller
{
    /**
     * Tampilkan semua data tahun aktif (bisa difilter per user atau tahun)
     */
    public function index(Request $request)
    {
        // PERBAIKAN: Gunakan 'mitra' sesuai nama fungsi di Model TahunAktif
        $query = TahunAktif::with('mitra');

        // Filter User ID
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter Tahun
        if ($request->has('tahun')) {
            $query->where('tahun', $request->tahun);
        }

        $data = $query->latest()->get();

        return response()->json([
            'status' => 'success',
            'data' => $data
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:mitra,id', // Pastikan validasi ke tabel mitra
            'tahun'   => 'required|digits:4',
            'status'  => 'nullable|in:aktif,non-aktif',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $exists = TahunAktif::where('user_id', $request->user_id)
                            ->where('tahun', $request->tahun)
                            ->exists();

        if ($exists) {
            return response()->json(['message' => 'Tahun ini sudah terdaftar untuk mitra tersebut'], 409);
        }

        $tahunAktif = TahunAktif::create([
            'user_id' => $request->user_id,
            'tahun'   => $request->tahun,
            'status'  => $request->status ?? 'aktif',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Tahun aktif berhasil ditambahkan',
            'data' => $tahunAktif
        ], 201);
    }

    public function show($id)
    {
        $tahunAktif = TahunAktif::with('mitra')->find($id);
        if (!$tahunAktif) return response()->json(['message' => 'Data tidak ditemukan'], 404);
        return response()->json(['status' => 'success', 'data' => $tahunAktif]);
    }

    public function update(Request $request, $id)
    {
        $tahunAktif = TahunAktif::find($id);
        if (!$tahunAktif) return response()->json(['message' => 'Data tidak ditemukan'], 404);

        $validator = Validator::make($request->all(), [
            'tahun'   => 'sometimes|digits:4',
            'status'  => 'sometimes|in:aktif,non-aktif',
        ]);

        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);

        $tahunAktif->update($request->only(['tahun', 'status']));

        return response()->json([
            'status' => 'success',
            'message' => 'Data berhasil diperbarui',
            'data' => $tahunAktif
        ]);
    }

    public function destroy($id)
    {
        $tahunAktif = TahunAktif::find($id);
        if (!$tahunAktif) return response()->json(['message' => 'Data tidak ditemukan'], 404);
        $tahunAktif->delete();
        return response()->json(['status' => 'success', 'message' => 'Data berhasil dihapus']);
    }
}