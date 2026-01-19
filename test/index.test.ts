import { BigNumber, math } from '../src/index';

describe('math-literal', () => {
  describe('BigNumber', () => {
    it('creates a BigNumber from a number', () => {
      const num = BigNumber.from(123);
      expect(BigNumber.toString(num)).toEqual('123');
    });

    it('creates a BigNumber from a string', () => {
      const num = BigNumber.from('456.789');
      expect(BigNumber.toString(num)).toEqual('456.789');
    });

    it('checks if value is a BigNumber', () => {
      const num = BigNumber.from(100);
      expect(BigNumber.isBigNumber(num)).toBe(true);
      expect(BigNumber.isBigNumber(100)).toBe(false);
    });
  });

  describe('math (math string)', () => {
    it('evaluates simple addition', () => {
      const a = 1;
      const b = 2;
      const result = math`${a} + ${b}`;
      expect(BigNumber.toString(result)).toEqual('3');
    });

    it('evaluates multiplication', () => {
      const a = 5;
      const b = 6;
      const result = math`${a} * ${b}`;
      expect(BigNumber.toString(result)).toEqual('30');
    });

    it('evaluates complex expressions', () => {
      const a = 10;
      const b = 5;
      const c = 2;
      const result = math`(${a} + ${b}) * ${c}`;
      expect(BigNumber.toString(result)).toEqual('30');
    });

    it('evaluates division with decimals', () => {
      const a = '10.5';
      const b = '2.5';
      const result = math`${a} / ${b}`;
      expect(BigNumber.toString(result)).toEqual('4.2');
    });
  });
});
