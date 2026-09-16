import { BigNumber } from './BigNumber';

/**
 * The value shape {@link BigJSON.parse} produces. Every JSON number becomes a
 * {@link BigNumber}, so nothing is rounded on the way in — `9223372036854775807`
 * stays `9223372036854775807` and `0.1` stays exactly `0.1`.
 */
export type JSONValue =
  | null
  | boolean
  | string
  | BigNumber
  | JSONValue[]
  | { [key: string]: JSONValue };

/**
 * What to do when an object literal carries a key that can poison a prototype.
 *
 * - `'error'` — throw (the default)
 * - `'ignore'` — parse the value and drop it
 * - `'preserve'` — keep it as a plain own property, defined rather than
 *   assigned so `__proto__` cannot reach `Object.prototype`
 */
export type ForbiddenKeyAction = 'error' | 'ignore' | 'preserve';

export type JSONReviver = (
  this: unknown,
  key: string,
  value: unknown
) => unknown;

export type JSONReplacer = (
  this: unknown,
  key: string,
  value: unknown
) => unknown;

export type ParseOptions = {
  /**
   * Throw on a duplicate object key instead of silently keeping the last one.
   * Default `false`, matching `JSON.parse`.
   */
  strict?: boolean;
  /** Handling for a `__proto__` key. Default `'error'`. */
  protoAction?: ForbiddenKeyAction;
  /** Handling for a `constructor` key. Default `'error'`. */
  constructorAction?: ForbiddenKeyAction;
};

export type ParseOptionsWithReviver = ParseOptions & {
  /**
   * Called bottom-up for every key/value pair, exactly like the second
   * argument to `JSON.parse`. Returning `undefined` deletes the member.
   */
  reviver: JSONReviver;
};

export type StringifyOptions = {
  /** A mapping function, or a whitelist of object keys to keep. */
  replacer?: JSONReplacer | ReadonlyArray<string>;
  /** Indent width (capped at 10) or literal indent string (first 10 chars). */
  space?: number | string;
};

export class JSONParseError extends SyntaxError {
  readonly name = 'JSONParseError';

  constructor(
    message: string,
    /** Index into {@link text} just past the character that failed. */
    readonly at: number,
    /** The full source that was being parsed. */
    readonly text: string
  ) {
    super(`${message} at position ${at}`);
  }
}

const ESCAPES: { [char: string]: string | undefined } = {
  '"': '"',
  '\\': '\\',
  '/': '/',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
};

/**
 * Plain notation is nicer to read and round-trips a big integer back to the
 * literal it came from, but it costs one character per power of ten. This
 * budget covers what people actually store as exact integers or fixed-point
 * decimals — 2^256 is 78 digits, wei is 18 places. Past it we fall back to
 * exponential notation, which is equally valid JSON and equally lossless.
 */
const MAX_PLAIN_NUMBER_DIGITS = 100;

const isWhitespace = (ch: string): boolean =>
  ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';

const isDigit = (ch: string): boolean => ch >= '0' && ch <= '9';

/**
 * A recursive descent scanner in the shape of Crockford's `json_parse`, with
 * the number rule replaced by {@link BigNumber} and the state kept per
 * instance so that a reviver may re-enter the parser.
 */
class Scanner {
  /** Index of the character *after* {@link ch}. */
  private at = 0;
  /** The character under the cursor; `''` once the input is exhausted. */
  private cursor = ' ';

  constructor(
    private readonly text: string,
    private readonly options: Required<ParseOptions>
  ) {}

  /**
   * Read the cursor through a call, not a field: a narrowed `this.field` would
   * stay narrowed across `next()`, which mutates it.
   */
  private ch(): string {
    return this.cursor;
  }

  run(): JSONValue {
    const result = this.value();
    this.white();
    if (this.ch() !== '') {
      this.fail(`Unexpected '${this.ch()}' after the top-level value`);
    }
    return result;
  }

  private fail(message: string): never {
    throw new JSONParseError(message, this.at, this.text);
  }

  private describe(): string {
    return this.ch() === '' ? 'end of input' : `'${this.ch()}'`;
  }

