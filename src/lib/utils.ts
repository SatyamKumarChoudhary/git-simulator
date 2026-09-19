export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
