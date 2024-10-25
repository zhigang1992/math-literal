import { Decimal as Big } from 'decimal.js';

type OneOrMore<T> = [T, ...T[]];

export type BigNumberSource =
  | number
  | string
  | bigint
  | Big.Value
  | Big
  | BigNumber;

const toBig = (num: BigNumberSource): Big => {
  if (num instanceof Big) {
    return num;
  }

  if (BigNumber.isBigNumber(num)) {
    return num as any;
  }

  if (typeof num === 'bigint') {
    return new Big(num.toString());
  }

  return new Big(num as any);
};

const fromBig = (num: Big): BigNumber => {
  return num as unknown as BigNumber;
};

export type BigNumber = Omit<Big, keyof Big> & {
  readonly ___unique: unique symbol;
  ___B: 'BigNumber';
};
export namespace BigNumber {
  export const {
    ROUND_UP: roundUp,
    ROUND_DOWN: roundDown,
    ROUND_HALF_UP: roundHalfUp,
    ROUND_HALF_DOWN: roundHalfDown,
    ROUND_HALF_EVEN: roundHalfEven,
    ROUND_FLOOR: roundFloor,
    ROUND_CEIL: roundCeil,
    ROUND_HALF_FLOOR: roundHalfFloor,
    ROUND_HALF_CEIL: roundHalfCeil,
  } = Big;
  export type RoundingMode =
    | typeof roundUp
    | typeof roundDown
    | typeof roundHalfUp
    | typeof roundHalfDown
    | typeof roundHalfEven
    | typeof roundFloor
    | typeof roundCeil
    | typeof roundHalfFloor
    | typeof roundHalfCeil;

  export const isBigNumber = (num: any): num is BigNumber => {
    return num instanceof Big;
  };

  export const safeFrom = (value: BigNumberSource): undefined | BigNumber => {
    try {
      return from(value);
    } catch (_) {
      return undefined;
    }
  };

  export const from = (value: BigNumberSource): BigNumber => {
    return fromBig(toBig(value as any));
  };

  // biome-ignore lint/suspicious/noShadowRestrictedNames: override default toString
  export const toString = (value: BigNumberSource): string => {
    // const prevConf = Big.config({})
    // // https://github.com/MikeMcl/bignumber.js/blob/4120e6a3b9086a71658db5e3c0db68fd31c35354/bignumber.mjs#L67
    // Big.config({ EXPONENTIAL_AT: 1e9 })
    const res = toBig(value).toString();
    // Big.config(prevConf)
    return res;
  };

  export const toNumber = (value: BigNumberSource): number => {
    return toBig(value).toNumber();
  };

  export const toBigInt = (value: BigNumberSource): bigint => {
    return BigInt(toBig(value).toString());
  };

  export const toFixed = curry2(
    (
      options: {
        precision?: number;
        roundingMode?: RoundingMode;
      },
      value: BigNumberSource,
    ): string => {
      return toBig(value).toFixed(
        options.precision ?? 0,
        options.roundingMode ?? roundFloor,
      );
    },
  );

  export const toExponential = curry2(
    (
      options: {
        precision?: number;
        roundingMode?: RoundingMode;
      },
      value: BigNumberSource,
    ): string => {
      return toBig(value).toExponential(
        options.precision ?? 0,
        options.roundingMode ?? roundFloor,
      );
    },
  );

  export const isNegative = (value: BigNumberSource): boolean => {
    return toBig(value).lt(0);
  };

  export const isGtZero = (value: BigNumberSource): boolean => {
    return toBig(value).gt(0);
  };

  export const isZero = (value: BigNumberSource): boolean => {
    return toBig(value).eq(0);
  };

  export const isEq = curry2(
    (value: BigNumberSource, a: BigNumberSource): boolean => {
      return toBig(value).eq(toBig(a));
    },
  );

  export const isGt = curry2(
    (value: BigNumberSource, a: BigNumberSource): boolean => {
      return toBig(value).gt(toBig(a));
    },
  );

  export const isGte = curry2(
    (value: BigNumberSource, a: BigNumberSource): boolean => {
      return toBig(value).gte(toBig(a));
    },
  );

  export const isLt = curry2(
    (value: BigNumberSource, a: BigNumberSource): boolean => {
      return toBig(value).lt(toBig(a));
    },
  );

  export const isLte = curry2(
    (value: BigNumberSource, a: BigNumberSource): boolean => {
      return toBig(value).lte(toBig(a));
    },
  );

  export const setPrecision = curry2(
    (
      options: {
        precision?: number;
        roundingMode?: RoundingMode;
      },
      value: BigNumberSource,
    ): BigNumber => {
      return fromBig(
        toBig(
          toBig(value).toPrecision(
            options.precision ?? 0,
            options.roundingMode ?? roundFloor,
          ),
        ),
      );
    },
  );

  export const getPrecision = (value: BigNumberSource): number => {
    return toBig(value).d?.length ?? 0 - ((toBig(value).e ?? -1) + 1);
  };

  export const getIntegerLength = (value: BigNumberSource): number => {
    return (toBig(value).e ?? -1) + 1;
  };

