"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// runtime/entry.ts
var entry_exports = {};
__export(entry_exports, {
  INTEREST_CN: () => INTEREST_CN,
  ItinerarySchema: () => ItinerarySchema,
  MetaSchema: () => MetaSchema,
  intake: () => intake,
  itineraryTotalCost: () => itineraryTotalCost,
  runAgent: () => runAgent,
  totalTransitMin: () => totalTransitMin
});
module.exports = __toCommonJS(entry_exports);

// ../../src/domain/time.ts
var MIN_PER_DAY = 1440;
function toMin(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) throw new Error(`bad time: ${hhmm}`);
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 47 || mi > 59) throw new Error(`bad time: ${hhmm}`);
  return h * 60 + mi;
}
function fromMin(min) {
  const wrapped = (min % MIN_PER_DAY + MIN_PER_DAY) % MIN_PER_DAY;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function durationMin(start, end) {
  const raw = toMin(end) - toMin(start);
  return raw < 0 ? raw + MIN_PER_DAY : raw;
}
function weekdayOf(date) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
var WEEKDAY_CN = ["\u5468\u65E5", "\u5468\u4E00", "\u5468\u4E8C", "\u5468\u4E09", "\u5468\u56DB", "\u5468\u4E94", "\u5468\u516D"];
function weekdayLabel(date) {
  return WEEKDAY_CN[weekdayOf(date)];
}
function addDays(date, n) {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}
function diffDays(start, end) {
  const a = (/* @__PURE__ */ new Date(`${start}T00:00:00Z`)).getTime();
  const b = (/* @__PURE__ */ new Date(`${end}T00:00:00Z`)).getTime();
  return Math.round((b - a) / 864e5);
}
function dateList(start, end) {
  const n = Math.max(0, diffDays(start, end));
  return Array.from({ length: n + 1 }, (_, i) => addDays(start, i));
}

// ../../node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// ../../node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// ../../node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// ../../node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// ../../node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// ../../node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// ../../node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// ../../node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: (arg) => ZodString.create({ ...arg, coerce: true }),
  number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
  boolean: (arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  }),
  bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
  date: (arg) => ZodDate.create({ ...arg, coerce: true })
};
var NEVER = INVALID;

// ../../src/domain/schema.ts
var PACES = {
  relaxed: { max_active_min_per_day: 6 * 60, max_poi_per_day: 3, label: "\u8F7B\u677E" },
  moderate: { max_active_min_per_day: 9 * 60, max_poi_per_day: 5, label: "\u9002\u4E2D" },
  packed: { max_active_min_per_day: 12 * 60, max_poi_per_day: 7, label: "\u7D27\u51D1" }
};
var INTEREST_CN = {
  food: "\u7F8E\u98DF",
  nature: "\u81EA\u7136\u98CE\u5149",
  history: "\u5386\u53F2\u53E4\u8FF9",
  museum: "\u535A\u7269\u9986",
  art: "\u827A\u672F",
  shopping: "\u8D2D\u7269",
  nightlife: "\u591C\u751F\u6D3B",
  photography: "\u62CD\u7167",
  theme_park: "\u4E3B\u9898\u4E50\u56ED",
  hot_spring: "\u6E29\u6CC9",
  hiking: "\u5F92\u6B65",
  local_life: "\u5E02\u4E95\u751F\u6D3B"
};
var OUTDOOR_CATEGORIES = ["nature", "hiking", "theme_park", "landmark", "sight"];
var DataConfidence = external_exports.enum(["verified", "estimated", "unknown"]);
var MoneySchema = external_exports.object({
  amount: external_exports.number(),
  currency: external_exports.string().default("CNY"),
  type: external_exports.enum(["ticket", "meal", "lodging", "transit", "other"]).default("other")
});
var OpeningHoursSchema = external_exports.object({
  open: external_exports.string(),
  close: external_exports.string(),
  closed_days: external_exports.array(external_exports.number().int().min(0).max(6)).default([]),
  confidence: DataConfidence.default("estimated")
});
var ItineraryItemSchema = external_exports.object({
  id: external_exports.string(),
  type: external_exports.enum(["activity", "meal", "transit", "rest", "checkin"]),
  poi_id: external_exports.string().nullable().default(null),
  name: external_exports.string(),
  lat: external_exports.number().nullable().default(null),
  lng: external_exports.number().nullable().default(null),
  category: external_exports.string().nullable().default(null),
  start_time: external_exports.string(),
  end_time: external_exports.string(),
  duration_min: external_exports.number().int().nonnegative(),
  cost: MoneySchema,
  opening_hours: OpeningHoursSchema.nullable().default(null),
  booking_required: external_exports.boolean().default(false),
  booked: external_exports.boolean().default(false),
  locked: external_exports.boolean().default(false),
  mode: external_exports.string().nullable().default(null),
  from_item_id: external_exports.string().nullable().default(null),
  to_item_id: external_exports.string().nullable().default(null),
  distance_m: external_exports.number().nullable().default(null),
  notes: external_exports.string().nullable().default(null),
  weather_sensitive: external_exports.boolean().default(false)
});
var DaySummarySchema = external_exports.object({
  activity_min: external_exports.number(),
  transit_min: external_exports.number(),
  active_min: external_exports.number(),
  cost: external_exports.object({
    amount: external_exports.number(),
    currency: external_exports.string(),
    by_type: external_exports.record(external_exports.string(), external_exports.number())
  }),
  poi_count: external_exports.number(),
  max_leg_km: external_exports.number()
});
var DaySchema = external_exports.object({
  date: external_exports.string(),
  day_index: external_exports.number().int(),
  base_area: external_exports.object({ name: external_exports.string(), lat: external_exports.number(), lng: external_exports.number() }).nullable().default(null),
  lodging: external_exports.object({
    name: external_exports.string(),
    lat: external_exports.number(),
    lng: external_exports.number(),
    cost: MoneySchema
  }).nullable().default(null),
  items: external_exports.array(ItineraryItemSchema),
  summary: DaySummarySchema
});
var MetaSchema = external_exports.object({
  destination: external_exports.string(),
  city_code: external_exports.string().default("chengdu"),
  country: external_exports.string().default("CN"),
  start_date: external_exports.string(),
  end_date: external_exports.string(),
  timezone: external_exports.string().default("Asia/Shanghai"),
  travelers: external_exports.object({ adults: external_exports.number().int().min(1), children: external_exports.number().int().min(0).default(0) }),
  /** 出发地。空字符串表示用户没说 —— 不要替用户猜 */
  origin_city: external_exports.string().default(""),
  budget: external_exports.object({
    amount: external_exports.number(),
    currency: external_exports.string().default("CNY"),
    includes_flights: external_exports.boolean().default(false)
  }),
  pace: external_exports.enum(["relaxed", "moderate", "packed"]).default("moderate"),
  interests: external_exports.array(external_exports.string()).default([]),
  mobility: external_exports.enum(["normal", "limited", "wheelchair"]).default("normal"),
  must_visit: external_exports.array(external_exports.string()).default([]),
  avoid: external_exports.array(external_exports.string()).default([]),
  source: external_exports.object({ type: external_exports.enum(["chat", "manual", "import"]), file_ref: external_exports.string().nullable().default(null) }).default({
    type: "chat",
    file_ref: null
  })
});
var ViolationSchema = external_exports.object({
  code: external_exports.string(),
  severity: external_exports.enum(["error", "warning", "info"]),
  day_index: external_exports.number().optional(),
  item_ids: external_exports.array(external_exports.string()),
  message: external_exports.string(),
  suggestion: external_exports.string(),
  auto_fixable: external_exports.boolean()
});
var RuleResultSchema = external_exports.object({
  code: external_exports.string(),
  title: external_exports.string().default(""),
  description: external_exports.string().default(""),
  passed: external_exports.boolean(),
  severity: external_exports.enum(["error", "warning", "info"]).optional(),
  checked: external_exports.number(),
  covered: external_exports.number().default(0),
  detail: external_exports.string().optional(),
  warnings: external_exports.number().default(0),
  infos: external_exports.number().default(0)
});
var CertificateSchema = external_exports.object({
  verified_at: external_exports.string(),
  verifier_version: external_exports.string(),
  rules: external_exports.array(RuleResultSchema),
  evidence: external_exports.object({
    poi_sources: external_exports.array(external_exports.object({ poi_id: external_exports.string(), provider: external_exports.string(), fetched_at: external_exports.string() })),
    cost_breakdown: external_exports.record(external_exports.string(), external_exports.number()),
    max_leg_km: external_exports.number(),
    total_transit_min: external_exports.number(),
    assumptions: external_exports.array(external_exports.string()),
    data_coverage: external_exports.object({
      poi_verified: external_exports.number(),
      poi_total: external_exports.number(),
      hours_known: external_exports.number(),
      hours_total: external_exports.number()
    })
  }),
  summary: external_exports.object({ passed: external_exports.number(), total: external_exports.number(), errors: external_exports.number(), warnings: external_exports.number() })
});
var ItinerarySchema = external_exports.object({
  id: external_exports.string(),
  version: external_exports.number().int(),
  parent_id: external_exports.string().nullable().default(null),
  variant_label: external_exports.string().nullable().default(null),
  created_at: external_exports.string(),
  updated_at: external_exports.string(),
  meta: MetaSchema,
  days: external_exports.array(DaySchema),
  unscheduled: external_exports.array(external_exports.any()).default([]),
  warnings: external_exports.array(ViolationSchema).default([]),
  feasibility: CertificateSchema.nullable().default(null),
  assumptions: external_exports.array(external_exports.string()).default([])
});
var CandidateSchema = external_exports.object({
  poi_id: external_exports.string(),
  name: external_exports.string(),
  lat: external_exports.number(),
  lng: external_exports.number(),
  category: external_exports.string(),
  reason: external_exports.string(),
  suggested_duration_min: external_exports.number(),
  cost: MoneySchema,
  indoor: external_exports.boolean().default(false),
  interest_tags: external_exports.array(external_exports.string()).default([]),
  rating: external_exports.number().default(0),
  opening_hours: OpeningHoursSchema.nullable().default(null),
  booking_required: external_exports.boolean().default(false)
});

// ../../src/domain/geo.ts
var R = 6371.0088;
function haversine(a, b) {
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const la1 = a.lat * Math.PI / 180;
  const la2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
var DETOUR_FACTOR = 1.32;
function roadKm(a, b) {
  return haversine(a, b) * DETOUR_FACTOR;
}
var SPEED_KMH = {
  walk: 4.4,
  bike: 12,
  subway: 28,
  bus: 17,
  taxi: 22,
  drive: 24,
  train: 120,
  flight: 700
};
function pickMode(km) {
  if (km <= 1.4) return "walk";
  if (km <= 22) return "taxi";
  if (km <= 90) return "train";
  return "train";
}
function estimateTransitMinutes(km, mode) {
  const speed = SPEED_KMH[mode] ?? 20;
  const overhead = mode === "walk" ? 0 : mode === "taxi" ? 6 : 12;
  return Math.max(2, Math.round(km / speed * 60 + overhead));
}
function centroid(points) {
  if (points.length === 0) return { lat: 0, lng: 0 };
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  return { lat, lng };
}
function kmeans(items, k, iterations = 24) {
  if (items.length === 0) return [];
  const groups = Math.max(1, Math.min(k, items.length));
  const sorted = [...items].sort((a, b) => a.lng - b.lng || a.lat - b.lat);
  const centers = [];
  for (let i = 0; i < groups; i++) {
    const idx = Math.min(sorted.length - 1, Math.round((i + 0.5) / groups * sorted.length));
    centers.push({ lat: sorted[idx].lat, lng: sorted[idx].lng });
  }
  let assignment = new Array(items.length).fill(0);
  for (let iter = 0; iter < iterations; iter++) {
    let changed = false;
    items.forEach((item, i) => {
      let best = 0;
      let bestD = Infinity;
      centers.forEach((c, ci) => {
        const d = haversine(item, c);
        if (d < bestD) {
          bestD = d;
          best = ci;
        }
      });
      if (assignment[i] !== best) {
        assignment[i] = best;
        changed = true;
      }
    });
    for (let ci = 0; ci < centers.length; ci++) {
      const members = items.filter((_, i) => assignment[i] === ci);
      if (members.length > 0) centers[ci] = centroid(members);
    }
    if (!changed) break;
  }
  const out = Array.from({ length: groups }, () => []);
  items.forEach((item, i) => out[assignment[i]].push(item));
  return out.filter((g) => g.length > 0);
}
function nearestNeighborOrder(items, start) {
  const remaining = [...items];
  const ordered = [];
  let cursor = start;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestD = Infinity;
    remaining.forEach((item, i) => {
      const d = haversine(cursor, item);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    });
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    cursor = next;
  }
  return ordered;
}
function maxPairwiseKm(points) {
  let max = 0;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      max = Math.max(max, haversine(points[i], points[j]));
    }
  }
  return max;
}

