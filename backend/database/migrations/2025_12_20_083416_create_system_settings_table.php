<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
{
    Schema::create('system_settings', function (Blueprint $table) {
        $table->id();
        $table->string('key')->unique(); // Misal: 'app_logo', 'home_background'
        $table->text('value')->nullable(); // Path file atau nilai setting
        $table->timestamps();
    });
}
};
