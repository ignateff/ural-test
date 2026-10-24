import "@testing-library/jest-dom/vitest";

globalThis.ResizeObserver = class { observe() {} disconnect() {} };
