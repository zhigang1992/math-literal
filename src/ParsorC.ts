import type { ExpressionSource } from './bigNumberExpressionParser';

export class Parser<Source, T> {
  constructor(readonly parse: (input: Source[]) => [T, Source[]]) {}

  // Array.from, Promise.resolve, RxJs.of, just, return
  static unit<Source, T>(value: T): Parser<Source, T> {
    return new Parser<Source, T>((i) => [value, i]);
  }

  // then
  map<U>(f: (i: T) => U): Parser<Source, U> {
    return this.flatMap((t) => Parser.unit(f(t)));
  }

  // SwitchMap, flatten, Ramda.chain, compactMap
  // async / await -> do notation
  // >>=
  flatMap<U>(f: (i: T) => Parser<Source, U>): Parser<Source, U> {
    return new Parser((input: Source[]) => {
      const [value, rest] = this.parse(input);
      return f(value).parse(rest);
    });
  }

  // RxJs.combineLatest
  apply<U, V>(f: Parser<Source, U>, map: (t: T, u: U) => V): Parser<Source, V> {
    return this.flatMap((t) => f.map((u) => map(t, u)));
  }

  or(other: Parser<Source, T>): Parser<Source, T> {
    return new Parser<Source, T>((i) => {
      try {
        return this.parse(i);
      } catch (e) {
        if (!(e instanceof ParserError)) throw e;
        try {
          return other.parse(i);
        } catch (otherError) {
          if (!(otherError instanceof ParserError)) throw otherError;
          throw furthestFailure(e, otherError);
        }
      }
    });
  }
}

/**
 * When every branch of an `or` chain fails, the last one tried is rarely the
 * interesting one. Report whichever got deepest into the input instead, so a
 * typo inside `max(…)` blames the argument rather than the `max` that never
 * matched.
 */
const furthestFailure = (a: ParserError, b: ParserError): ParserError => {
  // No `remaining` means the branch failed without saying where, which tells us
  // less than a branch that did.
  if (a.remaining == null) return b.remaining == null ? a : b;
  if (b.remaining == null) return a;
  // Fewer tokens left over means more input consumed.
  return b.remaining.length < a.remaining.length ? b : a;
};

export class ParserError extends Error {
  constructor(message: string, readonly remaining?: ExpressionSource[]) {
    super(message);
  }
}
