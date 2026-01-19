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
```

## Features

- **Template Literal Syntax**: Write mathematical expressions naturally using template literals
- **Arbitrary Precision**: Built on `decimal.js` for accurate decimal arithmetic
- **Type Safety**: Full TypeScript support with proper type definitions
- **Comprehensive Operations**: Support for arithmetic, comparison, and mathematical functions
- **Clean API**: Intuitive syntax that reads like mathematical notation

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
```

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