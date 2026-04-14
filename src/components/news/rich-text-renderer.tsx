type RichTextRendererProps = {
  html: string;
};

export function injectHeadingIds(html: string): string {
  let i = 0;
  return html.replace(/<(h[1-6])([^>]*)>/gi, (_, tag, attrs) => {
    return `<${tag}${attrs} id="heading-${i++}">`;
  });
}

export function RichTextRenderer({ html }: RichTextRendererProps) {
  return (
    <article
      className="prose dark:prose-invert max-w-none w-full prose-headings:font-heading prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-strong:text-foreground prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-h5:text-sm prose-h6:text-sm prose-img:w-full prose-img:rounded-xl prose-img:max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
