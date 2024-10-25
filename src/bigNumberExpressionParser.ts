import { BigNumber, type BigNumberSource } from './BigNumber';
import { Parser, ParserError } from './ParsorC';

export type ExpressionSource =
  | {
      type: 'expression';
      expression: string;
    }
  | {
      type: 'value';
    };

const expression = <Op extends string>(
  input: Op,
): Parser<ExpressionSource, Op> =>
  new Parser<ExpressionSource, Op>((i) => {
    const expressions = i.slice(0, input.length).map((a) => {
      if (a.type !== 'expression') {
        throw new ParserError(`not expression ${input}`);
      }
      return a.expression;
    });
    if (expressions.join('') === input) {
      return [input, i.slice(input.length)];
    }
    throw new ParserError(`not matching ${input}`, i);
  });

function fails<T>(): Parser<ExpressionSource, T> {
  return new Parser(() => {
    throw new ParserError('Fails');
  });
}

function oneOf<T>(
  p: Parser<ExpressionSource, T>[],
): Parser<ExpressionSource, T> {
  return p.reduce((a, b) => a.or(b), fails());
}

// \d+
function some<T>(
  p: Parser<ExpressionSource, T>,
): Parser<ExpressionSource, T[]> {
  return p.flatMap((x) => someOrNone(p).map((xs) => [x, ...xs]));
}
// \d*
function someOrNone<T>(
  p: Parser<ExpressionSource, T>,
): Parser<ExpressionSource, T[]> {
  return some(p).or(Parser.unit([]));
}

export type Execution = Parser<BigNumberSource, BigNumber>;

const number = new Parser<ExpressionSource, Execution>((i) => {
  const [head, ...tail] = i;
  if (head == null || head.type !== 'value') {
    throw new ParserError('Not a BigNumberSource');
  }
  const pickFirst: Execution = new Parser(([first, ...numbers]) => {
    if (first == null) {
      throw new ParserError('Not enough numbers');
    }
    return [BigNumber.from(first), numbers];
  });
  return [pickFirst, tail];
});

const deferredExpression = defer(() => expr);

const paras = expression('(')
  .apply(deferredExpression, (_, b) => b)
  .apply(expression(')'), (a, _) => a);

const factor = number.or(paras);

const neg = expression('-').apply(factor, (_, b) => b.map(BigNumber.neg));
const round = expression("round").apply(factor, (_, b) =>
  b.map(BigNumber.round({})),
)
const floor = expression("floor").apply(factor, (_, b) =>
  b.map(BigNumber.round({ roundingMode: BigNumber.roundDown })),
)
const ceil = expression("ceil").apply(factor, (_, b) =>
  b.map(BigNumber.round({ roundingMode: BigNumber.roundUp })),
)
const sqrt = expression('sqrt').apply(paras, (_, b) => b.map(BigNumber.sqrt));
const abs = expression('abs').apply(paras, (_, b) => b.map(BigNumber.abs));
const ln = expression('ln').apply(paras, (_, b) => b.map(BigNumber.ln));
const exp = expression('exp').apply(paras, (_, b) => b.map(BigNumber.exp));

const minAndMax = oneOf([
  expression('max').map(
    () => (a: BigNumberSource) => (b: BigNumberSource) => BigNumber.max([a, b]),
  ),
  expression('min').map(
    () => (a: BigNumberSource) => (b: BigNumberSource) => BigNumber.min([a, b]),
  ),
])
  .apply(expression('('), (a, _) => a)
  .apply(deferredExpression, (a, b) => b.map(a))
  .apply(expression(','), (a, _) => a)
  .apply(deferredExpression, (a, b) => a.apply(b, (x, y) => x(y)))
  .apply(expression(')'), (a, _) => a);

const numberWithDec = neg
  .or(round)
  .or(floor)
  .or(ceil)
  .or(sqrt)
  .or(abs)
  .or(ln)
  .or(exp)
  .or(minAndMax)
  .or(factor);

const term = numberWithDec.apply(
  someOrNone(
    oneOf(
      [
        expression('<<').map(
          () => (x: BigNumberSource) => (y: BigNumberSource) =>
            BigNumber.leftMoveDecimals(
              BigNumber.toNumber(y),
              x,
            ) as BigNumberSource,
        ),
        expression('>>').map(
          () => (x: BigNumberSource) => (y: BigNumberSource) =>
            BigNumber.rightMoveDecimals(
              BigNumber.toNumber(y),
              x,
            ) as BigNumberSource,
        ),
        oneOf([expression('**'), expression('^')]).map(
          () => (x: BigNumberSource) => (y: BigNumberSource) =>
            BigNumber.pow(x, BigNumber.toNumber(y)) as BigNumberSource,
        ),
        expression('*' as string)
          .or(expression('x'))
          .map(() => BigNumber.mul),
        expression('/').map(() => BigNumber.div),
      ].map((o) => o.apply(numberWithDec, (op, right) => [op, right] as const)),
    ),
  ),
  (left, list) =>
    list.reduce(
      (curr, [op, right]): Execution =>
        curr.apply(right, (x, y) => BigNumber.from(op(x)(y))),
      left,
    ) as Execution,
);

