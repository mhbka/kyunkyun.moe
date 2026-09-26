/** Wires file selection and drag-and-drop for a shared upload control. */
export function initFileDropzone(root: HTMLElement, onFiles: (files: FileList) => void) {
	const input = root.querySelector<HTMLInputElement>('[data-file-dropzone-input]');
	if (!input) return;

	input.addEventListener('change', () => {
		if (input.files?.length) onFiles(input.files);
	});
	for (const eventName of ['dragenter', 'dragover']) {
		root.addEventListener(eventName, (event) => {
			event.preventDefault();
			root.classList.add('is-dragging');
		});
	}
	for (const eventName of ['dragleave', 'drop']) {
		root.addEventListener(eventName, (event) => {
			event.preventDefault();
			root.classList.remove('is-dragging');
		});
	}
	root.addEventListener('drop', (event) => {
		if (event.dataTransfer?.files.length) onFiles(event.dataTransfer.files);
	});
}
