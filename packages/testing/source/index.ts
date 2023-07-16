/// <reference types="jest" />

const globalIt = it;
const globalTest = test;
const globalDescribe = describe;
const globalExpect = expect;
const globalBeforeEach = beforeEach;
const globalAfterEach = afterEach;
const globalBeforeAll = beforeAll;
const globalAfterAll = afterAll;
const globalJest = jest;

export {
  globalIt as it,
  globalTest as test,
  globalDescribe as describe,
  globalExpect as expect,
  globalBeforeEach as beforeEach,
  globalAfterEach as afterEach,
  globalBeforeAll as beforeAll,
  globalAfterAll as afterAll,
  globalJest as jest,
};
