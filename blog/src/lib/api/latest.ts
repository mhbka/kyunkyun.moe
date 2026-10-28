import type { ApiRequest } from '../models/api.ts';
import type { Latest } from '../models/latest.ts';

/** Creates requests for the cached home-page snapshot. */
export function createLatestApi(request: ApiRequest) {
	return {
		getLatest: () => request<Latest>('/latest'),
	};
}
