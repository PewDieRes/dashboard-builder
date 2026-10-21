const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAXIMUM_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export class ImageUploader {
    #apiClient;
    #notifier;

    constructor(apiClient, notifier) {
        this.#apiClient = apiClient;
        this.#notifier = notifier;
    }

    static get acceptedMimeTypes() {
        return ALLOWED_MIME_TYPES.join(',');
    }

    /** Resolves to the uploaded image URL, or null after telling the user why the file was not uploaded. */
    async upload(file) {
        const rejectionMessage = this.#findRejectionMessage(file);
        if (rejectionMessage) {
            this.#notifier.error(rejectionMessage);
            return null;
        }
        try {
            const { imageUrl } = await this.#apiClient.uploadImage(file);
            return imageUrl;
        } catch (apiError) {
            this.#notifier.error(apiError.message);
            return null;
        }
    }

    #findRejectionMessage(file) {
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return 'Only PNG, JPEG, GIF and WEBP images are supported.';
        }
        if (file.size > MAXIMUM_FILE_SIZE_BYTES) {
            return 'Image must be 5 MB or smaller.';
        }
        return null;
    }
}
