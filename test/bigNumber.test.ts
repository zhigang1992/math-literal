import { BigNumber } from '../src/index';

describe('BigNumber.getPrecision', () => {
  // Regression: this used to return `d.length`, decimal.js' internal limb count
  // in base 1e7, because `??` binds looser than `-` and swallowed the exponent
  // term. Every one of these returned 1, 2 or 3.
  const cases: Array<[value: string, decimalPlaces: number]> = [
    ['0', 0],
    ['100', 0],
    ['1.5', 1],
    ['-2.50', 1],
    ['1.2345', 4],
    ['0.001', 3],
    ['12.345', 3],
    ['0.987654', 6],
    ['1e-8', 8],
    ['1e21', 0],
    ['1.23456789012', 11],
  ];

  for (const [value, expected] of cases) {
    it(`counts ${expected} decimal place(s) in ${value}`, () => {
      expect(BigNumber.getPrecision(value)).toEqual(expected);
    });
  }

  it('counts decimal places, not significant digits', () => {
    // 0.001 has one significant digit but three decimal places.
    expect(BigNumber.getPrecision('0.001')).toEqual(3);
    // 12.345 has five significant digits but three decimal places.
    expect(BigNumber.getPrecision('12.345')).toEqual(3);
  });

  it('is unaffected by how the number was written', () => {
    expect(BigNumber.getPrecision('0.00000001')).toEqual(
      BigNumber.getPrecision('1e-8')
    );
  });
});

describe('BigNumber.getDecimalPart', () => {
  // Regression: these followed getPrecision off a cliff. "0.987654" at
  // precision 6 returned "9".
  const cases: Array<
    [value: string, precision: number, expected: undefined | string]
  > = [
    ['1.2345', 4, '2345'],
    ['1.5', 2, '5'],
    ['0.987654', 6, '987654'],
    ['12.345', 3, '345'],
    ['100', 2, undefined],
    ['0', 2, undefined],
  ];

  for (const [value, precision, expected] of cases) {
    it(`takes ${JSON.stringify(
      expected
    )} from ${value} at precision ${precision}`, () => {
      expect(BigNumber.getDecimalPart({ precision }, value)).toEqual(expected);
    });
  }

  it('does not pad when precision exceeds the actual decimal places', () => {
    expect(BigNumber.getDecimalPart({ precision: 10 }, '12.345')).toEqual(
      '345'
    );
    expect(BigNumber.getDecimalPart({ precision: 6 }, '1.5')).toEqual('5');
  });

  it('truncates rather than rounds when precision is the limit', () => {
    expect(BigNumber.getDecimalPart({ precision: 2 }, '1.239')).toEqual('23');
  });

  it('is curried like its neighbours', () => {
    const twoPlaces = BigNumber.getDecimalPart({ precision: 2 });
    expect(twoPlaces('3.14159')).toEqual('14');
  });
});
