---
name: ui-test-with-playwright
description: Write a UI test using Playwright with JavaScript that follows with best practices and is easy to maintain.
---

## Workflow
1. Analyze the UI of the application and identify the elements that need to be tested.
2. Write only the necessary test scripts based on the test cases defined by the user's requirements.
3. Try to create mock servers for Anthropics API calls to avoid hitting the real API during tests.
4. Run tests and verify that they pass successfully.
   * If the tests fail, analyze the errors and fix them.

## Project structure
```
web/
  tests/
    feature_name.success.spec.js
    feature_name.failure.spec.js
```

## Best practices
* Use descriptive test names that clearly indicate the purpose of the test.
* Use `beforeAll` and `afterAll` hooks to set up and tear down the test environment.
* Use data test id attributes to locate elements instead of relying on CSS selectors or XPath. https://playwright.dev/docs/api/class-page#page-get-by-test-id
