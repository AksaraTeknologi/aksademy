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
        Schema::table('coding_lessons', function (Blueprint $table) {
            $table->foreignId('coding_module_id')
                ->nullable()
                ->after('coding_track_id')
                ->constrained('coding_modules')
                ->nullOnDelete();

            $table->index(['coding_module_id', 'is_active', 'sort_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('coding_lessons', function (Blueprint $table) {
            $table->dropForeign(['coding_module_id']);
            $table->dropIndex(['coding_module_id', 'is_active', 'sort_order']);
            $table->dropColumn('coding_module_id');
        });
    }
};
