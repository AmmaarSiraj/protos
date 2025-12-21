<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens; // Penting untuk API Login

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Menentukan nama tabel secara spesifik karena tidak menggunakan plural 'users'
     */
    protected $table = 'user';

    /**
     * Kolom yang boleh diisi secara massal (Mass Assignment)
     * Sesuai dengan struktur database Anda.
     */
    protected $fillable = [
        'username',
        'email',
        'password',
        'role', // user, admin, superadmin
    ];

    /**
     * Atribut yang harus disembunyikan saat model dikonversi menjadi Array/JSON.
     * Password tidak boleh ikut terkirim ke frontend.
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Konversi tipe data otomatis.
     * 'password' => 'hashed' akan otomatis menghash password saat create/update.
     */
    protected $casts = [
        'password' => 'hashed',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * ----------------------------------------------------------------------
     * Helper Methods (Untuk Manajemen User)
     * ----------------------------------------------------------------------
     */

    /**
     * Cek apakah user adalah Admin
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Cek apakah user adalah Super Admin
     */
    public function isSuperAdmin(): bool
    {
        return $this->role === 'superadmin';
    }

    /**
     * Cek apakah user memiliki role tertentu
     * Contoh penggunaan: $user->hasRole('user')
     */
    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }
}