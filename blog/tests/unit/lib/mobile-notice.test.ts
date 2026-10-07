import assert from 'node:assert/strict';
import test from 'node:test';
import { MOBILE_NOTICE_STORAGE_KEY, markMobileNoticeShown, shouldShowMobileNotice } from '../../../src/lib/mobile-notice.ts';

/** Creates the small part of browser storage needed by the notice. */
function createStorage() {
	const values = new Map<string, string>();
	return {
		getItem(key: string) { return values.get(key) ?? null; },
		setItem(key: string, value: string) { values.set(key, value); },
	};
}

test('shows the mobile notice before it has been recorded', () => {
	const storage = createStorage();

	assert.equal(shouldShowMobileNotice(storage), true);
});

test('does not show the mobile notice after recording it', () => {
	const storage = createStorage();

	markMobileNoticeShown(storage);

	assert.equal(storage.getItem(MOBILE_NOTICE_STORAGE_KEY), 'true');
	assert.equal(shouldShowMobileNotice(storage), false);
});