// ../../src/data/pois.ts
var CITIES = [
  {
    code: "chengdu",
    name: "\u6210\u90FD",
    center: { lat: 30.657, lng: 104.066 },
    lodging: { name: "\u6625\u7199\u8DEF \xB7 \u4E9A\u6735\u9152\u5E97", lat: 30.6571, lng: 104.0802, price: 420, area: "\u6625\u7199\u8DEF" },
    aliases: ["\u6210\u90FD", "\u84C9\u57CE", "\u9526\u5B98\u57CE"]
  },
  {
    code: "xian",
    name: "\u897F\u5B89",
    center: { lat: 34.245, lng: 108.955 },
    lodging: { name: "\u949F\u697C \xB7 \u7F8E\u5C45\u9152\u5E97", lat: 34.2605, lng: 108.9448, price: 380, area: "\u949F\u697C" },
    aliases: ["\u897F\u5B89", "\u957F\u5B89"]
  },
  {
    code: "xiamen",
    name: "\u53A6\u95E8",
    center: { lat: 24.445, lng: 118.09 },
    lodging: { name: "\u4E2D\u5C71\u8DEF \xB7 \u6D77\u666F\u516C\u5BD3", lat: 24.4562, lng: 118.0836, price: 460, area: "\u4E2D\u5C71\u8DEF" },
    aliases: ["\u53A6\u95E8", "\u9E6D\u5C9B"]
  },
  {
    code: "beijing",
    name: "\u5317\u4EAC",
    center: { lat: 39.93, lng: 116.4 },
    lodging: { name: "\u738B\u5E9C\u4E95 \xB7 \u5168\u5B63\u9152\u5E97", lat: 39.9142, lng: 116.4108, price: 520, area: "\u738B\u5E9C\u4E95" },
    aliases: ["\u5317\u4EAC", "\u4EAC\u57CE", "\u5E1D\u90FD"]
  },
  {
    code: "hangzhou",
    name: "\u676D\u5DDE",
    center: { lat: 30.25, lng: 120.15 },
    lodging: { name: "\u6E56\u6EE8 \xB7 \u541B\u60A6\u9152\u5E97", lat: 30.2551, lng: 120.1602, price: 680, area: "\u6E56\u6EE8" },
    aliases: ["\u676D\u5DDE", "\u4E34\u5B89", "\u676D\u57CE"]
  }
];
var P = (poi_id, name, city, lat, lng, area, category, tags, duration_min, price, open, close, closed_days, hours_confidence, rating, indoor, booking_required, blurb) => ({
  poi_id,
  name,
  city,
  lat,
  lng,
  area,
  category,
  tags,
  duration_min,
  price,
  open,
  close,
  closed_days,
  hours_confidence,
  rating,
  indoor,
  booking_required,
  blurb
});
var POIS = [
  // ---------------- 成都 ----------------
  P("CD01", "\u5BBD\u7A84\u5DF7\u5B50", "chengdu", 30.669, 104.0533, "\u5BBD\u7A84\u5DF7\u5B50", "sight", ["local_life", "photography", "food"], 120, 0, "00:00", "23:59", [], "verified", 4.5, false, false, "\u4E09\u6761\u6E05\u4EE3\u8001\u5DF7\uFF0C\u9752\u7816\u7070\u74E6\uFF0C\u65E9\u4E0A\u4E5D\u70B9\u524D\u51E0\u4E4E\u6CA1\u4EBA"),
  P("CD02", "\u6B66\u4FAF\u7960", "chengdu", 30.645, 104.045, "\u6B66\u4FAF\u7960", "sight", ["history"], 90, 50, "08:00", "18:30", [], "verified", 4.6, false, false, "\u4E09\u56FD\u4E3B\u9898\u7960\u5E99\uFF0C\u7EA2\u5899\u7AF9\u5F71\u662F\u6210\u90FD\u6700\u51FA\u7247\u7684\u673A\u4F4D"),
  P("CD03", "\u9526\u91CC\u53E4\u8857", "chengdu", 30.6445, 104.047, "\u6B66\u4FAF\u7960", "sight", ["local_life", "food", "photography"], 90, 0, "10:00", "23:00", [], "verified", 4.2, false, false, "\u7D27\u90BB\u6B66\u4FAF\u7960\uFF0C\u665A\u4E0A\u706F\u7B3C\u4EAE\u8D77\u6765\u624D\u597D\u770B"),
  P("CD04", "\u675C\u752B\u8349\u5802", "chengdu", 30.662, 104.03, "\u6D63\u82B1\u6EAA", "sight", ["history", "nature"], 120, 50, "09:00", "18:00", [], "verified", 4.6, false, false, "\u56ED\u6797\u5F0F\u7EAA\u5FF5\u9986\uFF0C\u7AF9\u6797\u548C\u6C34\u666F\u9002\u5408\u6162\u6162\u8D70"),
  P("CD05", "\u6210\u90FD\u535A\u7269\u9986", "chengdu", 30.6575, 104.0635, "\u5929\u5E9C\u5E7F\u573A", "museum", ["museum", "history"], 120, 0, "09:00", "17:00", [1], "verified", 4.7, true, true, "\u514D\u8D39\u4F46\u9700\u9884\u7EA6\uFF0C\u8D1F\u4E00\u5C42\u81EA\u7136\u5385\u9002\u5408\u96E8\u5929"),
  P("CD06", "\u6625\u7199\u8DEF", "chengdu", 30.657, 104.081, "\u6625\u7199\u8DEF", "shopping", ["shopping", "local_life"], 90, 0, "10:00", "22:00", [], "verified", 4.1, false, false, "\u6210\u90FD\u6700\u70ED\u95F9\u7684\u5546\u4E1A\u8857\uFF0C\u665A\u4E0A\u6709\u8857\u5934\u8868\u6F14"),
  P("CD07", "\u592A\u53E4\u91CC", "chengdu", 30.654, 104.083, "\u6625\u7199\u8DEF", "shopping", ["shopping", "art", "photography"], 90, 0, "10:00", "22:00", [], "verified", 4.5, false, false, "\u4F4E\u5C42\u8857\u533A\u5F0F\u5546\u4E1A\uFF0C\u5927\u6148\u5BFA\u5C31\u5728\u4E2D\u95F4"),
  P("CD08", "\u4EBA\u6C11\u516C\u56ED", "chengdu", 30.657, 104.063, "\u5929\u5E9C\u5E7F\u573A", "sight", ["local_life", "nature"], 60, 0, "06:00", "22:00", [], "verified", 4.4, false, false, "\u9E64\u9E23\u8336\u793E\u559D\u76D6\u7897\u8336\u3001\u638F\u8033\u6735\uFF0C\u6210\u90FD\u751F\u6D3B\u6837\u672C"),
  P("CD09", "\u5927\u718A\u732B\u7E41\u80B2\u7814\u7A76\u57FA\u5730", "chengdu", 30.735, 104.145, "\u5317\u90CA", "nature", ["nature", "photography"], 180, 55, "07:30", "18:00", [], "verified", 4.8, false, true, "\u5FC5\u987B\u65E9\u53BB\uFF0C10 \u70B9\u540E\u718A\u732B\u5C31\u56DE\u53BB\u7761\u89C9\u4E86"),
  P("CD10", "\u6587\u6B8A\u9662", "chengdu", 30.678, 104.07, "\u6587\u6B8A\u9662", "sight", ["history", "local_life"], 60, 0, "08:00", "17:00", [], "verified", 4.4, false, false, "\u9999\u706B\u6E05\u51C0\uFF0C\u95E8\u53E3\u7684\u751C\u6C34\u9762\u503C\u5F97\u4E00\u8BD5"),
  P("CD11", "\u91D1\u6C99\u9057\u5740\u535A\u7269\u9986", "chengdu", 30.681, 104.013, "\u91D1\u6C99", "museum", ["museum", "history"], 120, 70, "08:00", "18:00", [1], "verified", 4.6, true, false, "\u592A\u9633\u795E\u9E1F\u51FA\u571F\u5730\uFF0C\u5C55\u5385\u706F\u5149\u505A\u5F97\u5F88\u597D"),
  P("CD12", "\u56DB\u5DDD\u535A\u7269\u9662", "chengdu", 30.657, 104.033, "\u6D63\u82B1\u6EAA", "museum", ["museum", "art"], 120, 0, "09:00", "17:00", [1], "verified", 4.5, true, true, "\u5F20\u5927\u5343\u4E66\u753B\u9986\u662F\u91CD\u70B9\uFF0C\u514D\u8D39\u9700\u9884\u7EA6"),
  P("CD13", "\u4E1C\u90CA\u8BB0\u5FC6", "chengdu", 30.665, 104.13, "\u5EFA\u8BBE\u8DEF", "sight", ["art", "photography", "nightlife"], 90, 0, "10:00", "22:00", [], "estimated", 4.3, false, false, "\u8001\u5382\u623F\u6539\u7684\u6587\u521B\u56ED\uFF0C\u5DE5\u4E1A\u98CE\u62CD\u7167\u70B9\u5BC6\u96C6"),
  P("CD14", "\u4E5D\u773C\u6865", "chengdu", 30.64, 104.09, "\u4E5D\u773C\u6865", "nightlife", ["nightlife"], 90, 0, "18:00", "02:00", [], "estimated", 4, false, false, "\u5E9C\u5357\u6CB3\u8FB9\u9152\u5427\u4E00\u6761\u8857\uFF0C\u591C\u91CC\u6700\u6709\u70DF\u706B\u6C14"),
  P("CD15", "\u7389\u6797\u8DEF\u5C0F\u9152\u9986", "chengdu", 30.63, 104.06, "\u7389\u6797", "nightlife", ["nightlife", "local_life"], 90, 80, "19:00", "02:00", [], "estimated", 4.2, true, true, "\u300A\u6210\u90FD\u300B\u5531\u7684\u90A3\u5BB6\uFF0C\u5468\u672B\u8981\u6392\u961F"),
  P("CD16", "\u5EFA\u8BBE\u8DEF\u5C0F\u5403\u8857", "chengdu", 30.665, 104.115, "\u5EFA\u8BBE\u8DEF", "restaurant", ["food", "local_life"], 60, 50, "17:00", "23:00", [], "estimated", 4.4, false, false, "\u94B5\u94B5\u9E21\u3001\u86CB\u70D8\u7CD5\u3001\u70E4\u8111\u82B1\uFF0C\u8FB9\u8D70\u8FB9\u5403"),
  P("CD17", "\u9752\u57CE\u5C71", "chengdu", 30.9, 103.57, "\u90FD\u6C5F\u5830", "hiking", ["hiking", "nature", "history"], 240, 80, "08:00", "17:00", [], "verified", 4.7, false, false, "\u524D\u5C71\u9053\u89C2\u591A\u3001\u540E\u5C71\u6EAA\u8C37\u591A\uFF0C\u5355\u7A0B\u7EA6 1.5 \u5C0F\u65F6"),
  P("CD18", "\u90FD\u6C5F\u5830\u666F\u533A", "chengdu", 31, 103.6, "\u90FD\u6C5F\u5830", "sight", ["history", "nature"], 180, 80, "08:00", "18:00", [], "verified", 4.6, false, false, "\u4E24\u5343\u5E74\u8FD8\u5728\u7528\u7684\u6C34\u5229\u5DE5\u7A0B\uFF0C\u9C7C\u5634\u503C\u5F97\u8D70\u4E00\u904D"),
  P("CD19", "\u9648\u9EBB\u5A46\u8C46\u8150\uFF08\u9AA1\u9A6C\u5E02\uFF09", "chengdu", 30.67, 104.07, "\u9AA1\u9A6C\u5E02", "restaurant", ["food"], 60, 70, "11:00", "21:00", [], "verified", 4.3, true, false, "\u767E\u5E74\u8001\u5E97\u7684\u9EBB\u5A46\u8C46\u8150\uFF0C\u914D\u7C73\u996D"),
  P("CD20", "\u9A6C\u65FA\u5B50\u5DDD\u83DC\u9986", "chengdu", 30.656, 104.08, "\u6625\u7199\u8DEF", "restaurant", ["food"], 75, 120, "11:00", "21:00", [], "estimated", 4.6, true, true, "\u672C\u5730\u4EBA\u8BF7\u5BA2\u5E38\u53BB\uFF0C\u8C46\u74E3\u9C7C\u548C\u751C\u76AE\u9E2D"),
  P("CD21", "\u7518\u8BB0\u80A5\u80A0\u7C89", "chengdu", 30.66, 104.075, "\u9AA1\u9A6C\u5E02", "restaurant", ["food", "local_life"], 45, 35, "07:00", "21:00", [], "verified", 4.4, true, false, "\u4E00\u7897\u80A5\u80A0\u7C89\u52A0\u4E00\u4E2A\u9505\u76D4\uFF0C\u6210\u90FD\u4EBA\u7684\u65E9\u996D"),
  P("CD22", "\u7389\u6797\u4E32\u4E32\u9999", "chengdu", 30.632, 104.062, "\u7389\u6797", "restaurant", ["food", "nightlife"], 75, 90, "17:00", "02:00", [], "estimated", 4.3, true, false, "\u8001\u724C\u4E32\u4E32\uFF0C\u725B\u8089\u548C\u85D5\u7247\u5FC5\u70B9"),
  P("CD23", "\u9E64\u9E23\u8336\u793E", "chengdu", 30.6572, 104.0631, "\u4EBA\u6C11\u516C\u56ED", "cafe", ["local_life", "food"], 60, 40, "08:00", "20:00", [], "verified", 4.5, false, false, "\u7AF9\u6905\u76D6\u7897\u8336\uFF0C\u53EF\u4EE5\u5750\u4E00\u4E0B\u5348"),
  // ---------------- 西安 ----------------
  P("XA01", "\u79E6\u59CB\u7687\u5175\u9A6C\u4FD1\u535A\u7269\u9986", "xian", 34.3841, 109.2785, "\u4E34\u6F7C", "museum", ["history", "museum"], 180, 120, "08:30", "17:00", [], "verified", 4.8, true, true, "\u4E00\u53F7\u5751\u6700\u9707\u64BC\uFF0C\u5EFA\u8BAE\u8BF7\u8BB2\u89E3\u6216\u79DF\u8BB2\u89E3\u5668"),
  P("XA02", "\u5927\u96C1\u5854", "xian", 34.2186, 108.964, "\u5927\u96C1\u5854", "sight", ["history", "photography"], 90, 50, "08:00", "18:30", [], "verified", 4.5, false, false, "\u5927\u6148\u6069\u5BFA\u5185\uFF0C\u5317\u5E7F\u573A\u665A\u4E0A\u6709\u97F3\u4E50\u55B7\u6CC9"),
  P("XA03", "\u9655\u897F\u5386\u53F2\u535A\u7269\u9986", "xian", 34.2225, 108.948, "\u5C0F\u5BE8", "museum", ["museum", "history"], 150, 0, "08:30", "18:00", [1], "verified", 4.8, true, true, "\u5FC5\u987B\u63D0\u524D\u9884\u7EA6\uFF0C\u4F55\u5BB6\u6751\u7A96\u85CF\u662F\u538B\u7BB1\u5E95\u7684"),
  P("XA04", "\u897F\u5B89\u57CE\u5899\uFF08\u6C38\u5B81\u95E8\uFF09", "xian", 34.252, 108.946, "\u5357\u95E8", "sight", ["history", "photography"], 120, 54, "08:00", "22:00", [], "verified", 4.6, false, false, "\u79DF\u81EA\u884C\u8F66\u73AF\u57CE 13.7 \u516C\u91CC\uFF0C\u65E5\u843D\u65F6\u5206\u6700\u597D"),
  P("XA05", "\u56DE\u6C11\u8857", "xian", 34.265, 108.943, "\u949F\u697C", "restaurant", ["food", "local_life"], 90, 80, "10:00", "23:00", [], "verified", 4, false, false, "\u6E38\u5BA2\u591A\u4F46\u786E\u5B9E\u597D\u5403\uFF0C\u5F80\u5317\u8D70\u5927\u76AE\u9662\u66F4\u672C\u5730"),
  P("XA06", "\u949F\u697C", "xian", 34.261, 108.945, "\u949F\u697C", "landmark", ["history", "photography"], 45, 30, "08:30", "21:30", [], "verified", 4.4, true, false, "\u591C\u91CC\u4EAE\u706F\u540E\u662F\u897F\u5B89\u6700\u7ECF\u5178\u7684\u4E00\u5F20\u7167\u7247"),
  P("XA07", "\u9F13\u697C", "xian", 34.263, 108.942, "\u949F\u697C", "landmark", ["history"], 40, 30, "08:30", "21:00", [], "verified", 4.2, true, false, "\u548C\u949F\u697C\u8054\u7968\uFF0C\u4E0A\u9762\u6709\u9F13\u4E50\u8868\u6F14"),
  P("XA08", "\u5927\u5510\u4E0D\u591C\u57CE", "xian", 34.214, 108.964, "\u5927\u96C1\u5854", "nightlife", ["nightlife", "photography", "local_life"], 120, 0, "18:00", "00:00", [], "verified", 4.7, false, false, "\u6574\u6761\u8857\u90FD\u662F\u706F\u5149\u548C\u4E0D\u5012\u7FC1\u5C0F\u59D0\u59D0\uFF0C\u665A\u4E0A\u624D\u5F00"),
  P("XA09", "\u534E\u6E05\u5BAB", "xian", 34.362, 109.215, "\u4E34\u6F7C", "sight", ["history", "nature"], 150, 120, "07:00", "19:00", [], "verified", 4.3, false, false, "\u548C\u5175\u9A6C\u4FD1\u540C\u65B9\u5411\uFF0C\u53EF\u4EE5\u62FC\u4E00\u5929"),
  P("XA10", "\u7891\u6797\u535A\u7269\u9986", "xian", 34.254, 108.952, "\u4E66\u9662\u95E8", "museum", ["museum", "art", "history"], 90, 65, "08:00", "18:00", [], "verified", 4.5, true, false, "\u4E66\u6CD5\u7231\u597D\u8005\u7684\u5723\u5730\uFF0C\u989C\u771F\u537F\u67F3\u516C\u6743\u90FD\u5728"),
  P("XA11", "\u5C0F\u96C1\u5854\uFF08\u897F\u5B89\u535A\u7269\u9662\uFF09", "xian", 34.24, 108.945, "\u5C0F\u96C1\u5854", "sight", ["history", "museum"], 90, 0, "09:00", "17:00", [2], "verified", 4.4, false, true, "\u4EBA\u5C11\u6E05\u51C0\uFF0C\u535A\u7269\u9662\u514D\u8D39\u4F46\u8981\u9884\u7EA6"),
  P("XA12", "\u5927\u5510\u8299\u84C9\u56ED", "xian", 34.213, 108.97, "\u5927\u96C1\u5854", "theme_park", ["theme_park", "photography", "nightlife"], 150, 120, "09:00", "22:00", [], "verified", 4.2, false, false, "\u4EFF\u5510\u56ED\u6797\uFF0C\u665A\u4E0A\u7684\u6C34\u5E55\u7535\u5F71\u503C\u5F97\u7559\u65F6\u95F4"),
  P("XA13", "\u8001\u5B59\u5BB6\u6CE1\u998D", "xian", 34.265, 108.944, "\u949F\u697C", "restaurant", ["food"], 60, 50, "10:00", "21:00", [], "estimated", 4.1, true, false, "\u81EA\u5DF1\u63B0\u998D\u624D\u6709\u7075\u9B42\uFF0C\u63B0\u6210\u9EC4\u8C46\u5927\u5C0F"),
  P("XA14", "\u8D3E\u4E09\u704C\u6C64\u5305", "xian", 34.266, 108.942, "\u949F\u697C", "restaurant", ["food"], 60, 55, "09:00", "22:00", [], "estimated", 4, true, true, "\u56DE\u6C11\u8857\u8001\u5E97\uFF0C\u76AE\u8584\u6C41\u591A"),
  P("XA15", "\u957F\u5B89\u5927\u724C\u6863", "xian", 34.22, 108.96, "\u5927\u96C1\u5854", "restaurant", ["food", "local_life"], 75, 90, "11:00", "22:00", [], "verified", 4.4, true, true, "\u9655\u83DC\u96C6\u5408\u5E97\uFF0C\u846B\u82A6\u9E21\u548C\u6BDB\u7B14\u9165"),
  P("XA16", "\u6C38\u5174\u574A", "xian", 34.27, 108.96, "\u4E2D\u5C71\u95E8", "restaurant", ["food", "local_life"], 75, 60, "10:00", "22:00", [], "estimated", 4.2, false, false, "\u6454\u7897\u9152\u548C\u9655\u897F\u5404\u5730\u5C0F\u5403\u805A\u96C6\u5730"),
  // ---------------- 厦门 ----------------
  P("XM01", "\u9F13\u6D6A\u5C7F", "xiamen", 24.447, 118.067, "\u9F13\u6D6A\u5C7F", "sight", ["photography", "history", "local_life"], 240, 100, "07:00", "22:00", [], "verified", 4.6, false, true, "\u8F6E\u6E21\u7968\u8981\u63D0\u524D\u4E70\uFF0C\u5C9B\u4E0A\u4E0D\u80FD\u8D70\u673A\u52A8\u8F66"),
  P("XM02", "\u53A6\u95E8\u5927\u5B66\uFF08\u601D\u660E\u6821\u533A\uFF09", "xiamen", 24.438, 118.096, "\u53A6\u5927", "sight", ["photography", "local_life"], 90, 0, "12:00", "22:00", [], "verified", 4.5, false, true, "\u9700\u63D0\u524D\u5728\u516C\u4F17\u53F7\u9884\u7EA6\uFF0C\u8299\u84C9\u96A7\u9053\u662F\u91CD\u70B9"),
  P("XM03", "\u5357\u666E\u9640\u5BFA", "xiamen", 24.442, 118.098, "\u53A6\u5927", "sight", ["history", "nature"], 60, 0, "04:00", "18:00", [], "verified", 4.6, false, false, "\u514D\u8D39\u7D20\u658B\uFF0C\u540E\u5C71\u53EF\u4EE5\u722C\u5230\u4E94\u8001\u5CF0"),
  P("XM04", "\u66FE\u539D\u57B5", "xiamen", 24.43, 118.11, "\u66FE\u539D\u57B5", "sight", ["local_life", "food", "nightlife"], 120, 60, "10:00", "23:00", [], "verified", 4, false, false, "\u6587\u827A\u6E14\u6751\u6539\u9020\uFF0C\u665A\u4E0A\u5C0F\u5403\u644A\u5168\u5F00"),
  P("XM05", "\u73AF\u5C9B\u8DEF", "xiamen", 24.43, 118.14, "\u73AF\u5C9B\u8DEF", "nature", ["nature", "photography"], 120, 0, "00:00", "23:59", [], "verified", 4.7, false, false, "\u6CBF\u6D77\u9A91\u884C\u9053\uFF0C\u9000\u6F6E\u65F6\u6C99\u6EE9\u5F88\u5BBD"),
  P("XM06", "\u4E2D\u5C71\u8DEF\u6B65\u884C\u8857", "xiamen", 24.457, 118.082, "\u4E2D\u5C71\u8DEF", "shopping", ["shopping", "food", "local_life"], 120, 0, "09:00", "22:00", [], "verified", 4.2, false, false, "\u9A91\u697C\u8001\u8857\uFF0C\u4E24\u4FA7\u5DF7\u5B50\u91CC\u7684\u6C99\u8336\u9762\u66F4\u5730\u9053"),
  P("XM07", "\u80E1\u91CC\u5C71\u70AE\u53F0", "xiamen", 24.433, 118.105, "\u80E1\u91CC\u5C71", "sight", ["history", "nature"], 75, 25, "07:30", "18:00", [], "verified", 4.1, false, false, "\u514B\u864F\u4F2F\u5927\u70AE\uFF0C\u6D77\u666F\u89C6\u91CE\u597D"),
  P("XM08", "\u96C6\u7F8E\u5B66\u6751", "xiamen", 24.57, 118.1, "\u96C6\u7F8E", "sight", ["history", "art"], 120, 0, "08:00", "18:00", [], "verified", 4.4, false, false, "\u5609\u5E9A\u5EFA\u7B51\u7FA4\uFF0C\u7EA2\u7816\u767D\u77F3\u5F88\u4E0A\u955C\uFF0C\u79BB\u5C9B\u5185\u7EA6 20km"),
  P("XM09", "\u53A6\u95E8\u56ED\u6797\u690D\u7269\u56ED", "xiamen", 24.452, 118.1, "\u4E07\u77F3\u5C71", "nature", ["nature", "photography"], 150, 30, "06:30", "18:00", [], "verified", 4.6, false, false, "\u96E8\u6797\u55B7\u96FE\u533A\u662F\u62CD\u7167\u91CD\u70B9\uFF0C\u65E9\u4E0A\u5149\u7EBF\u597D"),
  P("XM10", "\u6C99\u5761\u5C3E\u827A\u672F\u897F\u533A", "xiamen", 24.443, 118.087, "\u6C99\u5761\u5C3E", "sight", ["art", "local_life", "photography"], 90, 0, "10:00", "22:00", [], "estimated", 4.2, false, false, "\u8001\u907F\u98CE\u575E\u6539\u9020\uFF0C\u5496\u5561\u9986\u548C\u5C0F\u5E97\u5BC6\u96C6"),
  P("XM11", "\u6F14\u6B66\u5927\u6865\u89C2\u666F\u53F0", "xiamen", 24.435, 118.092, "\u53A6\u5927", "landmark", ["photography", "nature"], 45, 0, "00:00", "23:59", [], "verified", 4.5, false, false, "\u770B\u6F14\u6B66\u5927\u6865\u548C\u65E5\u843D\uFF0C\u98CE\u5F88\u5927"),
  P("XM12", "\u5C40\u53E3\u8857\u6C99\u8336\u9762", "xiamen", 24.457, 118.083, "\u4E2D\u5C71\u8DEF", "restaurant", ["food", "local_life"], 45, 25, "07:00", "21:00", [], "verified", 4.4, true, false, "\u6C99\u8336\u6C64\u5934\u6D53\uFF0C\u52A0\u732A\u809D\u548C\u8C46\u5E72"),
  P("XM13", "\u963F\u6770\u4E94\u9999", "xiamen", 24.456, 118.084, "\u4E2D\u5C71\u8DEF", "restaurant", ["food"], 45, 30, "08:00", "20:00", [], "estimated", 4.2, true, false, "\u73B0\u70B8\u4E94\u9999\u5377\uFF0C\u914D\u751C\u8FA3\u9171"),
  P("XM14", "\u8D75\u5C0F\u59D0\u7684\u5E97", "xiamen", 24.4471, 118.0672, "\u9F13\u6D6A\u5C7F", "cafe", ["food", "photography"], 45, 45, "09:00", "22:00", [], "estimated", 4, true, false, "\u5C9B\u4E0A\u7684\u8001\u522B\u5885\u5496\u5561\u9986\uFF0C\u6B47\u811A\u7528"),
  P("XM15", "\u516B\u5E02\u6D77\u9C9C\u5927\u6392\u6863", "xiamen", 24.459, 118.079, "\u516B\u5E02", "restaurant", ["food", "local_life"], 90, 130, "16:00", "23:00", [], "estimated", 4.5, false, false, "\u83DC\u5E02\u573A\u91CC\u73B0\u4E70\u73B0\u505A\uFF0C\u4EF7\u683C\u900F\u660E"),
  // ---------------- 北京 ----------------
  P("BJ01", "\u6545\u5BAB\u535A\u7269\u9662", "beijing", 39.9163, 116.3972, "\u5929\u5B89\u95E8", "museum", ["history", "museum", "photography"], 210, 60, "08:30", "17:00", [1], "verified", 4.9, false, true, "\u5FC5\u987B\u63D0\u524D 7 \u5929\u9884\u7EA6\uFF0C\u4ECE\u5348\u95E8\u8FDB\u795E\u6B66\u95E8\u51FA"),
  P("BJ02", "\u5929\u5B89\u95E8\u5E7F\u573A", "beijing", 39.9087, 116.3975, "\u5929\u5B89\u95E8", "landmark", ["history", "photography"], 60, 0, "05:00", "22:00", [], "verified", 4.4, false, true, "\u9700\u5B9E\u540D\u9884\u7EA6\uFF0C\u770B\u5347\u65D7\u8981\u51CC\u6668\u5230"),
  P("BJ03", "\u666F\u5C71\u516C\u56ED", "beijing", 39.928, 116.396, "\u666F\u5C71", "nature", ["nature", "photography", "history"], 60, 2, "06:00", "21:00", [], "verified", 4.7, false, false, "\u4E07\u6625\u4EAD\u770B\u6545\u5BAB\u5168\u666F\uFF0C\u65E5\u843D\u524D\u4E0A\u53BB"),
  P("BJ04", "\u5317\u6D77\u516C\u56ED", "beijing", 39.925, 116.389, "\u4EC0\u5239\u6D77", "nature", ["nature", "history"], 90, 10, "06:30", "20:00", [], "verified", 4.6, false, false, "\u767D\u5854\u548C\u8377\u82B1\uFF0C\u5212\u8239\u5F88\u8212\u670D"),
  P("BJ05", "\u9890\u548C\u56ED", "beijing", 39.999, 116.275, "\u9890\u548C\u56ED", "nature", ["nature", "history"], 180, 30, "06:30", "18:00", [], "verified", 4.8, false, false, "\u4ECE\u5317\u5BAB\u95E8\u8FDB\u4EBA\u5C11\uFF0C\u957F\u5ECA\u548C\u6606\u660E\u6E56"),
  P("BJ06", "\u5929\u575B\u516C\u56ED", "beijing", 39.8822, 116.4066, "\u5929\u575B", "sight", ["history", "nature"], 120, 34, "06:00", "22:00", [], "verified", 4.7, false, false, "\u7948\u5E74\u6BBF\uFF0C\u65E9\u4E0A\u53BB\u80FD\u770B\u5230\u672C\u5730\u4EBA\u6668\u7EC3"),
  P("BJ07", "798 \u827A\u672F\u533A", "beijing", 39.984, 116.495, "798", "sight", ["art", "photography"], 120, 0, "10:00", "18:00", [], "verified", 4.3, true, false, "\u5DE5\u5382\u6539\u9020\u7684\u753B\u5ECA\u533A\uFF0C\u5468\u4E00\u5F88\u591A\u9986\u95ED\u95E8"),
  P("BJ08", "\u5357\u9523\u9F13\u5DF7", "beijing", 39.937, 116.403, "\u5357\u9523\u9F13\u5DF7", "sight", ["local_life", "food"], 90, 0, "10:00", "22:00", [], "verified", 4, false, false, "\u4E3B\u8857\u5546\u4E1A\u5316\uFF0C\u5F80\u4E24\u4FA7\u80E1\u540C\u8D70\u66F4\u597D"),
  P("BJ09", "\u4EC0\u5239\u6D77", "beijing", 39.94, 116.386, "\u4EC0\u5239\u6D77", "sight", ["local_life", "nightlife", "nature"], 90, 0, "00:00", "23:59", [], "verified", 4.4, false, false, "\u540E\u6D77\u9152\u5427\u8857\uFF0C\u51AC\u5929\u53EF\u4EE5\u6ED1\u51B0"),
  P("BJ10", "\u4E2D\u56FD\u56FD\u5BB6\u535A\u7269\u9986", "beijing", 39.9042, 116.401, "\u5929\u5B89\u95E8", "museum", ["museum", "history", "art"], 180, 0, "09:00", "17:00", [1], "verified", 4.8, true, true, "\u514D\u8D39\u4F46\u8981\u62A2\u7968\uFF0C\u53E4\u4EE3\u4E2D\u56FD\u9648\u5217\u81F3\u5C11\u7559 3 \u5C0F\u65F6"),
  P("BJ11", "\u96CD\u548C\u5BAB", "beijing", 39.947, 116.417, "\u96CD\u548C\u5BAB", "sight", ["history"], 75, 25, "09:00", "16:30", [], "verified", 4.6, false, false, "\u85CF\u4F20\u4F5B\u6559\u5BFA\u9662\uFF0C\u9999\u706B\u6781\u65FA"),
  P("BJ12", "\u516B\u8FBE\u5CAD\u957F\u57CE", "beijing", 40.358, 116.017, "\u5EF6\u5E86", "hiking", ["hiking", "history", "nature"], 210, 40, "07:00", "17:30", [], "verified", 4.7, false, true, "\u5355\u7A0B\u7EA6 1.5 \u5C0F\u65F6\uFF0C\u5EFA\u8BAE\u65E9\u73ED\u8F66\u53BB"),
  P("BJ13", "\u56DB\u5B63\u6C11\u798F\u70E4\u9E2D\u5E97\uFF08\u6545\u5BAB\u5E97\uFF09", "beijing", 39.916, 116.41, "\u738B\u5E9C\u4E95", "restaurant", ["food"], 90, 160, "10:30", "22:00", [], "verified", 4.6, true, true, "\u80FD\u770B\u5230\u89D2\u697C\u7684\u5EA7\u4F4D\u8981\u6392\u961F\uFF0C\u70E4\u9E2D\u76AE\u8638\u7CD6"),
  P("BJ14", "\u59DA\u8BB0\u7092\u809D", "beijing", 39.939, 116.402, "\u9F13\u697C", "restaurant", ["food", "local_life"], 50, 35, "06:00", "21:00", [], "estimated", 4.1, true, false, "\u7092\u809D\u914D\u5305\u5B50\uFF0C\u8001\u5317\u4EAC\u65E9\u996D"),
  P("BJ15", "\u62A4\u56FD\u5BFA\u5C0F\u5403", "beijing", 39.937, 116.383, "\u62A4\u56FD\u5BFA", "restaurant", ["food", "local_life"], 50, 30, "06:00", "21:00", [], "estimated", 4.2, true, false, "\u8C46\u6C41\u7126\u5708\u8C4C\u8C46\u9EC4\uFF0C\u4E00\u6B21\u5C1D\u904D"),
  P("BJ16", "Arabica \u5496\u5561\uFF08\u4E09\u91CC\u5C6F\uFF09", "beijing", 39.934, 116.455, "\u4E09\u91CC\u5C6F", "cafe", ["food", "photography"], 40, 40, "08:00", "22:00", [], "estimated", 4.3, true, false, "\u767D\u5899\u6781\u7B80\uFF0C\u62CD\u7167\u6253\u5361\u70B9"),
  // ---------------- 杭州 ----------------
  P("HZ01", "\u897F\u6E56\uFF08\u65AD\u6865\xB7\u767D\u5824\uFF09", "hangzhou", 30.259, 120.148, "\u897F\u6E56", "nature", ["nature", "photography", "history"], 180, 0, "00:00", "23:59", [], "verified", 4.8, false, false, "\u73AF\u6E56\u9A91\u884C\u6216\u6B65\u884C\uFF0C\u6E05\u6668\u96FE\u6700\u597D\u770B"),
  P("HZ02", "\u7075\u9690\u5BFA", "hangzhou", 30.24, 120.1, "\u7075\u9690", "sight", ["history", "nature"], 120, 75, "07:00", "17:30", [], "verified", 4.7, false, false, "\u98DE\u6765\u5CF0\u9020\u50CF\u548C\u5BFA\u5185\u7D20\u9762\uFF0C\u9700\u4E24\u9053\u95E8\u7968"),
  P("HZ03", "\u96F7\u5CF0\u5854", "hangzhou", 30.232, 120.148, "\u897F\u6E56", "sight", ["history", "photography"], 75, 40, "08:00", "20:00", [], "verified", 4.3, true, false, "\u5854\u4E0A\u770B\u897F\u6E56\u5168\u666F\uFF0C\u508D\u665A\u6709\u5915\u7167"),
  P("HZ04", "\u6CB3\u574A\u8857", "hangzhou", 30.24, 120.17, "\u6E05\u6CB3\u574A", "sight", ["local_life", "food", "shopping"], 90, 0, "09:00", "22:00", [], "verified", 4, false, false, "\u8001\u5B57\u53F7\u4E00\u6761\u8857\uFF0C\u80E1\u5E86\u4F59\u5802\u5728\u91CC\u9762"),
  P("HZ05", "\u897F\u6EAA\u6E7F\u5730", "hangzhou", 30.27, 120.07, "\u897F\u6EAA", "nature", ["nature", "photography"], 180, 80, "07:30", "17:30", [], "verified", 4.5, false, false, "\u5750\u6447\u6A79\u8239\u8FDB\u6C34\u5DF7\uFF0C\u79CB\u5929\u82A6\u82B1\u6700\u597D"),
  P("HZ06", "\u6D59\u6C5F\u7701\u535A\u7269\u9986\uFF08\u5B64\u5C71\u9986\uFF09", "hangzhou", 30.253, 120.14, "\u897F\u6E56", "museum", ["museum", "art", "history"], 120, 0, "09:00", "17:00", [1], "verified", 4.5, true, true, "\u5B64\u5C71\u811A\u4E0B\uFF0C\u770B\u5B8C\u53EF\u4EE5\u63A5\u7740\u8D70\u767D\u5824"),
  P("HZ07", "\u5B8B\u57CE", "hangzhou", 30.19, 120.1, "\u4E4B\u6C5F", "theme_park", ["theme_park", "history"], 180, 320, "09:00", "21:00", [], "verified", 4.3, false, true, "\u300A\u5B8B\u57CE\u5343\u53E4\u60C5\u300B\u6F14\u51FA\u662F\u6838\u5FC3\uFF0C\u7968\u4EF7\u542B\u6F14\u51FA"),
  P("HZ08", "\u9F99\u4E95\u6751", "hangzhou", 30.22, 120.11, "\u9F99\u4E95", "nature", ["nature", "local_life"], 120, 0, "08:00", "18:00", [], "estimated", 4.4, false, false, "\u8336\u56ED\u68AF\u7530\uFF0C\u53EF\u4EE5\u5728\u519C\u5BB6\u559D\u4E00\u676F\u660E\u524D"),
  P("HZ09", "\u4E2D\u56FD\u7F8E\u9662\u8C61\u5C71\u6821\u533A", "hangzhou", 30.16, 120.09, "\u8F6C\u5858", "sight", ["art", "photography"], 90, 0, "09:00", "17:00", [], "estimated", 4.5, false, false, "\u738B\u6F8D\u8BBE\u8BA1\u7684\u6821\u56ED\uFF0C\u5EFA\u7B51\u672C\u8EAB\u5C31\u662F\u5C55\u54C1"),
  P("HZ10", "\u6B66\u6797\u591C\u5E02", "hangzhou", 30.272, 120.165, "\u6B66\u6797", "shopping", ["nightlife", "food", "local_life"], 90, 0, "18:00", "23:59", [], "estimated", 4.1, false, false, "\u5E02\u4E2D\u5FC3\u591C\u5E02\uFF0C\u5C0F\u5403\u548C\u5C0F\u5546\u54C1"),
  P("HZ11", "\u5916\u5A46\u5BB6\uFF08\u6E56\u6EE8\u5E97\uFF09", "hangzhou", 30.256, 120.164, "\u6E56\u6EE8", "restaurant", ["food"], 75, 80, "10:30", "21:00", [], "verified", 4.2, true, true, "\u676D\u5E2E\u83DC\u8FDE\u9501\uFF0C\u996D\u70B9\u8981\u53D6\u53F7"),
  P("HZ12", "\u77E5\u5473\u89C2\uFF08\u4EC1\u548C\u8DEF\uFF09", "hangzhou", 30.245, 120.16, "\u6E56\u6EE8", "restaurant", ["food", "local_life"], 75, 90, "10:00", "21:00", [], "verified", 4.1, true, false, "\u867E\u7206\u9CDD\u9762\u548C\u732B\u8033\u6735\uFF0C\u8001\u5B57\u53F7"),
  P("HZ13", "\u9F99\u4E95\u8349\u5802", "hangzhou", 30.225, 120.108, "\u9F99\u4E95", "restaurant", ["food", "nature"], 120, 400, "11:00", "21:00", [], "estimated", 4.7, true, true, "\u8336\u56ED\u91CC\u7684\u79C1\u623F\u83DC\uFF0C\u4EBA\u5747\u9AD8\u4F46\u73AF\u5883\u6781\u597D"),
  P("HZ14", "\u9752\u85E4\u8336\u9986", "hangzhou", 30.252, 120.15, "\u897F\u6E56", "cafe", ["food", "local_life"], 90, 120, "09:00", "23:00", [], "estimated", 4.4, true, false, "\u81EA\u52A9\u8336\u70B9\uFF0C\u5750\u4E00\u4E0B\u5348\u770B\u6E56")
];
var EXTRA_CITIES = [];
var EXTRA_POIS = [];
function allCities() {
  return [...CITIES, ...EXTRA_CITIES];
}
function cityByCode(code) {
  return CITIES.find((c) => c.code === code) ?? EXTRA_CITIES.find((c) => c.code === code);
}
function poisByCity(city) {
  return [...POIS.filter((p) => p.city === city), ...EXTRA_POIS.filter((p) => p.city === city)];
}
var HOSTELS = {
  chengdu: { name: "\u6625\u7199\u8DEF \xB7 \u9752\u65C5\u5E8A\u4F4D", price: 95 },
  xian: { name: "\u949F\u697C \xB7 \u9752\u65C5\u5E8A\u4F4D", price: 85 },
  xiamen: { name: "\u4E2D\u5C71\u8DEF \xB7 \u9752\u65C5\u5E8A\u4F4D", price: 105 },
  beijing: { name: "\u738B\u5E9C\u4E95 \xB7 \u9752\u65C5\u5E8A\u4F4D", price: 120 },
  hangzhou: { name: "\u6E56\u6EE8 \xB7 \u9752\u65C5\u5E8A\u4F4D", price: 110 }
};
function findCity(input) {
  const text = input.trim();
  for (const c of allCities()) {
    if (c.code === text || c.name === text) return c;
    if (c.aliases.some((a) => text.includes(a))) return c;
  }
  return null;
}

