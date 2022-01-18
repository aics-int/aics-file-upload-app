import React from "react";

export function createEnterKeyHandler(handler: () => void) {
  return (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handler();
    }
  };
}
