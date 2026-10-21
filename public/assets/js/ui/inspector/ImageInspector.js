import { createNode } from '../../dom/createNode.js';
import { ImageUploader } from '../../elements/ImageUploader.js';
import { createButton, createInspectorSection, createTextField } from '../formControls.js';

export class ImageInspector {
    #layoutStore;
    #imageUploader;

    constructor(layoutStore, imageUploader) {
        this.#layoutStore = layoutStore;
        this.#imageUploader = imageUploader;
    }

    render(sectionClientId, elementClientId) {
        const subject = { sectionClientId, elementClientId };
        const { imageUrl } = this.#findElement(subject).content;
        const fileInputNode = this.#createFileInput(subject);
        const thumbnailNode = createNode('div', { className: 'image-thumbnail' });
        if (imageUrl) {
            thumbnailNode.append(createNode('img', { attributes: { src: imageUrl, alt: '' } }));
        }
        return [
            createInspectorSection('Image', [
                thumbnailNode,
                createButton({ label: 'Replace', onClick: () => fileInputNode.click() }),
                fileInputNode,
                createTextField({
                    label: 'Alt text',
                    readValue: () => this.#findElement(subject).content.altText ?? '',
                    applyValue: altText => this.#updateContent(subject, { altText }),
                }),
            ]),
        ];
    }

    #createFileInput(subject) {
        const fileInputNode = createNode('input', {
            attributes: { type: 'file', accept: ImageUploader.acceptedMimeTypes, hidden: '', 'aria-label': 'Replacement image' },
        });
        fileInputNode.addEventListener('change', async () => {
            const [file] = fileInputNode.files;
            fileInputNode.value = '';
            const imageUrl = file ? await this.#imageUploader.upload(file) : null;
            if (imageUrl) {
                this.#updateContent(subject, { imageUrl, altText: file.name });
            }
        });
        return fileInputNode;
    }

    #updateContent({ sectionClientId, elementClientId }, changedContent) {
        const { content } = this.#findElement({ sectionClientId, elementClientId });
        this.#layoutStore.updateElement(
            sectionClientId,
            elementClientId,
            { content: { ...content, ...changedContent } },
            'element-content',
        );
    }

    #findElement({ sectionClientId, elementClientId }) {
        return this.#layoutStore.findElement(sectionClientId, elementClientId);
    }
}