// ../../src/agent/research.ts
var INTEREST_WEIGHT = {
  food: 1,
  nature: 1,
  history: 1,
  museum: 0.95,
  art: 0.85,
  shopping: 0.7,
  nightlife: 0.8,
  photography: 0.85,
  theme_park: 0.9,
  hot_spring: 0.9,
  hiking: 1,
  local_life: 0.85
};
function buildPoiPool(meta) {
  const dates = dateList(meta.start_date, meta.end_date);
  const seedList = poisByCity(meta.city_code);
  const interests = meta.interests.length > 0 ? meta.interests : ["food", "nature"];
  const closedOn = {};
  const scored = seedList.map((seed) => {
    const reasons = [];
    let score = seed.rating;
    for (const tag of seed.tags) {
      const w = INTEREST_WEIGHT[tag] ?? 0.6;
      if (interests.includes(tag)) {
        score += 2.2 * w;
        reasons.push(`\u5339\u914D\u504F\u597D\u300C${tag}\u300D`);
      }
    }
    if (meta.must_visit.some((m) => seed.name.includes(m) || m.includes(seed.name))) {
      score += 8;
      reasons.push("\u4F60\u70B9\u540D\u8981\u53BB");
    }
    if (meta.avoid.some((a) => seed.tags.includes(a) || seed.name.includes(a))) {
      score -= 10;
      reasons.push("\u547D\u4E2D\u907F\u96F7\u6E05\u5355");
    }
    if (seed.category === "restaurant" || seed.category === "cafe") {
      score -= 1.2;
    }
    if (seed.hours_confidence === "verified") score += 0.3;
    const closed = dates.filter((d) => seed.closed_days.includes(weekdayOf(d)));
    closedOn[seed.poi_id] = closed;
    if (closed.length === dates.length) score -= 100;
    return { seed, score, reasons };
  });
  scored.sort((a, b) => b.score - a.score || a.seed.poi_id.localeCompare(b.seed.poi_id));
  return {
    city: meta.city_code,
    cityName: cityByCode(meta.city_code)?.name ?? meta.destination,
    pool: scored,
    dates,
    closedOn
  };
}
function pickLodging(city) {
  return cityByCode(city)?.lodging ?? CITIES[0].lodging;
}
function cityOf(code) {
  return cityByCode(code) ?? CITIES[0];
}

