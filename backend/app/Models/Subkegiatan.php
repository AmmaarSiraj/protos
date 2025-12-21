<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subkegiatan extends Model
{
    use HasFactory;

    protected $table = 'subkegiatan';

    // PENTING: Beri tahu Laravel bahwa primary key bukan integer auto-increment
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        // 'id', // ID tidak perlu di-fillable karena otomatis dibuat oleh Trigger database
        'id_kegiatan',
        'nama_sub_kegiatan',
        'deskripsi',
        'tanggal_mulai',
        'tanggal_selesai',
        'status',
    ];

    protected $casts = [
        'tanggal_mulai' => 'date',
        'tanggal_selesai' => 'date',
    ];

    public function kegiatan()
    {
        return $this->belongsTo(Kegiatan::class, 'id_kegiatan', 'id');
    }
}