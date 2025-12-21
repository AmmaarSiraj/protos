<?php

namespace App\Http\Controllers;

use App\Models\JabatanMitra;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class JabatanMitraController extends Controller
{
    public function index()
    {
        $jabatan = JabatanMitra::orderBy('nama_jabatan', 'asc')->get();
        return response()->json(['status' => 'success', 'data' => $jabatan]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'kode_jabatan' => 'required|string|unique:jabatan_mitra,kode_jabatan|max:50',
            'nama_jabatan' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $jabatan = JabatanMitra::create([
            'kode_jabatan' => $request->kode_jabatan,
            'nama_jabatan' => $request->nama_jabatan
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Jabatan berhasil ditambahkan',
            'data' => $jabatan
        ], 201);
    }

    public function show($id)
    {
        // $id disini adalah kode_jabatan (misal: 'PPL-01')
        $jabatan = JabatanMitra::find($id);

        if (!$jabatan) {
            return response()->json(['message' => 'Jabatan tidak ditemukan'], 404);
        }

        return response()->json(['status' => 'success', 'data' => $jabatan]);
    }

    public function update(Request $request, $id)
    {
        $jabatan = JabatanMitra::find($id);

        if (!$jabatan) {
            return response()->json(['message' => 'Jabatan tidak ditemukan'], 404);
        }

        $validator = Validator::make($request->all(), [
            'nama_jabatan' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $jabatan->update(['nama_jabatan' => $request->nama_jabatan]);

        return response()->json([
            'status' => 'success',
            'message' => 'Jabatan berhasil diperbarui',
            'data' => $jabatan
        ]);
    }

    public function destroy($id)
    {
        $jabatan = JabatanMitra::find($id);

        if (!$jabatan) {
            return response()->json(['message' => 'Jabatan tidak ditemukan'], 404);
        }

        // Cek apakah jabatan sedang dipakai di honorarium?
        // Jika iya, biasanya akan gagal delete karena Foreign Key restrict (sesuai migrasi kita)
        try {
            $jabatan->delete();
            return response()->json(['status' => 'success', 'message' => 'Jabatan berhasil dihapus']);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Gagal menghapus. Jabatan ini mungkin sedang digunakan di data Honorarium.'
            ], 409); // 409 Conflict
        }
    }
}