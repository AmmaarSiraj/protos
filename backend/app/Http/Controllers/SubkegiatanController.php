<?php

namespace App\Http\Controllers;

use App\Models\Subkegiatan;
use App\Models\Kegiatan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SubkegiatanController extends Controller
{

    public function index()
    {
        // Mengambil semua subkegiatan
        $subkegiatan = Subkegiatan::latest()->get();

        return response()->json([
            'status' => 'success',
            'data' => $subkegiatan
        ]);
    }

    public function getByKegiatan($id_kegiatan)
    {
        $subs = Subkegiatan::where('id_kegiatan', $id_kegiatan)->get();
        return response()->json($subs); // Return array langsung agar sesuai dengan frontend
    }
    /**
     * Tambah Sub Kegiatan Baru
     */
    public function store(Request $request)
    {
        // Validasi input
        $validator = Validator::make($request->all(), [
            'id_kegiatan'       => 'required|exists:kegiatan,id', // Pastikan ID induk ada
            'nama_sub_kegiatan' => 'required|string|max:255',
            'deskripsi'         => 'nullable|string',
            'tanggal_mulai'     => 'nullable|date',
            'tanggal_selesai'   => 'nullable|date|after_or_equal:tanggal_mulai',
            'status'            => 'nullable|string|in:pending,progress,done',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Create data. ID 'subX' akan otomatis dibuat oleh Trigger MySQL
        $sub = Subkegiatan::create([
            'id_kegiatan'       => $request->id_kegiatan,
            'nama_sub_kegiatan' => $request->nama_sub_kegiatan,
            'deskripsi'         => $request->deskripsi,
            'tanggal_mulai'     => $request->tanggal_mulai,
            'tanggal_selesai'   => $request->tanggal_selesai,
            'status'            => $request->status ?? 'pending',
        ]);

        // Opsional: Kita refresh model untuk mengambil ID yang baru saja dibuat trigger
        // Note: Terkadang Eloquent butuh query ulang untuk dpt ID dari trigger
        $sub = Subkegiatan::where('created_at', $sub->created_at)
            ->where('nama_sub_kegiatan', $sub->nama_sub_kegiatan)
            ->orderBy('created_at', 'desc')
            ->first();

        return response()->json([
            'status' => 'success',
            'message' => 'Sub Kegiatan berhasil ditambahkan',
            'data' => $sub
        ], 201);
    }

    public function show($id)
    {
        $sub = Subkegiatan::where('id', $id)->first();

        if (!$sub) {
            return response()->json([
                'status' => 'error',
                'message' => 'Sub Kegiatan dengan ID ' . $id . ' tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $sub
        ]);
    }

    /**
     * Update Sub Kegiatan (Berdasarkan ID String, misal: sub12)
     */
    public function update(Request $request, $id)
    {
        $sub = Subkegiatan::find($id);

        if (!$sub) {
            return response()->json(['message' => 'Sub Kegiatan tidak ditemukan'], 404);
        }

        $validator = Validator::make($request->all(), [
            'nama_sub_kegiatan' => 'required|string|max:255',
            'deskripsi'         => 'nullable|string',
            'tanggal_mulai'     => 'nullable|date',
            'tanggal_selesai'   => 'nullable|date|after_or_equal:tanggal_mulai',
            'status'            => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $sub->update($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Sub Kegiatan berhasil diupdate',
            'data' => $sub
        ]);
    }

    /**
     * Hapus Sub Kegiatan
     */
    public function destroy($id)
    {
        $sub = Subkegiatan::find($id);

        if (!$sub) {
            return response()->json(['message' => 'Sub Kegiatan tidak ditemukan'], 404);
        }

        $sub->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Sub Kegiatan berhasil dihapus'
        ]);
    }
}
