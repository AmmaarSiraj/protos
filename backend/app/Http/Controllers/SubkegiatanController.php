<?php

namespace App\Http\Controllers;

use App\Models\Subkegiatan;
use App\Models\Kegiatan;
use App\Models\Honorarium;
use App\Models\JabatanMitra;
use App\Models\SatuanKegiatan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Shared\Date;
use Carbon\Carbon;

class SubkegiatanController extends Controller
{
    public function index()
    {
        $subkegiatan = Subkegiatan::latest()->get();

        return response()->json([
            'status' => 'success',
            'data' => $subkegiatan
        ]);
    }

    public function getByKegiatan($id_kegiatan)
    {
        $subs = Subkegiatan::where('id_kegiatan', $id_kegiatan)->get();
        return response()->json($subs);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id_kegiatan'       => 'required|exists:kegiatan,id',
            'nama_sub_kegiatan' => 'required|string|max:255',
            'deskripsi'         => 'nullable|string',
            'tanggal_mulai'     => 'nullable|date',
            'tanggal_selesai'   => 'nullable|date|after_or_equal:tanggal_mulai',
            'status'            => 'nullable|string|in:pending,progress,done',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $sub = Subkegiatan::create([
            'id_kegiatan'       => $request->id_kegiatan,
            'nama_sub_kegiatan' => $request->nama_sub_kegiatan,
            'deskripsi'         => $request->deskripsi,
            'tanggal_mulai'     => $request->tanggal_mulai,
            'tanggal_selesai'   => $request->tanggal_selesai,
            'status'            => $request->status ?? 'pending',
        ]);

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
                'message' => 'Sub Kegiatan tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $sub
        ]);
    }

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

   public function downloadTemplate()
    {
        $filePath = storage_path('app/template_import_kegiatan.xlsx');

        if (!file_exists($filePath)) {
            return response()->json([
                'status' => 'error',
                'message' => 'File template belum tersedia di server.'
            ], 404);
        }

        return response()->download($filePath, 'template_import_kegiatan.xlsx');
    }

    public function import(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:xlsx,xls,csv,txt|max:10240',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $file = $request->file('file');
        $successCount = 0;
        $errors = [];

        DB::beginTransaction();

        try {
            $inputFileType = IOFactory::identify($file->getPathname());
            $reader = IOFactory::createReader($inputFileType);

            if ($reader instanceof \PhpOffice\PhpSpreadsheet\Reader\Csv) {
                $reader->setDelimiter(',');
            }

            $reader->setReadDataOnly(true);
            $spreadsheet = $reader->load($file->getPathname());
            $sheet = $spreadsheet->getActiveSheet();
            $rows = $sheet->toArray();

            if (empty($rows)) throw new \Exception("File kosong.");

            $headerIndex = -1;
            $headerRow = [];
            foreach ($rows as $index => $row) {
                $rowString = strtolower(implode(' ', array_map(function($val){ return trim((string)$val); }, $row)));
                
                if (str_contains($rowString, 'nama_kegiatan') || str_contains($rowString, 'survei/sensus') || (str_contains($rowString, 'kegiatan') && str_contains($rowString, 'sub'))) {
                    $headerIndex = $index;
                    $headerRow = array_map(function ($h) { return trim(strtolower((string)$h)); }, $row);
                    break;
                }
                if ($index > 5) break; 
            }

            if ($headerIndex === -1) throw new \Exception("Header tidak ditemukan!");

            $colMap = [
                'kegiatan'       => $this->findHeaderIndex($headerRow, ['nama_kegiatan', 'survei/sensus']),
                'subkegiatan'    => $this->findHeaderIndex($headerRow, ['nama_sub_kegiatan', 'subkegiatan', 'kegiatan']),
                'deskripsi'      => $this->findHeaderIndex($headerRow, ['deskripsi', 'keterangan']),
                'tgl_mulai'      => $this->findHeaderIndex($headerRow, ['tanggal_mulai', 'tgl_mulai', 'tanggal mulai']),
                'tgl_selesai'    => $this->findHeaderIndex($headerRow, ['tanggal_selesai', 'tgl_selesai', 'tanggal selesai']),
                'jabatan'        => $this->findHeaderIndex($headerRow, ['jabatan', 'nama_jabatan', 'role']),
                'tarif'          => $this->findHeaderIndex($headerRow, ['tarif', 'honor', 'harga']),
                'satuan'         => $this->findHeaderIndex($headerRow, ['satuan', 'satuan_kegiatan']),
                'basis_volume'   => $this->findHeaderIndex($headerRow, ['basis_volume', 'volume']),
                'beban_anggaran' => $this->findHeaderIndex($headerRow, ['beban_anggaran', 'kode_anggaran', 'beban anggaran']),
            ];

            for ($i = $headerIndex + 1; $i < count($rows); $i++) {
                $row = $rows[$i];
                $rowNumber = $i + 1;

                $namaKegiatan = $this->getValue($row, $colMap['kegiatan']);
                $namaSub      = $this->getValue($row, $colMap['subkegiatan']);

                if (empty($namaKegiatan) || empty($namaSub)) continue;

                try {
                    $kegiatan = Kegiatan::firstOrCreate(
                        ['nama_kegiatan' => $namaKegiatan],
                        ['deskripsi' => 'Imported via Excel']
                    );

                    $existingSub = Subkegiatan::where('id_kegiatan', $kegiatan->id)
                        ->where('nama_sub_kegiatan', $namaSub)
                        ->first();

                    $subId = null;

                    if ($existingSub) {
                        $subId = $existingSub->id;
                        $existingSub->update([
                             'deskripsi' => $this->getValue($row, $colMap['deskripsi']),
                             'tanggal_mulai' => $this->formatDate($this->getValue($row, $colMap['tgl_mulai'])),
                             'tanggal_selesai' => $this->formatDate($this->getValue($row, $colMap['tgl_selesai'])),
                        ]);
                    } else {
                        Subkegiatan::create([
                            'id_kegiatan'       => $kegiatan->id,
                            'nama_sub_kegiatan' => $namaSub,
                            'deskripsi'         => $this->getValue($row, $colMap['deskripsi']),
                            'tanggal_mulai'     => $this->formatDate($this->getValue($row, $colMap['tgl_mulai'])),
                            'tanggal_selesai'   => $this->formatDate($this->getValue($row, $colMap['tgl_selesai'])),
                            'status'            => 'aktif'
                        ]);

                        $newSub = Subkegiatan::where('id_kegiatan', $kegiatan->id)
                                    ->where('nama_sub_kegiatan', $namaSub)
                                    ->orderBy('created_at', 'desc')
                                    ->first();
                        
                        if ($newSub) {
                            $subId = $newSub->id;
                        } else {
                            throw new \Exception("Gagal mengambil ID Subkegiatan (Trigger DB Error).");
                        }
                    }

                    $rawJabatan = $this->getValue($row, $colMap['jabatan']);
                    
                    if (!empty($rawJabatan) && $subId) {
                        $jabatan = null;
                        $cleanJabatan = strtolower(trim($rawJabatan));

                        $jabatan = JabatanMitra::whereRaw('LOWER(nama_jabatan) = ?', [$cleanJabatan])
                                    ->orWhereRaw('LOWER(kode_jabatan) = ?', [$cleanJabatan])
                                    ->first();

                        if (!$jabatan && preg_match('/^(.*?)\s*\((.*?)\)$/', $rawJabatan, $matches)) {
                            $potNama = trim($matches[1]);
                            $potKode = trim($matches[2]);
                            $jabatan = JabatanMitra::whereRaw('LOWER(nama_jabatan) = ?', [strtolower($potNama)])
                                        ->orWhereRaw('LOWER(kode_jabatan) = ?', [strtolower($potKode)])
                                        ->first();
                        }

                        if (!$jabatan) {
                            $errors[] = "Baris $rowNumber: Jabatan '$rawJabatan' tidak ditemukan.";
                        } else {
                            $namaSatuan = $this->getValue($row, $colMap['satuan']);
                            $satuan = null;
                            if ($namaSatuan) {
                                $satuan = SatuanKegiatan::whereRaw('LOWER(nama_satuan) = ?', [strtolower(trim($namaSatuan))])->first();
                            }

                            Honorarium::updateOrCreate(
                                [
                                    'id_subkegiatan' => $subId,
                                    'kode_jabatan'   => $jabatan->kode_jabatan,
                                ],
                                [
                                    'tarif'          => preg_replace('/[^0-9]/', '', $this->getValue($row, $colMap['tarif'])) ?: 0,
                                    'id_satuan'      => $satuan ? $satuan->id : null,
                                    'basis_volume'   => $this->getValue($row, $colMap['basis_volume']) ?: 1,
                                    'beban_anggaran' => $this->getValue($row, $colMap['beban_anggaran']),
                                ]
                            );
                        }
                    }
                    $successCount++;
                } catch (\Exception $e) {
                    $errors[] = "Baris $rowNumber: " . $e->getMessage();
                }
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'successCount' => $successCount, 
                'failCount' => count($errors),   
                'errors' => $errors,
                'message' => "Import selesai."
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
    

    private function formatDate($date) {
        if (empty($date)) return null;
        try {
            if (is_numeric($date)) {
                return Date::excelToDateTimeObject($date)->format('Y-m-d');
            }
            return Carbon::parse($date)->format('Y-m-d');
        } catch (\Exception $e) {
            return null;
        }
    }
    
    private function findHeaderIndex($header, $searchTerms)
    {
        foreach ($searchTerms as $term) {
            $index = array_search($term, $header);
            if ($index !== false) return $index;
        }
        return null;
    }
    
    private function getValue($row, $index)
    {
        return ($index !== null && isset($row[$index])) ? trim($row[$index]) : null;
    }
}