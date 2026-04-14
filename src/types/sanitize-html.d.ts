declare module "sanitize-html" {
  type AllowedAttributeMap = Record<string, string[]>;

  type SanitizeOptions = {
    allowedTags?: string[];
    allowedAttributes?: AllowedAttributeMap;
    allowedSchemes?: string[];
    disallowedTagsMode?: "discard" | "completelyDiscard" | "escape" | "recursiveEscape";
  };

  export default function sanitizeHtml(input: string, options?: SanitizeOptions): string;
}
