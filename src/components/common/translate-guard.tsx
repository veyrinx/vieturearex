"use client";

import { useEffect } from "react";

/**
 * Google Translate rewrites text nodes in place. When React later tries to
 * remove/replace a node that Google Translate has already swapped, the browser
 * throws:
 *   "Failed to execute 'removeChild' on 'Node': The node to be removed is not
 *    a child of this node."
 * (same for insertBefore). This crashes the whole app on client navigation.
 *
 * Well-known mitigation: make removeChild/insertBefore defensive so that when
 * the target isn't actually a child, we no-op instead of throwing. Only patches
 * once, and only guards the specific mismatch case.
 */
export function TranslateGuard() {
  useEffect(() => {
    if (typeof Node !== "function" || (window as unknown as { __translateGuard?: boolean }).__translateGuard) return;
    (window as unknown as { __translateGuard?: boolean }).__translateGuard = true;

    const originalRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
      if (child.parentNode !== this) {
        return child;
      }
      return originalRemoveChild.call(this, child) as T;
    };

    const originalInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function <T extends Node>(this: Node, newNode: T, referenceNode: Node | null): T {
      if (referenceNode && referenceNode.parentNode !== this) {
        return originalInsertBefore.call(this, newNode, null) as T;
      }
      return originalInsertBefore.call(this, newNode, referenceNode) as T;
    };
  }, []);

  return null;
}
