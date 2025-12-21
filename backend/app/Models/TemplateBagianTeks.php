<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TemplateBagianTeks extends Model
{
    use HasFactory;

    protected $table = 'template_bagian_teks';

    protected $fillable = [
        'template_id',
        'jenis_bagian',
        'isi_teks',
    ];

    public function template()
    {
        return $this->belongsTo(MasterTemplateSPK::class, 'template_id');
    }
}