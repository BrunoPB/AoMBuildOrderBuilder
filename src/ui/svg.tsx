const PATHS: Record<string, string> = {
  plus: "M12 5v14M5 12h14",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  up: "M12 19V5M5 12l7-7 7 7",
  down: "M12 5v14M19 12l-7 7-7-7",
  grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
  play: "M7 4l13 8-13 8z",
  pause: "M8 5v14M16 5v14",
  reset: "M4 12a8 8 0 1 0 3-6.3M4 4v5h5",
  download: "M12 4v12M6 10l6 6 6-6M4 20h16",
  upload: "M12 20V8M6 14l6-6 6 6M4 4h16",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  globe:
    "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  warning: "M12 3l10 18H2zM12 10v4M12 17h.01",
  error: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15 9l-6 6M9 9l6 6",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7h.01",
  check: "M5 12l5 5 9-10",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 3",
  hammer: "M14 6l4 4M3 21l9-9M12 4l8 8-3 3-8-8z",
  sword: "M14.5 3H21v6.5L9 21l-6-6zM5 13l6 6M3 21l3-3",
  flask: "M9 3h6M10 3v6L4 20h16L14 9V3M7 14h10",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  arrows: "M4 8h13M13 4l4 4-4 4M20 16H7M11 12l-4 4 4 4",
  star: "M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z",
  repeat: "M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3",
  stop: "M6 6h12v12H6z",
  coin: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v10M9 9.5c0-1 1.3-1.5 3-1.5s3 .7 3 2-1.3 1.6-3 2-3 .8-3 2 1.3 2 3 2 3-.5 3-1.5",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  hourglass: "M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9",
  pyramid: "M3 21h18M5 21v-9M9.7 21v-9M14.3 21v-9M19 21v-9M2 10l10-6 10 6z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  home: "M3 11l9-8 9 8M5 9v12h14V9",
  chevron: "M9 6l6 6-6 6",
  monitor: "M3 4h18v12H3zM8 20h8M12 16v4",
  volume: "M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14",
  mute: "M11 5L6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6",
  milestone: "M12 2v20M5 5h11l-2 3 2 3H5",
};

export type SvgName = keyof typeof PATHS;

export function Svg({ name, label }: { name: string; label?: string }) {
  return (
    <svg
      class="svg-icon"
      viewBox="0 0 24 24"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={PATHS[name] ?? PATHS.info} />
    </svg>
  );
}

export const KIND_ICON: Record<string, string> = {
  train: "sword",
  ready: "sword",
  build: "hammer",
  research: "flask",
  age: "pyramid",
  move: "arrows",
  power: "bolt",
  timeShift: "hourglass",
  promote: "star",
  autoTrain: "repeat",
  stopAutoTrain: "stop",
  trainWhenAffordable: "coin",
  stopTrainWhenAffordable: "stop",
  event: "flag",
  rule: "repeat",
};
