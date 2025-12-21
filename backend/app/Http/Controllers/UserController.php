<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Facades\Excel;

class UserController extends Controller
{
    /**
     * 1. GET ALL USERS (READ)
     */
    public function index()
    {
        // Mengambil semua user, urut dari yang terbaru
        $users = User::orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $users
        ]);
    }

    /**
     * 2. SHOW SINGLE USER (DETAIL)
     */
    public function show($id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'User tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $user
        ]);
    }

    /**
     * 3. CREATE NEW USER (TAMBAH)
     */
    public function store(Request $request)
    {
        // Validasi Input
        $validator = Validator::make($request->all(), [
            'username' => 'required|string|max:50|unique:user,username', // Cek unik di tabel 'user'
            'email'    => 'required|email|max:100|unique:user,email',
            'password' => 'required|string|min:6',
            'role'     => 'required|in:admin,user,superadmin,mitra', // Sesuaikan role yang ada
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        // Simpan ke Database
        // Note: Password otomatis di-hash karena di Model User ada 'casts' => ['password' => 'hashed']
        $user = User::create([
            'username' => $request->username,
            'email'    => $request->email,
            'password' => $request->password,
            'role'     => $request->role,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'User berhasil ditambahkan',
            'data' => $user
        ], 201);
    }

    /**
     * 4. UPDATE USER (EDIT)
     */
    public function update(Request $request, $id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'User tidak ditemukan'], 404);
        }

        // Validasi Input (Ignore unique untuk ID user ini sendiri)
        $validator = Validator::make($request->all(), [
            'username' => 'required|string|max:50|unique:user,username,' . $id,
            'email'    => 'required|email|max:100|unique:user,email,' . $id,
            'role'     => 'required|in:admin,user,superadmin,mitra',
            'password' => 'nullable|string|min:6' // Password opsional saat edit
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        // Siapkan data update
        $dataToUpdate = [
            'username' => $request->username,
            'email'    => $request->email,
            'role'     => $request->role,
        ];

        // Hanya update password jika diisi oleh user
        if ($request->filled('password')) {
            $dataToUpdate['password'] = $request->password;
            // Model akan otomatis hash password ini karena cast 'hashed'
        }

        $user->update($dataToUpdate);

        return response()->json([
            'status' => 'success',
            'message' => 'Data user berhasil diperbarui',
            'data' => $user
        ]);
    }

    /**
     * 5. DELETE USER (HAPUS)
     */
    public function destroy($id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'User tidak ditemukan'], 404);
        }

        $user->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'User berhasil dihapus'
        ]);
    }

    /**
     * PROFILE SAYA (Me)
     */
    public function me(Request $request)
    {
        return response()->json([
            'status' => 'success',
            'data' => $request->user()
        ]);
    }

    public function import(Request $request)
    {
        // 1. Validasi File (Support csv, xlsx, xls)
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:2048'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'File tidak valid. Harap upload CSV atau Excel.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // 2. Membaca File menggunakan Library Excel
            // toArray akan mengembalikan array 3 dimensi: [Sheet1 => [Baris1, Baris2...]]
            $array = Excel::toArray([], $request->file('file'));

            // Kita ambil Sheet pertama saja
            $data = $array[0] ?? [];

            // Cek jika data kosong
            if (count($data) < 2) { // Minimal ada header dan 1 data
                return response()->json(['status' => 'error', 'message' => 'File kosong atau format salah.'], 400);
            }

            // Hapus baris header (index 0)
            // Asumsi baris pertama adalah: username, email, password, role
            unset($data[0]);

            $successCount = 0;
            $failCount = 0;
            $errors = [];

            foreach ($data as $index => $row) {
                // Skip baris kosong
                if (!isset($row[0]) || !isset($row[1])) continue;

                // Ambil data berdasarkan index kolom (0=username, 1=email, dst)
                $username = trim($row[0] ?? '');
                $email    = trim($row[1] ?? '');
                $password = trim($row[2] ?? '');
                $role     = trim($row[3] ?? '');

                if ($username === '' || $email === '') continue;

                // Validasi Duplikasi
                $exists = User::where('username', $username)->orWhere('email', $email)->exists();

                if ($exists) {
                    $failCount++;
                    // $index + 1 karena array mulai dari 0, di Excel baris mulai dari 1
                    // (Header sudah di-unset, tapi key index tetap asli dari array awal)
                    $errors[] = "Baris " . ($index + 1) . ": Username '$username' atau Email sudah ada.";
                    continue;
                }

                try {
                    User::create([
                        'username' => $username,
                        'email'    => $email,
                        'password' => $password ?: 'password123', // Default jika kosong
                        'role'     => in_array(strtolower($role), ['admin', 'superadmin']) ? strtolower($role) : 'user',
                    ]);
                    $successCount++;
                } catch (\Exception $e) {
                    $failCount++;
                    $errors[] = "Baris " . ($index + 1) . ": Error database (" . $e->getMessage() . ")";
                }
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Proses import selesai',
                'successCount' => $successCount,
                'failCount' => $failCount,
                'errors' => $errors
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal membaca file: ' . $e->getMessage()
            ], 500);
        }
    }

    public function downloadTemplate()
    {
        // Pastikan nama file sesuai dengan yang Anda taruh di storage/app/
        $filePath = storage_path('app/import_users.xlsx');

        if (!file_exists($filePath)) {
            return response()->json([
                'status' => 'error',
                'message' => 'File template belum tersedia di server.'
            ], 404);
        }

        return response()->download($filePath, 'import_users.xlsx');
    }
}
