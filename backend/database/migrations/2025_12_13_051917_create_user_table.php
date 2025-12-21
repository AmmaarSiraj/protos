<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('user', function (Blueprint $table) {
            $table->id(); // int(11) AUTO_INCREMENT
            
            // varchar(100) NOT NULL, Unique
            $table->string('username', 100)->unique(); 
            
            // varchar(100) NOT NULL, Unique
            $table->string('email', 100)->unique(); 
            
            // varchar(255) NOT NULL
            $table->string('password', 255); 
            
            // enum('user','admin','superadmin') DEFAULT 'user'
            $table->enum('role', ['user', 'admin', 'superadmin'])->default('user');
            
            // timestamp DEFAULT current_timestamp()
            // Kita tambahkan updated_at juga agar fitur Model Laravel berjalan lancar (nullable)
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrentOnUpdate(); 
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user');
    }
};