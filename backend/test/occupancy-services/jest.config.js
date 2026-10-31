// Config para las pruebas E2E con PostgreSQL real (fuera de `npm test`)
module.exports = {
  rootDir: '../..',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: 'test/occupancy-services/.*\\.pg\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    // @nestjs/mapped-types "*" resuelve a una versión solo-ESM que Jest (CJS) no carga
    // (problema preexistente: también rompe 6 specs de `npm test`). Para estas pruebas
    // se usa un alias instalado con --no-save de la 2.1.0 (CJS). Ver README.
    '^@nestjs/mapped-types$': 'mapped-types-cjs',
  },
  testEnvironment: 'node',
};
