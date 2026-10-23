import React from "react";

export function createEnterKeyHandler<T>(handler: () => void) {
  return (e: React.KeyboardEvent<T>) => {
    if (e.key === "Enter") {
      handler();
    }
  };
}
