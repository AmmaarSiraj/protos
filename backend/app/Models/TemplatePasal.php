<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TemplatePasal extends Model
{
    use HasFactory;

    protected $table = 'template_pasal';

    protected $fillable = [
        'template_id',
        'nomor_pasal',
        'judul_pasal',
        'isi_pasal',
        'urutan',
    ];

    public function template()
    {
        return $this->belongsTo(MasterTemplateSPK::class, 'template_id');
    }
}