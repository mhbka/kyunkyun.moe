import assert from 'node:assert/strict';
import test from 'node:test';
import { finishPixPortalImageLoad, startPixPortalImageLoad } from '../../../../src/components/pix/portal-image.ts';

/** Creates the minimal image surface needed by the portal loader. */
function createImage() {
	return {
		src: 'https://pix.example.test/images/previous.jpg',
		dataset: {} as { loading?: string },
		removeAttribute(name: string) {
			if (name === 'src') this.src = '';
		},
	};
}

test('clears the previous portal image before loading the next one', () => {
	const image = createImage();
	startPixPortalImageLoad(image, 'https://pix.example.test/images/next.jpg');

	assert.equal(image.dataset.loading, '');
	assert.equal(
		image.src,
		'https://pix.example.test/cdn-cgi/image/width=1920,height=1920,fit=scale-down,format=auto,quality=85/images/next.jpg',
	);

	finishPixPortalImageLoad(image);
	assert.equal(image.dataset.loading, undefined);
});
