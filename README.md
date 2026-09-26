# math-literal

[![npm version](https://badge.fury.io/js/math-literal.svg)](https://www.npmjs.com/package/math-literal)
[![CI](https://github.com/zhigang1992/math-literal/actions/workflows/main.yml/badge.svg)](https://github.com/zhigang1992/math-literal/actions/workflows/main.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A TypeScript library for precise mathematical expressions using template literals with BigNumber support.

## Overview

`math-literal` provides a clean, readable syntax for complex mathematical operations using JavaScript template literals while maintaining arbitrary precision arithmetic through the `decimal.js` library.

## The Problem

Traditional BigNumber arithmetic can become unreadable with nested operations:

```javascript
// Hard to read and maintain
BigNumber.add(BigNumber.div(BigNumber.plus(a, BigNumber.times(b, c)), d), e)
```

## The Solution

With `math-literal`, complex expressions become intuitive:

```javascript
import { math } from 'math-literal';

// Clean and readable
const result = math`(${a} + ${b} * ${c}) / ${d} + ${e}`;
```

## Installation

```bash
npm install math-literal
```

Or using Yarn:

```bash
yarn add math-literal
```

Or using Bun:

```bash
bun add math-literal
```

## Quick Start

```typescript
import { math, mathIs, BigNumber } from 'math-literal';

// Basic arithmetic
const sum = math`${10} + ${20}`;  // 30
const product = math`${5} * ${6}`; // 30

// Complex expressions with proper precedence
const result = math`(${10} + ${5}) * ${2}`; // 30

// Comparisons return boolean values
const isGreater = mathIs`${10} > ${5}`;  // true
const isEqual = mathIs`${5} === ${5}`;   // true

// Working with BigNumber directly
const bigNum = BigNumber.from('123.456');
const precise = math`${bigNum} * ${2}`;
console.log(BigNumber.toString(precise)); // "246.912"

// JSON in, BigNumber out
import { BigJSON } from 'math-literal';

const order = BigJSON.parse('{"id": 9223372036854775807, "price": 0.1}');
BigJSON.stringify(order); // '{"id":9223372036854775807,"price":0.1}'
```

## Features

- **Template Literal Syntax**: Write mathematical expressions naturally using template literals
- **Arbitrary Precision**: Built on `decimal.js` for accurate decimal arithmetic
- **Type Safety**: Full TypeScript support with proper type definitions
- **Comprehensive Operations**: Support for arithmetic, comparison, and mathematical functions
- **Clean API**: Intuitive syntax that reads like mathematical notation
- **Lossless JSON**: `BigJSON.parse` turns every JSON number into a `BigNumber`, so precision never leaves the wire

## API Reference

### Core Functions

#### `math`
Evaluates mathematical expressions and returns a `BigNumber` result.

```typescript
const result = math`${a} + ${b}`;
```

#### `mathIs`
Evaluates comparison and logical expressions, returning a boolean.

```typescript
const isTrue = mathIs`${a} > ${b} && ${c} < ${d}`;
```

### Supported Operators

#### Arithmetic Operators
| Operator | Description | Example |
|----------|-------------|---------|
| `+` | Addition | `math`${a} + ${b}`` |
| `-` | Subtraction | `math`${a} - ${b}`` |
| `*`, `x` | Multiplication | `math`${a} * ${b}`` |
| `/` | Division | `math`${a} / ${b}`` |
| `**`, `^` | Exponentiation | `math`${a} ** ${b}`` |
| `<<` | Left shift decimals | `math`${a} << ${2}`` |
| `>>` | Right shift decimals | `math`${a} >> ${2}`` |

#### Mathematical Functions
| Function | Description | Example |
|----------|-------------|---------|
| `round()` | Round to nearest integer | `math`round(${a})`` |
| `floor()` | Round down | `math`floor(${a})`` |
| `ceil()` | Round up | `math`ceil(${a})`` |
| `sqrt()` | Square root | `math`sqrt(${a})`` |
| `abs()` | Absolute value | `math`abs(${a})`` |
| `ln()` | Natural logarithm | `math`ln(${a})`` |
| `exp()` | Exponential (e^x) | `math`exp(${a})`` |
| `max()` | Maximum of two values | `math`max(${a}, ${b})`` |
| `min()` | Minimum of two values | `math`min(${a}, ${b})`` |

#### Comparison Operators (for `mathIs`)
| Operator | Description | Example |
|----------|-------------|---------|
| `>` | Greater than | `mathIs`${a} > ${b}`` |
| `>=` | Greater than or equal | `mathIs`${a} >= ${b}`` |
| `<` | Less than | `mathIs`${a} < ${b}`` |
| `<=` | Less than or equal | `mathIs`${a} <= ${b}`` |
| `===`, `==` | Equal to | `mathIs`${a} === ${b}`` |
| `!==`, `!=` | Not equal to | `mathIs`${a} !== ${b}`` |

#### Logical Operators (for `mathIs`)
| Operator | Description | Example |
|----------|-------------|---------|
| `&&` | Logical AND | `mathIs`${a} > 0 && ${b} < 10`` |
| `\|\|` | Logical OR | `mathIs`${a} < 0 \|\| ${b} > 10`` |

### BigNumber Utilities

The library exports a comprehensive `BigNumber` namespace with utility functions:

```typescript
import { BigNumber } from 'math-literal';

// Creating BigNumbers
const num = BigNumber.from('123.456');
const fromNumber = BigNumber.from(789);

// Type checking
BigNumber.isBigNumber(num); // true

// Conversions
BigNumber.toString(num);    // "123.456"
BigNumber.toNumber(num);    // 123.456

// Comparisons
BigNumber.isEq(num, '123.456');  // true
BigNumber.isGt(num, 100);        // true
BigNumber.isLt(num, 200);        // true

// Arithmetic operations
const sum = BigNumber.add(num, 10);
const diff = BigNumber.minus(num, 10);
const product = BigNumber.mul(num, 2);
const quotient = BigNumber.div(num, 2);

// Rounding operations
const rounded = BigNumber.round({}, num);
const fixed = BigNumber.toFixed({ precision: 2 }, num);

// Inspecting shape
BigNumber.getPrecision('12.345');                       // 3  (decimal places)
BigNumber.getIntegerLength('12.345');                   // 2  (digits before the point)
BigNumber.getDecimalPart({ precision: 2 }, '12.345');   // "34"
```

`getPrecision` counts **decimal places**, not significant digits: `0.001` is
`3`, not `1`. `getDecimalPart` truncates rather than rounds, and never pads, so
asking for more precision than the value carries just gives you what is there.

## JSON

`JSON.parse` reads every number into a double. That silently rewrites any
integer past 2^53 and rounds most decimals:

```javascript
JSON.parse('{"id": 9223372036854775807}').id; // 9223372036854776000
JSON.parse('{"total": 0.1}').total + 0.2;     // 0.30000000000000004
```

`BigJSON` parses the same text into `BigNumber` values instead. Every number
becomes one — not just the integers a double would mangle — so a value is never
half-precise depending on how large it happened to be:

```typescript
import { BigJSON, BigNumber, math } from 'math-literal';

// `parse` returns a JSONValue; narrow it to the shape you expect.
const order = BigJSON.parse(
  '{"id": 9223372036854775807, "price": 0.1, "qty": 3}'
) as { id: BigNumber; price: BigNumber; qty: BigNumber };

BigNumber.toString(order.id);                            // "9223372036854775807"
BigNumber.toString(math`${order.price} * ${order.qty}`); // "0.3"

BigJSON.stringify(order);
// '{"id":9223372036854775807,"price":0.1,"qty":3}'
```

`stringify` writes BigNumbers back as bare JSON numbers, not quoted strings, so
a parse/stringify round trip returns the literals you started with.

### `BigJSON.parse(text, options?)`

Returns a `JSONValue`: `null`, `boolean`, `string`, `BigNumber`, an array, or a
plain object. Objects come back with a normal prototype.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `strict` | `boolean` | `false` | Throw on a duplicate object key instead of keeping the last one |
| `protoAction` | `'error' \| 'ignore' \| 'preserve'` | `'error'` | Handling for a `__proto__` key |
| `constructorAction` | `'error' \| 'ignore' \| 'preserve'` | `'error'` | Handling for a `constructor` key |
| `reviver` | `(key, value) => unknown` | — | Bottom-up transform, like the second argument to `JSON.parse` |

Under `'preserve'` the key is defined as an ordinary own property rather than
assigned, so `__proto__` cannot reach `Object.prototype`.

Parse failures throw a `JSONParseError` (a `SyntaxError`) carrying `at` and
`text`.

### `BigJSON.stringify(value, options?)`

| Option | Type | Description |
|--------|------|-------------|
| `replacer` | `(key, value) => unknown` \| `string[]` | Mapping function, or a whitelist of object keys |
| `space` | `number \| string` | Indent width (capped at 10) or literal indent string |

Returns `undefined` for a top-level `undefined`, function or symbol, exactly as
`JSON.stringify` does. Native `bigint` values are written as JSON numbers
rather than throwing.

### Differences from `JSON` and from `json-bigint`

- **Every** number becomes a `BigNumber`. `json-bigint` promotes only integers
  it judges unsafe, so `1` and `1e400` come back as different types.
- The number grammar is RFC 8259 exactly — no leading zeros, no bare `1.`, no
  empty exponent — and strings reject unescaped control characters. On a fuzz
  of 200k inputs it accepts and rejects precisely what `JSON.parse` does, with
  one deliberate exception: a magnitude `JSON.parse` would flatten to
  `Infinity` (`1e999999999999999999`) throws rather than parsing to a wrong
  value.
- Parser state lives on the call, so a reviver may re-enter `parse`.
- A reviver is not walked into a `BigNumber`'s internal fields.
- Numbers stringify in plain notation up to 100 digits and switch to
  exponential beyond that. Both forms are valid JSON and both are lossless.

## Advanced Examples

### Complex Financial Calculations

```typescript
import { math, BigNumber } from 'math-literal';

// Calculate compound interest: A = P(1 + r/n)^(nt)
function compoundInterest(principal: number, rate: number, n: number, time: number) {
  const r = BigNumber.from(rate);
  const base = math`${1} + ${r} / ${n}`;
  const exponent = n * time;
  return math`${principal} * ${base} ** ${exponent}`;
}

const investment = compoundInterest(1000, 0.05, 12, 10);
console.log(BigNumber.toFixed({ precision: 2 }, investment)); // "1647.01"
```

### Statistical Operations

```typescript
// Calculate standard deviation
function standardDeviation(values: number[]) {
  const n = values.length;
  const mean = values.reduce((sum, val) =>
    BigNumber.add(sum, val), BigNumber.from(0)
  );
  const avgMean = math`${mean} / ${n}`;

  const variance = values.reduce((sum, val) => {
    const diff = math`${val} - ${avgMean}`;
    return BigNumber.add(sum, math`${diff} ** ${2}`);
  }, BigNumber.from(0));

  return math`sqrt(${variance} / ${n})`;
}
```

### Conditional Logic

```typescript
import { mathIs } from 'math-literal';

function validateTransaction(amount: number, balance: number, limit: number) {
  // Check multiple conditions
  const isValid = mathIs`${amount} > ${0} && ${amount} <= ${balance} && ${amount} <= ${limit}`;

  if (isValid) {
    console.log('Transaction approved');
  } else {
    console.log('Transaction denied');
  }
}
```

## When an expression is wrong

`math` and `mathIs` parse the template the first time a given call site runs,
then cache it. A malformed expression throws with the token stream the parser
saw and a caret on the token that broke it:

```
Could not parse this math expression:

  m a x ( ${0} ${1} )
               ^

Expected "," but found a value
```

Whitespace is dropped while tokenising, so the rendered form shows what the
parser worked with rather than what you typed. That is usually the more useful
of the two: `${a} ++ ${b}` renders as `${0} + + ${1}`, which makes it obvious
that `++` became two separate operators.

Interpolated values appear as `${0}`, `${1}` and so on, numbered in order.

## Order of Operations

The library follows standard mathematical precedence:

1. Parentheses `()`
2. Functions (`sqrt`, `abs`, etc.)
3. Exponentiation (`**`, `^`)
4. Multiplication (`*`, `x`) and Division (`/`)
5. Addition (`+`) and Subtraction (`-`)
6. Comparison operators (`>`, `<`, `>=`, `<=`, `==`, `!=`)
7. Logical operators (`&&`, `||`)

## TypeScript Support

The library is written in TypeScript and provides complete type definitions:

```typescript
import { BigNumber, math, mathIs } from 'math-literal';

// Type-safe operations
const result: BigNumber = math`${10} + ${20}`;
const comparison: boolean = mathIs`${10} > ${5}`;

// BigNumber type utilities
type BigNumberSource = string | number | BigNumber;
```

## Development

### Prerequisites

- Node.js 22+ or Bun
- npm, yarn, or bun package manager

### Setup

```bash
# Clone the repository
git clone https://github.com/zhigang1992/math-literal.git
cd math-literal

# Install dependencies
npm install

# Run tests
npm test

# Build the library
npm run build

# Run linting
npm run lint
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built on top of [decimal.js](https://github.com/MikeMcl/decimal.js/) for arbitrary precision arithmetic
- Inspired by the need for readable mathematical expressions in JavaScript

## Author

Kyle Fang

## Links

- [npm Package](https://www.npmjs.com/package/math-literal)
- [GitHub Repository](https://github.com/zhigang1992/math-literal)
- [Issue Tracker](https://github.com/zhigang1992/math-literal/issues)