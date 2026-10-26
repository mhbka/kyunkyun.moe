import { $remark } from '@milkdown/kit/utils';
import remarkDirective from 'remark-directive';

import { remarkRestoreTextDirectives } from '../../../lib/content/restore-text-directives.ts';

/**
 * Registers `remark-directive` in Milkdown's remark pipeline so `:::gallery`
 * containers (and their `::pic` leaf directives) parse and serialize.
 * `remark-directive` adds both the micromark parse extension and the
 * `mdast-util-directive` stringify handlers.
 */
export const galleryRemarkPlugin = $remark('remark-gallery-directive', () => remarkDirective);

/** Keeps stray inline `:name` text (like "1:1") as plain text instead of failing to parse. */
export const restoreTextDirectivesPlugin = $remark(
	'remark-restore-text-directives',
	() => remarkRestoreTextDirectives,
);
