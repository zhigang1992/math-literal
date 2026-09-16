import { BigJSON, BigNumber, JSONParseError, math } from '../src/index';
import type { BigNumberSource } from '../src/index';

/** Assert `value` is a BigNumber and return its canonical decimal string. */
const num = (value: unknown): string => {
  if (!BigNumber.isBigNumber(value)) {
    throw new Error(`expected a BigNumber, got ${String(value)}`);
  }
  return BigNumber.toString(value);
};

/** Walk into a parsed structure without fighting the index signatures. */
const at = (value: unknown, ...path: Array<string | number>): unknown =>
  path.reduce<unknown>(
    (acc, key) => (acc == null ? acc : Reflect.get(Object(acc), String(key))),
    value
  );

describe('BigJSON.parse', () => {
  describe('numbers become BigNumber', () => {
    it('promotes every number, not just unsafe integers', () => {
      const parsed = BigJSON.parse('{"small": 1, "big": 9223372036854775807}');
      expect(BigNumber.isBigNumber(at(parsed, 'small'))).toBe(true);
      expect(BigNumber.isBigNumber(at(parsed, 'big'))).toBe(true);
      expect(num(at(parsed, 'small'))).toEqual('1');
      expect(num(at(parsed, 'big'))).toEqual('9223372036854775807');
    });

    it('keeps integers that a double would round', () => {
      expect(num(BigJSON.parse('9223372036854775807'))).toEqual(
        '9223372036854775807'
      );
      // What JSON.parse does to the same input, for contrast.
      expect(String(JSON.parse('9223372036854775807'))).toEqual(
        '9223372036854776000'
      );
    });

    it('keeps decimals exactly as written', () => {
      expect(num(BigJSON.parse('0.1'))).toEqual('0.1');
      expect(num(BigJSON.parse('0.30000000000000004'))).toEqual(
        '0.30000000000000004'
      );
      expect(num(BigJSON.parse('1.000000000000000000000000000001'))).toEqual(
        '1.000000000000000000000000000001'
      );
    });

    it('parses signs, zero and exponents', () => {
      expect(num(BigJSON.parse('0'))).toEqual('0');
      expect(num(BigJSON.parse('-0'))).toEqual('0');
      expect(num(BigJSON.parse('-42'))).toEqual('-42');
      expect(num(BigJSON.parse('1e3'))).toEqual('1000');
      expect(num(BigJSON.parse('1E3'))).toEqual('1000');
      expect(num(BigJSON.parse('1e+3'))).toEqual('1000');
      expect(num(BigJSON.parse('-1.5e-3'))).toEqual('-0.0015');
    });

    it('accepts magnitudes that overflow a double', () => {
      // JSON.parse turns this into Infinity.
      expect(num(BigJSON.parse('1e400'))).toEqual('1e+400');
      expect(num(BigJSON.parse('1e-400'))).toEqual('1e-400');
    });

    it('rejects an exponent it cannot represent', () => {
      // decimal.js saturates to Infinity here rather than throwing, and a
      // silently wrong value is worse than a parse error.
      expect(() => BigJSON.parse('1e999999999999999999')).toThrow(
        /out of range/
      );
      expect(() => BigJSON.parse('1.5e1012345678901234567890')).toThrow(
        JSONParseError
      );
    });

    it('underflows to zero the way the number grammar implies', () => {
      expect(num(BigJSON.parse('1e-999999999999999999'))).toEqual('0');
    });

    it('feeds straight into the math template', () => {
      const parsed = BigJSON.parse('{"price": 0.1, "qty": 3}');
      const price = at(parsed, 'price') as BigNumberSource;
      const qty = at(parsed, 'qty') as BigNumberSource;
      expect(BigNumber.toString(math`${price} * ${qty}`)).toEqual('0.3');
    });
  });

  describe('primitives, arrays and objects', () => {
    it('parses literals', () => {
      expect(BigJSON.parse('true')).toBe(true);
      expect(BigJSON.parse('false')).toBe(false);
      expect(BigJSON.parse('null')).toBe(null);
      expect(BigJSON.parse('"hi"')).toEqual('hi');
    });

    it('parses empty and nested containers', () => {
      expect(BigJSON.parse('[]')).toEqual([]);
      expect(BigJSON.parse('{}')).toEqual({});
      const parsed = BigJSON.parse('{"a": [1, {"b": [2]}]}');
      expect(num(at(parsed, 'a', 0))).toEqual('1');
      expect(num(at(parsed, 'a', 1, 'b', 0))).toEqual('2');
    });

    it('tolerates the JSON whitespace set anywhere', () => {
      const parsed = BigJSON.parse('\t\r\n { "a" :\n[ 1 ,\t2 ] }\n ');
      expect(num(at(parsed, 'a', 1))).toEqual('2');
    });

    it('decodes string escapes', () => {
      expect(BigJSON.parse('"a\\"b"')).toEqual('a"b');
      expect(BigJSON.parse('"\\\\"')).toEqual('\\');
      expect(BigJSON.parse('"\\/"')).toEqual('/');
      expect(BigJSON.parse('"\\b\\f\\n\\r\\t"')).toEqual('\b\f\n\r\t');
      expect(BigJSON.parse('"\\u00e9"')).toEqual('é');
      expect(BigJSON.parse('"\\ud83d\\ude00"')).toEqual('😀');
      expect(BigJSON.parse('"mixed \\u0041 tail"')).toEqual('mixed A tail');
    });

    it('produces objects with a normal prototype', () => {
      const parsed = BigJSON.parse('{"a": 1}');
      expect(Object.getPrototypeOf(parsed)).toBe(Object.prototype);
      expect(Object.prototype.hasOwnProperty.call(parsed, 'a')).toBe(true);
    });
  });

  describe('duplicate keys', () => {
    const dupes = '{"k": 1, "k": 2}';

    it('keeps the last value by default', () => {
      expect(num(at(BigJSON.parse(dupes), 'k'))).toEqual('2');
    });

    it('throws under strict', () => {
      expect(() => BigJSON.parse(dupes, { strict: true })).toThrow(
        /Duplicate key "k"/
      );
    });
  });

  describe('prototype poisoning', () => {
    const proto = '{"__proto__": {"polluted": true}}';
    const ctor = '{"constructor": {"prototype": {"polluted": true}}}';

    it('rejects __proto__ and constructor keys by default', () => {
      expect(() => BigJSON.parse(proto)).toThrow(/forbidden "__proto__"/);
      expect(() => BigJSON.parse(ctor)).toThrow(/forbidden "constructor"/);
    });

    it('drops them under "ignore" and keeps parsing the rest', () => {
      const parsed = BigJSON.parse('{"__proto__": {"x": 1}, "safe": 2}', {
        protoAction: 'ignore',
      });
      expect(Object.keys(parsed as object)).toEqual(['safe']);
      expect(num(at(parsed, 'safe'))).toEqual('2');
    });

    it('keeps __proto__ as an own property under "preserve"', () => {
      const parsed = BigJSON.parse(proto, { protoAction: 'preserve' });
      expect(Object.prototype.hasOwnProperty.call(parsed, '__proto__')).toBe(
        true
      );
      // The real prototype chain is untouched.
      expect(Object.getPrototypeOf(parsed)).toBe(Object.prototype);
      expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    });

    it('does not leak into Object.prototype under any action', () => {
      for (const action of ['ignore', 'preserve'] as const) {
        BigJSON.parse(proto, { protoAction: action });
      }
      expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    });
  });

  describe('malformed input', () => {
    const bad: Array<[label: string, text: string]> = [
      ['empty input', ''],
      ['trailing content', '{} {}'],
      ['trailing comma in array', '[1,]'],
      ['trailing comma in object', '{"a":1,}'],
      ['unterminated array', '[1, 2'],
      ['unterminated object', '{"a": 1'],
      ['unterminated string', '"abc'],
      ['unquoted key', '{a: 1}'],
      ['single quotes', "'a'"],
      ['leading zero', '01'],
      ['leading plus', '+1'],
      ['bare minus', '-'],
      ['no digit after point', '1.'],
      ['no digit before point', '.5'],
      ['empty exponent', '1e'],
      ['exponent with no digits', '1e+'],
      ['hex literal', '0x10'],
      ['Infinity', 'Infinity'],
      ['NaN', 'NaN'],
      ['undefined', 'undefined'],
      ['truncated keyword', 'tru'],
      ['raw control character in string', `"a${String.fromCharCode(1)}b"`],
      ['unknown escape', '"\\x"'],
      ['short \\u escape', '"\\u12"'],
    ];

    for (const [label, text] of bad) {
      it(`rejects ${label}`, () => {
        expect(() => BigJSON.parse(text)).toThrow(JSONParseError);
      });
    }

    it('reports position and source on the error', () => {
      try {
        BigJSON.parse('{"a": 01}');
        throw new Error('should have thrown');
      } catch (error) {
        if (!(error instanceof JSONParseError)) throw error;
        expect(error.name).toEqual('JSONParseError');
        expect(error instanceof SyntaxError).toBe(true);
        expect(error.text).toEqual('{"a": 01}');
        expect(error.at).toBeGreaterThan(0);
        expect(error.message).toMatch(/at position \d+/);
      }
    });

    it('agrees with JSON.parse on what is valid', () => {
      const inputs = [
        '{"a":1}',
        '[1,2,3]',
        '"x"',
        'null',
        '01',
        '[1,]',
        '{a:1}',
        '1.',
        'NaN',
      ];
      for (const input of inputs) {
        const nativeOk = (() => {
          try {
            JSON.parse(input);
            return true;
          } catch {
            return false;
          }
        })();
        const oursOk = (() => {
          try {
            BigJSON.parse(input);
            return true;
          } catch {
            return false;
          }
        })();
        expect([input, oursOk]).toEqual([input, nativeOk]);
      }
    });
  });

  describe('reviver', () => {
    it('receives every key bottom-up and can replace values', () => {
      const seen: string[] = [];
      const result = BigJSON.parse('{"a": {"b": 1}}', {
        reviver(key, value) {
          seen.push(key);
          return value;
        },
      });
      expect(seen).toEqual(['b', 'a', '']);
      expect(num(at(result, 'a', 'b'))).toEqual('1');
    });

    it('deletes a member when it returns undefined', () => {
      const result = BigJSON.parse('{"keep": 1, "drop": 2}', {
        reviver: (key, value) => (key === 'drop' ? undefined : value),
      });
      expect(Object.keys(result as object)).toEqual(['keep']);
    });

    it('hands over BigNumbers without walking their internals', () => {
      const keys: string[] = [];
      BigJSON.parse('{"n": 1}', {
        reviver(key, value) {
          keys.push(key);
          return value;
        },
      });
      // Decimal instances carry enumerable `s`, `e` and `d` fields; a naive
      // walk would surface them here.
      expect(keys).toEqual(['n', '']);
    });

    it('can convert BigNumbers to plain numbers', () => {
      const result = BigJSON.parse('{"n": 1.5}', {
        reviver: (_key, value) =>
          BigNumber.isBigNumber(value) ? BigNumber.toNumber(value) : value,
      });
      expect(at(result, 'n')).toEqual(1.5);
    });

    it('can re-enter the parser, because state is per call', () => {
      const result = BigJSON.parse('{"nested": "{\\"n\\": 7}"}', {
        reviver: (key, value) =>
          key === 'nested' && typeof value === 'string'
            ? BigJSON.parse(value)
            : value,
      });
      expect(num(at(result, 'nested', 'n'))).toEqual('7');
    });

    it('still applies the other options', () => {
      expect(() =>
        BigJSON.parse('{"k":1,"k":2}', { strict: true, reviver: (_k, v) => v })
      ).toThrow(/Duplicate key/);
    });
  });
});

