import { $command, $inputRule } from '@milkdown/kit/utils';
import { InputRule } from '@milkdown/kit/prose/inputrules';

import { gallerySchema } from './schema.ts';

/** Inserts an empty gallery block at the current selection. */
export const insertGalleryCommand = $command('InsertGallery', (ctx) => () => (state, dispatch) => {
	const type = gallerySchema.type(ctx);
	const node = type.create({ caption: '', images: [] });
	if (dispatch) dispatch(state.tr.replaceSelectionWith(node).scrollIntoView());
	return true;
});

/** Inserts a gallery when the author types `:::gallery` on its own line. */
export const galleryInputRule = $inputRule((ctx) => new InputRule(/^:::gallery$/, (state, _match, start, end) => {
	const type = gallerySchema.type(ctx);
	return state.tr.replaceRangeWith(start, end, type.create({ caption: '', images: [] }));
}));
