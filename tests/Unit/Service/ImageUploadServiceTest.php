<?php

declare(strict_types=1);

namespace DashboardBuilder\Tests\Unit\Service;

use DashboardBuilder\Http\ValidationException;
use DashboardBuilder\Service\ImageUploadService;
use PHPUnit\Framework\TestCase;

final class ImageUploadServiceTest extends TestCase
{
    private const ONE_PIXEL_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    private string $workingDirectory;
    private string $uploadDirectory;
    private ImageUploadService $imageUploadService;

    protected function setUp(): void
    {
        $this->workingDirectory = sys_get_temp_dir() . '/dashboard-builder-upload-test-' . bin2hex(random_bytes(8));
        $this->uploadDirectory = $this->workingDirectory . '/uploads';
        mkdir($this->workingDirectory);
        $this->imageUploadService = new ImageUploadService($this->uploadDirectory);
    }

    protected function tearDown(): void
    {
        $entries = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($this->workingDirectory, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST,
        );
        foreach ($entries as $entry) {
            $entry->isDir() ? rmdir($entry->getPathname()) : unlink($entry->getPathname());
        }
        rmdir($this->workingDirectory);
    }

    public function testStoresRealPngAndReturnsPublicUrl(): void
    {
        $temporaryFilePath = $this->writeTemporaryFile('upload.tmp', base64_decode(self::ONE_PIXEL_PNG_BASE64));

        $publicUrl = $this->imageUploadService->store($temporaryFilePath, filesize($temporaryFilePath));

        self::assertMatchesRegularExpression('#^/uploads/[a-f0-9]{32}\.png$#', $publicUrl);
        self::assertFileExists($this->uploadDirectory . '/' . basename($publicUrl));
    }

    public function testRejectsNonImageFileDisguisedAsPng(): void
    {
        $temporaryFilePath = $this->writeTemporaryFile('fake.png', 'not an image');

        $this->expectException(ValidationException::class);
        $this->imageUploadService->store($temporaryFilePath, filesize($temporaryFilePath));
    }

    public function testRejectsFilesLargerThanFiveMegabytes(): void
    {
        $temporaryFilePath = $this->writeTemporaryFile('large.png', base64_decode(self::ONE_PIXEL_PNG_BASE64));

        try {
            $this->imageUploadService->store($temporaryFilePath, 6_000_000);
            self::fail('Expected ValidationException');
        } catch (ValidationException $exception) {
            self::assertSame(['image' => 'Image must be 5 MB or smaller'], $exception->details());
        }
    }

    private function writeTemporaryFile(string $fileName, string $contents): string
    {
        $filePath = $this->workingDirectory . '/' . $fileName;
        file_put_contents($filePath, $contents);

        return $filePath;
    }
}
