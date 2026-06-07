export type Role = 'user' | 'assistant';

/** A turn sent to the model (system is passed separately). */
export interface ChatTurn {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

/** A cited source lesson, derived from retrieval metadata. */
export interface ChatSource {
	slug: string;
	title: string;
	product: string;
	section: string;
}

/** A message as held in the client store / rendered in the UI. */
export interface UIMessage {
	id: string;
	role: Role;
	content: string;
	sources?: ChatSource[];
	status: 'streaming' | 'done' | 'error';
}

/** Normalized server→client stream events (our SSE protocol). */
export type ServerEvent =
	| { type: 'meta'; sources: ChatSource[] }
	| { type: 'token'; text: string }
	| { type: 'done' }
	| { type: 'error'; message: string };
