<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    use HasFactory;

    /**
     * Nama tabel di database.
     */
    protected $table = 'system_settings';

    /**
     * Kolom yang dapat diisi (Mass Assignment).
     * Kita menggunakan 'key' sebagai pengenal unik dan 'value' untuk isinya.
     */
    protected $fillable = [
        'key',
        'value',
    ];

    /**
     * (Opsional) Casts
     * Jika nanti Anda ingin menyimpan data JSON di kolom value, 
     * Anda bisa mengaktifkan baris di bawah ini.
     * Untuk saat ini (hanya path gambar string), ini tidak wajib.
     */
    // protected $casts = [
    //     'value' => 'array', 
    // ];
}