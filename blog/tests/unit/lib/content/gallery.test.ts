import assert from 'node:assert/strict';
import test from 'node:test';

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkDirective from 'remark-directive';

import {
	addImage,
	escapeHtml,
	galleryToDirectiveNode,
	moveImage,
	parseGallery,
	parseVideo,
	removeImage,
	renderGalleryHtml,
	renderVideoHtml,
	videoToDirectiveNode,
	type DirectiveNode,
	type Gallery,
} from '../../../../src/lib/content/gallery.ts';

test('escapeHtml escapes HTML-sensitive characters', () => {
	assert.equal(escapeHtml(`a & b < c > "d" 'e'`), 'a &amp; b &lt; c &gt; &quot;d&quot; &#39;e&#39;');
});

test('parseGallery rejects non-gallery directives', () => {
	const node: DirectiveNode = { type: 'containerDirective', name: 'note' };
	assert.equal(parseGallery(node), null);
});

test('parseGallery reads caption and ordered pic children', () => {
	const node: DirectiveNode = {
		type: 'containerDirective',
		name: 'gallery',
		attributes: { caption: 'My trip' },
		children: [
			{ type: 'leafDirective', name: 'pic', attributes: { src: 'https://x/1.jpg', caption: 'One' } },
			{ type: 'leafDirective', name: 'pic', attributes: { src: 'https://x/2.jpg', alt: 'Two' } },
		],
	};

	assert.deepEqual(parseGallery(node), {
		caption: 'My trip',
		images: [
			{ src: 'https://x/1.jpg', caption: 'One' },
			{ src: 'https://x/2.jpg', alt: 'Two' },
		],
	});
});

test('parseGallery drops pics without a src and trims whitespace', () => {
	const node: DirectiveNode = {
		type: 'containerDirective',
		name: 'gallery',
		attributes: { caption: '  ' },
		children: [
			{ type: 'leafDirective', name: 'pic', attributes: { caption: 'missing src' } },
			{ type: 'leafDirective', name: 'pic', attributes: { src: '  https://x/1.jpg  ' } },
		],
	};

	assert.deepEqual(parseGallery(node), {
		caption: undefined,
		images: [{ src: 'https://x/1.jpg' }],
	});
});

test('renderGalleryHtml renders a single image without navigation', () => {
	const gallery: Gallery = { images: [{ src: 'https://x/1.jpg' }] };

	const html = renderGalleryHtml(gallery);

	assert.match(html, /<figure class="gallery" data-gallery>/);
	assert.match(html, /<div class="gallery__viewport">/);
	assert.match(html, /<figure class="gallery__item"><img src="https:\/\/x\/1.jpg">/);
	assert.equal(html.includes('gallery__nav'), false);
	assert.equal(html.includes('gallery__counter'), false);
});

test('renderGalleryHtml renders video sources as video players', () => {
	const html = renderGalleryHtml({ images: [{ src: 'https://x/1.mp4?v=1' }, { src: 'https://x/2.jpg' }] });

	assert.match(html, /<video src="https:\/\/x\/1.mp4\?v=1" controls playsinline preload="metadata"><\/video>/);
	assert.match(html, /<img src="https:\/\/x\/2.jpg" loading="lazy">/);
});

