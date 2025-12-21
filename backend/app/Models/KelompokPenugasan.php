<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KelompokPenugasan extends Model
{
    use HasFactory;

    protected $table = 'kelompok_penugasan';
    
    // Matikan updated_at jika di database memang tidak ada kolomnya (sesuai sql file Anda)
    public $timestamps = false; 
    
    // Tapi kita butuh created_at agar terisi otomatis
    protected $dates = ['created_at']; 

    public static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            $model->created_at = $model->created_at ?? now();
        });
    }

    protected $fillable = [
        'id_penugasan',
        'id_mitra',
        'kode_jabatan',
        'volume_tugas',
    ];

    public function penugasan()
    {
        return $this->belongsTo(Penugasan::class, 'id_penugasan', 'id');
    }

    // Pastikan Model Mitra sudah dibuat. Jika Mitra adalah User, ganti ke User::class
    public function mitra()
    {
        // return $this->belongsTo(Mitra::class, 'id_mitra', 'id');
        // SEMENTARA asumsi ke User jika belum ada model Mitra
        return $this->belongsTo(Mitra::class, 'id_mitra', 'id');
    }

    public function jabatan()
    {
        return $this->belongsTo(JabatanMitra::class, 'kode_jabatan', 'kode_jabatan');
    }
}