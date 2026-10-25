import { $remark } from '@milkdown/kit/utils';
import remarkDirective from 'remark-directive';

/**
 * Registers `remark-directive` in Milkdown's remark pipeline so `:::gallery`
 * containers (and their `::pic` leaf directives) parse and serialize.
 * `remark-directive` adds both the micromark parse extension and the
 * `mdast-util-directive` stringify handlers.
 */
export const galleryRemarkPlugin = $remark('remark-gallery-directive', () => remarkDirective);
