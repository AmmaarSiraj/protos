<?php

namespace App\Http\Controllers;

use App\Models\MasterTemplateSPK;
use App\Models\TemplateBagianTeks;
use App\Models\TemplatePasal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class MasterTemplateSPKController extends Controller
{
    // List semua template
    public function index()
    {
        $data = MasterTemplateSPK::orderBy('created_at', 'desc')->get();
        return response()->json(['status' => 'success', 'data' => $data]);
    }

    // Buat Template Baru (Hanya Header)
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nama_template' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $template = MasterTemplateSPK::create([
            'nama_template' => $request->nama_template,
            'is_active' => false // Default non-aktif dulu
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Template berhasil dibuat',
            'data' => $template
        ], 201);
    }

    // Detail Template Lengkap dengan Bagian Teks & Pasal
    public function show($id)
    {
        $template = MasterTemplateSPK::with(['bagianTeks', 'pasal'])->find($id);

        if (!$template) {
            return response()->json(['message' => 'Template tidak ditemukan'], 404);
        }

        return response()->json(['status' => 'success', 'data' => $template]);
    }

    // Set Template Aktif (Hanya 1 yang boleh aktif)
    public function setActive($id)
    {
        $template = MasterTemplateSPK::find($id);
        if (!$template) return response()->json(['message' => 'Template tidak ditemukan'], 404);

        // Gunakan Transaction agar atomik
        DB::transaction(function () use ($template) {
            // Non-aktifkan semua template lain
            MasterTemplateSPK::where('id', '!=', $template->id)->update(['is_active' => false]);
            
            // Aktifkan template ini
            $template->update(['is_active' => true]);
        });

        return response()->json(['status' => 'success', 'message' => 'Template berhasil diaktifkan']);
    }

    public function update(Request $request, $id)
    {
        $template = MasterTemplateSPK::find($id);

        if (!$template) {
            return response()->json(['message' => 'Template tidak ditemukan'], 404);
        }

        // Gunakan Transaction untuk memastikan semua data tersimpan atau tidak sama sekali
        DB::transaction(function () use ($template, $request) {
            
            // 1. Update Nama Template (Header)
            if ($request->has('nama_template')) {
                $template->update([
                    'nama_template' => $request->nama_template
                ]);
            }

            // 2. Update Bagian Teks (Parts)
            // Frontend mengirim object: { "pembuka": "...", "penutup": "..." }
            if ($request->has('parts') && is_array($request->parts)) {
                foreach ($request->parts as $jenis => $isi) {
                    // Update jika ada, Create jika belum ada
                    TemplateBagianTeks::updateOrCreate(
                        [
                            'template_id' => $template->id,
                            'jenis_bagian' => $jenis
                        ],
                        [
                            'isi_teks' => $isi
                        ]
                    );
                }
            }

            // 3. Update Pasal-Pasal (Articles)
            // Frontend mengirim array: [ {nomor_pasal: 1, ...}, ... ]
            if ($request->has('articles') && is_array($request->articles)) {
                
                // Strategi: Hapus semua pasal lama, lalu insert ulang yang baru.
                // Ini menangani kasus pasal dihapus, diedit, atau diurutkan ulang dengan mudah.
                $template->pasal()->delete();

                foreach ($request->articles as $index => $art) {
                    TemplatePasal::create([
                        'template_id' => $template->id,
                        'nomor_pasal' => $art['nomor_pasal'],
                        'judul_pasal' => $art['judul_pasal'] ?? '',
                        'isi_pasal'   => $art['isi_pasal'] ?? '',
                        'urutan'      => $index + 1 // Urutan otomatis berdasarkan array
                    ]);
                }
            }
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Template berhasil diperbarui',
            'data' => $template->load(['bagianTeks', 'pasal']) // Return data terbaru
        ]);
    }

    // Hapus Template (Cascade delete anak-anaknya)
    public function destroy($id)
    {
        $template = MasterTemplateSPK::find($id);
        if (!$template) return response()->json(['message' => 'Template tidak ditemukan'], 404);

        $template->delete();
        return response()->json(['status' => 'success', 'message' => 'Template berhasil dihapus']);
    }
}