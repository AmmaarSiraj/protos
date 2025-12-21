<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tabel Jabatan Mitra
        // Berdasarkan file jabatan_mitra.sql
        Schema::create('jabatan_mitra', function (Blueprint $table) {
            $table->string('kode_jabatan', 50)->primary(); // Primary Key String (Bukan Auto Increment)
            $table->string('nama_jabatan', 255);
            
            // Timestamps opsional (created_at, updated_at)
            $table->timestamps(); 
        });

        // 2. Tabel Honorarium
        // Berdasarkan file honorarium.sql
        Schema::create('honorarium', function (Blueprint $table) {
            $table->id(); // int(11) AUTO_INCREMENT
            
            // Relasi ke tabel subkegiatan (ID string 'sub1', 'sub2', dst)
            // Pastikan tabel 'subkegiatan' sudah ada sebelumnya
            $table->string('id_subkegiatan', 50);
            $table->foreign('id_subkegiatan')
                  ->references('id')->on('subkegiatan')
                  ->onDelete('cascade')
                  ->onUpdate('cascade');

            // Relasi ke tabel jabatan_mitra
            $table->string('kode_jabatan', 50);
            $table->foreign('kode_jabatan')
                  ->references('kode_jabatan')->on('jabatan_mitra')
                  ->onDelete('restrict') // Jangan hapus jabatan jika masih dipakai di honor
                  ->onUpdate('cascade');

            $table->decimal('tarif', 10, 2)->default(0);
            $table->integer('id_satuan'); // Diasumsikan integer biasa (belum ada tabel referensi satuan)
            $table->integer('basis_volume')->default(1);
            $table->string('beban_anggaran', 100)->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('honorarium');
        Schema::dropIfExists('jabatan_mitra');
    }
};