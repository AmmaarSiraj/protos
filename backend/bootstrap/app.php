<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php', // <--- 1. TAMBAHKAN BARIS INI
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // 2. KONFIGURASI UNTUK API
        
        // Opsional: Jika nanti Anda menaruh API di subdomain atau prefix tertentu
        // $middleware->statefulApi(); 
        
        // 3. Konfigurasi CORS (Agar Frontend React bisa akses)
        // Laravel 11 biasanya sudah otomatis menangani CORS jika 'install:api' dijalankan,
        // tapi kita pastikan di sini.
        $middleware->validateCsrfTokens(except: [
            'api/*', // Matikan CSRF protection untuk route API (karena pakai Token)
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();