const selectors = [];

export function withValidationSelector(selector, operation) {
  selectors.push(selector);
  try {
    return operation();
  } finally {
    selectors.pop();
  }
}

export function currentValidationSelector() {
  return selectors.at(-1);
}