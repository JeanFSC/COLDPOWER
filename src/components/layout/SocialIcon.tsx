type SocialIconName = "facebook" | "instagram" | "linkedin" | "youtube";

export function SocialIcon({ name }: { name: SocialIconName }) {
  if (name === "facebook") return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.7 22v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V4.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.3H8v3.1h2.6v8h3.1Z" /></svg>;
  if (name === "instagram") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" /></svg>;
  if (name === "linkedin") return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 8.2A1.8 1.8 0 1 0 5 4.6a1.8 1.8 0 0 0 0 3.6ZM3.5 20h3V9.6h-3V20Zm5 0h3v-5.2c0-1.4.3-2.8 2-2.8 1.7 0 1.7 1.7 1.7 2.9V20h3v-5.7c0-2.8-.6-5-3.9-5-1.6 0-2.7.9-3.1 1.7h-.1V9.6h-2.9V20Z" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.6 7.2a2.8 2.8 0 0 0-2-2C17.8 4.7 12 4.7 12 4.7s-5.8 0-7.6.5a2.8 2.8 0 0 0-2 2C2 9 2 12 2 12s0 3 .4 4.8a2.8 2.8 0 0 0 2 2c1.8.5 7.6.5 7.6.5s5.8 0 7.6-.5a2.8 2.8 0 0 0 2-2C22 15 22 12 22 12s0-3-.4-4.8ZM10 15.5v-7l6 3.5-6 3.5Z" /></svg>;
}
