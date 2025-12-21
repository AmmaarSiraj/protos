<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('spk_setting', function (Blueprint $table) {
            $table->id();
            
            // Periode format YYYY-MM (misal: 2025-12)
            // Saya tambahkan unique() agar sesuai dengan file SQL (satu periode cuma punya 1 setting)
            $table->string('periode', 7)->unique(); 
            
            // Format Nomor Surat (misal: 000/33730/SPK.MITRA/MM/YYYY)
            $table->string('nomor_surat_format', 100)->nullable();
            
            $table->date('tanggal_surat')->nullable();
            $table->string('nama_ppk', 100)->nullable();
            $table->string('nip_ppk', 50)->nullable();
            $table->string('jabatan_ppk', 100)->default('Pejabat Pembuat Komitmen');
            
            // Text panjang untuk komponen honor (pasal/keterangan pembayaran)
            $table->text('komponen_honor')->nullable();

            // === TAMBAHAN TEMPLATE ID ===
            // Pastikan tabel 'master_template_spk' sudah dimigrate SEBELUM file ini dijalankan
            $table->foreignId('template_id')
                  ->nullable()                          // Boleh kosong
                  ->constrained('master_template_spk')  // Terhubung ke tabel master_template_spk
                  ->nullOnDelete();                     // Jika template induk dihapus, ini jadi NULL

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('spk_setting');
    }
};