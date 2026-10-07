/** Stores whether the visitor has already seen the mobile notice. */
export const MOBILE_NOTICE_STORAGE_KEY = 'mobile-notice-shown';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

/** Returns whether the mobile notice has not yet been shown on this device. */
export function shouldShowMobileNotice(storage: StorageLike) {
	return storage.getItem(MOBILE_NOTICE_STORAGE_KEY) !== 'true';
}

/** Records the notice before it becomes visible to avoid showing it again. */
export function markMobileNoticeShown(storage: StorageLike) {
	storage.setItem(MOBILE_NOTICE_STORAGE_KEY, 'true');
}
