Math Literal
-----

```javascript
BigNumber.add(BigNumber.div(BigNumber.plus(a, BigNumber.times(b, c)), d), e)
```

Or

```javascript
math`(${a} + ${b} * ${c}) / ${d} + ${e}`
```

I like the second one. ^^

```typescript
import { math, BigNumber } from 'math-literal';

const a = BigNumber.from('1'); // support bigint, number, string, BigNumber
...

math`(${a} + ${b} * ${c}) / ${d} + ${e}`

```

there is also `mathIs` that returns a boolean

```typescript
mathIs`abs(${a}) > ${b}`
```

### Available Operators

#### Arithmetic Operators
- `+` : Addition
- `-` : Subtraction
- `*` or `x` : Multiplication
- `/` : Division
- `**` or `^` : Exponentiation

#### Special Arithmetic Operators
- `<<` : Left move decimals (equivalent to multiplying by a power of 10)
- `>>` : Right move decimals (equivalent to dividing by a power of 10)
- `*~` : Multiplication with rounding down
- `/~` : Division with rounding down

#### Unary Operators
- `-` : Negation (when used before a number or expression)

#### Functions
- `round(x)` : Round to the nearest integer
- `floor(x)` : Round down to the nearest integer
- `ceil(x)` : Round up to the nearest integer
- `sqrt(x)` : Square root
- `abs(x)` : Absolute value
- `ln(x)` : Natural logarithm
- `exp(x)` : Exponential function (e^x)
- `max(x, y)` : Maximum of two values
- `min(x, y)` : Minimum of two values

#### Comparison Operators (for `mathIs`)
- `>` : Greater than
- `>=` : Greater than or equal to
- `<` : Less than
- `<=` : Less than or equal to
- `===` or `==` : Equal to
- `!==` or `!=` : Not equal to

#### Logical Operators (for `mathIs`)
- `&&` : Logical AND
- `||` : Logical OR

#### Grouping
- `( )` : Parentheses for grouping expressions and function arguments

Note: The order of operations follows standard mathematical conventions, with functions and parentheses having the highest precedence, followed by exponents, multiplication/division, and then addition/subtraction.
