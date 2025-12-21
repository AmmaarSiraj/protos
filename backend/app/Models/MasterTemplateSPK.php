<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MasterTemplateSPK extends Model
{
    use HasFactory;

    protected $table = 'master_template_spk';

    protected $fillable = [
        'nama_template',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // Relasi ke Bagian Teks
    public function bagianTeks()
    {
        return $this->hasMany(TemplateBagianTeks::class, 'template_id', 'id');
    }

    // Relasi ke Pasal-Pasal
    public function pasal()
    {
        return $this->hasMany(TemplatePasal::class, 'template_id', 'id')->orderBy('urutan', 'asc');
    }
}