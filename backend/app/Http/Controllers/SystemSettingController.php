<?php

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SystemSettingController extends Controller
{
    // Ambil semua setting public
    public function index()
    {
        $settings = SystemSetting::pluck('value', 'key');
        // Ubah path menjadi URL lengkap
        $data = [
            'home_background' => isset($settings['home_background']) 
                ? asset('storage/' . $settings['home_background']) 
                : null,
            'app_logo' => isset($settings['app_logo']) 
                ? asset('storage/' . $settings['app_logo']) 
                : null,
        ];
        return response()->json(['data' => $data]);
    }

    // Upload File
    public function upload(Request $request)
    {
        $request->validate([
            'type' => 'required|in:home_background,app_logo',
            'file' => 'required|image|max:5120', // Max 5MB
        ]);

        $file = $request->file('file');
        $type = $request->type;

        // Hapus file lama jika ada
        $oldSetting = SystemSetting::where('key', $type)->first();
        if ($oldSetting && $oldSetting->value) {
            Storage::disk('public')->delete($oldSetting->value);
        }

        // Simpan file baru
        $path = $file->store('uploads/system', 'public');

        // Update database
        SystemSetting::updateOrCreate(
            ['key' => $type],
            ['value' => $path]
        );

        return response()->json([
            'message' => 'Upload berhasil',
            'url' => asset('storage/' . $path)
        ]);
    }
}