import { visit } from 'unist-util-visit';
import type { Node, Parent } from 'unist';

interface TextDirectiveNode extends Node {
	name: string;
	attributes?: Record<string, string | null | undefined>;
	children?: Node[];
}

/**
 * Turns inline `:name` text directives (e.g. the `:1` in "1:1") back into
 * plain text. Only `:::gallery` and `::pic` are real directives here.
 */
export function remarkRestoreTextDirectives() {
	return (tree: Node) => {
		visit(tree, 'textDirective', (node, index, parent) => {
			if (index == null || !parent) return;
			const directive = node as TextDirectiveNode;
			if (directive.children?.length || Object.keys(directive.attributes ?? {}).length) return;
			const siblings = (parent as Parent).children;
			const prev = siblings[index - 1] as (Node & { value?: string }) | undefined;
			const text = `:${directive.name}`;
			if (prev?.type === 'text' && typeof prev.value === 'string') {
				prev.value += text;
				siblings.splice(index, 1);
				return index;
			}
			siblings[index] = { type: 'text', value: text } as unknown as Node;
		});
	};
}
