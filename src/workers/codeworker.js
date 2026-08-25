/* eslint-disable no-restricted-globals */

self.onmessage = (e) => {
  const { code, testCases } = e.data;
  const results = [];
  try {
    // grab every distinct function name referenced across all test cases
    const functionNames = [...new Set(testCases.map((t) => t.functionName))];
    const exportsFn = new Function(`${code}\nreturn { ${functionNames.join(',')} };`);
    const exported = exportsFn();

    testCases.forEach((test, i) => {
      try {
        const fn = exported[test.functionName];
        if (typeof fn !== 'function') {
          throw new Error(`"${test.functionName}" is not defined`);
        }
        const actual = fn(...test.input);
        results.push({
          name: test.name || `Test ${i + 1}`,
          passed: JSON.stringify(actual) === JSON.stringify(test.expectedOutput),
          actual,
          expected: test.expectedOutput,
        });
      } catch (err) {
        results.push({ name: test.name || `Test ${i + 1}`, passed: false, error: err.message });
      }
    });
  } catch (err) {
    results.push({ name: 'Error', passed: false, error: err.message });
  }
  self.postMessage(results);
};