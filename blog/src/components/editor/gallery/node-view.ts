import { $view } from '@milkdown/kit/utils';
import type { NodeViewConstructor } from '@milkdown/kit/prose/view';
import type { Node } from '@milkdown/kit/prose/model';

import { addImage, moveImage, removeImage, type GalleryImage } from '../../../lib/gallery.ts';
import { galleryConfig } from './config.ts';
import { gallerySchema } from './schema.ts';

/** Builds the interactive editor UI for a gallery node. */
export const galleryNodeView = $view(gallerySchema.node, (ctx): NodeViewConstructor => {
	const config = ctx.get(galleryConfig.key);

	return (initialNode, view, getPos) => {
		const dom = document.createElement('div');
		dom.className = 'gallery-editor';
		dom.contentEditable = 'false';

		// Header: gallery caption + actions.
		const header = document.createElement('div');
		header.className = 'gallery-editor__header';

		const captionInput = document.createElement('input');
		captionInput.className = 'ui-input gallery-editor__caption';
		captionInput.placeholder = 'gallery caption';
		captionInput.type = 'text';

		const actions = document.createElement('div');
		actions.className = 'gallery-editor__actions';

		const uploadButton = document.createElement('button');
		uploadButton.className = 'ui-button gallery-editor__upload';
		uploadButton.type = 'button';
		uploadButton.textContent = 'upload images';

		const removeGalleryButton = document.createElement('button');
		removeGalleryButton.className = 'ui-button gallery-editor__remove';
		removeGalleryButton.type = 'button';
		removeGalleryButton.setAttribute('aria-label', 'remove gallery');
		removeGalleryButton.textContent = '×';

		const fileInput = document.createElement('input');
		fileInput.type = 'file';
		fileInput.accept = 'image/*';
		fileInput.multiple = true;
		fileInput.hidden = true;

		actions.append(uploadButton, removeGalleryButton);
		header.append(captionInput, actions, fileInput);

		// Track holds the thumbnail items (rebuilt on structural changes).
		const track = document.createElement('div');
		track.className = 'gallery-editor__track';

		const status = document.createElement('p');
		status.className = 'gallery-editor__status';
		status.setAttribute('role', 'status');

		dom.append(header, track, status);

		/** Dispatches a single attribute change for the gallery node. */
		function setAttr(attr: string, value: unknown) {
			if (!view.editable) return;
			const pos = getPos();
			if (pos == null) return;
			view.dispatch(view.state.tr.setNodeAttribute(pos, attr, value));
		}

		function imagesOf(node: Node): GalleryImage[] {
			return (node.attrs.images ?? []) as GalleryImage[];
		}

		/** Structural fingerprint: order and identity of image sources. */
		function signature(images: GalleryImage[]): string {
			return images.map((image) => image.src).join('\u0000');
		}

		/** Rebuilds the thumbnail track for the given images. */
		function renderTrack(images: GalleryImage[]) {
			track.replaceChildren();

			if (!images.length) {
				const empty = document.createElement('p');
				empty.className = 'gallery-editor__empty';
				empty.textContent = 'no images yet — upload some';
				track.append(empty);
				return;
			}

			images.forEach((image, index) => {
				track.append(buildItem(image, index, images));
			});
		}

		/** Builds one thumbnail item with caption and reorder/remove controls. */
		function buildItem(image: GalleryImage, index: number, images: GalleryImage[]) {
			const item = document.createElement('div');
			item.className = 'gallery-editor__item';

			const img = document.createElement('img');
			img.src = image.src;
			img.alt = image.alt ?? '';

			const caption = document.createElement('input');
			caption.className = 'ui-input gallery-editor__item-caption';
			caption.type = 'text';
			caption.placeholder = 'caption';
			caption.value = image.caption ?? '';
			caption.addEventListener('input', () => {
				const next = imagesOf(getCurrentNode()).map((entry, i) =>
					i === index ? { ...entry, caption: caption.value } : entry,
				);
				setAttr('images', next);
			});

			const controls = document.createElement('div');
			controls.className = 'gallery-editor__item-actions';
			controls.append(
				actionButton('‹', 'move left', index === 0, () => {
					setAttr('images', moveImage(images, index, index - 1));
				}),
				actionButton('›', 'move right', index === images.length - 1, () => {
					setAttr('images', moveImage(images, index, index + 1));
				}),
				actionButton('×', 'remove image', false, () => {
					setAttr('images', removeImage(images, index));
				}),
			);

			item.append(img, caption, controls);
			return item;
		}

		function actionButton(label: string, ariaLabel: string, disabled: boolean, onClick: () => void) {
			const button = document.createElement('button');
			button.className = 'ui-button';
			button.type = 'button';
			button.textContent = label;
			button.setAttribute('aria-label', ariaLabel);
			button.disabled = disabled;
			button.addEventListener('click', onClick);
			return button;
		}

		captionInput.value = (initialNode.attrs.caption ?? '') as string;
		captionInput.addEventListener('input', () => setAttr('caption', captionInput.value));

		uploadButton.addEventListener('click', () => fileInput.click());
		removeGalleryButton.addEventListener('click', () => {
			const pos = getPos();
			if (pos == null || !view.editable) return;
			view.dispatch(view.state.tr.deleteRange(pos, pos + initialNode.nodeSize));
		});

		fileInput.addEventListener('change', () => {
			const files = fileInput.files ? Array.from(fileInput.files) : [];
			fileInput.value = '';
			void uploadFiles(files);
		});

		/** Uploads a batch of files sequentially, appending each as it resolves. */
		async function uploadFiles(files: File[]) {
			if (!files.length || !view.editable) return;
			uploadButton.disabled = true;
			let images = imagesOf(getCurrentNode());
			const failures: string[] = [];
			for (const [index, file] of files.entries()) {
				status.classList.remove('gallery-editor__status--error');
				status.textContent = files.length > 1
					? `uploading ${index + 1} of ${files.length}: ${file.name}…`
					: `uploading ${file.name}…`;
				try {
					const src = await config.onUpload(file);
					images = addImage(images, { src });
					setAttr('images', images);
				} catch (error) {
					failures.push(error instanceof Error ? error.message : `couldn't upload ${file.name}`);
				}
			}
			uploadButton.disabled = false;
			if (!failures.length) {
				status.textContent = '';
				return;
			}
			status.classList.add('gallery-editor__status--error');
			status.textContent = failures.length > 1
				? `${failures.length} of ${files.length} uploads failed — ${failures[failures.length - 1]}`
				: failures[0];
		}

		/** Returns the current node from the editor state. */
		function getCurrentNode(): Node {
			const pos = getPos();
			if (pos == null) return initialNode;
			return view.state.doc.nodeAt(pos) ?? initialNode;
		}

		let renderedSignature = signature(imagesOf(initialNode));
		renderTrack(imagesOf(initialNode));

		return {
			dom,
			update: (node) => {
				if (node.type !== gallerySchema.type(ctx)) return false;
				captionInput.value = (node.attrs.caption ?? '') as string;
				const images = imagesOf(node);
				const nextSignature = signature(images);
				if (nextSignature !== renderedSignature) {
					renderedSignature = nextSignature;
					renderTrack(images);
				}
				return true;
			},
			stopEvent: (event) =>
				event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement,
			destroy: () => dom.remove(),
		};
	};
});
