import { calcTransport, calcHome, calcFood, calcShopping, calcTravel } from './js/calculator.js';

describe('Carbon Emission Calculator Math', () => {
  
  test('calcTransport correctly computes emissions for petrol car + cycle', () => {
    // miles=100, carType='petrol', ptHours=2, cycle=5
    // EF: carBase:1.0, carMiles:0.0024, ptPerHour:0.015, cycle:-0.005
    // Car = 1.0 + (100 * 0.0024 * 52) = 1.0 + 12.48 = 13.48
    // PT = 2 * 0.015 * 52 = 1.56
    // Cycle = 5 * -0.005 * 52 = -1.3
    // Total = 13.48 + 1.56 - 1.3 = 13.74
    const result = calcTransport(100, 'petrol', 2, 5);
    expect(result).toBeCloseTo(13.74, 2);
  });

  test('calcTransport floor is 0', () => {
    // 0 miles, none car, 0 pt, 100 cycle
    // Total = 0 + 0 + 0 - 26 = -26 -> floored to 0
    const result = calcTransport(0, 'none', 0, 100);
    expect(result).toBe(0);
  });

  test('calcHome computes emissions with renewable energy', () => {
    // heating='heatpump', kwh=300, size='small', renew='yes'
    // base = (0.3) * (0.8) = 0.24
    // elec = 300 * 0.00023 * 12 * 0.1 = 0.0828
    // Total = 0.3228
    const result = calcHome('heatpump', 300, 'small', 'yes');
    expect(result).toBeCloseTo(0.3228, 4);
  });

  test('calcFood computes diet based emissions', () => {
    // diet='vegan', waste='low', local='always'
    // base = 0.9 + 0 - 0.1 = 0.8
    const result = calcFood('vegan', 'low', 'always');
    expect(result).toBeCloseTo(0.8, 2);
  });

  test('calcShopping computes clothing and electronics', () => {
    // clothing=5, elec='one', habit='minimal', sh='often'
    // cloth = 5 * 0.012 * 12 = 0.72
    // elec = 0.15
    // habit = 0.3
    // sh = -0.2
    // Total = 0.72 + 0.15 + 0.3 - 0.2 = 0.97
    const result = calcShopping(5, 'one', 'minimal', 'often');
    expect(result).toBeCloseTo(0.97, 2);
  });

  test('calcTravel computes long and short flights with offsetting', () => {
    // sf=2, lf=1, class='economy', offset='sometimes'
    // sf(2) * 0.25 + lf(1) * 1.5 = 2.0
    // multiplier = 1.0 (economy)
    // flights = 2.0
    // offsetMultiplier = 0.4
    // offsetVal = 2.0 * 0.4 = 0.8
    // Total = 2.0 - 0.8 = 1.2
    const result = calcTravel(2, 1, 'economy', 'sometimes');
    expect(result).toBeCloseTo(1.2, 2);
  });

});
