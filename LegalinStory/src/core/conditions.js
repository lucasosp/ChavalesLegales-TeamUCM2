/**
 * Tiny, declarative condition evaluator for story data.
 *
 * Conditions are data, never strings of JavaScript. This keeps content
 * portable and makes it safe to load stories from untrusted sources.
 *
 * Supported forms:
 *   { "flag": "acceptedInvitation" }
 *   { "seen": "poem-1" }
 *   { "not": { "flag": "metHana" } }
 *   { "all": [ ... ] }
 *   { "any": [ ... ] }
 *   { "eq": [ { "flag": "chapter" }, 2 ] }
 *   { "neq" | "gt" | "gte" | "lt" | "lte": [ left, right ] }
 */

const OPERATORS = new Set([
  "flag",
  "seen",
  "not",
  "all",
  "any",
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
]);

export function evaluateCondition(condition, { flags = {}, seen = new Set() } = {}) {
  if (condition === undefined || condition === null) return true;

  if (!isPlainObject(condition)) {
    throw new TypeError("A condition must be an object");
  }

  const operators = Object.keys(condition);
  if (operators.length !== 1) {
    throw new Error("A condition must contain exactly one operator");
  }

  const operator = operators[0];
  const value = condition[operator];
  const context = { flags, seen };

  switch (operator) {
    case "flag":
      return Boolean(flags[value]);

    case "seen":
      return seen instanceof Set ? seen.has(value) : Array.isArray(seen) && seen.includes(value);

    case "not":
      return !evaluateCondition(value, context);

    case "all":
      assertArray(operator, value);
      return value.every((item) => evaluateCondition(item, context));

    case "any":
      assertArray(operator, value);
      return value.some((item) => evaluateCondition(item, context));

    case "eq":
      return compare(operator, value, context, (left, right) => left === right);

    case "neq":
      return compare(operator, value, context, (left, right) => left !== right);

    case "gt":
      return compare(operator, value, context, (left, right) => left > right);

    case "gte":
      return compare(operator, value, context, (left, right) => left >= right);

    case "lt":
      return compare(operator, value, context, (left, right) => left < right);

    case "lte":
      return compare(operator, value, context, (left, right) => left <= right);

    default:
      throw new Error(`Unknown condition operator "${operator}"`);
  }
}

function compare(operator, operands, context, test) {
  assertArray(operator, operands);
  if (operands.length !== 2) {
    throw new Error(`Condition "${operator}" needs exactly two operands`);
  }

  return test(readOperand(operands[0], context), readOperand(operands[1], context));
}

function readOperand(operand, { flags, seen }) {
  if (!isPlainObject(operand)) return operand;

  if ("flag" in operand) return flags[operand.flag];
  if ("seen" in operand) {
    return seen instanceof Set ? seen.has(operand.seen) : Array.isArray(seen) && seen.includes(operand.seen);
  }

  throw new Error("A comparison operand must be a literal, { flag } or { seen }");
}

function assertArray(operator, value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Condition "${operator}" needs a non-empty array`);
  }
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