  export const leftMoveDecimals = curry2(
    (distance: number, value: BigNumberSource): BigNumber =>
      moveDecimals({ distance }, value),
  );

  export const rightMoveDecimals = curry2(
    (distance: number, value: BigNumberSource): BigNumber =>
      moveDecimals({ distance: -distance }, value),
  );

  export const moveDecimals = curry2(
    (options: { distance: number }, value: BigNumberSource): BigNumber => {
      if (options.distance > 0) {
        return fromBig(toBig(value).div(10 ** options.distance));
      }

      if (options.distance < 0) {
        return fromBig(toBig(value).mul(10 ** -options.distance));
      }

      // distance === 0
      return from(value);
    },
  );

  export const getDecimalPart = curry2(
    (
      options: { precision: number },
      value: BigNumberSource,
    ): undefined | string => {
      /**
       * `toString` will return `"1e-8"` in some case, so we choose `toFixed` here
       */
      const formatted = toFixed(
        {
          precision: Math.min(getPrecision(value), options.precision),
          roundingMode: roundDown,
        },
        value,
      );

      const [, decimals] = formatted.split('.');
      if (decimals == null) return undefined;
      return decimals;
    },
  );

  export const abs = (value: BigNumberSource): BigNumber => {
    return fromBig(toBig(value).abs());
  };

  export const ln = (value: BigNumberSource): BigNumber => {
    return fromBig(toBig(value).ln());
  };

  export const exp = (value: BigNumberSource): BigNumber => {
    return fromBig(toBig(value).exp());
  };

  export const neg = (value: BigNumberSource): BigNumber => {
    return fromBig(toBig(value).negated());
  };

  export const sqrt = (value: BigNumberSource): BigNumber => {
    return fromBig(toBig(value).sqrt());
  };

  export const add = curry2(
    (value: BigNumberSource, a: BigNumberSource): BigNumber => {
      return fromBig(toBig(value).plus(toBig(a)));
    },
  );

  export const minus = curry2(
    (value: BigNumberSource, a: BigNumberSource): BigNumber => {
      return fromBig(toBig(value).minus(toBig(a)));
    },
  );

  export const mul = curry2(
    (value: BigNumberSource, a: BigNumberSource): BigNumber => {
      return fromBig(toBig(value).mul(toBig(a)));
    },
  );

  export const div = curry2(
    (value: BigNumberSource, a: BigNumberSource): BigNumber => {
      return fromBig(toBig(value).div(toBig(a)));
    },
  );

  export const pow = curry2((value: BigNumberSource, a: number): BigNumber => {
    return fromBig(toBig(value).pow(a));
  });

  export const round = curry2(
    (
      options: {
        precision?: number;
        roundingMode?: RoundingMode;
      },
      value: BigNumberSource,
    ): BigNumber => {
      const n = toBig(value);
      return fromBig(
        n.toSD(
          Math.max(1, (n.e ?? 0) + 1 + (options.precision ?? 0)),
          options.roundingMode ?? roundFloor,
        ),
      );
    },
  );

  export const toPrecision = curry2(
    (
      options: {
        precision?: number;
        roundingMode?: RoundingMode;
      },
      value: BigNumberSource,
    ): string => {
      return toBig(value).toPrecision(
        options.precision ?? 0,
        options.roundingMode ?? roundFloor,
      );
    },
  );

  export const ascend = curry2(
    (a: BigNumberSource, b: BigNumberSource): -1 | 0 | 1 =>
      isLt(a, b) ? -1 : isGt(a, b) ? 1 : 0,
  );

  export const descend = curry2(
    (a: BigNumberSource, b: BigNumberSource): -1 | 0 | 1 =>
      isLt(a, b) ? 1 : isGt(a, b) ? -1 : 0,
  );

  export const max = (numbers: OneOrMore<BigNumberSource>): BigNumber => {
    return fromBig(Big.max(...numbers.map(toBig)));
  };

  export const min = (numbers: OneOrMore<BigNumberSource>): BigNumber => {
    return fromBig(Big.min(...numbers.map(toBig)));
  };

  export const clamp = (
    range: [min: BigNumber, max: BigNumber],
    n: BigNumber,
  ): BigNumber => {
    const [min, max] = range;
    if (isGte(n, max)) return max;
    if (isLte(n, min)) return min;
    return n;
  };

  export const sum = (numbers: BigNumberSource[]): BigNumber => {
    return fromBig(Big.sum(...numbers.map(toBig)));
  };

  export const ZERO = BigNumber.from(0);
  export const ONE = BigNumber.from(1e8);
}

interface Curry2<X, Y, Ret> {
  (x: X): (y: Y) => Ret;
  (x: X, y: Y): Ret;
}
function curry2<X, Y, Ret>(fn: (x: X, y: Y) => Ret): Curry2<X, Y, Ret> {
  // @ts-ignore
  return (...args) => {
    if (args.length === 2) {
      // @ts-ignore
      return fn(...args);
    }
    // @ts-ignore
    return (y: Y) => fn(...args, y);
  };
}
