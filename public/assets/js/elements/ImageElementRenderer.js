import { createNode } from '../dom/createNode.js';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAXIMUM_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export class ImageElementRenderer {
    render(containerNode, element, context) {
        this.#renderContent(containerNode, element, context);
        return () => containerNode.replaceChildren();
    }

    #renderContent(containerNode, element, context) {
        const fileInputNode = this.#createFileInput(containerNode, element, context);
        const { imageUrl, altText } = element.content;
        const contentNode = imageUrl
            ? this.#createImageView(imageUrl, altText, fileInputNode)
            : this.#createEmptyState(fileInputNode);
        containerNode.replaceChildren(contentNode, fileInputNode);
    }

    #createImageView(imageUrl, altText, fileInputNode) {
        const imageNode = createNode('img', {
            attributes: { src: imageUrl, alt: altText ?? '', draggable: 'false' },
        });
        imageNode.style.cssText = 'object-fit: contain; width: 100%; height: 100%';
        const replaceButtonNode = createNode('button', {
            className: 'image-replace-button',
            text: 'Replace',
            attributes: { type: 'button' },
        });
        replaceButtonNode.addEventListener('click', () => fileInputNode.click());
        return createNode('div', { className: 'image-element' }, [imageNode, replaceButtonNode]);
    }

    #createEmptyState(fileInputNode) {
        const uploadButtonNode = createNode('button', {
            className: 'image-empty-state',
            text: 'Upload image',
            attributes: { type: 'button' },
        });
        uploadButtonNode.addEventListener('click', () => fileInputNode.click());
        return uploadButtonNode;
    }

    #createFileInput(containerNode, element, context) {
        const fileInputNode = createNode('input', {
            attributes: { type: 'file', accept: ALLOWED_MIME_TYPES.join(','), hidden: '' },
        });
        fileInputNode.addEventListener('change', async () => {
            const [file] = fileInputNode.files;
            if (file) {
                await this.#uploadFile(file, containerNode, element, context);
            }
            fileInputNode.value = '';
        });
        return fileInputNode;
    }

    async #uploadFile(file, containerNode, element, context) {
        const rejectionMessage = this.#findRejectionMessage(file);
        if (rejectionMessage) {
            context.notifier.error(rejectionMessage);
            return;
        }
        try {
            const { imageUrl } = await context.apiClient.uploadImage(file);
            context.layoutStore.updateElement(
                context.sectionClientId,
                context.elementClientId,
                { content: { imageUrl, altText: file.name } },
                'content',
            );
            this.#renderContent(containerNode, element, context);
        } catch (apiError) {
            context.notifier.error(apiError.message);
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
