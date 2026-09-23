export function avatarSrc(key: string): string {
  return `/players/${key}.jpg`;
}

export function avatarName(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}
