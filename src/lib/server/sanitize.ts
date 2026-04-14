import sanitizeHtml from "sanitize-html";

export function sanitizePlainText(value: string) {
  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}

export function sanitizeRichText(value: string) {
  return sanitizeHtml(value, {
    allowedTags: [
      "p",
      "b",
      "strong",
      "i",
      "em",
      "u",
      "s",
      "mark",
      "h1",
      "h2",
      "h3",
      "h4",
      "blockquote",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "code",
      "pre",
      "br",
      "hr",
      "span",
      "div",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height", "class", "style"],
      span: ["class", "style"],
      div: ["class"],
      p: ["class"],
      "*": ["class"],
    },
    allowedSchemes: ["http", "https", "mailto", "data"],
  }).trim();
}