test('renderMediaHtml marks transformed gallery images as loading', () => {
	const html = renderGalleryHtml({ images: [{ src: 'https://blogmedia.kyunkyun.moe/post-images/post/image.jpg' }] });

	assert.match(html, /<img class="media-loadable" data-loading src="https:\/\/blogmedia\.kyunkyun\.moe\/cdn-cgi\/image\/width=640/);
});

test('video directives parse, render, and round-trip', () => {
	const node = videoToDirectiveNode({ src: 'https://x/clip.webm', caption: 'Clip' });

	assert.deepEqual(parseVideo(node), { src: 'https://x/clip.webm', caption: 'Clip' });
	assert.equal(parseVideo({ type: 'leafDirective', name: 'video', attributes: {} }), null);
	assert.match(renderVideoHtml({ src: 'https://x/clip.webm', caption: 'Clip' }), /<figure class="video"><video src="https:\/\/x\/clip.webm"[^>]*><\/video><figcaption class="video__caption">Clip<\/figcaption>/);
});

test('renderGalleryHtml escapes the gallery and image captions', () => {
	const gallery: Gallery = {
		caption: 'a < b',
		images: [{ src: 'https://x/1.jpg', caption: 'c & "d"' }],
	};

	const html = renderGalleryHtml(gallery);

	assert.match(html, /<figcaption class="gallery__caption">a &lt; b<\/figcaption>/);
	assert.match(html, /<figcaption class="gallery__item-caption">c &amp; &quot;d&quot;<\/figcaption>/);
});

test('renderGalleryHtml renders navigation and hides non-first images', () => {
	const gallery: Gallery = {
		images: [
			{ src: 'https://x/1.jpg', alt: 'one' },
			{ src: 'https://x/2.jpg', caption: 'Two' },
		],
	};

	const html = renderGalleryHtml(gallery);

	assert.match(html, /<figure class="gallery__item"><img src="https:\/\/x\/1.jpg" alt="one">/);
	assert.match(html, /<figure class="gallery__item" hidden><img src="https:\/\/x\/2.jpg" loading="lazy">/);
	assert.match(html, /<button class="gallery__nav gallery__nav--prev"[^>]*data-gallery-prev/);
	assert.match(html, /<button class="gallery__nav gallery__nav--next"[^>]*data-gallery-next/);
	assert.match(html, /<span data-gallery-current>1<\/span> \/ <span data-gallery-total>2<\/span>/);
});

test('addImage appends without mutating the source', () => {
	const images = [{ src: 'a' }];
	const next = addImage(images, { src: 'b' });

	assert.deepEqual(images, [{ src: 'a' }]);
	assert.deepEqual(next, [{ src: 'a' }, { src: 'b' }]);
});

test('removeImage drops the entry at index', () => {
	const images = [{ src: 'a' }, { src: 'b' }, { src: 'c' }];

	assert.deepEqual(removeImage(images, 1), [{ src: 'a' }, { src: 'c' }]);
});

test('moveImage reorders and clamps the target position', () => {
	const images = [{ src: 'a' }, { src: 'b' }, { src: 'c' }];

	assert.deepEqual(moveImage(images, 0, 2), [{ src: 'b' }, { src: 'c' }, { src: 'a' }]);
	assert.deepEqual(moveImage(images, 2, 0), [{ src: 'c' }, { src: 'a' }, { src: 'b' }]);
	assert.deepEqual(moveImage(images, 1, 99), [{ src: 'a' }, { src: 'c' }, { src: 'b' }]);
	assert.deepEqual(moveImage(images, 1, 1), images);
});

test('galleryToDirectiveNode round-trips through parseGallery', () => {
	const gallery: Gallery = {
		caption: 'A "quoted" trip',
		images: [
			{ src: 'https://x/1.jpg', caption: 'One & only', alt: 'first' },
			{ src: 'https://x/2.jpg' },
		],
	};

	assert.deepEqual(parseGallery(galleryToDirectiveNode(gallery)), gallery);
});

test('gallery directive text round-trips through remark', () => {
	const gallery: Gallery = {
		caption: 'A "quoted" trip',
		images: [
			{ src: 'https://x/1.jpg', caption: 'One & only', alt: 'first' },
			{ src: 'https://x/2.jpg' },
		],
	};

	const processor = unified().use(remarkParse).use(remarkStringify).use(remarkDirective);
	const root = { type: 'root', children: [galleryToDirectiveNode(gallery)] } as Parameters<typeof processor.stringify>[0];
	const text = processor.stringify(root);
	const reparsed = processor.parse(text);

	assert.match(text, /^:::gallery\{/);
	assert.match(text, /::pic\{src="https:\/\/x\/1.jpg"/);
	assert.deepEqual(parseGallery(reparsed.children[0] as DirectiveNode), gallery);
});
