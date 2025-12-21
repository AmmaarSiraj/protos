<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tabel Master Template SPK
        Schema::create('master_template_spk', function (Blueprint $table) {
            $table->id();
            $table->string('nama_template', 255); // Contoh: "Template 2025"
            $table->boolean('is_active')->default(0)->comment('1 = Template Default/Aktif');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrentOnUpdate();
        });

        // 2. Tabel Template Bagian Teks (Pembuka, Penutup, Pihak)
        Schema::create('template_bagian_teks', function (Blueprint $table) {
            $table->id();
            
            $table->foreignId('template_id')
                  ->constrained('master_template_spk')
                  ->onDelete('cascade');

            // Enum sesuai SQL
            $table->enum('jenis_bagian', ['pembuka', 'pihak_pertama', 'pihak_kedua', 'kesepakatan', 'penutup']);
            
            $table->text('isi_teks')->nullable(); // Boleh mengandung variabel {{...}}
            
            $table->timestamps(); // Created_at & Updated_at
        });

        // 3. Tabel Template Pasal (Pasal 1, Pasal 2, dst)
        Schema::create('template_pasal', function (Blueprint $table) {
            $table->id();

            $table->foreignId('template_id')
                  ->constrained('master_template_spk')
                  ->onDelete('cascade');

            $table->integer('nomor_pasal');
            $table->string('judul_pasal', 255)->nullable();
            $table->text('isi_pasal')->nullable(); // Boleh mengandung variabel {{...}}
            $table->integer('urutan')->default(0);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('template_pasal');
        Schema::dropIfExists('template_bagian_teks');
        Schema::dropIfExists('master_template_spk');
    }
};