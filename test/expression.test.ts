import { math, mathIs } from '../src/index';

/** Capture the thrown message, failing loudly if nothing was thrown. */
const messageOf = (fn: () => unknown): string => {
  try {
    fn();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error('expected the expression to be rejected');
};

describe('math template errors', () => {
  it('shows the expression the parser actually saw', () => {
    const message = messageOf(() => math`${1} ++ ${2}`);
    expect(message).toContain('Could not parse this math expression:');
    // Whitespace is dropped while tokenising, so `++` shows as two operators.
    expect(message).toContain('${0} + + ${1}');
  });

  it('points a caret at the offending token', () => {
    const lines = messageOf(() => math`${1} ++ ${2}`).split('\n');
    const rendered = lines.findIndex((l) => l.includes('${0} + + ${1}'));
    const caret = lines[rendered + 1] ?? '';
    expect(caret.trim()).toEqual('^');
    // Points at the first '+' of the pair, where the expression stopped being
    // parseable, rather than somewhere further along.
    expect(caret.indexOf('^')).toEqual(lines[rendered]!.indexOf('+'));
  });

  it('numbers the interpolated values so the caret can be located', () => {
    expect(messageOf(() => math`${1} + ${2} ${3}`)).toContain(
      '${0} + ${1} ${2}'
    );
  });

  it('names the token it wanted instead of the combinator that failed', () => {
    expect(messageOf(() => math`(${1} + ${2}`)).toContain('Expected ")"');
    expect(messageOf(() => math`${1} % ${2}`)).toContain('Unexpected "%"');
  });

  it('blames the argument inside a call, not the call itself', () => {
    // Every branch of the `or` chain fails here. Reporting the last one tried
    // used to blame `max` and point the caret at column 0; the deepest failure
    // is the missing comma.
    const message = messageOf(() => math`max(${1} ${2})`);
    expect(message).toContain('Expected ","');
    const lines = message.split('\n');
    const rendered = lines.findIndex((l) => l.includes('${0}'));
    const caret = lines[rendered + 1] ?? '';
    // The caret sits on the second argument, the one missing its comma.
    expect(caret.indexOf('^')).toEqual(lines[rendered]!.indexOf('${1}'));
  });

  it('reports the point a known function stopped matching', () => {
    const message = messageOf(() => math`sqrtt(${4})`);
    expect(message).toContain('Expected "("');
    // `sqrt` matched, so the caret lands on the stray trailing character.
    const lines = message.split('\n');
    const rendered = lines.findIndex((l) => l.includes('s q r t t'));
    expect((lines[rendered + 1] ?? '').indexOf('^')).toEqual(
      lines[rendered]!.lastIndexOf('t')
    );
  });

  it('carries the same treatment through mathIs', () => {
    const message = messageOf(() => mathIs`${1} =~ ${2}`);
    expect(message).toContain('Could not parse this math expression:');
    expect(message).toContain('${0} = ~ ${1}');
  });

  it('still rejects bare numbers with the dedicated hint', () => {
    expect(messageOf(() => math`${1} + 2`)).toContain(
      'You need to wrap all the numbers in ${}'
    );
  });

  it('leaves valid expressions alone', () => {
    expect(() => math`(${1} + ${2}) * ${3}`).not.toThrow();
    expect(() => math`max(${1}, ${2})`).not.toThrow();
    expect(() => math`sqrt(${4})`).not.toThrow();
    expect(() => mathIs`${1} < ${2} && ${3} >= ${3}`).not.toThrow();
  });
});
