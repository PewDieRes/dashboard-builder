import { createNode } from '../dom/createNode.js';
import { ImageUploader } from './ImageUploader.js';

export class ImageElementRenderer {
    #imageUploader;

    constructor(imageUploader) {
        this.#imageUploader = imageUploader;
    }

    render(containerNode, element, context) {
        const fileInputNode = this.#createFileInput(element, context);
        const { imageUrl, altText } = element.content;
        const contentNode = imageUrl
            ? this.#createImageView(imageUrl, altText, fileInputNode)
            : this.#createEmptyState(fileInputNode);
        containerNode.replaceChildren(contentNode, fileInputNode);
        return () => containerNode.replaceChildren();
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

    #createFileInput(element, context) {
        const fileInputNode = createNode('input', {
            attributes: { type: 'file', accept: ImageUploader.acceptedMimeTypes, hidden: '' },
        });
        fileInputNode.addEventListener('change', async () => {
            const [file] = fileInputNode.files;
            fileInputNode.value = '';
            const imageUrl = file ? await this.#imageUploader.upload(file) : null;
            if (imageUrl) {
                context.layoutStore.updateElement(
                    context.sectionClientId,
                    context.elementClientId,
                    { content: { ...element.content, imageUrl, altText: file.name } },
                    'element-content',
                );
            }
        });
        return fileInputNode;
    }
}
