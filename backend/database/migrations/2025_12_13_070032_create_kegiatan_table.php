<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kegiatan', function (Blueprint $table) {
            $table->id(); // int(11) AUTO_INCREMENT
            $table->string('nama_kegiatan', 255);
            $table->text('deskripsi')->nullable();
            
            // timestamp DEFAULT current_timestamp()
            $table->timestamp('created_at')->useCurrent();
            
            // Opsional: tambahkan updated_at agar fitur Eloquent berjalan normal, 
            // set nullable agar tidak error saat insert data lama
            $table->timestamp('updated_at')->nullable()->useCurrentOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kegiatan');
    }
};