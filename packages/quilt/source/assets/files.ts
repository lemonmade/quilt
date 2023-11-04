// Declare modules for file types that are transformed into
// URL references.

// @see https://github.com/lemonmade/quilt/blob/main/packages/rollup/source/features/assets.ts
// @see https://github.com/vitejs/vite/blob/76fdc27437d37534cf157bf869a648e0d176b267/packages/vite/src/node/constants.ts#L63-L95

declare module '*.jpg' {
  const source: string;
  export default source;
}

declare module '*.jpeg' {
  const source: string;
  export default source;
}

declare module '*.png' {
  const source: string;
  export default source;
}

declare module '*.gif' {
  const source: string;
  export default source;
}

declare module '*.svg' {
  const source: string;
  export default source;
}

declare module '*.ico' {
  const source: string;
  export default source;
}

declare module '*.webp' {
  const source: string;
  export default source;
}

declare module '*.avif' {
  const source: string;
  export default source;
}

declare module '*.mp4' {
  const source: string;
  export default source;
}

declare module '*.webm' {
  const source: string;
  export default source;
}

declare module '*.ogg' {
  const source: string;
  export default source;
}

declare module '*.mp3' {
  const source: string;
  export default source;
}

declare module '*.wav' {
  const source: string;
  export default source;
}

declare module '*.flac' {
  const source: string;
  export default source;
}

declare module '*.aac' {
  const source: string;
  export default source;
}

// fonts

declare module '*.woff' {
  const source: string;
  export default source;
}

declare module '*.woff2' {
  const source: string;
  export default source;
}

declare module '*.eot' {
  const source: string;
  export default source;
}

declare module '*.ttf' {
  const source: string;
  export default source;
}

declare module '*.otf' {
  const source: string;
  export default source;
}

declare module '*.webmanifest' {
  const source: string;
  export default source;
}

declare module '*.pdf' {
  const source: string;
  export default source;
}

declare module '*.txt' {
  const source: string;
  export default source;
}

// Special query params

declare module '*?raw' {
  const source: string;
  export default source;
}
