<?php

declare(strict_types=1);

namespace DashboardBuilder\Controller;

use DashboardBuilder\Http\JsonResponse;
use DashboardBuilder\Http\Request;
use DashboardBuilder\Http\ValidationException;
use DashboardBuilder\Service\ImageUploadService;

final class ImageUploadController
{
    private const UPLOAD_FIELD_NAME = 'image';

    public function __construct(private readonly ImageUploadService $imageUploadService)
    {
    }

    public function upload(Request $request, array $routeParameters): JsonResponse
    {
        $uploadedFile = $this->requireSuccessfulUpload($request->uploadedFile(self::UPLOAD_FIELD_NAME));

        $imageUrl = $this->imageUploadService->store($uploadedFile['tmp_name'], (int) $uploadedFile['size']);

        return new JsonResponse(['imageUrl' => $imageUrl], 201);
    }

    private function requireSuccessfulUpload(?array $uploadedFile): array
    {
        $uploadError = $uploadedFile['error'] ?? UPLOAD_ERR_NO_FILE;

        if (in_array($uploadError, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
            throw new ValidationException([self::UPLOAD_FIELD_NAME => 'Image must be 5 MB or smaller']);
        }
        if ($uploadError !== UPLOAD_ERR_OK || !is_uploaded_file((string) ($uploadedFile['tmp_name'] ?? ''))) {
            throw new ValidationException([self::UPLOAD_FIELD_NAME => 'Please choose an image to upload']);
        }

        return $uploadedFile;
    }
}