  private next(expected?: string): string {
    if (expected != null && expected !== this.ch()) {
      this.fail(`Expected '${expected}' instead of ${this.describe()}`);
    }
    this.cursor = this.text.charAt(this.at);
    this.at += 1;
    return this.cursor;
  }

  private white(): void {
    while (isWhitespace(this.ch())) {
      this.next();
    }
  }

  private value(): JSONValue {
    this.white();
    switch (this.ch()) {
      case '{':
        return this.object();
      case '[':
        return this.array();
      case '"':
        return this.string();
      case '':
        return this.fail('Unexpected end of input');
      default:
        return this.ch() === '-' || isDigit(this.ch())
          ? this.number()
          : this.word();
    }
  }

  private word(): boolean | null {
    switch (this.ch()) {
      case 't':
        this.next('t');
        this.next('r');
        this.next('u');
        this.next('e');
        return true;
      case 'f':
        this.next('f');
        this.next('a');
        this.next('l');
        this.next('s');
        this.next('e');
        return false;
      case 'n':
        this.next('n');
        this.next('u');
        this.next('l');
        this.next('l');
        return null;
      default:
        return this.fail(`Unexpected ${this.describe()}`);
    }
  }

  /**
   * The RFC 8259 number grammar, enforced strictly: no leading `+`, no leading
   * zeros, no bare `1.`, no empty exponent. The matched literal goes straight
   * into a {@link BigNumber}, so magnitudes a double cannot hold survive.
   */
  private number(): BigNumber {
    const start = this.at - 1;

    if (this.ch() === '-') {
      this.next();
    }

    if (this.ch() === '0') {
      this.next();
    } else if (this.ch() >= '1' && this.ch() <= '9') {
      while (isDigit(this.ch())) {
        this.next();
      }
    } else {
      this.fail(`Bad number: expected a digit instead of ${this.describe()}`);
    }

    if (this.ch() === '.') {
      this.next();
      if (!isDigit(this.ch())) {
        this.fail(
          `Bad number: expected a digit after '.' instead of ${this.describe()}`
        );
      }
      while (isDigit(this.ch())) {
        this.next();
      }
    }

    if (this.ch() === 'e' || this.ch() === 'E') {
      this.next();
      if (this.ch() === '-' || this.ch() === '+') {
        this.next();
      }
      if (!isDigit(this.ch())) {
        this.fail(
          `Bad number: expected a digit in the exponent instead of ${this.describe()}`
        );
      }
      while (isDigit(this.ch())) {
        this.next();
      }
    }

    const literal = this.text.slice(start, this.at - 1);
    const parsed = BigNumber.safeFrom(literal);
    // An exponent past decimal.js' range comes back as Infinity rather than
    // throwing, and a value we cannot represent is worse than a clear error.
    if (parsed == null || !BigNumber.isFinite(parsed)) {
      this.fail(`Bad number: ${literal} is out of range`);
    }
    return parsed;
  }

  private string(): string {
    if (this.ch() !== '"') {
      this.fail(`Bad string: expected '"' instead of ${this.describe()}`);
    }

    let result = '';
    // Everything from `startAt` up to the cursor is plain text we can copy in
    // one slice rather than character by character.
    let startAt = this.at;

    while (this.next() !== '') {
      if (this.ch() === '"') {
        if (this.at - 1 > startAt) {
          result += this.text.substring(startAt, this.at - 1);
        }
        this.next();
        return result;
      }

      if (this.ch() === '\\') {
        if (this.at - 1 > startAt) {
          result += this.text.substring(startAt, this.at - 1);
        }
        this.next();
        if (this.ch() === 'u') {
          let code = 0;
          for (let i = 0; i < 4; i += 1) {
            const hex = parseInt(this.next(), 16);
            if (!isFinite(hex)) {
              this.fail('Bad string: malformed \\u escape');
            }
            code = code * 16 + hex;
          }
          result += String.fromCharCode(code);
        } else {
          const escaped = ESCAPES[this.ch()];
          if (escaped == null) {
            this.fail(`Bad string: unknown escape ${this.describe()}`);
          }
          result += escaped;
        }
        startAt = this.at;
      } else if (this.ch() < ' ') {
        this.fail('Bad string: unescaped control character');
      }
    }

    return this.fail('Bad string: unterminated');
  }

