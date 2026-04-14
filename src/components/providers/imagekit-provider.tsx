"use client";

import { ReactNode } from "react";
import { ImageKitProvider as Provider } from "@imagekit/react";

type ImageKitProviderProps = {
  children: ReactNode;
};

export function ImageKitProvider({ children }: ImageKitProviderProps) {
  return (
    <Provider urlEndpoint="https://ik.imagekit.io/oyvgbkwyt">
      {children}
    </Provider>
  );
}
