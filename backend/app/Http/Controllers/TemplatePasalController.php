<?php

namespace App\Http\Controllers;

use App\Models\TemplatePasal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TemplatePasalController extends Controller
{
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'template_id' => 'required|exists:master_template_spk,id',
            'nomor_pasal' => 'required|integer',
            'judul_pasal' => 'nullable|string|max:255',
            'isi_pasal'   => 'nullable|string',
            'urutan'      => 'nullable|integer',
        ]);

        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);

        $pasal = TemplatePasal::create($request->all());

        return response()->json(['status' => 'success', 'data' => $pasal], 201);
    }

    public function update(Request $request, $id)
    {
        $pasal = TemplatePasal::find($id);
        if (!$pasal) return response()->json(['message' => 'Pasal tidak ditemukan'], 404);

        $pasal->update($request->only(['nomor_pasal', 'judul_pasal', 'isi_pasal', 'urutan']));

        return response()->json(['status' => 'success', 'data' => $pasal]);
    }

    public function destroy($id)
    {
        $pasal = TemplatePasal::find($id);
        if (!$pasal) return response()->json(['message' => 'Pasal tidak ditemukan'], 404);

        $pasal->delete();
        return response()->json(['status' => 'success', 'message' => 'Pasal dihapus']);
    }
}