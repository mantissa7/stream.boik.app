// Turns a raw chat message into a list of render tokens, resolving both
// Twitch's native emotes (positional, from message tags) and third-party
// BTTV/FFZ/7TV emotes (matched by word).

import type { EmoteMap } from "./emotes";

export type Token =
	| { type: "text"; value: string }
	| { type: "emote"; url: string; alt: string };

const twitchEmoteUrl = (id: string) =>
	`https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0`;

type Span = { start: number; end: number; id: string };

function parseTwitchSpans(emotes: Record<string, string[]>): Span[] {
	const spans: Span[] = [];
	for (const [id, ranges] of Object.entries(emotes)) {
		for (const range of ranges) {
			const [start, end] = range.split("-").map(Number);
			if (!Number.isNaN(start) && !Number.isNaN(end)) {
				spans.push({ start, end, id });
			}
		}
	}
	return spans.sort((a, b) => a.start - b.start);
}

export function tokenize(
	text: string,
	twitchEmotes: Record<string, string[]>,
	thirdParty: EmoteMap,
): Token[] {
	// Twitch emote positions are code-point offsets, not UTF-16 indices.
	const chars = Array.from(text);
	const spans = parseTwitchSpans(twitchEmotes);
	const tokens: Token[] = [];
	let textBuf = "";

	const flushText = () => {
		if (!textBuf) {
			return;
		}
		// Preserve whitespace so the message reads normally; replace any word
		// that matches a third-party emote with its image.
		for (const part of textBuf.split(/(\s+)/)) {
			const emote = thirdParty.get(part);
			if (emote) {
				tokens.push({ type: "emote", url: emote.url, alt: part });
			} else if (part) {
				tokens.push({ type: "text", value: part });
			}
		}
		textBuf = "";
	};

	let i = 0;
	let spanIdx = 0;
	while (i < chars.length) {
		// Skip any spans we've already passed (defensive against bad ranges).
		while (spans[spanIdx] && spans[spanIdx].start < i) {
			spanIdx++;
		}
		const span = spans[spanIdx];
		if (span && i === span.start) {
			flushText();
			const alt = chars.slice(span.start, span.end + 1).join("");
			tokens.push({ type: "emote", url: twitchEmoteUrl(span.id), alt });
			i = span.end + 1;
			spanIdx++;
		} else {
			textBuf += chars[i];
			i++;
		}
	}
	flushText();
	return tokens;
}
