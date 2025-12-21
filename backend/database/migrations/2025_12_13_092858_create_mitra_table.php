<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mitra', function (Blueprint $table) {
            $table->id(); // int(11) AUTO_INCREMENT
            $table->string('nama_lengkap', 255);
            $table->string('nik', 50)->unique(); // NIK Wajib & Unik
            $table->string('sobat_id', 50)->nullable(); // ID Sobat BPS (Opsional)
            $table->text('alamat')->nullable();
            
            // L = Laki-laki, P = Perempuan
            $table->string('jenis_kelamin', 10)->nullable(); 
            
            $table->string('pendidikan', 100)->nullable();
            $table->string('pekerjaan', 100)->nullable(); // Pekerjaan utama
            $table->text('deskripsi_pekerjaan_lain')->nullable(); // Jika ada ket lain
            
            $table->string('nomor_hp', 20)->nullable();
            $table->string('email', 100)->nullable();

            // Timestamps
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrentOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mitra');
    }
};