<?php

namespace App\Http\Controllers;

use App\Models\TemplateBagianTeks;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TemplateBagianTeksController extends Controller
{
    // Simpan atau Update Bagian Teks
    // Logika: Jika kombinasi template_id & jenis_bagian sudah ada, update. Jika belum, create.
    public function storeOrUpdate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'template_id'  => 'required|exists:master_template_spk,id',
            'jenis_bagian' => 'required|in:pembuka,pihak_pertama,pihak_kedua,kesepakatan,penutup',
            'isi_teks'     => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $bagian = TemplateBagianTeks::updateOrCreate(
            [
                'template_id'  => $request->template_id,
                'jenis_bagian' => $request->jenis_bagian
            ],
            [
                'isi_teks' => $request->isi_teks
            ]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Bagian teks berhasil disimpan',
            'data' => $bagian
        ]);
    }
}