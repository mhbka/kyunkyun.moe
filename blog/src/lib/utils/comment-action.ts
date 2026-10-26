/** Reports failed comment actions and tells forms whether it is safe to clear their text. */
export async function runCommentAction(action: () => Promise<void>, reportError: (message: string) => void) {
	reportError('');
	try {
		await action();
		return true;
	} catch (error) {
		reportError(error instanceof Error ? error.message : 'Unable to save your comment change. Please try again.');
		return false;
	}
}
