<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KelompokPerencanaan extends Model
{
    use HasFactory;

    protected $table = 'kelompok_perencanaan';
    
    // Matikan timestamps otomatis karena di DB hanya ada created_at
    public $timestamps = false; 
    
    protected $dates = ['created_at']; 

    public static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            $model->created_at = $model->created_at ?? now();
        });
    }

    protected $fillable = [
        'id_perencanaan',
        'id_mitra',
        'kode_jabatan',
        'volume_tugas',
    ];

    public function perencanaan()
    {
        return $this->belongsTo(Perencanaan::class, 'id_perencanaan', 'id');
    }

    public function mitra()
    {
        return $this->belongsTo(Mitra::class, 'id_mitra', 'id');
    }

    public function jabatan()
    {
        return $this->belongsTo(JabatanMitra::class, 'kode_jabatan', 'kode_jabatan');
    }
}