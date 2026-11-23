// Config para las pruebas E2E de billetera + pagos con PostgreSQL real (fuera de `npm test`)
module.exports = {
  rootDir: '../..',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: 'test/payments/.*\\.pg\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    // Mismo alias que las otras suites E2E (ver test/occupancy-services/README.md)
    '^@nestjs/mapped-types$': 'mapped-types-cjs',
  },
  testEnvironment: 'node',
};
