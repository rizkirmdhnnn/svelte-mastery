/**
 * Parse a buffer of Server-Sent-Events text. Events are separated by a blank
 * line (`\n\n`). Within an event, the payload is the concatenation of every
 * `data:` line (joined by `\n`). Non-`data:` lines are ignored. Returns the
 * decoded payload strings plus any trailing partial text that has not yet been
 * terminated by a blank line (carry it into the next call).
 */
export function parseSSEEvents(buffer: string): { events: string[]; rest: string } {
	const events: string[] = [];
	let rest = buffer;
	let sep = rest.indexOf('\n\n');
	while (sep !== -1) {
		const block = rest.slice(0, sep);
		rest = rest.slice(sep + 2);
		const dataLines: string[] = [];
		for (const line of block.split('\n')) {
			if (line.startsWith('data:')) {
				dataLines.push(line.slice(5).replace(/^ /, ''));
			}
		}
		if (dataLines.length > 0) events.push(dataLines.join('\n'));
		sep = rest.indexOf('\n\n');
	}
	return { events, rest };
}
