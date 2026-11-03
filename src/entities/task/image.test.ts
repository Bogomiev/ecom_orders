import { describe, it, expect } from "vitest";
import { qrImageSource } from "./image";
describe("task QR images",()=>{
 it("uses the uploaded image format for Base64 values",()=>{
  expect(qrImageSource("/9j/example")).toBe("data:image/jpeg;base64,/9j/example");
  expect(qrImageSource("R0lGODexample")).toBe("data:image/gif;base64,R0lGODexample");
  expect(qrImageSource("UklGRexample")).toBe("data:image/webp;base64,UklGRexample");
  expect(qrImageSource("iVBORexample")).toBe("data:image/png;base64,iVBORexample");
 });
 it("preserves an existing image data URL",()=>{
  expect(qrImageSource("data:image/png;base64,abc")).toBe("data:image/png;base64,abc");
  expect(qrImageSource("data:image/svg+xml;base64,abc")).toBe("data:image/svg+xml;base64,abc");
 });
 it("recognizes SVG icons with XML declarations and leading whitespace",()=>{
  for (const svg of ['<svg xmlns="http://www.w3.org/2000/svg"></svg>', '\n<?xml version="1.0"?>\n<!-- icon -->\n<svg></svg>']) {
   const value = btoa(svg);
   expect(qrImageSource(value)).toBe(`data:image/svg+xml;base64,${value}`);
  }
 });
});
