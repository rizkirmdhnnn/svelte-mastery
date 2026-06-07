import { describe, it, expect } from 'vitest';
import { parseSSEEvents } from '$lib/chat/sse';

describe('parseSSEEvents', () => {
	it('extracts complete data events and keeps the trailing partial as rest', () => {
		const { events, rest } = parseSSEEvents('data: {"a":1}\n\ndata: {"b":2}\n\ndata: {"c"');
		expect(events).toEqual(['{"a":1}', '{"b":2}']);
		expect(rest).toBe('data: {"c"');
	});

	it('joins multiple data: lines within one event with newlines', () => {
		const { events } = parseSSEEvents('data: line1\ndata: line2\n\n');
		expect(events).toEqual(['line1\nline2']);
	});

	it('ignores non-data lines (comments, event:) and tolerates no space after colon', () => {
		const { events } = parseSSEEvents(': keep-alive\nevent: x\ndata:{"ok":true}\n\n');
		expect(events).toEqual(['{"ok":true}']);
	});

	it('returns no events and full rest when no blank-line terminator yet', () => {
		const { events, rest } = parseSSEEvents('data: {"partial":1}\n');
		expect(events).toEqual([]);
		expect(rest).toBe('data: {"partial":1}\n');
	});
});