  private array(): JSONValue[] {
    const array: JSONValue[] = [];

    this.next('[');
    this.white();
    if (this.ch() === ']') {
      this.next(']');
      return array;
    }

    while (this.ch() !== '') {
      array.push(this.value());
      this.white();
      if (this.ch() === ']') {
        this.next(']');
        return array;
      }
      this.next(',');
      this.white();
    }

    return this.fail('Bad array: unterminated');
  }

  private object(): { [key: string]: JSONValue } {
    const object: { [key: string]: JSONValue } = {};

    this.next('{');
    this.white();
    if (this.ch() === '}') {
      this.next('}');
      return object;
    }

    while (this.ch() !== '') {
      const key = this.string();
      this.white();
      this.next(':');

      if (
        this.options.strict &&
        Object.prototype.hasOwnProperty.call(object, key)
      ) {
        this.fail(`Duplicate key "${key}"`);
      }

      const action = this.actionFor(key);
      if (action === 'error') {
        this.fail(`Object contains forbidden "${key}" property`);
      }

      const parsed = this.value();
      switch (action) {
        case null:
          object[key] = parsed;
          break;
        case 'preserve':
          // Assignment would run the `__proto__` setter; defining the property
          // keeps it an ordinary own key.
          Object.defineProperty(object, key, {
            value: parsed,
            writable: true,
            enumerable: true,
            configurable: true,
          });
          break;
        case 'ignore':
          break;
        default:
          return assertNever(action);
      }

      this.white();
      if (this.ch() === '}') {
        this.next('}');
        return object;
      }
      this.next(',');
      this.white();
    }

    return this.fail('Bad object: unterminated');
  }

  private actionFor(key: string): ForbiddenKeyAction | null {
    if (key === '__proto__') return this.options.protoAction;
    if (key === 'constructor') return this.options.constructorAction;
    return null;
  }
}

function assertNever(value: never): never {
  throw new Error(`Unreachable: ${String(value)}`);
}

const DEFAULT_PARSE_OPTIONS: Required<ParseOptions> = {
  strict: false,
  protoAction: 'error',
  constructorAction: 'error',
};

const revive = (holder: object, key: string, reviver: JSONReviver): unknown => {
  const value = Reflect.get(holder, key);
  // A BigNumber is a `Decimal` under the hood, with enumerable own fields of
  // its own. Walking into it would hand the reviver the mantissa digits.
  if (
    value != null &&
    typeof value === 'object' &&
    !BigNumber.isBigNumber(value)
  ) {
    for (const childKey of Object.keys(value)) {
      const revived = revive(value, childKey, reviver);
      if (revived === undefined) {
        Reflect.deleteProperty(value, childKey);
      } else {
        Reflect.set(value, childKey, revived);
      }
    }
  }
  return reviver.call(holder, key, value);
};

const readIndent = (space: number | string | undefined): string => {
  if (typeof space === 'number') {
    return ' '.repeat(Math.max(0, Math.min(10, Math.floor(space))));
  }
  if (typeof space === 'string') {
    return space.slice(0, 10);
  }
  return '';
};

type StringifyState = {
  readonly indent: string;
  readonly gap: string;
  readonly replacer: JSONReplacer | ReadonlyArray<string> | undefined;
  /** Ancestors on the current path, so genuine cycles are caught. */
  readonly seen: Set<object>;
};

/**
 * Renders a BigNumber as a bare JSON number rather than a quoted string, which
 * is the whole point: the value survives a `stringify`/`parse` round trip.
 */
const numberLiteral = (value: BigNumber): string => {
  // JSON has no Infinity or NaN; `JSON.stringify` writes null for both.
  if (!BigNumber.isFinite(value)) return 'null';
  const digits = Math.abs(BigNumber.getIntegerLength(value));
  return digits <= MAX_PLAIN_NUMBER_DIGITS
    ? BigNumber.toPlainString(value)
    : BigNumber.toString(value);
};

