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
        if (e instanceof ParserError) {
          return other.parse(i);
        }
        throw e;
      }
    });
  }
}

export class ParserError extends Error {
  constructor(
    message: string,
    readonly remaining?: ExpressionSource[],
  ) {
    super(message);
  }
}
