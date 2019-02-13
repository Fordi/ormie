/**
 * Dead simple JS ORM
 **/
const {
  where,
  order,
  limit,
  select,
  remove,
  insert,
  create,
  drop,
  update,
  mergeUpdate
} = require('./query-build');

class Table {
  constructor(db, Type) {
    this.db = db;
    this.Type = Type;
    this.name = Type.tableName || Type.name;
    if (!this.name) {
      throw new Error("No name for table: " + Type + "; please specify a `.name` or `static get tableName()`");
    }
    if (Type.schema instanceof Function) {
      this.schema = Type.schema();
    } else if (Type.schema instanceof Object) {
      this.schema = Type.schema;
    } else {
      throw new Error(`No schema for type: ${name}; please define a \`static get schema\` or \`static schema()\``);
    }
    this.memo = {
      select: {},
      delete: {},
      insert: null,
      create: null,
    };
  }
  create() {
    return create(this).run();
  }
  insert(obj) {
    return insert(this).run(obj);
  }
  find(props, skipInst) {
    const stmt = select(this, props);
    const result = props ? stmt.all(props) : stmt.all();
    if (props && props._cols && props._cols.length === 1) {
      return result.map(res => res[props._cols[0]]);
    }
    if (this.Type instanceof Function && !skipInst && !(props && props._cols)) {
      return result.map(res => new this.Type(res));
    }
    return result;
  }
  first(props, skipInst) {
    const stmt = select(this, props);
    const result = props ? stmt.get(props) : stmt.get();
    if (props && props._cols && props._cols.length === 1) {
      return result && result[props._cols[0]];
    }
    if (this.Type instanceof Function && !skipInst && !(props && props._cols)) {
      return result && new this.Type(result);
    }
    return result;
  }
  remove(props) {
    const stmt = remove(this, props);
    return props ? stmt.run(props) : stmt.run();
  }
  update(props, clause) {
    const stmt = update(this, props, clause);
    return stmt.run(mergeUpdate(props, clause));
  }
  drop() {
    drop(this).run();
  }
  transaction(fn) {
    return this.db.transaction(fn);
  }
}
module.exports = Table;
