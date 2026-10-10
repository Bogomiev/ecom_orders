import { describe, expect, it } from "vitest";
import { formatScannedMark } from "./format-scanned-mark";

describe("formatScannedMark", () => {
  it.each([
    ["0104640112480084215b7Hpg\u001d93JDyA", "(01)04640112480084(21)5b7Hpg(93)JDyA"],
    ["0104640112480084215b7Hpg93JDyA", "(01)04640112480084(21)5b7Hpg(93)JDyA"],
    ["0104650257360424215+Q9(X\u001d91ABCD\u001d92signature", "(01)04650257360424(21)5+Q9(X"],
    ["0104650257360486215ОЧФшз91УУ1292ЩоШЙЯИУ6зеЩуд4.ЬЯЦвфщЙПВ+еЧЛепЦзИЩрраЬщфггы=", "(01)04650257360486(21)5JXAip"],
    ["(01)04650257360424(21)5+Q9(X", "(01)04650257360424(21)5+Q9(X"],
    ["010464011248008421abc93def\u001d91ABCD\u001d92signature", "(01)04640112480084(21)abc93def"],
    ["(01)04640112480084(21)5b7Hpg(93)JDyA", "(01)04640112480084(21)5b7Hpg(93)JDyA"]
  ])("formats %j", (input, expected) => {
    expect(formatScannedMark(input)).toBe(expected);
    expect(formatScannedMark(expected)).toBe(expected);
  });
});
