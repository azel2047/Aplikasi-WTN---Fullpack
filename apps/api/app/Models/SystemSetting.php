<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    protected $guarded = ['id'];

    public static function getValue(string $key, $default = null)
    {
        $row = static::where('key', $key)->first();
        if (!$row) {
            return $default;
        }
        return match ($row->type) {
            'integer' => (int) $row->value,
            'boolean' => filter_var($row->value, FILTER_VALIDATE_BOOLEAN),
            'json' => json_decode($row->value, true) ?? $default,
            default => $row->value,
        };
    }

    public static function setValue(string $key, $value, string $type = 'string', string $group = 'general', ?string $description = null): self
    {
        $stored = is_array($value) ? json_encode($value) : (is_bool($value) ? ($value ? '1' : '0') : (string) $value);
        return static::updateOrCreate(
            ['key' => $key],
            [
                'value' => $stored,
                'type' => $type,
                'group' => $group,
                'description' => $description,
            ]
        );
    }
}