describe('BigJSON.stringify', () => {
  it('writes BigNumbers as bare JSON numbers', () => {
    const value = BigJSON.parse('{"id": 9223372036854775807}');
    expect(BigJSON.stringify(value)).toEqual('{"id":9223372036854775807}');
  });

  it('round-trips without drift', () => {
    const inputs = [
      '{"id":9223372036854775807,"price":0.1}',
      '[1,2.5,-3,0,1000]',
      '{"a":{"b":[{"c":123456789012345678901234567890}]}}',
      '{"s":"text","t":true,"f":false,"n":null}',
      '[]',
      '{}',
      '{"deep":{"deeper":{"deepest":0.000000000000000000001}}}',
    ];
    for (const input of inputs) {
      expect(BigJSON.stringify(BigJSON.parse(input))).toEqual(input);
    }
  });

  it('prefers plain notation over exponential for big integers', () => {
    expect(BigJSON.stringify(BigNumber.from('1e30'))).toEqual(
      '1000000000000000000000000000000'
    );
    expect(BigJSON.stringify(BigNumber.from('1e-8'))).toEqual('0.00000001');
  });

  it('falls back to exponential past the plain-notation budget', () => {
    for (const [source, expected] of [
      ['1e99', '1'.padEnd(100, '0')],
      ['1e200', '1e+200'],
      ['1e-99', `0.${'0'.repeat(98)}1`],
      ['1e-200', '1e-200'],
    ] as const) {
      const rendered = BigJSON.stringify(BigNumber.from(source));
      expect([source, rendered]).toEqual([source, expected]);
      // Whichever form we picked, it is valid JSON and still the same value.
      expect(BigNumber.isEq(BigJSON.parse(rendered ?? ''), source)).toBe(true);
    }
  });

  it('writes null for a non-finite BigNumber', () => {
    // decimal.js yields Infinity for x / 0; JSON has no way to spell that.
    expect(BigJSON.stringify({ n: BigNumber.div(1, 0) })).toEqual('{"n":null}');
    expect(BigJSON.stringify({ n: BigNumber.from(NaN) })).toEqual('{"n":null}');
  });

  it('accepts a BigNumber at the top level', () => {
    expect(BigJSON.stringify(BigNumber.from('12.5'))).toEqual('12.5');
  });

  it('handles the plain JSON types', () => {
    expect(BigJSON.stringify('a"b')).toEqual('"a\\"b"');
    expect(BigJSON.stringify(true)).toEqual('true');
    expect(BigJSON.stringify(null)).toEqual('null');
    expect(BigJSON.stringify(1.5)).toEqual('1.5');
    expect(BigJSON.stringify([1, 'two', null])).toEqual('[1,"two",null]');
  });

  it('writes non-finite numbers as null, like JSON.stringify', () => {
    expect(BigJSON.stringify([NaN, Infinity, -Infinity])).toEqual(
      '[null,null,null]'
    );
  });

  it('writes native bigints as numbers instead of throwing', () => {
    expect(BigJSON.stringify({ n: 10n ** 30n })).toEqual(
      '{"n":1000000000000000000000000000000}'
    );
    expect(() => JSON.stringify({ n: 1n })).toThrow();
  });

  it('drops undefined, functions and symbols in objects', () => {
    const value = { a: 1, b: undefined, c: () => 1, d: Symbol('d') };
    expect(BigJSON.stringify(value)).toEqual('{"a":1}');
  });

  it('nulls them out inside arrays', () => {
    expect(BigJSON.stringify([1, undefined, () => 1])).toEqual('[1,null,null]');
  });

  it('returns undefined for a bare undefined or function', () => {
    expect(BigJSON.stringify(undefined)).toBeUndefined();
    expect(BigJSON.stringify(() => 1)).toBeUndefined();
  });

  it('honours toJSON on other objects', () => {
    const date = new Date('2020-01-02T03:04:05.000Z');
    expect(BigJSON.stringify({ date })).toEqual(
      '{"date":"2020-01-02T03:04:05.000Z"}'
    );
  });

  it('does not let BigNumber toJSON turn the number into a string', () => {
    // decimal.js defines toJSON; if it ran, this would come back quoted.
    expect(BigJSON.stringify({ n: BigNumber.from('1.5') })).toEqual(
      '{"n":1.5}'
    );
  });

  describe('space', () => {
    const value = BigJSON.parse('{"a":1,"b":[2,3]}');

    it('indents with a number of spaces', () => {
      expect(BigJSON.stringify(value, { space: 2 })).toEqual(
        '{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}'
      );
    });

    it('indents with a string', () => {
      expect(BigJSON.stringify(value, { space: '\t' })).toEqual(
        '{\n\t"a": 1,\n\t"b": [\n\t\t2,\n\t\t3\n\t]\n}'
      );
    });

    it('caps the indent at 10 like JSON.stringify', () => {
      const ours = BigJSON.stringify({ a: 1 }, { space: 20 });
      expect(ours).toEqual(JSON.stringify({ a: 1 }, null, 20));
    });

    it('leaves empty containers on one line', () => {
      expect(BigJSON.stringify({ a: {}, b: [] }, { space: 2 })).toEqual(
        '{\n  "a": {},\n  "b": []\n}'
      );
    });
  });

  describe('replacer', () => {
    it('maps values through a function', () => {
      const result = BigJSON.stringify(
        { a: 1, b: 2 },
        { replacer: (key, value) => (key === 'b' ? undefined : value) }
      );
      expect(result).toEqual('{"a":1}');
    });

    it('sees BigNumbers before they are rendered', () => {
      const result = BigJSON.stringify(BigJSON.parse('{"n": 5}'), {
        replacer: (_key, value) =>
          BigNumber.isBigNumber(value) ? BigNumber.mul(value, 2) : value,
      });
      expect(result).toEqual('{"n":10}');
    });

    it('whitelists keys when given an array', () => {
      const result = BigJSON.stringify(
        { a: 1, b: 2, c: 3 },
        { replacer: ['a', 'c'] }
      );
      expect(result).toEqual('{"a":1,"c":3}');
    });

    it('leaves array elements alone when given a key whitelist', () => {
      expect(BigJSON.stringify([1, 2], { replacer: ['a'] })).toEqual('[1,2]');
    });
  });

  it('throws on a circular structure', () => {
    const value: Record<string, unknown> = {};
    value['self'] = value;
    expect(() => BigJSON.stringify(value)).toThrow(/circular/i);
  });

  it('allows the same object twice when it is not a cycle', () => {
    const shared = { a: 1 };
    expect(BigJSON.stringify({ x: shared, y: shared })).toEqual(
      '{"x":{"a":1},"y":{"a":1}}'
    );
  });

  it('matches JSON.stringify on values with no BigNumbers', () => {
    const values: unknown[] = [
      { a: 1, b: 'two', c: [true, false, null] },
      [],
      {},
      'plain',
      0,
      { nested: { deep: [1, { x: null }] } },
    ];
    for (const value of values) {
      expect(BigJSON.stringify(value)).toEqual(JSON.stringify(value));
      expect(BigJSON.stringify(value, { space: 2 })).toEqual(
        JSON.stringify(value, null, 2)
      );
    }
  });
});