// ../../src/agent/outline.ts
function makeOutline(meta) {
  const research = buildPoiPool(meta);
  const dates = dateList(meta.start_date, meta.end_date);
  const days = dates.length;
  const perDay = PACES[meta.pace].max_poi_per_day;
  const lodging = pickLodging(meta.city_code);
  const attractions = research.pool.filter(
    (p) => p.seed.category !== "restaurant" && p.seed.category !== "cafe" && p.score > -50 && !(research.closedOn[p.seed.poi_id]?.length === dates.length)
  );
  const cityCenter = cityOf(meta.city_code).center;
  const dayTrips = attractions.filter((p) => haversine(p.seed, cityCenter) > 30);
  const inCity = attractions.filter((p) => haversine(p.seed, cityCenter) <= 30);
  const target = Math.min(inCity.length, days * perDay + 6);
  const shortlist = inCity.slice(0, target);
  const musts = shortlist.filter((p) => meta.must_visit.some((m) => p.seed.name.includes(m) || m.includes(p.seed.name)));
  const rest = shortlist.filter((p) => !musts.includes(p));
  const clusters = kmeans(
    rest.map((p) => ({ ...p, lat: p.seed.lat, lng: p.seed.lng })),
    days
  );
  const clustersTyped = clusters.map((group) => ({
    items: group,
    center: centroid(group.map((g) => ({ lat: g.seed.lat, lng: g.seed.lng })))
  }));
  for (const m of musts) {
    if (clustersTyped.length === 0) {
      clustersTyped.push({ items: [m], center: { lat: m.seed.lat, lng: m.seed.lng } });
      continue;
    }
    let best = 0;
    let bestD = Infinity;
    clustersTyped.forEach((c, i) => {
      const d = Math.hypot(c.center.lat - m.seed.lat, c.center.lng - m.seed.lng);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    clustersTyped[best].items.unshift(m);
  }
  clustersTyped.sort(
    (a, b) => Math.hypot(a.center.lat - lodging.lat, a.center.lng - lodging.lng) - Math.hypot(b.center.lat - lodging.lat, b.center.lng - lodging.lng)
  );
  const plans = [];
  const used = /* @__PURE__ */ new Set();
  const leftovers = [];
  for (let i = 0; i < days; i++) {
    const cluster = clustersTyped[i % Math.max(1, clustersTyped.length)];
    const pool = cluster ? cluster.items : [];
    const picked = [];
    const catCount = {};
    for (const item of pool) {
      if (picked.length >= perDay) break;
      if (used.has(item.seed.poi_id)) continue;
      const closedToday = research.closedOn[item.seed.poi_id]?.includes(dates[i]);
      if (closedToday) continue;
      const cat = item.seed.category;
      if ((catCount[cat] ?? 0) >= 2) continue;
      catCount[cat] = (catCount[cat] ?? 0) + 1;
      picked.push(item);
      used.add(item.seed.poi_id);
    }
    if (picked.length < 2) {
      for (const item of inCity) {
        if (picked.length >= 2) break;
        if (used.has(item.seed.poi_id)) continue;
        if (research.closedOn[item.seed.poi_id]?.includes(dates[i])) continue;
        picked.push(item);
        used.add(item.seed.poi_id);
      }
    }
    const refCenter = picked.length ? centroid(picked.map((p) => ({ lat: p.seed.lat, lng: p.seed.lng }))) : cluster?.center ?? { lat: lodging.lat, lng: lodging.lng };
    const daytime = () => picked.filter((p) => toMin(p.seed.open) < toMin("17:00"));
    if (daytime().length < 2) {
      const backup = inCity.filter((p) => !used.has(p.seed.poi_id)).filter((p) => !research.closedOn[p.seed.poi_id]?.includes(dates[i])).filter((p) => toMin(p.seed.open) < toMin("17:00")).map((p) => ({ p, d: Math.hypot(p.seed.lat - refCenter.lat, p.seed.lng - refCenter.lng) })).sort((a, b) => a.d - b.d);
      for (const { p } of backup) {
        if (daytime().length >= 2 || picked.length >= perDay) break;
        picked.push(p);
        used.add(p.seed.poi_id);
      }
    }
    const area = picked.length > 0 ? picked[0].seed.area : cityOf(meta.city_code).lodging.area;
    plans.push({
      date: dates[i],
      day_index: i + 1,
      poi_ids: picked.map((p) => p.seed.poi_id),
      base_area: area,
      centroid: picked.length ? centroid(picked.map((p) => ({ lat: p.seed.lat, lng: p.seed.lng }))) : cluster?.center ?? { lat: lodging.lat, lng: lodging.lng }
    });
  }
  for (const item of dayTrips) {
    leftovers.push({ ...item, reasons: ["\u90CA\u53BF\u4E00\u65E5\u6E38 \xB7 \u9700\u8981\u5355\u72EC\u5B89\u6392\u4E00\u5929", ...item.reasons] });
  }
  for (const item of inCity) {
    if (!used.has(item.seed.poi_id)) leftovers.push(item);
  }
  return { plans, leftovers, research };
}

// ../../src/domain/summary.ts
function itemCost(item) {
  return item.cost?.amount ?? 0;
}
function recomputeDaySummary(day) {
  const byType = {};
  let activity = 0;
  let transit = 0;
  let poiCount = 0;
  let maxLeg = 0;
  for (const item of day.items) {
    const dur = item.duration_min || durationMin(item.start_time, item.end_time);
    if (item.type === "transit") {
      transit += dur;
      if (item.distance_m) maxLeg = Math.max(maxLeg, item.distance_m / 1e3);
    } else {
      activity += dur;
      if (item.poi_id && item.type === "activity") poiCount += 1;
    }
    const amount = itemCost(item);
    if (amount > 0) {
      const key = item.cost.type || "other";
      byType[key] = (byType[key] ?? 0) + amount;
    }
  }
  if (day.lodging?.cost?.amount) {
    byType.lodging = (byType.lodging ?? 0) + day.lodging.cost.amount;
    activity += 0;
  }
  const total = Object.values(byType).reduce((s, v2) => s + v2, 0) + 0;
  const geoPoints = day.items.filter((i) => i.lat != null && i.lng != null).map((i) => ({ lat: i.lat, lng: i.lng }));
  const geoMax = geoPoints.length > 1 ? maxPairwiseKm(geoPoints) : 0;
  return {
    ...day,
    summary: {
      activity_min: activity,
      transit_min: transit,
      active_min: activity + transit,
      cost: { amount: total, currency: "CNY", by_type: byType },
      poi_count: poiCount,
      max_leg_km: Math.max(maxLeg, Number(geoMax.toFixed(2)))
    }
  };
}
function recomputeItinerary(itin) {
  return {
    ...itin,
    days: itin.days.map(recomputeDaySummary),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function itineraryTotalCost(itin) {
  return itin.days.reduce((sum, day) => {
    const dayTotal = day.items.reduce((s, i) => s + itemCost(i), 0);
    const lodging = day.lodging?.cost?.amount ?? 0;
    return sum + dayTotal + lodging;
  }, 0);
}
function costBreakdown(itin) {
  const out = {};
  for (const day of itin.days) {
    for (const item of day.items) {
      const amount = itemCost(item);
      if (amount <= 0) continue;
      const key = item.cost.type || "other";
      out[key] = (out[key] ?? 0) + amount;
    }
    if (day.lodging?.cost?.amount) {
      out.lodging = (out.lodging ?? 0) + day.lodging.cost.amount;
    }
  }
  return out;
}
function totalTransitMin(itin) {
  return itin.days.reduce(
    (s, d) => s + d.items.filter((i) => i.type === "transit").reduce((a, i) => a + i.duration_min, 0),
    0
  );
}

// ../../src/agent/schedule.ts
var PACE_DURATION_FACTOR = { relaxed: 1.15, moderate: 1, packed: 0.9 };
function transitCost(mode, km) {
  switch (mode) {
    case "walk":
      return 0;
    case "taxi":
      return Math.round(10 + km * 2.6);
    case "subway":
    case "bus":
      return 4;
    case "train":
      return Math.round(20 + km * 0.45);
    default:
      return 0;
  }
}
function money(amount, type) {
  return { amount: Math.round(amount), currency: "CNY", type };
}
function toItemBase(seed, adults) {
  return {
    poi_id: seed.poi_id,
    name: seed.name,
    lat: seed.lat,
    lng: seed.lng,
    category: seed.category,
    opening_hours: {
      open: seed.open,
      close: seed.close,
      closed_days: seed.closed_days,
      confidence: seed.hours_confidence
    },
    booking_required: seed.booking_required,
    booked: false,
    locked: false,
    mode: null,
    from_item_id: null,
    to_item_id: null,
    distance_m: null,
    notes: seed.blurb,
    weather_sensitive: !seed.indoor,
    cost: money(seed.price * adults, seed.category === "restaurant" || seed.category === "cafe" ? "meal" : "ticket")
  };
}
function scheduleDays(meta, plans, research, lodgingOverride) {
  const lodging = lodgingOverride ?? pickLodging(meta.city_code);
  const all = poisByCity(meta.city_code);
  const byId = new Map(all.map((p) => [p.poi_id, p]));
  const restaurants = all.filter((p) => p.category === "restaurant" || p.category === "cafe");
  const cap = PACES[meta.pace].max_active_min_per_day;
  const factor = PACE_DURATION_FACTOR[meta.pace];
  const adults = meta.travelers.adults;
  const rooms = Math.max(1, Math.ceil(adults / 2));
  const unscheduled = [];
  const skipped = [];
  const days = [];
  plans.forEach((plan, planIdx) => {
    const items = [];
    let seq = 1;
    let tseq = 1;
    let cursor = toMin(planIdx === 0 ? "09:30" : "08:30");
    let prev = { lat: lodging.lat, lng: lodging.lng, name: lodging.name };
    let activityMin = 0;
    let poiCount = 0;
    let lunchDone = false;
    let dinnerDone = false;
    const usedRestaurants = /* @__PURE__ */ new Set();
    const seeds = plan.poi_ids.map((id) => byId.get(id)).filter((x) => !!x).sort((a, b) => {
      const aNight = toMin(a.open) >= toMin("17:00") ? 1 : 0;
      const bNight = toMin(b.open) >= toMin("17:00") ? 1 : 0;
      return aNight - bNight;
    });
    const dayGroup = seeds.filter((s) => toMin(s.open) < toMin("17:00"));
    const nightGroup = seeds.filter((s) => toMin(s.open) >= toMin("17:00"));
    const ordered = [...nearestNeighborOrder(dayGroup, prev), ...nearestNeighborOrder(nightGroup, prev)];
    const pushTransit = (from, to, departMin) => {
      const km = roadKm(from, to);
      const mode = pickMode(km);
      const mins = estimateTransitMinutes(km, mode);
      items.push({
        id: `d${plan.day_index}-t${tseq++}`,
        type: "transit",
        poi_id: null,
        name: `${from.name} \u2192 ${to.name}`,
        lat: null,
        lng: null,
        category: null,
        start_time: fromMin(departMin),
        end_time: fromMin(departMin + mins),
        duration_min: mins,
        cost: money(transitCost(mode, km) * (mode === "taxi" ? rooms : adults), "transit"),
        opening_hours: null,
        booking_required: false,
        booked: false,
        locked: false,
        mode,
        from_item_id: null,
        to_item_id: null,
        distance_m: Math.round(km * 1e3),
        notes: null,
        weather_sensitive: mode === "walk"
      });
      return mins;
    };
    const pickRestaurant = (at, clock, meal) => {
      const dur = meal === "lunch" ? 60 : 75;
      const windowStart = meal === "lunch" ? toMin("11:00") : toMin("17:00");
      const windowEnd = meal === "lunch" ? toMin("14:30") : toMin("21:30");
      if (clock < windowStart || clock > windowEnd) return null;
      const candidates = restaurants.filter((r) => !usedRestaurants.has(r.poi_id)).filter((r) => {
        const o = toMin(r.open);
        const c = toMin(r.close);
        const closeMin = c < o ? c + 1440 : c;
        return clock >= o && clock + dur <= closeMin;
      }).map((r) => ({ r, d: haversine(at, { lat: r.lat, lng: r.lng }) })).sort((a, b) => a.d - b.d);
      return candidates[0]?.r ?? null;
    };
    const insertMeal = (meal) => {
      const want = meal === "lunch" ? Math.max(cursor, toMin("11:30")) : Math.max(cursor, toMin("17:30"));
      const r = pickRestaurant(prev, want, meal);
      if (!r) return false;
      const travel = estimateTransitMinutes(roadKm(prev, r), pickMode(roadKm(prev, r)));
      const start = want + travel;
      const dur = meal === "lunch" ? 60 : 75;
      const o = toMin(r.open);
      const c = toMin(r.close);
      const closeMin = c < o ? c + 1440 : c;
      if (start + dur > closeMin) return false;
      pushTransit(prev, { lat: r.lat, lng: r.lng, name: r.name }, want);
      items.push({
        id: `d${plan.day_index}-i${seq++}`,
        type: "meal",
        ...toItemBase(r, adults),
        start_time: fromMin(start),
        end_time: fromMin(start + dur),
        duration_min: dur,
        cost: money(r.price * adults, "meal")
      });
      usedRestaurants.add(r.poi_id);
      cursor = start + dur;
      activityMin += travel + dur;
      prev = { lat: r.lat, lng: r.lng, name: r.name };
      return true;
    };
    for (const seed of ordered) {
      const dur = Math.round(seed.duration_min * factor);
      const openMin = toMin(seed.open);
      const closeMin = toMin(seed.close) < openMin ? toMin(seed.close) + 1440 : toMin(seed.close);
      if (!lunchDone && cursor >= toMin("11:20") && cursor <= toMin("14:00")) {
        if (insertMeal("lunch")) lunchDone = true;
      }
      const km = roadKm(prev, seed);
      const mode = pickMode(km);
      const travel = estimateTransitMinutes(km, mode);
      let depart = cursor;
      let arrive = depart + travel;
      if (arrive < openMin) {
        const wait = openMin - arrive;
        depart += wait;
        arrive = openMin;
      }
      if (activityMin + travel + dur > cap) {
        skipped.push({ poi_id: seed.poi_id, name: seed.name, reason: "\u8D85\u51FA\u5F53\u5929\u4F53\u529B\u4E0A\u9650" });
        continue;
      }
      if (poiCount >= PACES[meta.pace].max_poi_per_day) {
        skipped.push({ poi_id: seed.poi_id, name: seed.name, reason: `\u8D85\u8FC7\u300C${PACES[meta.pace].label}\u300D\u6BCF\u5929 ${PACES[meta.pace].max_poi_per_day} \u4E2A\u70B9\u7684\u4E0A\u9650` });
        continue;
      }
      if (arrive + dur > closeMin) {
        skipped.push({ poi_id: seed.poi_id, name: seed.name, reason: `\u6253\u70CA\u524D\u653E\u4E0D\u4E0B\uFF08${seed.open}\u2013${seed.close}\uFF09` });
        continue;
      }
      pushTransit(prev, seed, depart);
      items.push({
        id: `d${plan.day_index}-i${seq++}`,
        type: "activity",
        ...toItemBase(seed, adults),
        start_time: fromMin(arrive),
        end_time: fromMin(arrive + dur),
        duration_min: dur
      });
      cursor = arrive + dur;
      activityMin += travel + dur;
      poiCount += 1;
      prev = { lat: seed.lat, lng: seed.lng, name: seed.name };
    }
    if (!lunchDone) {
      if (insertMeal("lunch")) lunchDone = true;
    }
    if (!dinnerDone && cursor >= toMin("16:30")) {
      if (insertMeal("dinner")) dinnerDone = true;
    }
    const day = {
      date: plan.date,
      day_index: plan.day_index,
      base_area: { name: plan.base_area, lat: plan.centroid.lat, lng: plan.centroid.lng },
      lodging: {
        name: lodging.name,
        lat: lodging.lat,
        lng: lodging.lng,
        cost: money(lodging.price * rooms, "lodging")
      },
      items,
      summary: {
        activity_min: 0,
        transit_min: 0,
        active_min: 0,
        cost: { amount: 0, currency: "CNY", by_type: {} },
        poi_count: 0,
        max_leg_km: 0
      }
    };
    days.push(recomputeDaySummary(day));
  });
  for (const s of skipped) {
    const seed = byId.get(s.poi_id);
    if (!seed) continue;
    unscheduled.push({
      poi_id: seed.poi_id,
      name: seed.name,
      lat: seed.lat,
      lng: seed.lng,
      category: seed.category,
      reason: s.reason,
      suggested_duration_min: seed.duration_min,
      cost: money(seed.price, "ticket"),
      indoor: seed.indoor,
      interest_tags: seed.tags,
      rating: seed.rating,
      opening_hours: {
        open: seed.open,
        close: seed.close,
        closed_days: seed.closed_days,
        confidence: seed.hours_confidence
      },
      booking_required: seed.booking_required
    });
  }
  for (const left of research.pool.slice(0, 40)) {
    if (unscheduled.some((u) => u.poi_id === left.seed.poi_id)) continue;
    if (days.some((d) => d.items.some((i) => i.poi_id === left.seed.poi_id))) continue;
    const seed = left.seed;
    unscheduled.push({
      poi_id: seed.poi_id,
      name: seed.name,
      lat: seed.lat,
      lng: seed.lng,
      category: seed.category,
      reason: seed.category === "restaurant" || seed.category === "cafe" ? "\u5907\u9009\u9910\u5385" : left.reasons[0] ?? "\u5907\u9009\u666F\u70B9",
      suggested_duration_min: seed.duration_min,
      cost: money(seed.price, seed.category === "restaurant" ? "meal" : "ticket"),
      indoor: seed.indoor,
      interest_tags: seed.tags,
      rating: seed.rating,
      opening_hours: {
        open: seed.open,
        close: seed.close,
        closed_days: seed.closed_days,
        confidence: seed.hours_confidence
      },
      booking_required: seed.booking_required
    });
  }
  return { days, unscheduled: dedupe(unscheduled), skipped };
}
function dedupe(list) {
  const seen = /* @__PURE__ */ new Set();
  return list.filter((c) => {
    if (seen.has(c.poi_id)) return false;
    seen.add(c.poi_id);
    return true;
  });
}

// ../../src/agent/intake.ts
var INTEREST_KEYWORDS = [
  [/吃|美食|小吃|川菜|火锅|好食/g, "food"],
  [/自然|风景|山水|海边|湖|公园|绿/g, "nature"],
  [/历史|古迹|古城|文化|人文/g, "history"],
  [/博物馆|展览|文物/g, "museum"],
  [/艺术|美术馆|文创|设计/g, "art"],
  [/购物|逛街|商场|买/g, "shopping"],
  [/夜生活|酒吧|夜市|晚上/g, "nightlife"],
  [/拍照|摄影|出片|打卡/g, "photography"],
  [/乐园|游乐园|主题公园/g, "theme_park"],
  [/温泉|泡汤/g, "hot_spring"],
  [/徒步|爬山|登山|暴走/g, "hiking"],
  [/市井|本地生活|烟火气|老城/g, "local_life"]
];
var CN_DIGIT = { \u96F6: 0, \u4E00: 1, \u4E8C: 2, \u4E24: 2, \u4E09: 3, \u56DB: 4, \u4E94: 5, \u516D: 6, \u4E03: 7, \u516B: 8, \u4E5D: 9 };
function cnNum(raw) {
  const s = raw.trim();
  if (/^\d+$/.test(s)) return Number(s);
  if (!/^[零一二两三四五六七八九十]+$/.test(s)) return null;
  if (s === "\u5341") return 10;
  const m = /^([一二两三四五六七八九])?十([一二三四五六七八九])?$/.exec(s);
  if (m) return (m[1] ? CN_DIGIT[m[1]] : 1) * 10 + (m[2] ? CN_DIGIT[m[2]] : 0);
  if (s.length === 1) return CN_DIGIT[s] ?? null;
  return null;
}
var PROVINCES = [
  "\u5317\u4EAC",
  "\u5929\u6D25",
  "\u4E0A\u6D77",
  "\u91CD\u5E86",
  "\u6CB3\u5317",
  "\u5C71\u897F",
  "\u8FBD\u5B81",
  "\u5409\u6797",
  "\u9ED1\u9F99\u6C5F",
  "\u6C5F\u82CF",
  "\u6D59\u6C5F",
  "\u5B89\u5FBD",
  "\u798F\u5EFA",
  "\u6C5F\u897F",
  "\u5C71\u4E1C",
  "\u6CB3\u5357",
  "\u6E56\u5317",
  "\u6E56\u5357",
  "\u5E7F\u4E1C",
  "\u6D77\u5357",
  "\u56DB\u5DDD",
  "\u8D35\u5DDE",
  "\u4E91\u5357",
  "\u9655\u897F",
  "\u7518\u8083",
  "\u9752\u6D77",
  "\u53F0\u6E7E",
  "\u5185\u8499\u53E4",
  "\u5E7F\u897F",
  "\u897F\u85CF",
  "\u5B81\u590F",
  "\u65B0\u7586",
  "\u9999\u6E2F",
  "\u6FB3\u95E8"
];
function stripRegion(name) {
  let s = name.trim();
  s = s.replace(/(省|市|自治区|特别行政区|地区|县)$/g, "");
  for (const p of PROVINCES) {
    if (s.startsWith(p) && s.length > p.length + 1) {
      s = s.slice(p.length).replace(/(省|市|自治州|地区|县)$/g, "");
      break;
    }
  }
  return s;
}
var ORIGIN_PATTERNS = [
  /(?:从|自|由)\s*([\u4e00-\u9fa5]{2,10}?)\s*(?:出发|启程|动身|走|飞|坐车|开车|过来)/g,
  /([\u4e00-\u9fa5]{2,8})\s*(?:出发|启程)/g,
  /(?:出发地|出发城市|起点)\s*(?:是|为|：|:)?\s*([\u4e00-\u9fa5]{2,10})/g,
  /(?:从|自|由)(?!由)\s*([\u4e00-\u9fa5]{2,10}?)\s*(?:去|到|往|飞往)/g,
  /([\u4e00-\u9fa5]{2,10})\s*(?:→|->|—|~)\s*[\u4e00-\u9fa5]{2,10}/g
];
var ORIGIN_DIRT = /年|月|日|末|开始|想|准备|打算|计划|考虑|如果|以前|之后|以后|时候|五一|十一|国庆|春节|寒假|暑假|国庆|周末/;
var ORIGIN_PREFIX = /^(?:五一|十一|国庆|春节|寒假|暑假|周末|明年|今年|下周|下次|这次|我|我们|你|您|想|要|准备|打算|计划|从|自|由|于|在|跟|和|带)+/;
function parseOrigin(text) {
  for (const re of ORIGIN_PATTERNS) {
    const g = new RegExp(re.source, "g");
    let m;
    while (m = g.exec(text)) {
      if (ORIGIN_DIRT.test(m[1])) continue;
      const name = stripRegion(m[1].replace(ORIGIN_PREFIX, ""));
      if (name.length >= 2) return name;
    }
  }
  return null;
}
function parseDestinationName(text) {
  const m = /(?:去|到|游|玩|逛|飞往|前往)\s*([\u4e00-\u9fa5]{2,12}?)\s*(?:玩|旅游|旅行|逛逛|待|出差|度假|自由行|，|,|。|\s)/.exec(text);
  if (!m) return null;
  const name = stripRegion(m[1]);
  return name.length >= 2 ? name : null;
}
var POI_SUFFIX = /(?:边|山|湖|海|岛|寺|庙|塔|桥|洞|园|馆|街|巷|村|寨|湾|滩|泉|林|谷|峰|崖|坝|沟|古镇|古城|公园|广场|景区|一带)$/;
function looksLikePoi(name) {
  return POI_SUFFIX.test(name);
}
function parseCount(text) {
  const cn = { \u4E00: 1, \u4E24: 2, \u4E8C: 2, \u4E09: 3, \u56DB: 4, \u4E94: 5, \u516D: 6, \u4E03: 7, \u516B: 8 };
  let m = /(\d+)\s*(?:个)?人/.exec(text);
  if (m) return Number(m[1]);
  m = /([一两二三四五六七八])\s*(?:个)?人/.exec(text);
  if (m) return cn[m[1]];
  if (/带(?:上)?父母|一家三口|带爸妈/.test(text)) return 3;
  if (/带娃|带孩子|带小孩/.test(text)) return 3;
  if (/一个人|独自|单人/.test(text)) return 1;
  if (/情侣|两个人|二人|夫妻/.test(text)) return 2;
  return null;
}
function cnMoney(raw) {
  const s = raw.trim();
  const wan = /^([零一二两三四五六七八九十]+)万([一二三四五六七八九]千)?([一二三四五六七八九]百)?$/.exec(s);
  if (wan) {
    const base = cnNum(wan[1]);
    if (base == null) return null;
    const q = wan[2] ? (cnNum(wan[2][0]) ?? 0) * 1e3 : 0;
    const b = wan[3] ? (cnNum(wan[3][0]) ?? 0) * 100 : 0;
    return base * 1e4 + q + b;
  }
  const qian = /^([零一二两三四五六七八九十]+)千([一二三四五六七八九]百)?$/.exec(s);
  if (qian) {
    const base = cnNum(qian[1]);
    if (base == null) return null;
    return base * 1e3 + (qian[2] ? (cnNum(qian[2][0]) ?? 0) * 100 : 0);
  }
  const bare = cnNum(s);
  return bare != null && bare >= 100 ? bare : null;
}
function parseBudget(text) {
  let m = /预算\s*(?:只有|大概|约)?\s*(\d+(?:\.\d+)?)\s*(万|千|k|K)?/i.exec(text);
  if (!m) m = /(\d+(?:\.\d+)?)\s*(万|千|k|K)?\s*(?:块|元|人民币|¥)/i.exec(text);
  if (!m) m = /砍到\s*(\d+)/.exec(text);
  if (!m) {
    const cm = /预算[^\d零一二两三四五六七八九十]{0,4}([零一二两三四五六七八九十]{1,6}[千万][一二三四五六七八九]?[百千]?)/.exec(text) ?? /([零一二两三四五六七八九十]{1,6}[千万][一二三四五六七八九]?[百千]?)\s*(?:块|元)/.exec(text);
    if (cm) return cnMoney(cm[1]);
    return null;
  }
  let n = Number(m[1]);
  if (m[2] === "\u4E07") n *= 1e4;
  if (m[2] === "\u5343" || /k/i.test(m[2] ?? "")) n *= 1e3;
  return n;
}
function parseDays(text) {
  const cn = { \u4E00: 1, \u4E24: 2, \u4E8C: 2, \u4E09: 3, \u56DB: 4, \u4E94: 5, \u516D: 6, \u4E03: 7, \u516B: 8, \u4E5D: 9, \u5341: 10 };
  let m = /(\d+)\s*(?:天|日游)/.exec(text);
  if (m) return Number(m[1]);
  m = /([一两二三四五六七八九十])\s*(?:天|日游)/.exec(text);
  if (m) return cn[m[1]];
  return null;
}
function parseStartDate(text) {
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  const N = "\\d{1,2}|[\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D\u4E03\u516B\u4E5D\u5341]{1,3}";
  let m = /(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/.exec(text);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`;
  m = new RegExp(`(${N})\\s*\u6708\\s*(${N})\\s*[\u65E5\u53F7]?`).exec(text);
  if (m) {
    const mo = cnNum(m[1]);
    const dd = cnNum(m[2]);
    if (mo && dd && mo >= 1 && mo <= 12 && dd >= 1 && dd <= 31) {
      const d = `${year}-${String(mo).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
      return d < (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) ? `${year + 1}${d.slice(4)}` : d;
    }
  }
  m = new RegExp(`(${N})\\s*[\u65E5\u53F7]`).exec(text);
  if (m) {
    const dd = cnNum(m[1]);
    if (dd && dd >= 1 && dd <= 31) {
      const today2 = /* @__PURE__ */ new Date();
      const base = new Date(today2.getFullYear(), today2.getMonth(), dd);
      if (base < new Date(today2.getFullYear(), today2.getMonth(), today2.getDate())) base.setMonth(base.getMonth() + 1);
      return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
    }
  }
  m = /(\d{1,2})\/(\d{1,2})/.exec(text);
  if (m) {
    const d = `${year}-${String(m[1]).padStart(2, "0")}-${String(m[2]).padStart(2, "0")}`;
    return d < (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) ? `${year + 1}${d.slice(4)}` : d;
  }
  if (/五一/.test(text)) return `${year + 1}-05-01`;
  if (/国庆/.test(text)) return `${year}-10-01` > (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) ? `${year}-10-01` : `${year + 1}-10-01`;
  if (/暑假/.test(text)) return `${year + 1}-07-15`;
  if (/寒假/.test(text)) return `${year + 1}-01-20`;
  const today = /* @__PURE__ */ new Date();
  const dow = today.getDay();
  if (/后天/.test(text)) return addDays(today.toISOString().slice(0, 10), 2);
  if (/明天/.test(text)) return addDays(today.toISOString().slice(0, 10), 1);
  if (/下周/.test(text)) {
    const delta = (8 - dow) % 7 || 7;
    return addDays(today.toISOString().slice(0, 10), delta);
  }
  if (/这周|本周|周末/.test(text)) {
    const delta = (6 - dow + 7) % 7 || 6;
    return addDays(today.toISOString().slice(0, 10), delta);
  }
  return null;
}
function intake(text, base) {
  const notes = [];
  const missing = [];
  const days = parseDays(text);
  const budget = parseBudget(text);
  const travelers = parseCount(text);
  const explicitStart = parseStartDate(text);
  const origin = parseOrigin(text);
  let city = findCity(text);
  const destFromText = parseDestinationName(text);
  if (city && destFromText && destFromText !== city.name && !looksLikePoi(destFromText)) {
    const destCity = findCity(destFromText);
    city = destCity;
  }
  const destName = city ? city.name : destFromText;
  const start = explicitStart ?? addDays((/* @__PURE__ */ new Date()).toISOString().slice(0, 10), 14);
  if (!explicitStart) {
    notes.push("\u672A\u6307\u5B9A\u51FA\u53D1\u65E5\u671F\uFF0C\u6309\u4E24\u5468\u540E\u4F30\u7B97");
    missing.push("start_date");
  }
  const span = days ?? 3;
  if (!days) {
    notes.push("\u672A\u8BF4\u73A9\u51E0\u5929\uFF0C\u5148\u6309 3 \u5929\u6392");
    missing.push("days");
  }
  const end = addDays(start, span - 1);
  if (!destName) missing.push("destination");
  if (!origin) {
    notes.push("\u672A\u8BF4\u4ECE\u54EA\u91CC\u51FA\u53D1\uFF0C\u9700\u8981\u4F60\u8865\u4E00\u4E0B\uFF08\u57CE\u9645\u4EA4\u901A\u8981\u7528\uFF09");
    missing.push("origin");
  }
  if (!budget) missing.push("budget");
  if (!travelers) missing.push("travelers");
  const interests = INTEREST_KEYWORDS.filter(([re]) => {
    re.lastIndex = 0;
    return re.test(text);
  }).map(([, tag]) => tag);
  const uniqueInterests = Array.from(new Set(interests));
  if (uniqueInterests.length === 0) {
    uniqueInterests.push("food", "nature");
    notes.push("\u672A\u8BC6\u522B\u5230\u504F\u597D\uFF0C\u9ED8\u8BA4\u6309\u300C\u7F8E\u98DF + \u81EA\u7136\u300D\u642D\u914D");
  }
  let pace = "moderate";
  if (/轻松|不想太赶|别太累|慢节奏|带父母|带娃|走不动/.test(text)) pace = "relaxed";
  if (/紧凑|暴走|能走|尽可能多|特种兵/.test(text)) pace = "packed";
  const must = [...text.matchAll(/(?:一定要去|必须去|想去)\s*([\u4e00-\u9fa5A-Za-z0-9·]{2,10})/g)].map((m) => m[1]);
  const avoid = [...text.matchAll(/(?:不要去|不想去|避开)\s*([\u4e00-\u9fa5A-Za-z0-9·]{2,10})/g)].map((m) => m[1]);
  const meta = {
    destination: destName ?? base?.destination ?? "\u5F85\u5B9A",
    city_code: city?.code ?? base?.city_code ?? `dynamic:${destName ?? "unknown"}`,
    country: "CN",
    start_date: start,
    end_date: end,
    timezone: "Asia/Shanghai",
    travelers: { adults: travelers ?? 2, children: 0 },
    origin_city: origin ?? base?.origin_city ?? "",
    budget: { amount: budget ?? 5e3, currency: "CNY", includes_flights: false },
    pace,
    interests: uniqueInterests,
    mobility: /走不动|轮椅|老人/.test(text) ? "limited" : "normal",
    must_visit: must,
    avoid,
    source: { type: "chat", file_ref: null }
  };
  if (!budget) notes.push("\u672A\u7ED9\u9884\u7B97\uFF0C\u6682\u6309 \xA55,000 \u4F30\u7B97\uFF0C\u53EF\u5728\u4E0B\u65B9\u76F4\u63A5\u6539");
  if (!travelers) notes.push("\u672A\u8BF4\u660E\u4EBA\u6570\uFF0C\u6682\u6309 2 \u4EBA\u4F30\u7B97");
  if (meta.mobility === "limited") notes.push("\u8BC6\u522B\u5230\u884C\u52A8\u4E0D\u4FBF\uFF0C\u8282\u594F\u5DF2\u8C03\u4E3A\u8F7B\u677E");
  return { meta, missing, notes };
}

// ../../src/agent/reflow.ts
function transitCost2(mode, km) {
  switch (mode) {
    case "walk":
      return 0;
    case "taxi":
      return Math.round(10 + km * 2.6);
    case "subway":
    case "bus":
      return 4;
    case "train":
      return Math.round(20 + km * 0.45);
    default:
      return 0;
  }
}
function reflowDay(day, opts) {
  const activities = day.items.filter((i) => i.type !== "transit");
  const items = [];
  let cursor = toMin(opts.startClock);
  let prev = { lat: opts.lodging.lat, lng: opts.lodging.lng, name: opts.lodging.name };
  let tseq = 1;
  for (const item of activities) {
    const lat = item.lat ?? prev.lat;
    const lng = item.lng ?? prev.lng;
    const km = roadKm(prev, { lat, lng });
    const mode = item.mode && item.type !== "activity" ? item.mode : pickMode(km);
    const travel = estimateTransitMinutes(km, mode);
    const dur = item.duration_min || 30;
    if (item.locked) {
      const lockStart = toMin(item.start_time);
      if (lockStart > cursor) {
        items.push({
          id: `d${day.day_index}-t${tseq++}`,
          type: "transit",
          poi_id: null,
          name: `${prev.name} \u2192 ${item.name}`,
          lat: null,
          lng: null,
          category: null,
          start_time: fromMin(cursor),
          end_time: fromMin(lockStart),
          duration_min: lockStart - cursor,
          cost: { amount: 0, currency: "CNY", type: "transit" },
          opening_hours: null,
          booking_required: false,
          booked: false,
          locked: false,
          mode,
          from_item_id: null,
          to_item_id: null,
          distance_m: Math.round(km * 1e3),
          notes: null,
          weather_sensitive: false
        });
      }
      items.push({ ...item });
      cursor = lockStart + dur;
      prev = { lat, lng, name: item.name };
      continue;
    }
    let start = cursor + travel;
    if (item.opening_hours && item.opening_hours.confidence !== "unknown") {
      const openMin = toMin(item.opening_hours.open);
      if (start < openMin) start = openMin;
    }
    items.push({
      id: `d${day.day_index}-t${tseq++}`,
      type: "transit",
      poi_id: null,
      name: `${prev.name} \u2192 ${item.name}`,
      lat: null,
      lng: null,
      category: null,
      start_time: fromMin(Math.max(cursor, start - travel)),
      end_time: fromMin(start),
      duration_min: travel,
      cost: { amount: transitCost2(mode, km), currency: "CNY", type: "transit" },
      opening_hours: null,
      booking_required: false,
      booked: false,
      locked: false,
      mode,
      from_item_id: null,
      to_item_id: null,
      distance_m: Math.round(km * 1e3),
      notes: null,
      weather_sensitive: mode === "walk"
    });
    items.push({
      ...item,
      start_time: fromMin(start),
      end_time: fromMin(start + dur),
      duration_min: dur
    });
    cursor = start + dur;
    prev = { lat, lng, name: item.name };
  }
  return recomputeDaySummary({ ...day, items });
}

// ../../src/verifier/rules.ts
var DEFAULT_THRESHOLDS = {
  geoScatterKm: 25,
  transitBurstMin: 90,
  maxLegMin: 120,
  maxLegKm: 60
};
function v(code, severity, item_ids, message, suggestion, auto_fixable, day_index) {
  return { code, severity, day_index, item_ids, message, suggestion, auto_fixable };
}
var TIME_OVERLAP = {
  code: "TIME_OVERLAP",
  title: "\u65F6\u95F4\u8FDE\u7EED\u6027",
  description: "\u540E\u4E00\u9879\u7684\u5F00\u59CB\u65F6\u95F4\u5FC5\u987B\u665A\u4E8E\u524D\u4E00\u9879\u7684\u7ED3\u675F\u65F6\u95F4\uFF0C\u542B\u901A\u52E4\u6761\u76EE",
  severity: "error",
  run(itin) {
    const violations = [];
    let checked = 0;
    let covered = 0;
    for (const day of itin.days) {
      for (let i = 1; i < day.items.length; i++) {
        const prev = day.items[i - 1];
        const cur = day.items[i];
        checked += 1;
        covered += 1;
        const prevEnd = toMin(prev.end_time);
        const curStart = toMin(cur.start_time);
        if (curStart < prevEnd) {
          violations.push(
            v(
              "TIME_OVERLAP",
              "error",
              [prev.id, cur.id],
              `\u7B2C ${day.day_index} \u5929\uFF1A${cur.name} \u4E8E ${cur.start_time} \u5F00\u59CB\uFF0C\u65E9\u4E8E\u4E0A\u4E00\u9879\u300C${prev.name}\u300D\u7684\u7ED3\u675F\u65F6\u95F4 ${prev.end_time}`,
              `\u5C06 ${cur.id} \u53CA\u5176\u540E\u7EED\u6761\u76EE\u6574\u4F53\u987A\u5EF6\u81F3 ${prev.end_time} \u4E4B\u540E`,
              true,
              day.day_index
            )
          );
        }
      }
    }
    return { violations, checked, covered };
  }
};
var OUTSIDE_OPENING = {
  code: "OUTSIDE_OPENING",
  title: "\u8425\u4E1A\u65F6\u95F4",
  description: "\u6D3B\u52A8\u5FC5\u987B\u843D\u5728\u5F00\u653E\u65F6\u6BB5\u5185\uFF0C\u4E14\u5F53\u5929\u4E0D\u662F\u95ED\u9986\u65E5",
  severity: "error",
  run(itin) {
    const violations = [];
    let checked = 0;
    let covered = 0;
    for (const day of itin.days) {
      const dow = weekdayOf(day.date);
      for (const item of day.items) {
        if (item.type !== "activity" && item.type !== "meal") continue;
        if (!item.opening_hours) continue;
        checked += 1;
        if (item.opening_hours.confidence === "unknown") continue;
        covered += 1;
        const { open, close, closed_days } = item.opening_hours;
        const openMin = toMin(open);
        const closeRaw = toMin(close);
        const closeMin = closeRaw < openMin ? closeRaw + 1440 : closeRaw;
        if (closed_days.includes(dow)) {
          violations.push(
            v(
              "OUTSIDE_OPENING",
              "error",
              [item.id],
              `\u7B2C ${day.day_index} \u5929\uFF08${weekdayLabel(day.date)}\uFF09${item.name} \u95ED\u9986`,
              `\u628A ${item.id} \u6362\u5230\u5176\u4ED6\u5929\uFF0C\u6216\u6362\u6210\u5F53\u5929\u5F00\u653E\u7684\u540C\u7C7B\u666F\u70B9`,
              false,
              day.day_index
            )
          );
          continue;
        }
        const dur = item.duration_min || durationMin(item.start_time, item.end_time);
        const startMin = toMin(item.start_time);
        if (startMin < openMin || startMin + dur > closeMin) {
          violations.push(
            v(
              "OUTSIDE_OPENING",
              "error",
              [item.id],
              `${item.name} \u8BA1\u5212 ${item.start_time}\u2013${item.end_time}\uFF0C\u8425\u4E1A\u65F6\u95F4 ${open}\u2013${close}`,
              `\u628A ${item.id} \u8C03\u6574\u5230 ${open}\u2013${fromMin(closeMin - dur)} \u4E4B\u95F4`,
              true,
              day.day_index
            )
          );
        }
      }
    }
    return { violations, checked, covered };
  }
};
var GEO_SCATTER = {
  code: "GEO_SCATTER",
  title: "\u5730\u7406\u805A\u96C6\u5EA6",
  description: "\u540C\u4E00\u5929\u5185\u4EFB\u610F\u4E24\u70B9\u76F4\u7EBF\u8DDD\u79BB\u4E0E\u901A\u52E4\u603B\u91CF\u9700\u5728\u9608\u503C\u5185",
  severity: "warning",
  run(itin, ctx) {
    const th = { ...DEFAULT_THRESHOLDS, ...ctx.thresholds ?? {} };
    const violations = [];
    let checked = 0;
    let covered = 0;
    let worst = "";
    for (const day of itin.days) {
      const pts = day.items.filter((i) => i.lat != null && i.lng != null);
      if (pts.length < 2) continue;
      checked += 1;
      covered += 1;
      const span = maxPairwiseKm(pts);
      const transitMin = day.items.filter((i) => i.type === "transit").reduce((s, i) => s + i.duration_min, 0);
      worst = `\u5355\u65E5\u6700\u5927\u8DE8\u5EA6 ${span.toFixed(1)}km\uFF0C\u901A\u52E4\u5408\u8BA1 ${Math.round(transitMin)}min`;
      if (span > th.geoScatterKm) {
        const center = {
          lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length,
          lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length
        };
        const far = pts.map((p) => ({ p, d: Math.hypot(p.lat - center.lat, p.lng - center.lng) })).sort((a, b) => b.d - a.d)[0].p;
        const severity = span > th.geoScatterKm * 2 ? "error" : "warning";
        violations.push(
          v(
            "GEO_SCATTER",
            severity,
            [far.id],
            `\u7B2C ${day.day_index} \u5929\u8DE8\u5EA6 ${span.toFixed(1)}km\uFF0C\u8D85\u8FC7\u5E02\u5185 ${th.geoScatterKm}km \u9608\u503C`,
            `\u628A ${far.id}\uFF08${far.name}\uFF09\u79FB\u5230\u522B\u7684\u5929\uFF0C\u6216\u4E0B\u6C89\u5230\u5019\u9009\u6C60`,
            true,
            day.day_index
          )
        );
      }
      if (transitMin > th.transitBurstMin) {
        violations.push(
          v(
            "GEO_SCATTER",
            "warning",
            day.items.filter((i) => i.type === "transit").map((i) => i.id),
            `\u7B2C ${day.day_index} \u5929\u901A\u52E4\u5408\u8BA1 ${Math.round(transitMin)} \u5206\u949F\uFF0C\u8D85\u8FC7 ${th.transitBurstMin} \u5206\u949F\u4E0A\u9650`,
            "\u51CF\u5C11\u5F53\u5929\u7684\u8DE8\u533A\u79FB\u52A8\uFF0C\u628A\u76F8\u90BB\u70B9\u6392\u5728\u4E00\u8D77",
            true,
            day.day_index
          )
        );
      }
    }
    return { violations, checked, covered, detail: worst };
  }
};
var BUDGET_EXCEEDED = {
  code: "BUDGET_EXCEEDED",
  title: "\u9884\u7B97\u7EA6\u675F",
  description: "\u5168\u90E8\u82B1\u8D39\uFF08\u542B\u4F4F\u5BBF\uFF09\u4E0D\u5F97\u8D85\u8FC7\u9884\u7B97",
  severity: "error",
  run(itin) {
    const total = itineraryTotalCost(itin);
    const budget = itin.meta.budget.amount;
    const checked = 1;
    if (total > budget) {
      const over = total - budget;
      return {
        violations: [
          v(
            "BUDGET_EXCEEDED",
            "error",
            [],
            `\u603B\u82B1\u8D39 \xA5${Math.round(total)} \u8D85\u51FA\u9884\u7B97 \xA5${budget}\uFF0C\u8D85 \xA5${Math.round(over)}`,
            `\u4F18\u5148\u5220\u9664\u5355\u4EF7\u9AD8\u3001\u53EF\u66FF\u4EE3\u6027\u5F3A\u7684\u4ED8\u8D39\u9879\u76EE\uFF0C\u6216\u628A\u4F4F\u5BBF\u964D\u6863`,
            false
          )
        ],
        checked,
        covered: checked,
        detail: `\xA5${Math.round(total)} / \xA5${budget}`
      };
    }
    return { violations: [], checked, covered: checked, detail: `\xA5${Math.round(total)} / \xA5${budget}` };
  }
};
var OVER_PACE = {
  code: "OVER_PACE",
  title: "\u4F53\u529B\u8282\u594F",
  description: "\u6BCF\u65E5\u6D3B\u52A8\u65F6\u957F\u4E0E\u70B9\u4F4D\u6570\u4E0D\u8D85\u8FC7\u8282\u594F\u6863\u4F4D\u4E0A\u9650",
  severity: "warning",
  run(itin) {
    const pace = PACES[itin.meta.pace];
    const violations = [];
    let checked = 0;
    for (const day of itin.days) {
      checked += 1;
      const { active_min, poi_count } = day.summary;
      if (active_min > pace.max_active_min_per_day) {
        const last = [...day.items].reverse().find((i) => i.type !== "transit");
        violations.push(
          v(
            "OVER_PACE",
            "warning",
            last ? [last.id] : [],
            `\u7B2C ${day.day_index} \u5929\u5728\u5916 ${(active_min / 60).toFixed(1)} \u5C0F\u65F6\uFF0C\u8D85\u8FC7\u300C${pace.label}\u300D\u4E0A\u9650 ${pace.max_active_min_per_day / 60} \u5C0F\u65F6`,
            `\u628A\u6700\u540E\u4E00\u7AD9\u79FB\u5230\u5019\u9009\u6C60\uFF0C\u6216\u6362\u5230\u522B\u7684\u5929`,
            true,
            day.day_index
          )
        );
      }
      if (poi_count > pace.max_poi_per_day) {
        violations.push(
          v(
            "OVER_PACE",
            "warning",
            [],
            `\u7B2C ${day.day_index} \u5929\u5B89\u6392\u4E86 ${poi_count} \u4E2A\u70B9\uFF0C\u8D85\u8FC7\u300C${pace.label}\u300D\u4E0A\u9650 ${pace.max_poi_per_day} \u4E2A`,
            "\u51CF\u5C11\u4E00\u4E2A\u70B9\u4F4D\uFF0C\u7559\u51FA\u7F13\u51B2\u65F6\u95F4",
            true,
            day.day_index
          )
        );
      }
    }
    return { violations, checked, covered: checked, detail: `${itin.meta.pace} \xB7 \u4E0A\u9650 ${pace.max_active_min_per_day / 60}h` };
  }
};
var BOOKING_RISK = {
  code: "BOOKING_RISK",
  title: "\u9884\u7EA6\u98CE\u9669",
  description: "\u9700\u8981\u9884\u7EA6\u4E14\u5C1A\u672A\u9884\u7EA6\u7684\u6761\u76EE\uFF08\u63D0\u793A\uFF0C\u4E0D\u963B\u65AD\uFF09",
  severity: "info",
  run(itin) {
    const violations = [];
    let checked = 0;
    let covered = 0;
    for (const day of itin.days) {
      for (const item of day.items) {
        if (!item.booking_required) continue;
        checked += 1;
        covered += 1;
        if (!item.booked) {
          violations.push(
            v(
              "BOOKING_RISK",
              "info",
              [item.id],
              `${item.name} \u9700\u8981\u63D0\u524D\u9884\u7EA6`,
              "\u51FA\u884C\u524D 3\u20137 \u5929\u5B8C\u6210\u9884\u7EA6\uFF0C\u5C24\u5176\u662F\u535A\u7269\u9986\u4E0E\u70ED\u95E8\u9910\u5385",
              false,
              day.day_index
            )
          );
        }
      }
    }
    return {
      violations,
      checked,
      covered,
      detail: violations.length === 0 ? "\u5168\u90E8\u5DF2\u9884\u7EA6" : `${violations.length} \u9879\u5F85\u9884\u7EA6`
    };
  }
};
var WEATHER_CONFLICT = {
  code: "WEATHER_CONFLICT",
  title: "\u5929\u6C14\u51B2\u7A81",
  description: "\u6076\u52A3\u5929\u6C14\u4E0B\u7684\u6237\u5916\u6D3B\u52A8\u4F1A\u7ED9\u51FA\u66FF\u6362\u63D0\u793A",
  severity: "warning",
  run(itin, ctx) {
    const violations = [];
    let checked = 0;
    let covered = 0;
    if (ctx.weather.length === 0) {
      return { violations, checked: 0, covered: 0, detail: "\u65E0\u5929\u6C14\u6570\u636E\uFF0C\u672A\u6821\u9A8C" };
    }
    const byDate = new Map(ctx.weather.map((w) => [w.date, w]));
    for (const day of itin.days) {
      const w = byDate.get(day.date);
      if (!w) continue;
      checked += 1;
      covered += 1;
      const bad = w.precip_prob > 60 || w.temp_max > 35 || w.temp_min < 0;
      if (!bad) continue;
      for (const item of day.items) {
        if (item.type !== "activity") continue;
        const outdoor = item.weather_sensitive || OUTDOOR_CATEGORIES.includes(item.category ?? "");
        if (!outdoor) continue;
        violations.push(
          v(
            "WEATHER_CONFLICT",
            "warning",
            [item.id],
            `\u7B2C ${day.day_index} \u5929${w.text}\uFF08\u964D\u6C34 ${w.precip_prob}%\uFF0C${w.temp_min}\u2013${w.temp_max}\u2103\uFF09\uFF0C${item.name} \u4E3A\u6237\u5916\u9879\u76EE`,
            `\u628A ${item.id} \u6362\u6210\u5019\u9009\u6C60\u91CC\u7684\u5BA4\u5185\u5907\u9009\uFF0C\u6216\u6574\u4F53\u987A\u5EF6`,
            true,
            day.day_index
          )
        );
      }
    }
    return {
      violations,
      checked,
      covered,
      detail: `${checked} \u5929\u6709\u5929\u6C14\u6570\u636E \xB7 \u6765\u6E90 ${ctx.weatherSource}`
    };
  }
};
var TRANSIT_UNREACHABLE = {
  code: "TRANSIT_UNREACHABLE",
  title: "\u4EA4\u901A\u53EF\u8FBE",
  description: "\u5355\u6BB5\u901A\u52E4\u4E0D\u5F97\u8D85\u8FC7 120 \u5206\u949F\u6216 60 \u516C\u91CC",
  severity: "warning",
  run(itin, ctx) {
    const th = { ...DEFAULT_THRESHOLDS, ...ctx.thresholds ?? {} };
    const violations = [];
    let checked = 0;
    let covered = 0;
    for (const day of itin.days) {
      for (const item of day.items) {
        if (item.type !== "transit") continue;
        checked += 1;
        covered += 1;
        const km = (item.distance_m ?? 0) / 1e3;
        if (item.duration_min > th.maxLegMin || km > th.maxLegKm) {
          violations.push(
            v(
              "TRANSIT_UNREACHABLE",
              "warning",
              [item.id, item.from_item_id ?? "", item.to_item_id ?? ""].filter(Boolean),
              `\u7B2C ${day.day_index} \u5929\u6709\u4E00\u6BB5\u901A\u52E4 ${item.duration_min} \u5206\u949F / ${km.toFixed(0)}km`,
              "\u628A\u8FD9\u6BB5\u884C\u7A0B\u62C6\u5230\u4E0D\u540C\u5929\uFF0C\u6216\u6539\u7528\u66F4\u5FEB\u7684\u4EA4\u901A\u65B9\u5F0F",
              false,
              day.day_index
            )
          );
        }
      }
    }
    return { violations, checked, covered, detail: `${checked} \u6BB5\u901A\u52E4\u5DF2\u6821\u9A8C` };
  }
};
var RULES = [
  TIME_OVERLAP,
  OUTSIDE_OPENING,
  GEO_SCATTER,
  BUDGET_EXCEEDED,
  OVER_PACE,
  BOOKING_RISK,
  WEATHER_CONFLICT,
  TRANSIT_UNREACHABLE
];

// ../../src/verifier/index.ts
function verify(itin, ctx) {
  const byCode = {};
  const violations = [];
  for (const rule of RULES) {
    const outcome = rule.run(itin, ctx);
    byCode[rule.code] = outcome;
    violations.push(...outcome.violations);
  }
  return {
    violations,
    byCode,
    errors: violations.filter((x) => x.severity === "error"),
    warnings: violations.filter((x) => x.severity === "warning"),
    infos: violations.filter((x) => x.severity === "info")
  };
}
function buildCertificate(itin, ctx, result) {
  const rules = RULES.map((rule) => {
    const outcome = result.byCode[rule.code] ?? { violations: [], checked: 0, covered: 0 };
    const failed = outcome.violations.filter((x) => x.severity === "error");
    const warns = outcome.violations.filter((x) => x.severity === "warning");
    return {
      code: rule.code,
      title: rule.title,
      description: rule.description,
      passed: failed.length === 0,
      severity: rule.severity,
      checked: outcome.checked,
      covered: outcome.covered ?? 0,
      detail: outcome.detail ?? (warns.length ? `${warns.length} \u9879\u63D0\u9192` : "\u901A\u8FC7"),
      warnings: warns.length,
      infos: outcome.violations.filter((x) => x.severity === "info").length
    };
  });
  const allPois = itin.days.flatMap((d) => d.items).filter((i) => i.poi_id);
  const isLocalId = (id) => !!id && /^[A-Z]{2}\d{2}$/.test(id);
  const verifiedPois = allPois.filter((i) => isLocalId(i.poi_id));
  const hoursItems = itin.days.flatMap((d) => d.items).filter((i) => i.type === "activity" || i.type === "meal");
  const hoursKnown = hoursItems.filter((i) => i.opening_hours && i.opening_hours.confidence !== "unknown");
  return {
    verified_at: (/* @__PURE__ */ new Date()).toISOString(),
    verifier_version: "1.0",
    rules,
    evidence: {
      poi_sources: allPois.map((i) => ({
        poi_id: i.poi_id,
        provider: isLocalId(i.poi_id) ? "local-dataset" : "amap",
        fetched_at: "2026-10-18T00:00:00Z"
      })),
      cost_breakdown: costBreakdown(itin),
      max_leg_km: Math.max(...itin.days.map((d) => d.summary.max_leg_km), 0),
      total_transit_min: totalTransitMin(itin),
      assumptions: itin.assumptions,
      data_coverage: {
        poi_verified: verifiedPois.length,
        poi_total: allPois.length,
        hours_known: hoursKnown.length,
        hours_total: hoursItems.length
      }
    },
    summary: {
      passed: rules.filter((r) => r.passed).length,
      total: rules.length,
      errors: result.errors.length,
      warnings: result.warnings.length
    }
  };
}

// ../../src/agent/repair.ts
function cloneItin(itin) {
  return JSON.parse(JSON.stringify(itin));
}
function reflowFor(itin, dayIndex) {
  const day = itin.days[dayIndex];
  const lodging = day.lodging ?? { name: "\u4F4F\u5BBF", lat: 30.657, lng: 104.066 };
  const next = cloneItin(itin);
  next.days[dayIndex] = reflowDay(day, {
    startClock: dayIndex === 0 ? "09:30" : "08:30",
    lodging
  });
  return recomputeItinerary(next);
}
function toCandidate(item, reason) {
  return {
    poi_id: item.poi_id ?? item.id,
    name: item.name,
    lat: item.lat ?? 0,
    lng: item.lng ?? 0,
    category: item.category ?? "sight",
    reason,
    suggested_duration_min: item.duration_min,
    cost: item.cost,
    indoor: !item.weather_sensitive,
    interest_tags: [],
    rating: 0,
    opening_hours: item.opening_hours ?? null,
    booking_required: item.booking_required
  };
}
function removeItem(itin, itemId, reason) {
  const next = cloneItin(itin);
  for (let d = 0; d < next.days.length; d++) {
    const idx = next.days[d].items.findIndex((i) => i.id === itemId);
    if (idx < 0) continue;
    const item = next.days[d].items[idx];
    if (item.locked) return { itin, removed: false };
    next.days[d].items.splice(idx, 1);
    if (item.poi_id) {
      const rest = next.unscheduled.filter((c) => c.poi_id !== item.poi_id);
      next.unscheduled = [toCandidate(item, reason), ...rest];
    }
    return { itin: reflowFor(next, d), removed: true };
  }
  return { itin, removed: false };
}
function insertCandidate(itin, dayIndex, candidate, position) {
  const next = cloneItin(itin);
  const day = next.days[dayIndex];
  if (!day) return itin;
  const item = {
    id: `d${day.day_index}-i${day.items.length + 1}-x`,
    type: "activity",
    poi_id: candidate.poi_id,
    name: candidate.name,
    lat: candidate.lat,
    lng: candidate.lng,
    category: candidate.category,
    start_time: "09:00",
    end_time: "10:00",
    duration_min: candidate.suggested_duration_min,
    cost: candidate.cost,
    opening_hours: candidate.opening_hours,
    booking_required: candidate.booking_required,
    booked: false,
    locked: false,
    mode: null,
    from_item_id: null,
    to_item_id: null,
    distance_m: null,
    notes: candidate.reason,
    weather_sensitive: !candidate.indoor
  };
  const activities = day.items.filter((i) => i.type !== "transit");
  const anchor = activities[Math.min(position, activities.length)];
  const insertAt = anchor ? day.items.findIndex((i) => i.id === anchor.id) : day.items.length;
  day.items.splice(insertAt < 0 ? day.items.length : insertAt, 0, item);
  next.unscheduled = next.unscheduled.filter((c) => c.poi_id !== candidate.poi_id);
  return reflowFor(next, dayIndex);
}
var fixOverlap = (itin) => {
  const actions = [];
  let cur = itin;
  const overlaps = (day) => {
    for (let i = 1; i < day.items.length; i++) {
      if (toMin(day.items[i].start_time) < toMin(day.items[i - 1].end_time)) return true;
    }
    return false;
  };
  for (let d = 0; d < itin.days.length; d++) {
    const day = cur.days[d];
    if (!day || !overlaps(day)) continue;
    cur = reflowFor(cur, d);
    actions.push({
      kind: "auto",
      code: "TIME_OVERLAP",
      description: `\u7B2C ${day.day_index} \u5929\u6309\u987A\u5E8F\u91CD\u6392\u65F6\u95F4\uFF0C\u6D88\u9664\u65F6\u95F4\u91CD\u53E0`,
      item_ids: []
    });
  }
  return { itin: cur, actions };
};
var fixClosedDays = (itin) => {
  const actions = [];
  let cur = itin;
  for (const day of itin.days) {
    const dow = weekdayOf(day.date);
    for (const item of day.items) {
      if (!item.opening_hours || item.locked) continue;
      if (!item.opening_hours.closed_days.includes(dow)) continue;
      const res = removeItem(cur, item.id, "\u5F53\u5929\u95ED\u9986\uFF0C\u5DF2\u79FB\u5165\u5019\u9009\u6C60");
      if (res.removed) {
        cur = res.itin;
        actions.push({
          kind: "auto",
          code: "OUTSIDE_OPENING",
          description: `${item.name} \u5728 ${day.date} \u95ED\u9986\uFF0C\u79FB\u5165\u5019\u9009\u6C60`,
          item_ids: [item.id]
        });
      }
    }
  }
  return { itin: cur, actions };
};
var fixTooLong = (itin) => {
  const actions = [];
  let cur = itin;
  for (const day of itin.days) {
    for (const item of day.items) {
      if (item.type !== "activity" && item.type !== "meal") continue;
      if (!item.opening_hours || item.locked) continue;
      const open = toMin(item.opening_hours.open);
      const closeRaw = toMin(item.opening_hours.close);
      const close = closeRaw < open ? closeRaw + 1440 : closeRaw;
      if (close - open < item.duration_min) {
        const res = removeItem(cur, item.id, "\u5F00\u653E\u65F6\u957F\u4E0D\u8DB3\u4EE5\u5BB9\u7EB3\u8BA1\u5212\u505C\u7559");
        if (res.removed) {
          cur = res.itin;
          actions.push({
            kind: "strategic",
            code: "OUTSIDE_OPENING",
            description: `${item.name} \u8425\u4E1A\u65F6\u6BB5\u88C5\u4E0D\u4E0B ${item.duration_min} \u5206\u949F\uFF0C\u79FB\u5165\u5019\u9009\u6C60`,
            item_ids: [item.id]
          });
        }
      }
    }
  }
  return { itin: cur, actions };
};
var fixOpeningClamp = (itin) => {
  const actions = [];
  let cur = recomputeItinerary(itin);
  for (let round = 0; round < 2; round++) {
    for (let d = 0; d < cur.days.length; d++) {
      const day = cur.days[d];
      const needsFix = day.items.some((item) => {
        if (!item.opening_hours || item.opening_hours.confidence === "unknown") return false;
        const open = toMin(item.opening_hours.open);
        const closeRaw = toMin(item.opening_hours.close);
        const close = closeRaw < open ? closeRaw + 1440 : closeRaw;
        const start = toMin(item.start_time);
        return start < open || start + item.duration_min > close;
      });
      if (!needsFix) continue;
      cur = reflowFor(cur, d);
      actions.push({
        kind: "auto",
        code: "OUTSIDE_OPENING",
        description: `\u7B2C ${day.day_index} \u5929\u6309\u8425\u4E1A\u65F6\u95F4\u91CD\u6392\u65F6\u95F4\u8F74`,
        item_ids: []
      });
    }
  }
  return { itin: cur, actions };
};
var fixGeo = (threshold) => (itin) => {
  const actions = [];
  let cur = itin;
  for (const baseDay of itin.days) {
    let guard = 0;
    while (guard++ < 4) {
      const day = cur.days.find((d) => d.day_index === baseDay.day_index);
      if (!day || day.summary.max_leg_km <= threshold) break;
      const pts = day.items.filter((i) => i.lat != null && i.lng != null);
      if (pts.length < 2) break;
      const center = {
        lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length,
        lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length
      };
      const far = [...pts].filter((p) => !p.locked).sort((a, b) => roadKm(center, b) - roadKm(center, a))[0];
      if (!far) break;
      const res = removeItem(cur, far.id, `\u79BB\u5F53\u5929\u7247\u533A\u592A\u8FDC\uFF08>${threshold}km\uFF09`);
      if (!res.removed) break;
      cur = res.itin;
      actions.push({
        kind: "auto",
        code: "GEO_SCATTER",
        description: `${far.name} \u8DDD\u5F53\u5929\u4E2D\u5FC3\u8FC7\u8FDC\uFF0C\u79FB\u5165\u5019\u9009\u6C60`,
        item_ids: [far.id]
      });
    }
  }
  return { itin: cur, actions };
};
var fixPace = (itin) => {
  const actions = [];
  let cur = itin;
  const pace = PACES[itin.meta.pace];
  let guard = 0;
  while (guard++ < 12) {
    const day = cur.days.find(
      (d) => d.summary.active_min > pace.max_active_min_per_day || d.summary.poi_count > pace.max_poi_per_day
    );
    if (!day) break;
    const candidate = [...day.items].reverse().find((i) => (i.type === "activity" || i.type === "meal") && !i.locked && i.poi_id);
    if (!candidate) break;
    const res = removeItem(cur, candidate.id, "\u8D85\u51FA\u5F53\u5929\u8282\u594F\u4E0A\u9650");
    if (!res.removed) break;
    cur = res.itin;
    actions.push({
      kind: "auto",
      code: "OVER_PACE",
      description: `\u7B2C ${day.day_index} \u5929\u8D85\u51FA\u300C${pace.label}\u300D\u4E0A\u9650\uFF0C${candidate.name} \u79FB\u5165\u5019\u9009\u6C60`,
      item_ids: [candidate.id]
    });
  }
  return { itin: cur, actions };
};
var fixBudget = (itin) => {
  const actions = [];
  let cur = itin;
  let guard = 0;
  while (guard++ < 24) {
    if (itineraryTotalCost(cur) <= cur.meta.budget.amount) break;
    const removable = cur.days.flatMap((d) => d.items).filter((i) => i.poi_id && !i.locked && i.type !== "transit" && i.cost.amount > 0).sort((a, b) => b.cost.amount - a.cost.amount);
    if (removable.length === 0) break;
    const target = removable[0];
    const res = removeItem(cur, target.id, "\u9884\u7B97\u8D85\u652F\uFF0C\u88AB\u79FB\u9664");
    if (!res.removed) break;
    cur = res.itin;
    actions.push({
      kind: "strategic",
      code: "BUDGET_EXCEEDED",
      description: `\u4E3A\u538B\u9884\u7B97\u79FB\u9664 ${target.name}\uFF08\xA5${target.cost.amount}\uFF09`,
      item_ids: [target.id]
    });
  }
  if (itineraryTotalCost(cur) > cur.meta.budget.amount) {
    const hostel = HOSTELS[cur.meta.city_code];
    if (hostel && !cur.days.every((d) => d.lodging?.name === hostel.name)) {
      cur = cloneItin(cur);
      cur.days = cur.days.map(
        (d) => d.lodging ? { ...d, lodging: { ...d.lodging, name: hostel.name, cost: { ...d.lodging.cost, amount: hostel.price } } } : d
      );
      actions.push({
        kind: "strategic",
        code: "BUDGET_EXCEEDED",
        description: `\u4F4F\u5BBF\u964D\u6863\u4E3A ${hostel.name}\uFF08\xA5${hostel.price}/\u665A\uFF09`,
        item_ids: []
      });
    }
  }
  return { itin: recomputeItinerary(cur), actions };
};
var fixWeather = (ctx) => (itin) => {
  const actions = [];
  let cur = itin;
  if (ctx.weather.length === 0) return { itin: cur, actions };
  const byDate = new Map(ctx.weather.map((w) => [w.date, w]));
  for (const day of itin.days) {
    const w = byDate.get(day.date);
    if (!w) continue;
    const bad = w.precip_prob > 60 || w.temp_max > 35 || w.temp_min < 0;
    if (!bad) continue;
    for (const item of day.items) {
      if (item.type !== "activity" || !item.weather_sensitive || item.locked) continue;
      const indoor = cur.unscheduled.filter((c) => c.indoor && c.category !== "restaurant").map((c) => ({ c, d: roadKm({ lat: item.lat ?? 0, lng: item.lng ?? 0 }, c) })).sort((a, b) => a.d - b.d)[0];
      const position = day.items.filter((i) => i.type !== "transit").findIndex((i) => i.id === item.id);
      if (indoor) {
        const res = removeItem(cur, item.id, "\u5929\u6C14\u4E0D\u4F73\uFF0C\u6362\u6210\u5BA4\u5185\u5907\u9009");
        if (!res.removed) continue;
        cur = insertCandidate(res.itin, day.day_index - 1, indoor.c, Math.max(0, position));
        actions.push({
          kind: "strategic",
          code: "WEATHER_CONFLICT",
          description: `${item.name} \u4E3A\u6237\u5916\u9879\u76EE\uFF0C\u6362\u6210\u5BA4\u5185\u7684 ${indoor.c.name}`,
          item_ids: [item.id]
        });
      } else {
        const res = removeItem(cur, item.id, "\u5929\u6C14\u4E0D\u4F73\u4E14\u65E0\u5BA4\u5185\u5907\u9009");
        if (res.removed) {
          cur = res.itin;
          actions.push({
            kind: "strategic",
            code: "WEATHER_CONFLICT",
            description: `${item.name} \u4E3A\u6237\u5916\u9879\u76EE\u4E14\u65E0\u5BA4\u5185\u5907\u9009\uFF0C\u79FB\u5165\u5019\u9009\u6C60`,
            item_ids: [item.id]
          });
        }
      }
    }
  }
  return { itin: cur, actions };
};
function minimalPlan(itin) {
  let cur = itin;
  for (const day of itin.days) {
    const keep = day.items.filter((i) => i.type !== "transit").slice(0, 2);
    for (const item of day.items) {
      if (item.type === "transit" || item.locked) continue;
      if (keep.some((k) => k.id === item.id)) continue;
      const res = removeItem(cur, item.id, "\u964D\u7EA7\u4E3A\u6700\u5C0F\u53EF\u884C\u884C\u7A0B");
      if (res.removed) cur = res.itin;
    }
  }
  return cur;
}
function repair(itin, ctx, maxRounds = 3) {
  const rounds = [];
  let cur = recomputeItinerary(itin);
  let stopped = "max_rounds";
  for (let round = 1; round <= maxRounds; round++) {
    const before = verify(cur, ctx);
    if (before.errors.length === 0) {
      stopped = "clean";
      break;
    }
    const errorsBefore = before.errors.length;
    const actions = [];
    let working = cur;
    const passes = [
      fixOverlap,
      fixClosedDays,
      fixTooLong,
      fixOpeningClamp,
      fixGeo(ctx.thresholds?.geoScatterKm ?? 25),
      fixPace,
      fixBudget,
      fixWeather(ctx)
    ];
    for (const pass of passes) {
      const res = pass(working);
      working = res.itin;
      actions.push(...res.actions);
    }
    const after = verify(working, ctx);
    rounds.push({ round, errorsBefore, errorsAfter: after.errors.length, actions });
    if (after.errors.length < errorsBefore) {
      cur = working;
      if (after.errors.length === 0) {
        stopped = "clean";
        break;
      }
    } else {
      stopped = "no_progress";
      break;
    }
  }
  let final = verify(cur, ctx);
  if (final.errors.length > 0) {
    const minimal = minimalPlan(cur);
    const minimalRes = verify(minimal, ctx);
    if (minimalRes.errors.length < final.errors.length) {
      cur = minimal;
      final = minimalRes;
      rounds.push({
        round: rounds.length + 1,
        errorsBefore: verify(cur, ctx).errors.length,
        errorsAfter: minimalRes.errors.length,
        actions: [
          {
            kind: "strategic",
            code: "DEGRADE",
            description: "\u591A\u8F6E\u672A\u80FD\u6536\u655B\uFF0C\u964D\u7EA7\u4E3A\u6700\u5C0F\u53EF\u884C\u884C\u7A0B\uFF08\u6BCF\u5929 2 \u4E2A\u70B9\uFF09",
            item_ids: []
          }
        ]
      });
    }
  }
  if (final.errors.length === 0 && final.warnings.some((w) => w.auto_fixable)) {
    let polished = cur;
    for (const pass of [fixGeo(ctx.thresholds?.geoScatterKm ?? 25), fixPace]) {
      polished = pass(polished).itin;
    }
    const polishedRes = verify(polished, ctx);
    if (polishedRes.errors.length === 0 && polishedRes.warnings.length < final.warnings.length) {
      rounds.push({
        round: rounds.length + 1,
        errorsBefore: 0,
        errorsAfter: 0,
        actions: [
          {
            kind: "auto",
            code: "POLISH",
            description: `\u6E05\u7406 ${final.warnings.length - polishedRes.warnings.length} \u6761\u53EF\u81EA\u52A8\u4FEE\u590D\u7684\u63D0\u9192\uFF08\u5730\u7406\u8DE8\u5EA6\u8FC7\u5927 / \u8282\u594F\u8D85\u9650\uFF09`,
            item_ids: []
          }
        ]
      });
      cur = polished;
      final = polishedRes;
    }
  }
  const next = cloneItin(cur);
  next.warnings = [...final.errors, ...final.warnings, ...final.infos];
  return { itinerary: recomputeItinerary(next), rounds, unresolved: final.errors, stopped };
}

// ../../src/providers/weather.ts
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
var CITY_CLIMATE = {
  chengdu: { temp: 24, rain: 42 },
  xian: { temp: 23, rain: 26 },
  xiamen: { temp: 27, rain: 34 },
  beijing: { temp: 22, rain: 18 },
  hangzhou: { temp: 25, rain: 38 }
};
function simulatedWeather(city, dates) {
  const climate = CITY_CLIMATE[city] ?? { temp: 24, rain: 30 };
  return dates.map((date) => {
    const h = hash(`${city}:${date}`);
    const r = h % 1e3 / 1e3;
    const rain = Math.round(Math.min(95, Math.max(0, climate.rain + (r - 0.5) * 70)));
    const temp = Math.round(climate.temp + (r - 0.5) * 10);
    const text = rain > 60 ? "\u6709\u96E8" : rain > 35 ? "\u591A\u4E91" : "\u6674";
    return {
      date,
      precip_prob: rain,
      temp_max: temp + 4,
      temp_min: temp - 4,
      text,
      source: "simulated"
    };
  });
}

// ../../src/agent/orchestrator.ts
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function buildContext(meta, weatherMode = "none") {
  if (weatherMode === "none") {
    return { weather: [], weatherSource: "none" };
  }
  return {
    weather: simulatedWeather(meta.city_code, dateList(meta.start_date, meta.end_date)),
    weatherSource: "simulated"
  };
}
var NeedsClarification = class extends Error {
  constructor(missing, notes) {
    super("needs clarification");
    this.missing = missing;
    this.notes = notes;
    this.name = "NeedsClarification";
  }
};
async function runAgent(request, onEvent, options) {
  const t0 = performance.now();
  const log = [];
  const emit = (e) => {
    onEvent?.(e);
    if (e.status === "done") log.push({ stage: e.stage, message: e.message, detail: e.detail });
  };
  const tick = options?.animate === false ? 0 : 140;
  emit({ stage: "intake", status: "start", message: "\u89E3\u6790\u9700\u6C42" });
  const parsed = intake(request, options?.metaOverride);
  const meta = { ...parsed.meta, ...options?.metaOverride ?? {} };
  if (options?.metaOverride) {
    meta.start_date = options.metaOverride.start_date ?? parsed.meta.start_date;
    meta.end_date = options.metaOverride.end_date ?? parsed.meta.end_date;
    meta.budget = options.metaOverride.budget ?? parsed.meta.budget;
    meta.travelers = options.metaOverride.travelers ?? parsed.meta.travelers;
  }
  await sleep(tick);
  emit({
    stage: "intake",
    status: "done",
    message: `\u9700\u6C42\u89E3\u6790\u5B8C\u6210\uFF1A${meta.destination} \xB7 ${dateList(meta.start_date, meta.end_date).length} \u5929`,
    detail: meta.interests.join(" / ") || "\u672A\u6307\u5B9A\u504F\u597D",
    payload: { meta, missing: parsed.missing, notes: parsed.notes }
  });
  if (parsed.missing.includes("destination") && !options?.metaOverride?.city_code) {
    emit({
      stage: "intake",
      status: "done",
      message: "\u7F3A\u5C11\u76EE\u7684\u5730\uFF0C\u5148\u95EE\u4F60\u4E00\u53E5",
      detail: "\u5176\u4ED6\u5B57\u6BB5\u53EF\u4EE5\u5148\u6309\u9ED8\u8BA4\u503C\u4F30\u7B97"
    });
    throw new NeedsClarification(parsed.missing, parsed.notes);
  }
  emit({ stage: "research", status: "start", message: "\u68C0\u7D22 POI \u4E0E\u901A\u52E4" });
  const outline = makeOutline(meta);
  await sleep(tick);
  emit({
    stage: "research",
    status: "done",
    message: `POI \u6C60 ${outline.research.pool.length} \u6761\uFF0C\u53EF\u7528 ${outline.plans.reduce((s, p) => s + p.poi_ids.length, 0)} \u4E2A\u8FDB\u4E3B\u884C\u7A0B`,
    detail: `${outline.research.cityName} \xB7 \u6570\u636E\u6E90 local-dataset`,
    payload: { pool: outline.research.pool, closedOn: outline.research.closedOn }
  });
  emit({ stage: "outline", status: "start", message: "\u5206\u5929\u5206\u533A" });
  await sleep(tick);
  emit({
    stage: "outline",
    status: "done",
    message: outline.plans.map((p) => `D${p.day_index} ${p.base_area}`).join(" \xB7 "),
    payload: { plans: outline.plans }
  });
  emit({ stage: "schedule", status: "start", message: "\u6392\u65F6\u95F4\u8F74" });
  const scheduled = scheduleDays(meta, outline.plans, outline.research);
  const scheduledNames = scheduled.days.flatMap((d) => d.items).map((i) => i.name);
  const droppedMusts = meta.must_visit.filter(
    (m) => m && !scheduledNames.some((n) => n.includes(m) || m.includes(n))
  );
  await sleep(tick);
  emit({
    stage: "schedule",
    status: "done",
    message: `\u65F6\u95F4\u7531\u7A0B\u5E8F\u7D2F\u52A0\uFF0C\u5DF2\u751F\u6210 ${scheduled.days.reduce((s, d) => s + d.items.length, 0)} \u4E2A\u6761\u76EE`,
    detail: `${scheduled.unscheduled.length} \u4E2A\u5907\u9009\u8FDB\u5165\u5019\u9009\u6C60`,
    payload: { days: scheduled.days, unscheduled: scheduled.unscheduled }
  });
  const ctx = buildContext(meta);
  let itin = {
    id: `itin_${meta.start_date.replace(/-/g, "")}_${meta.city_code}`,
    version: 1,
    parent_id: null,
    variant_label: null,
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString(),
    meta,
    days: scheduled.days,
    unscheduled: scheduled.unscheduled,
    warnings: [],
    feasibility: null,
    assumptions: [
      "\u9884\u7B97\u4E0D\u542B\u5F80\u8FD4\u5927\u4EA4\u901A\uFF08\u673A\u7968/\u9AD8\u94C1\uFF09",
      "\u8425\u4E1A\u65F6\u95F4\u6765\u81EA\u672C\u5730\u6570\u636E\u96C6\uFF0C\u51FA\u884C\u524D\u8BF7\u4EE5\u5B98\u65B9\u516C\u544A\u4E3A\u51C6",
      "\u901A\u52E4\u65F6\u95F4\u6309\u76F4\u7EBF\u8DDD\u79BB \xD7 1.32 \u7ED5\u8DEF\u7CFB\u6570\u4F30\u7B97\uFF0C\u672A\u8BA1\u5165\u5B9E\u65F6\u8DEF\u51B5",
      "\u672A\u63A5\u5165\u5B9E\u65F6\u5929\u6C14 API\uFF0C\u5929\u6C14\u7EF4\u5EA6\u9ED8\u8BA4\u4E0D\u53C2\u4E0E\u6821\u9A8C\uFF1B\u53EF\u7528 What-if \u663E\u5F0F\u63A8\u6F14\u96E8\u5929\u65B9\u6848",
      ...droppedMusts.map((m) => `\u4F60\u70B9\u540D\u7684\u300C${m}\u300D\u672A\u6392\u8FDB\u4E3B\u884C\u7A0B\uFF08\u591A\u534A\u5728\u90CA\u53BF\u6216\u9700\u8981\u5355\u72EC\u4E00\u5929\uFF09\uFF0C\u5DF2\u653E\u8FDB\u5019\u9009\u6C60`),
      ...parsed.notes
    ]
  };
  itin = recomputeItinerary(itin);
  emit({ stage: "verify", status: "start", message: "\u8DD1 8 \u6761\u53EF\u884C\u6027\u89C4\u5219" });
  const first = verify(itin, ctx);
  await sleep(tick);
  emit({
    stage: "verify",
    status: "done",
    message: `${first.errors.length} \u4E2A error \xB7 ${first.warnings.length} \u4E2A warning`,
    detail: first.errors[0]?.message,
    payload: { result: first }
  });
  emit({ stage: "repair", status: "start", message: "\u5B9A\u5411\u4FEE\u590D" });
  const repaired = repair(itin, ctx, 3);
  await sleep(tick);
  emit({
    stage: "repair",
    status: "done",
    message: repaired.rounds.length === 0 ? "\u9996\u6B21\u751F\u6210\u5373\u901A\u8FC7\uFF0C\u65E0\u9700\u4FEE\u590D" : `${repaired.rounds.length} \u8F6E\u4FEE\u590D\uFF0C\u5269\u4F59 ${repaired.unresolved.length} \u4E2A error`,
    detail: repaired.rounds.flatMap((r) => r.actions.map((a) => a.description)).slice(0, 3).join("\uFF1B"),
    payload: { rounds: repaired.rounds, unresolved: repaired.unresolved, stopped: repaired.stopped }
  });
  itin = repaired.itinerary;
  const finalVerify = verify(itin, ctx);
  itin.feasibility = buildCertificate(itin, ctx, finalVerify);
  itin.warnings = [...finalVerify.errors, ...finalVerify.warnings, ...finalVerify.infos];
  emit({ stage: "render", status: "start", message: "\u6E32\u67D3" });
  await sleep(Math.max(60, tick / 2));
  emit({
    stage: "render",
    status: "done",
    message: `\u53EF\u884C\u6027 ${itin.feasibility.summary.passed}/${itin.feasibility.summary.total} \u901A\u8FC7`,
    payload: { itinerary: itin, result: finalVerify }
  });
  return {
    itinerary: itin,
    intake: parsed,
    verifyResult: finalVerify,
    repairResult: repaired,
    log,
    elapsedMs: Math.round(performance.now() - t0)
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  INTEREST_CN,
  ItinerarySchema,
  MetaSchema,
  intake,
  itineraryTotalCost,
  runAgent,
  totalTransitMin
});
