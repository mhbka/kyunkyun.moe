import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { readTagFilters, toggleTagUrl } from '../../../src/lib/tags.ts';

/** Executes a component's bootstrap while substituting browser and API dependencies. */
function runComponent(path: string, globals: object) {
	const source = readFileSync(new URL(`../../../src/${path}`, import.meta.url), 'utf8');
	const script = source.match(/<script>([\s\S]*?)<\/script>/)![1].replace(/^\s*import .*;$/gm, '');
	runInNewContext(ts.transpile(script, { target: ts.ScriptTarget.ES2022 }), globals);
}

test('initializes tweets on a normal load and does not bind the same timeline twice', () => {
	const events = new EventTarget();
	let timeline = {};
	const initialized: object[] = [];
	runComponent('components/tweets/TweetTimeline.astro', {
		document: { querySelector: () => timeline, addEventListener: events.addEventListener.bind(events) },
		initTweetTimeline: (element: object) => initialized.push(element),
	});
	assert.deepEqual(initialized, [timeline]);
	events.dispatchEvent(new Event('astro:page-load'));
	assert.equal(initialized.length, 1);
	timeline = {};
	events.dispatchEvent(new Event('astro:page-load'));
	assert.equal(initialized.length, 2);
});

test('draft publish controls work without a router event and bind only once', async () => {
	const events = new EventTarget();
	const handlers: Array<() => Promise<void>> = [];
	const published: string[] = [];
	let removed = false;
	const list = {};
	const button = { dataset: { publishId: 'draft-1' }, disabled: false, addEventListener: (_name: string, fn: () => Promise<void>) => handlers.push(fn) };
	runComponent('pages/blog/drafts.astro', {
		CSS: { escape: (value: string) => value },
		window: { alert: assert.fail },
		blogApi: { publishPost: async (id: string) => published.push(id) },
		createSupabaseBrowserClient: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'token' } } }) } }),
		document: {
			querySelector: (selector: string) => {
				if (selector === '#draft-list') return list;
				if (selector.startsWith('[data-draft-id')) return { remove() { removed = true; } };
				return null;
			},
			querySelectorAll: (selector: string) => selector === '[data-publish-id]' ? [button] : [],
			addEventListener: events.addEventListener.bind(events),
		},
	});
	assert.equal(handlers.length, 1);
	events.dispatchEvent(new Event('astro:page-load'));
	assert.equal(handlers.length, 1);
	await handlers[0]();
	assert.deepEqual(published, ['draft-1']);
	assert.equal(removed, true);
});

test('title hover binds on normal page loads and respects reduced motion', () => {
	for (const reduced of [false, true]) {
		const events: string[] = [];
		runComponent('components/PageTitle.astro', {
			AbortController,
			window: { matchMedia: () => ({ matches: reduced }) },
			document: { addEventListener: (name: string) => events.push(name) },
		});
		assert.equal(events.includes('pointermove'), !reduced);
	}
});

test('tag filtering works immediately and restores filters on browser history changes', () => {
	const listeners = new Map<string, (event: any) => void>();
	const location = { href: 'https://example.test/blog/?page=2', pathname: '/blog/' };
	const selections: string[][] = [];
	const filter = {
		dataset: { clientFilter: 'true' }, querySelectorAll: () => [],
		addEventListener: (name: string, fn: (event: any) => void) => listeners.set(name, fn),
	};
	runComponent('components/TagFilter.astro', {
		AbortController, CustomEvent, URL, readTagFilters, toggleTagUrl,
		document: { querySelector: () => filter, addEventListener() {}, dispatchEvent: (event: CustomEvent<string[]>) => selections.push(event.detail) },
		window: { location, history: { pushState: (_state: unknown, _title: string, url: URL) => { location.href = url.href; } }, addEventListener: (name: string, fn: (event: any) => void) => listeners.set(name, fn) },
	});
	let prevented = false;
	listeners.get('click')!({ button: 0, target: { closest: () => ({ href: 'https://example.test/blog/?tag=astro' }) }, preventDefault() { prevented = true; } });
	assert.equal(prevented, true);
	assert.deepEqual(selections, [['astro']]);
	location.href = 'https://example.test/blog/?page=2';
	listeners.get('popstate')!({});
	assert.deepEqual(selections, [['astro'], []]);
});
