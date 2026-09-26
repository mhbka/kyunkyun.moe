import { blogApi, type Pix } from '../../lib/api.ts';
import { restoreScrollPosition, type ScrollPosition } from './scroll.ts';
import { savePixTagEdits, type PixTagOperation } from './tag-edit.ts';
import { uploadPixFiles } from './upload.ts';
import { initFileDropzone } from '../ui/file-dropzone.ts';

type PixImage = Pick<Pix, 'id' | 'publicUrl' | 'tags' | 'createdAt'>;

/** Wires gallery browsing, modal viewing, and authenticated uploads. */
export function initPixGallery(gallery: HTMLElement) {
	const grid = gallery.querySelector<HTMLElement>('[data-moe-grid]');
	const loadMore = gallery.querySelector<HTMLButtonElement>('[data-moe-load-more]');
	const portal = gallery.querySelector<HTMLDialogElement>('[data-moe-portal]');
	const portalImage = gallery.querySelector<HTMLImageElement>('[data-moe-portal-image]');
	const portalCreatedAt = gallery.querySelector<HTMLTimeElement>('[data-moe-portal-created-at]');
	const portalTags = gallery.querySelector<HTMLElement>('[data-moe-portal-tags]');
	const status = gallery.querySelector<HTMLElement>('[data-moe-status]');
	const dropzone = gallery.querySelector<HTMLElement>('[data-file-dropzone]');
	const fileInput = gallery.querySelector<HTMLInputElement>('[data-file-dropzone-input]');
	const tagsInput = gallery.querySelector<HTMLInputElement>('[data-tag-value]');
	const selectToggle = gallery.querySelector<HTMLButtonElement>('[data-moe-select-toggle]');
	const tagEditor = gallery.querySelector<HTMLElement>('[data-moe-tag-editor]');
	const selectedCount = gallery.querySelector<HTMLElement>('[data-moe-selected-count]');
	const tagOperation = gallery.querySelector<HTMLSelectElement>('[data-moe-tag-operation]');
	const saveTags = gallery.querySelector<HTMLButtonElement>('[data-moe-tag-save]');
	let viewerScrollPosition: ScrollPosition | undefined;
	let isSelecting = false;
	const selectedImageIds = new Set<string>();

	/** Returns the viewport to the position it had before the viewer opened. */
	function restoreViewerScrollPosition() {
		if (!viewerScrollPosition) return;
		restoreScrollPosition(viewerScrollPosition, (left, top) => window.scrollTo(left, top));
	}

	/** Creates a gallery button for an image thumbnail. */
	function createThumbnail(pix: PixImage) {
		const button = document.createElement('button');
		button.className = 'ui-button moe-thumbnail';
		button.type = 'button';
		button.ariaLabel = 'view full image';
		button.dataset.imageId = pix.id;
		button.dataset.imageUrl = pix.publicUrl;
		button.dataset.imageTags = JSON.stringify(pix.tags);
		button.dataset.imageCreatedAt = pix.createdAt;
		const thumbnailImage = document.createElement('img');
		thumbnailImage.src = pix.publicUrl;
		thumbnailImage.alt = '';
		thumbnailImage.loading = 'lazy';
		button.append(thumbnailImage);
		const tick = document.createElement('span');
		tick.className = 'moe-thumbnail__tick';
		tick.ariaHidden = 'true';
		tick.textContent = '✓';
		button.append(tick);
		return button;
	}

	/** Reflects selection state in the gallery controls and thumbnails. */
	function renderSelection() {
		const canEdit = gallery.dataset.canEdit === 'true';
		tagEditor && (tagEditor.hidden = !selectedImageIds.size);
		if (selectedCount) selectedCount.textContent = `${selectedImageIds.size} selected`;
		if (selectToggle) {
			selectToggle.ariaPressed = String(isSelecting);
			selectToggle.textContent = isSelecting ? 'cancel selection' : 'select images to modify';
		}
		grid?.querySelectorAll<HTMLButtonElement>('[data-image-id]').forEach((thumbnail) => {
			const isSelected = selectedImageIds.has(thumbnail.dataset.imageId ?? '');
			thumbnail.classList.toggle('is-selected', isSelected);
			if (canEdit && isSelecting) thumbnail.ariaPressed = String(isSelected);
			else thumbnail.removeAttribute('aria-pressed');
		});
	}

	/** Populates the image viewer with the selected image details. */
	function showImage(image: PixImage) {
		if (!portalImage) return;
		portalImage.src = image.publicUrl;
		const createdAt = new Date(image.createdAt);
		if (portalCreatedAt) {
			portalCreatedAt.dateTime = image.createdAt;
			portalCreatedAt.textContent = Number.isNaN(createdAt.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(createdAt);
		}
		if (portalTags) portalTags.textContent = image.tags.map((tag) => `#${tag}`).join(' ');
	}

	grid?.addEventListener('click', (event) => {
		const thumbnail = (event.target as Element).closest<HTMLButtonElement>('[data-image-url]');
		if (!thumbnail || !portal || !portalImage) return;
		if (isSelecting && gallery.dataset.canEdit === 'true') {
			const imageId = thumbnail.dataset.imageId;
			if (!imageId) return;
			if (selectedImageIds.has(imageId)) selectedImageIds.delete(imageId);
			else selectedImageIds.add(imageId);
			renderSelection();
			return;
		}
		showImage({
			id: thumbnail.dataset.imageId ?? '',
			publicUrl: thumbnail.dataset.imageUrl ?? '',
			tags: JSON.parse(thumbnail.dataset.imageTags ?? '[]') as string[],
			createdAt: thumbnail.dataset.imageCreatedAt ?? '',
		});
		viewerScrollPosition = { left: window.scrollX, top: window.scrollY };
		portal.showModal();
		requestAnimationFrame(restoreViewerScrollPosition);
	});
	selectToggle?.addEventListener('click', () => {
		isSelecting = !isSelecting;
		if (!isSelecting) selectedImageIds.clear();
		renderSelection();
	});
	saveTags?.addEventListener('click', async () => {
		const token = gallery.dataset.token;
		if (!token || saveTags.disabled) return;
		const tags: string[] = JSON.parse(tagsInput?.value ?? '[]');
		saveTags.disabled = true;
		try {
			const updated = await savePixTagEdits({
				imageIds: [...selectedImageIds],
				operation: (tagOperation?.value ?? 'remove') as PixTagOperation,
				tags,
				update: (imageIds, operation, imageTags) => blogApi.updatePixTags(imageIds, operation, imageTags, token),
			});
			if (status) status.textContent = `${updated.length} image${updated.length === 1 ? '' : 's'} updated.`;
			window.location.reload();
		} catch (error) {
			if (status) status.textContent = error instanceof Error ? error.message : 'tag update failed. please try again.';
		} finally { saveTags.disabled = false; }
	});
	gallery.querySelector('[data-moe-close]')?.addEventListener('click', () => portal?.close());
	portal?.addEventListener('click', (event) => { if (event.target === portal) portal.close(); });
	portal?.addEventListener('close', () => {
		restoreViewerScrollPosition();
		viewerScrollPosition = undefined;
	});

	loadMore?.addEventListener('click', async () => {
		if (!grid || gallery.dataset.hasMore !== 'true' || !gallery.dataset.nextBefore) return;
		loadMore.disabled = true;
		try {
			const page = await blogApi.listPix(60, gallery.dataset.nextBefore, JSON.parse(gallery.dataset.tags ?? '[]') as string[]);
			page.images.forEach((image) => grid.append(createThumbnail(image)));
			renderSelection();
			gallery.dataset.nextBefore = page.nextBefore ?? '';
			gallery.dataset.hasMore = String(page.hasMore);
			loadMore.hidden = !page.hasMore;
		} catch { window.alert('could not load more pix.'); }
		finally { loadMore.disabled = false; }
	});

	/** Uploads a selected batch using the gallery's current tags. */
	async function uploadFiles(files: Iterable<File>) {
		if (!grid) return;
		const selectedFiles = [...files];
		if (!selectedFiles.length) return;
		const token = gallery.dataset.token;
		const tags: string[] = JSON.parse(tagsInput?.value ?? '[]');
		if (!tags.length) {
			window.alert('each pix must have at least 1 tag.');
			if (fileInput) fileInput.value = '';
			return;
		}
		if (!token || fileInput?.disabled) return;
		if (fileInput) fileInput.disabled = true;
		dropzone?.setAttribute('aria-busy', 'true');
		try {
			const result = await uploadPixFiles({
				files: selectedFiles,
				tags,
				upload: (file, imageTags) => blogApi.uploadPix(file, imageTags, token),
				onProgress: ({ uploaded, total }) => {
					if (status) status.textContent = `${uploaded}/${total} pix uploaded...`;
				},
			});
			if (fileInput) fileInput.value = '';
			if (!result.failed) {
				window.location.reload();
				return;
			}
			if (status) status.textContent = `${result.uploaded}/${result.total} pix uploaded. ${result.failed} failed.`;
		} catch { if (status) status.textContent = 'upload failed. please try again.'; }
		finally {
			if (fileInput) fileInput.disabled = false;
			dropzone?.removeAttribute('aria-busy');
		}
	}

	if (dropzone) initFileDropzone(dropzone, (files) => void uploadFiles(files));
}
