<?php

namespace App\Http\Controllers;

use App\Models\AturanPeriode;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AturanPeriodeController extends Controller
{
    /**
     * Tampilkan semua aturan periode
     */
    public function index()
    {
        // Urutkan periode terbaru di atas
        $data = AturanPeriode::orderBy('periode', 'desc')->get();
        
        return response()->json([
            'status' => 'success',
            'data' => $data
        ]);
    }

    /**
     * Simpan aturan baru
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'periode'     => 'required|string|max:7|unique:aturan_periode,periode',
            'batas_honor' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $aturan = AturanPeriode::create([
            'periode'     => $request->periode,
            'batas_honor' => $request->batas_honor
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Aturan periode berhasil dibuat',
            'data' => $aturan
        ], 201);
    }

    /**
     * Detail satu aturan
     */
    public function show($id)
    {
        $aturan = AturanPeriode::find($id);

        if (!$aturan) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        return response()->json(['status' => 'success', 'data' => $aturan]);
    }

    /**
     * Update aturan
     */
    public function update(Request $request, $id)
    {
        $aturan = AturanPeriode::find($id);

        if (!$aturan) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        $validator = Validator::make($request->all(), [
            // Unique tapi abaikan ID diri sendiri agar bisa update field lain
            'periode'     => 'required|string|max:7|unique:aturan_periode,periode,'.$id,
            'batas_honor' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $aturan->update($request->only(['periode', 'batas_honor']));

        return response()->json([
            'status' => 'success',
            'message' => 'Aturan periode berhasil diperbarui',
            'data' => $aturan
        ]);
    }

    /**
     * Hapus aturan
     */
    public function destroy($id)
    {
        $aturan = AturanPeriode::find($id);

        if (!$aturan) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        $aturan->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Aturan periode berhasil dihapus'
        ]);
    }
}