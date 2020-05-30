export interface HtmlNodeExtensions {
  readonly isDOM: boolean;
  readonly domNodes: HTMLElement[];
  readonly domNode: HTMLElement | null;
  readonly html: string;
  data(key: string): string | undefined;
}
