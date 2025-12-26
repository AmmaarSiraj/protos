<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    /**
     * 1. REGISTER (Pendaftaran User Baru)
     */
    public function register(Request $request)
    {
        // Validasi Input
        $validator = Validator::make($request->all(), [
            'username' => 'required|string|max:255',
            // PENTING: unique:user (nama tabel di database Anda 'user')
            'email'    => 'required|string|email|max:255|unique:user,email', 
            'password' => 'required|string|min:8',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Buat User Baru
            $user = User::create([
                'username' => $request->username,
                'email'    => $request->email,
                'password' => Hash::make($request->password), // Enkripsi password
                'role'     => 'user' // Default role, bisa diubah sesuai kebutuhan
            ]);

            // Buat Token (agar user langsung login setelah daftar)
            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'status' => 'success',
                'message' => 'Registrasi berhasil.',
                'data' => $user,
                'access_token' => $token,
                'token_type' => 'Bearer'
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal mendaftarkan user: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * 2. LOGIN (Masuk ke Sistem)
     */
    public function login(Request $request)
    {
        // 1. Ambil input identifier (bisa dari field 'email' atau 'username')
        // Ini menjaga kompatibilitas jika frontend masih mengirim field bernama 'email'
        $identifier = $request->input('email') ?? $request->input('username');

        // 2. Validasi Manual
        if (!$identifier) {
            return response()->json([
                'status' => 'error',
                'errors' => ['email' => ['Email atau Username wajib diisi.']]
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // 3. Cari User berdasarkan Email ATAU Username
        $user = User::where('email', $identifier)
                    ->orWhere('username', $identifier)
                    ->first();

        // 4. Cek apakah user ada & password cocok
        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Username, Email, atau Password salah.'
            ], 401);
        }

        // Hapus token lama (opsional, agar 1 user 1 token)
        // $user->tokens()->delete();

        // 5. Buat Token Baru
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Login berhasil.',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role
            ]
        ]);
    }

    /**
     * 3. LOGOUT (Keluar dari Sistem)
     */
    public function logout(Request $request)
    {
        // Menghapus token yang sedang digunakan saat ini
        if ($request->user()) {
            $request->user()->currentAccessToken()->delete();
            
            return response()->json([
                'status' => 'success',
                'message' => 'Berhasil logout.'
            ]);
        }

        return response()->json([
            'status' => 'error',
            'message' => 'User tidak terautentikasi.'
        ], 401);
    }

    /**
     * 4. CEK USER (Mendapatkan Data User yang Sedang Login)
     */
    public function me(Request $request)
    {
        return response()->json([
            'status' => 'success',
            'user' => $request->user()
        ]);
    }
}