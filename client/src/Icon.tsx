import type { ReactNode } from "react";

type IconName = "arrowRight" | "check" | "eye" | "eyeOff" | "fingerprint" | "lock" | "mail" | "shield" | "sparkles" | "user" | "x";

const drawings: Record<IconName, ReactNode> = {
  arrowRight: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="m3 3 18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a15.8 15.8 0 0 1-3.1 3.9M6.2 6.2C3.5 8.1 2 12 2 12s3.6 7 10 7a10 10 0 0 0 3-.5" /></>,
  fingerprint: <><path d="M12 11a2 2 0 0 0-2 2c0 2.4-.3 4.6-1 6" /><path d="M14 13c0 3.2-.3 5.7-1.1 7.8" /><path d="M6.5 17.5c.3-1.4.5-3 .5-4.5a5 5 0 0 1 10 0c0 1.2 0 2.5-.1 3.7" /><path d="M4 14v-1a8 8 0 0 1 16 0v.5" /><path d="M8 21c.2-.5.4-1 .5-1.5M16.8 21c.3-.7.5-1.5.7-2.4" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /><path d="M12 14v3" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
  sparkles: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z" /><path d="m5 2 .7 1.8L7.5 4.5l-1.8.7L5 7l-.7-1.8-1.8-.7 1.8-.7L5 2Z" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
  x: <><path d="m18 6-12 12M6 6l12 12" /></>,
};

export function Icon({ name, size = 18, strokeWidth = 1.8 }: { name: IconName; size?: number; strokeWidth?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{drawings[name]}</svg>;
}
