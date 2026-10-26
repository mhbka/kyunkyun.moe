import { Crepe } from '@milkdown/crepe';
import { commandsCtx } from '@milkdown/kit/core';

import { blogApi } from '../../lib/api/index.ts';
import { createSupabaseBrowserClient } from '../../lib/auth/supabase.ts';
import { uploadImage } from '../../lib/utils/image-upload.ts';
import { initTagInput } from '../tags/tag-input.ts';
import { trackEditorChanges } from './changes.ts';
import { galleryFeature, galleryIcon, insertGalleryCommand } from './gallery/index.ts';

/** Mounts the Milkdown editor on a post form; the returned cleanup runs once the page leaves it. */
export function initPostEditor(form: HTMLFormElement) {
	const lifetime = new AbortController();
	void mountPostEditor(form, lifetime.signal);
	return () => lifetime.abort();
}

/** Initializes the Milkdown editor and its post form controls. */
async function mountPostEditor(form: HTMLFormElement, signal: AbortSignal) {
	const root = form.querySelector<HTMLElement>('#post-content');
	const title = form.querySelector<HTMLTextAreaElement>('#post-title');
	const slug = form.querySelector<HTMLInputElement>('#post-slug');
	const tagRoot = form.querySelector<HTMLElement>('[data-tag-input]');
	const tagSuggestions = form.querySelector<HTMLDataListElement>('#post-tag-suggestions');
	const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
	const status = form.querySelector<HTMLElement>('[data-editor-status]');

	if (!root || !title || !slug || !tagRoot || !button || !status) return;

	const titleInput = title;

	/** Resizes the title field to fit its wrapped text. */
	function resizeTitle() {
		titleInput.style.height = 'auto';
		titleInput.style.height = `${titleInput.scrollHeight}px`;
	}

	resizeTitle();
	const changes = trackEditorChanges(form);
	titleInput.addEventListener('input', resizeTitle, { signal });

	const slugInput = slug;
	const tagInput = initTagInput(tagRoot);
	if (!tagInput) return;
	const mediaApiUrl = `${import.meta.env.BACKEND_URL.replace(/\/$/, '')}/media/uploads`;
	const supabaseClient = createSupabaseBrowserClient();
	let postId = form.dataset.postId;

	/** Returns a validation message for an invalid custom slug. */
	function slugError(value: string) {
		return value && !/^[A-Za-z0-9-]+$/.test(value)
			? 'Slug may contain only letters, numbers, and hyphens.'
			: '';
	}

	/** Applies custom slug validation to the form field. */
	function validateSlug() {
		const error = slugError(slugInput.value);
		slugInput.setCustomValidity(error);
		slugInput.setAttribute('aria-invalid', String(Boolean(error)));
		return error;
	}

	/** Uploads an editor image after checking the draft and session. */
	async function uploadImageFile(file: File): Promise<string> {
		if (!file.type.startsWith('image/')) throw new Error('Only image files can be uploaded.');
		if (!postId) throw new Error('Save this draft before uploading images.');

		const { data: { session } } = await supabaseClient.auth.getSession();
		if (!session) throw new Error('Please log in before uploading an image.');
		return uploadImage(file, mediaApiUrl, postId, session.access_token);
	}

	slug.addEventListener('input', validateSlug, { signal });

	void blogApi.listTags().then((availableTags) => {
		tagSuggestions?.replaceChildren(...availableTags.map(({ tag, count }) => {
			const option = document.createElement('option');
			option.value = tag;
			option.label = `${count} published post${count === 1 ? '' : 's'}`;
			return option;
		}));
	}).catch(() => {
		// Tag suggestions are optional; authors can always add a new tag.
	});

	// Crepe provides the standard editing controls while preserving Markdown output.
	const editor = new Crepe({
		root,
		defaultValue: root.dataset.initialContent ?? '',
		features: {
			[Crepe.Feature.TopBar]: true,
		},
		featureConfigs: {
			[Crepe.Feature.ImageBlock]: {
				onUpload: uploadImageFile,
			},
			[Crepe.Feature.Placeholder]: {
				text: 'Content',
				mode: 'doc',
			},
			[Crepe.Feature.TopBar]: {
				buildTopBar: (builder) => {
					builder.getGroup('insert').addItem('gallery', {
						icon: galleryIcon,
						active: () => false,
						onRun: (ctx) => {
							ctx.get(commandsCtx).call(insertGalleryCommand.key);
						},
					});
				},
			},
		},
	});

	editor.addFeature(galleryFeature, { onUpload: uploadImageFile });

	// Includes toolbar and programmatic edits, which need not fire DOM input events.
	let ready = false;
	let savedMarkdown = (root.dataset.initialContent ?? '').trim();
	editor.on(listener => listener.markdownUpdated((_ctx, markdown, previous) => {
		if (ready && markdown !== previous && markdown.trim() !== savedMarkdown) changes.markDirty();
	}));
	await editor.create();
	// Navigation may have removed the form while Milkdown was loading.
	if (signal.aborted) {
		await editor.destroy();
		return;
	}
	signal.addEventListener('abort', () => void editor.destroy(), { once: true });
	savedMarkdown = editor.getMarkdown().trim();
	ready = true;

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		if (button.disabled) return;
		tagInput.commit();
		const tags = tagInput.getTags();
		const contentMd = editor.getMarkdown().trim();
		const postTitle = titleInput.value.trim();
		const postSlug = slug.value.trim();

		if (!postTitle || !contentMd) {
			status.textContent = 'A title and content are required.';
			return;
		}
		if (validateSlug()) {
			slug.reportValidity();
			return;
		}

		const savedRevision = changes.getRevision();
		button.disabled = true;
		status.textContent = postId ? 'Saving changes...' : 'Creating draft...';
		try {
			const { data: { session } } = await supabaseClient.auth.getSession();
			if (!session) throw new Error('Please log in before saving a post.');
			if (postId) {
				await blogApi.updatePost(postId, { title: postTitle, contentMd, slug: postSlug, tags }, session.access_token);
				status.textContent = 'Changes saved.';
			} else {
				const post = await blogApi.createPost({ title: postTitle, contentMd, slug: postSlug, tags }, session.access_token);
				if (signal.aborted) return;
				postId = post.id;
				// Preserves existing router history metadata while promoting the draft URL.
				history.replaceState(history.state, '', `/posts/edit/${encodeURIComponent(post.id)}`);
				status.textContent = 'Draft created.';
			}
			if (signal.aborted) return;
			savedMarkdown = contentMd;
			// Milkdown notifications are debounced; check the current content before clearing dirty state.
			if (editor.getMarkdown().trim() !== contentMd) changes.markDirty();
			if (!changes.markSaved(savedRevision)) status.textContent = 'Saved. You have newer unsaved changes.';
		} catch (error) {
			status.textContent = error instanceof Error ? error.message : 'Unable to save the post. Please try again.';
		} finally {
			button.disabled = false;
		}
	}, { signal });
}
