<?php

namespace App\Http\Controllers;

use App\Models\KelompokPenugasan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class KelompokPenugasanController extends Controller
{
    public function index()
    {
        $data = KelompokPenugasan::with([
            'mitra', 
            'penugasan.subkegiatan.kegiatan', 
            'penugasan.pengawas',
            'jabatan'
        ])->latest()->get();

        $formatted = $data->map(function($item) {
            return [
                'id_kelompok'       => $item->id,
                'id_penugasan'      => $item->id_penugasan,
                'id_mitra'          => $item->id_mitra,
                'nama_mitra'        => $item->mitra ? $item->mitra->nama_lengkap : 'Mitra Terhapus',
                'nama_lengkap'      => $item->mitra ? $item->mitra->nama_lengkap : 'Mitra Terhapus',
                'nik_mitra'         => $item->mitra ? $item->mitra->nik : '-',
                'kode_jabatan'      => $item->kode_jabatan,
                'nama_jabatan'      => $item->jabatan ? $item->jabatan->nama_jabatan : ($item->kode_jabatan ?? '-'),
                'volume_tugas'      => $item->volume_tugas,
                'nama_sub_kegiatan' => $item->penugasan && $item->penugasan->subkegiatan ? $item->penugasan->subkegiatan->nama_sub_kegiatan : '-',
                'nama_kegiatan'     => $item->penugasan && $item->penugasan->subkegiatan && $item->penugasan->subkegiatan->kegiatan 
                                        ? $item->penugasan->subkegiatan->kegiatan->nama_kegiatan 
                                        : '-',
                'nama_pengawas'     => $item->penugasan && $item->penugasan->pengawas ? $item->penugasan->pengawas->username : '-',
            ];
        });

        return response()->json(['status' => 'success', 'data' => $formatted]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id_penugasan' => 'required|exists:penugasan,id',
            'id_mitra'     => 'required|exists:mitra,id',
            'kode_jabatan' => 'required|exists:jabatan_mitra,kode_jabatan',
            'volume_tugas' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $exists = KelompokPenugasan::where('id_penugasan', $request->id_penugasan)
                                   ->where('id_mitra', $request->id_mitra)
                                   ->first();

        if ($exists) {
            return response()->json([
                'status' => 'error', 
                'message' => 'Mitra ini sudah ada dalam tim penugasan tersebut.'
            ], 400);
        }

        try {
            $kp = KelompokPenugasan::create([
                'id_penugasan' => $request->id_penugasan,
                'id_mitra'     => $request->id_mitra,
                'kode_jabatan' => $request->kode_jabatan,
                'volume_tugas' => $request->volume_tugas
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Mitra berhasil ditambahkan ke penugasan',
                'data' => $kp
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error', 
                'message' => 'Gagal menyimpan: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $kp = KelompokPenugasan::find($id);
        if (!$kp) return response()->json(['message' => 'Data tidak ditemukan'], 404);

        $kp->update($request->only(['kode_jabatan', 'volume_tugas']));

        return response()->json(['status' => 'success', 'message' => 'Data berhasil diperbarui']);
    }

    public function destroy($id)
    {
        $kp = KelompokPenugasan::find($id);
        if (!$kp) return response()->json(['message' => 'Data tidak ditemukan'], 404);

        $kp->delete();

        return response()->json(['status' => 'success', 'message' => 'Mitra berhasil dihapus dari penugasan.']);
    }
}