<?php

namespace App\Http\Controllers;

use App\Models\SpkSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SpkSettingController extends Controller
{
    /**
     * Tampilkan semua setting (Urutkan periode terbaru)
     */
    public function index(Request $request)
    {
        $query = SpkSetting::query();

        // Filter by periode jika diminta
        if ($request->has('periode')) {
            $query->where('periode', $request->periode);
        }

        $data = $query->orderBy('periode', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $data
        ]);
    }

    /**
     * Simpan Setting SPK Baru
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'periode'            => 'required|string|max:7', // Jangan duplicate di periode yg sama
            'nomor_surat_format' => 'nullable|string|max:100',
            'tanggal_surat'      => 'nullable|date',
            'nama_ppk'           => 'nullable|string|max:100',
            'nip_ppk'            => 'nullable|string|max:50',
            'jabatan_ppk'        => 'nullable|string|max:100',
            'komponen_honor'     => 'nullable|string',
            // Pastikan template_id divalidasi dan diizinkan masuk
            'template_id'        => 'nullable|exists:master_template_spk,id', 
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Cek apakah setting untuk periode ini sudah ada?
        $exists = SpkSetting::where('periode', $request->periode)->exists();
        if ($exists) {
            return response()->json([
                'message' => 'Pengaturan SPK untuk periode ini sudah ada. Silakan edit data yang sudah ada.'
            ], 409);
        }

        $setting = SpkSetting::create($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Setting SPK berhasil dibuat',
            'data' => $setting
        ], 201);
    }

    /**
     * Tampilkan Detail Setting
     */
    public function show($id)
    {
        $setting = SpkSetting::find($id);

        if (!$setting) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        return response()->json(['status' => 'success', 'data' => $setting]);
    }

    /**
     * Update Setting
     */
    public function update(Request $request, $id)
    {
        $setting = SpkSetting::find($id);

        if (!$setting) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        $validator = Validator::make($request->all(), [
            'periode'            => 'sometimes|string|max:7',
            'nomor_surat_format' => 'nullable|string|max:100',
            'tanggal_surat'      => 'nullable|date',
            'nama_ppk'           => 'nullable|string|max:100',
            'nip_ppk'            => 'nullable|string|max:50',
            'jabatan_ppk'        => 'nullable|string|max:100',
            'komponen_honor'     => 'nullable|string',
            // Validasi template_id juga saat update
            'template_id'        => 'nullable|exists:master_template_spk,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Jika periode diubah, pastikan tidak bentrok dengan yang lain
        if ($request->has('periode') && $request->periode !== $setting->periode) {
            $exists = SpkSetting::where('periode', $request->periode)->exists();
            if ($exists) {
                return response()->json(['message' => 'Periode tersebut sudah digunakan di setting lain'], 409);
            }
        }

        $setting->update($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Setting SPK berhasil diperbarui',
            'data' => $setting
        ]);
    }

    /**
     * Hapus Setting
     */
    public function destroy($id)
    {
        $setting = SpkSetting::find($id);

        if (!$setting) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        $setting->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Setting SPK berhasil dihapus'
        ]);
    }

    /**
     * Helper: Ambil Setting berdasarkan String Periode (contoh: 2025-12)
     * Route: GET /api/spk-setting/periode/{periode}
     */
    public function getByPeriode($periode)
    {
        $setting = SpkSetting::where('periode', $periode)->first();

        if (!$setting) {
            return response()->json(['message' => 'Setting untuk periode ini belum diatur'], 404);
        }

        return response()->json(['status' => 'success', 'data' => $setting]);
    }
}