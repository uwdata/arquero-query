import {
  fromObject,
  getTable,
  joinKeys,
  joinValues,
  orderbyKeys,
  toObject
} from './util';

import {
  Expr,
  ExprList,
  ExprNumber,
  ExprObject,
  JoinKeys,
  JoinValues,
  Options,
  OrderbyKeys,
  TableRef,
  TableRefList
} from './constants';

import toAST from './to-ast';

/**
 * Model an Arquero verb as a serializable object.
 */
export class Verb {

  /**
   * Construct a new verb instance.
   * @param {string} verb The verb name.
   * @param {object[]} schema Schema describing verb parameters.
   * @param {any[]} params Array of parameter values.
   */
  constructor(verb, schema = [], params = []) {
    this.verb = verb;
    this.schema = schema;
    schema.forEach((s, index) => {
      const type = s.type;
      const param = params[index];
      const value = type === JoinKeys ? joinKeys(param)
        : type === JoinValues ? joinValues(param)
        : type === OrderbyKeys ? orderbyKeys(param)
        : param;
      this[s.name] = value !== undefined ? value : s.default;
    });
  }

  /**
   * Create new verb instance from the given serialized object.
   * @param {object} object A serialized verb representation, such as
   *  those generated by Verb.toObject.
   * @returns {Verb} The instantiated verb.
   */
  static from(object) {
    const Type = Verbs[object.verb];
    const params = (Type.schema || [])
      .map(({ name }) => fromObject(object[name]));
    return new Type(...params);
  }

  /**
   * Evaluate this verb against a given table and catalog.
   * @param {Table} table The Arquero table to process.
   * @param {Function} catalog A table lookup function that accepts a table
   *  name string as input and returns a corresponding Arquero table.
   * @returns {Table} The resulting Arquero table.
   */
  evaluate(table, catalog) {
    const params = this.schema.map(({ name, type }) => {
      const value = this[name];
      return type === TableRef ? getTable(catalog, value)
        : type === TableRefList ? value.map(t => getTable(catalog, t))
        : value;
    });
    return table[this.verb](...params);
  }

  /**
   * Serialize this verb as a JSON-compatible object. The resulting
   * object can be passed to Verb.from to re-instantiate this verb.
   * @returns {object} A JSON-compatible object representing this verb.
   */
  toObject() {
    const obj = { verb: this.verb };
    this.schema.forEach(({ name }) => {
      obj[name] = toObject(this[name]);
    });
    return obj;
  }

  /**
   * Serialize this verb to a JSON-compatible abstract syntax tree.
   * All table expressions will be parsed and represented as AST instances
   * using a modified form of the Mozilla JavaScript AST format.
   * This method can be used to output parsed and serialized representations
   * to translate Arquero verbs to alternative data processing platforms.
   * @returns {object} A JSON-compatible abstract syntax tree object.
   */
  toAST() {
    const obj = { verb: this.verb };
    this.schema.forEach(({ name, type, props }) => {
      obj[name] = toAST(this[name], type, props);
    });
    return obj;
  }
}

function createVerb(name, schema) {
  return Object.assign(
    class extends Verb {
      constructor(...params)  {
        super(name, schema, params);
      }
    },
    { schema }
  );
}

export const Reify = createVerb('reify');

export const Count = createVerb('count', [
  { name: 'options', type: Options }
]);

export const Dedupe = createVerb('dedupe', [
  { name: 'keys', type: ExprList, default: [] }
]);

export const Derive = createVerb('derive', [
  { name: 'values', type: ExprObject }
]);

export const Filter = createVerb('filter', [
  { name: 'criteria', type: ExprObject }
]);

export const Groupby = createVerb('groupby', [
  { name: 'keys', type: ExprList }
]);

export const Orderby = createVerb('orderby', [
  { name: 'keys', type: OrderbyKeys }
]);

export const Rollup = createVerb('rollup', [
  { name: 'values', type: ExprObject }
]);

export const Sample = createVerb('sample', [
  { name: 'size', type: ExprNumber },
  { name: 'options', type: Options, props: { weight: Expr } }
]);

export const Select = createVerb('select', [
  { name: 'columns', type: ExprList }
]);

export const Ungroup = createVerb('ungroup');

export const Unorder = createVerb('unorder');

export const Fold = createVerb('fold', [
  { name: 'values', type: ExprList },
  { name: 'options', type: Options }
]);

export const Pivot = createVerb('pivot', [
  { name: 'keys', type: ExprList },
  { name: 'values', type: ExprList },
  { name: 'options', type: Options }
]);

export const Spread = createVerb('spread', [
  { name: 'values', type: ExprList },
  { name: 'options', type: Options }
]);

export const Unroll = createVerb('unroll', [
  { name: 'values', type: ExprList },
  { name: 'options', type: Options, props: { drop: ExprList } }
]);

export const Lookup = createVerb('lookup', [
  { name: 'table', type: TableRef },
  { name: 'on', type: JoinKeys },
  { name: 'values', type: ExprList }
]);

export const Join = createVerb('join', [
  { name: 'table', type: TableRef },
  { name: 'on', type: JoinKeys },
  { name: 'values', type: JoinValues },
  { name: 'options', type: Options }
]);

export const Cross = createVerb('cross', [
  { name: 'table', type: TableRef },
  { name: 'values', type: JoinValues },
  { name: 'options', type: Options }
]);

export const Semijoin = createVerb('semijoin', [
  { name: 'table', type: TableRef },
  { name: 'on', type: JoinKeys }
]);

export const Antijoin = createVerb('antijoin', [
  { name: 'table', type: TableRef },
  { name: 'on', type: JoinKeys }
]);

export const Concat = createVerb('concat', [
  { name: 'tables', type: TableRefList }
]);

export const Union = createVerb('union', [
  { name: 'tables', type: TableRefList }
]);

export const Intersect = createVerb('intersect', [
  { name: 'tables', type: TableRefList }
]);

export const Except = createVerb('except', [
  { name: 'tables', type: TableRefList }
]);

/**
 * A lookup table of verb classes.
 */
export const Verbs = {
  count:     Count,
  dedupe:    Dedupe,
  derive:    Derive,
  filter:    Filter,
  groupby:   Groupby,
  orderby:   Orderby,
  rollup:    Rollup,
  sample:    Sample,
  select:    Select,
  ungroup:   Ungroup,
  unorder:   Unorder,
  fold:      Fold,
  pivot:     Pivot,
  spread:    Spread,
  unroll:    Unroll,
  lookup:    Lookup,
  join:      Join,
  cross:     Cross,
  semijoin:  Semijoin,
  antijoin:  Antijoin,
  concat:    Concat,
  union:     Union,
  intersect: Intersect,
  except:    Except
};