const expr: Parser<ExpressionSource, Execution> = term.apply(
  someOrNone(
    oneOf(
      [
        expression('+').map(() => BigNumber.add),
        expression('-').map(() => BigNumber.minus),
      ].map((o) => o.apply(term, (op, right) => [op, right] as const)),
    ),
  ),
  (left, list) =>
    list.reduce(
      (curr, [op, right]): Execution =>
        curr.apply(right, (x, y) => BigNumber.from(op(x)(y))),
      left,
    ) as Execution,
);

function defer<T>(
  p: () => Parser<ExpressionSource, T>,
): Parser<ExpressionSource, T> {
  return new Parser((input) => {
    return p().parse(input);
  });
}

export const EOF = new Parser<ExpressionSource, null>((input) => {
  if (input.length === 0) {
    return [null, []];
  }
  throw new ParserError(
    `Did not reach parse to end, remaining "${input
      .map((x) => (x.type === 'expression' ? x.expression : '[value]'))
      .join(' ')}"`,
  );
});

function extractExpressions(
  operators: TemplateStringsArray,
  args: BigNumberSource[],
): { key: string; expressions: ExpressionSource[]; values: BigNumberSource[] } {
  const expressions: ExpressionSource[] = [];
  const values: BigNumberSource[] = [];
  for (let i = 0; i < operators.length; i++) {
    const chars = operators[i]!.split('').filter((x) => x.trim());
    for (const char of chars) {
      if (!isNaN(char as any)) {
        throw new ParserError(
          `You need to wrap all the numbers in \${}, found a ${char}`,
        );
      }
      expressions.push({
        type: 'expression',
        expression: char,
      });
    }
    const arg = args[i];
    if (arg != null) {
      if (
        typeof arg === 'string' &&
        ['+', '-', '*', '/', '>', '<', '===', '==', '<=', '>=', '<<'].includes(
          arg.trim(),
        )
      ) {
        expressions.push(
          ...arg.split('').map((a) => ({
            type: 'expression' as const,
            expression: a,
          })),
        );
      } else {
        expressions.push({
          type: 'value',
        });
        values.push(arg);
      }
    }
  }
  const key = expressions
    .map((x) => (x.type === 'expression' ? x.expression : '$0'))
    .join('');
  return { key, expressions, values };
}

/**
 * this is the helper method to do BigNumber calculations
 * It supports normal operators like +, -, *, /, **
 * And also
 * - *leftMoveDecimals* via <<
 * - *mulDown* via *~
 * - *divDown* via /~
 */
export function math(
  operators: TemplateStringsArray,
  ...args: Array<BigNumberSource>
): BigNumber {
  const { expressions, values, key } = extractExpressions(operators, args);
  const cached = math.executionCache[key];
  if (cached != null) {
    return cached.parse(values)[0];
  }
  const [execution] = expr.apply(EOF, (a) => a).parse(expressions);
  math.executionCache[key] = execution;
  return execution.parse(values)[0];
}
math.executionCache = {} as { [key: string]: Execution };

const comparator = expr
  .apply(
    oneOf([
      expression('>=').map(() => BigNumber.isGte),
      expression('>').map(() => BigNumber.isGt),
      expression('<=').map(() => BigNumber.isLte),
      expression('<').map(() => BigNumber.isLt),
      expression<'===' | '=='>('===')
        .or(expression('=='))
        .map(() => BigNumber.isEq),
      expression<'!==' | '!='>('!==')
        .or(expression('!='))
        .map(
          () => (a: BigNumberSource) => (b: BigNumberSource) =>
            !BigNumber.isEq(a)(b),
        ),
    ]),
    (a, b) => [a, b] as const,
  )
  .apply(expr, ([a, op], b) => a.apply(b, (x, y) => op(x)(y)));

const logicOperator = comparator.apply(
  someOrNone(
    oneOf(
      [
        expression('&&').map(() => (a: boolean) => (b: boolean) => a && b),
        expression('||').map(() => (a: boolean) => (b: boolean) => a || b),
      ].map((o) => o.apply(comparator, (op, right) => [op, right] as const)),
    ),
  ),
  (left, list) =>
    list.reduce(
      (curr, [op, right]) => curr.apply(right, (x, y) => op(x)(y)),
      left,
    ),
);

export function mathIs(
  operators: TemplateStringsArray,
  ...args: Array<BigNumberSource>
): boolean {
  const { key, expressions, values } = extractExpressions(operators, args);
  const cached = mathIs.executionCache[key];
  if (cached != null) {
    return cached.parse(values)[0];
  }
  const [execution] = logicOperator.apply(EOF, (a) => a).parse(expressions);
  mathIs.executionCache[key] = execution;
  return execution.parse(values)[0];
}

mathIs.executionCache = {} as {
  [key: string]: Parser<BigNumberSource, boolean>;
};