const hasToJSON = (
  value: object
): value is { toJSON: (key: string) => unknown } =>
  typeof Reflect.get(value, 'toJSON') === 'function';

const serialize = (
  key: string,
  holder: object,
  state: StringifyState
): string | undefined => {
  let value: unknown = Reflect.get(holder, key);

  // BigNumber carries a `toJSON` that yields a string; letting it run here
  // would quote the number.
  if (
    !BigNumber.isBigNumber(value) &&
    value != null &&
    typeof value === 'object' &&
    hasToJSON(value)
  ) {
    value = value.toJSON(key);
  }

  if (typeof state.replacer === 'function') {
    value = state.replacer.call(holder, key, value);
  }

  if (BigNumber.isBigNumber(value)) {
    return numberLiteral(value);
  }

  switch (typeof value) {
    case 'string':
      return JSON.stringify(value);
    case 'number':
      return isFinite(value) ? String(value) : 'null';
    case 'boolean':
      return String(value);
    case 'bigint':
      return value.toString();
    case 'undefined':
    case 'function':
    case 'symbol':
      return undefined;
    case 'object':
      return value === null ? 'null' : serializeObject(value, state);
    default:
      return undefined;
  }
};

const serializeObject = (value: object, state: StringifyState): string => {
  if (state.seen.has(value)) {
    throw new TypeError('Converting circular structure to JSON');
  }
  state.seen.add(value);

  const mind = state.gap;
  const gap = state.gap + state.indent;
  const inner: StringifyState = { ...state, gap };
  const partial: string[] = [];
  let open = '{';
  let close = '}';

  if (Array.isArray(value)) {
    open = '[';
    close = ']';
    for (let i = 0; i < value.length; i += 1) {
      partial.push(serialize(String(i), value, inner) ?? 'null');
    }
  } else {
    const keys = Array.isArray(state.replacer)
      ? state.replacer.filter((k): k is string => typeof k === 'string')
      : Object.keys(value);
    for (const k of keys) {
      const rendered = serialize(k, value, inner);
      if (rendered !== undefined) {
        partial.push(`${JSON.stringify(k)}${gap ? ': ' : ':'}${rendered}`);
      }
    }
  }

  state.seen.delete(value);

  if (partial.length === 0) return `${open}${close}`;
  if (gap === '') return `${open}${partial.join(',')}${close}`;
  return `${open}\n${gap}${partial.join(`,\n${gap}`)}\n${mind}${close}`;
};

/**
 * `JSON.parse` / `JSON.stringify` that speak {@link BigNumber}.
 *
 * Unlike the platform pair — and unlike `json-bigint`, which only promotes
 * integers it considers unsafe — *every* JSON number becomes a BigNumber, so
 * `0.1 + 0.2` style drift never enters your data in the first place.
 *
 * ```ts
 * const order = BigJSON.parse('{"id": 9223372036854775807, "price": 0.1}');
 * BigJSON.stringify(order); // '{"id":9223372036854775807,"price":0.1}'
 * ```
 */
export namespace BigJSON {
  export function parse(text: string, options?: ParseOptions): JSONValue;
  export function parse(
    text: string,
    options: ParseOptionsWithReviver
  ): unknown;
  export function parse(
    text: string,
    options: ParseOptions | ParseOptionsWithReviver = {}
  ): unknown {
    const result = new Scanner(String(text), {
      ...DEFAULT_PARSE_OPTIONS,
      ...options,
    }).run();

    const reviver = 'reviver' in options ? options.reviver : undefined;
    return reviver == null ? result : revive({ '': result }, '', reviver);
  }

  /**
   * Returns `undefined` for a top-level `undefined`, function or symbol,
   * exactly as `JSON.stringify` does.
   */
  export const stringify = (
    value: unknown,
    options: StringifyOptions = {}
  ): string | undefined => {
    return serialize(
      '',
      { '': value },
      {
        indent: readIndent(options.space),
        gap: '',
        replacer: options.replacer,
        seen: new Set<object>(),
      }
    );
  };
}
