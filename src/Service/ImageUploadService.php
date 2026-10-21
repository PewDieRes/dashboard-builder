<?php

declare(strict_types=1);

namespace DashboardBuilder\Service;

use DashboardBuilder\Http\ValidationException;

final class ImageUploadService
{
    private const EXTENSION_BY_MIME_TYPE = [
        'image/png' => 'png',
        'image/jpeg' => 'jpg',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
    ];

    public function __construct(
        private readonly string $uploadDirectory,
        private readonly string $publicUrlPrefix = '/uploads/',
        private readonly int $maximumBytes = 5_242_880,
    ) {
    }

    /** @return string public URL of the stored image */
    public function store(string $temporaryFilePath, int $fileSizeInBytes): string
    {
        if ($fileSizeInBytes > $this->maximumBytes) {
            throw new ValidationException(['image' => 'Image must be 5 MB or smaller']);
        }

        $extension = $this->detectExtension($temporaryFilePath);
        $fileName = bin2hex(random_bytes(16)) . '.' . $extension;

        $this->ensureUploadDirectoryExists();
        if (!copy($temporaryFilePath, $this->uploadDirectory . '/' . $fileName)) {
            throw new \RuntimeException('Could not store uploaded image');
        }

        return $this->publicUrlPrefix . $fileName;
    }

    private function detectExtension(string $temporaryFilePath): string
    {
        $mimeType = (new \finfo(FILEINFO_MIME_TYPE))->file($temporaryFilePath);

        return self::EXTENSION_BY_MIME_TYPE[$mimeType]
            ?? throw new ValidationException(['image' => 'Only PNG, JPEG, GIF or WEBP images are allowed']);
    }

    private function ensureUploadDirectoryExists(): void
    {
        if (!is_dir($this->uploadDirectory) && !mkdir($this->uploadDirectory, 0755, true) && !is_dir($this->uploadDirectory)) {
            throw new \RuntimeException('Could not create upload directory');
        }
    }
}
