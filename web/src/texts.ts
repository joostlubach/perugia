import { parse } from 'yaml';
import raw from './texts.yaml?raw';

// Looks up a UI text in texts.yaml by dotted key (e.g. 'player.lobby.title')
// and fills in its {placeholders}. With a `count` var of 1, the `<key>_one`
// variant is used if there is one. A missing key shows up as the key itself.
export function t(key: string, vars: Record<string, string | number> = {}): string {
  const text = (vars.count === 1 ? lookup(`${key}_one`) : undefined) ?? lookup(key);
  if (text === undefined) return key;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

const TEXTS: unknown = parse(raw);

function lookup(key: string): string | undefined {
  let node: unknown = TEXTS;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}
