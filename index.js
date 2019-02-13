/**
 * Dead simple JS ORM
 **/

const where = (props, prefix) => {
  const names = Object.keys(props||{}).filter(name => name[0] !== '_');
  if (names.length > 0) {
    return 'WHERE ' + names.map(name => name + ' = @' + (prefix ? prefix : '') + name).join(' AND ');
  }
  return '';
};

const order = (props) => {
  const query = [];
  if (props._sort) {
    query.push('ORDER BY');
    if (typeof props._sort === 'string') {
      query.push('`' + props._sort + '`');
    } else {
      query.push(
        Object.keys(props._sort).map(name => (
          '`' + name + '` ' + (props._sort[name].toLowerCase() === 'desc' ? 'DESC' : 'ASC')
        )).join(', ')
      );
    }
  }
  return query.join(' ');
};

const limit = (props) => {
  const query = [];
  if ('_limit' in props) {
    query.push('LIMIT @_limit');
    if ('_offset' in props) {
      query.push('OFFSET @_offset');
    }
  }
  return query.join(' ');
};

const select = (table, properties) => {
  const props = properties || {};
  const columns = (props._cols || Object.keys(table.schema)).sort();
  const query = [
    'SELECT ' + columns.join(', ') + ' from `' + table.name + '`',
    where(props),
    order(props),
    limit(props)
  ].filter(a => !!a).join(' ');

  if (!table.memo[query]) {
    table.memo[query] = table.db.prepare(query);
  }
  return table.memo[query];
};

const remove = (table, props) => {
  const query = [
    'DELETE from `' + table.name + '`',
    where(props)
  ].filter(a => !!a).join(' ');
  if (!table.memo[query]) {
    table.memo[query] = table.db.prepare(query);
  }
  return table.memo[query];
};

const insert = (table) => {
  if (!table.memo.INSERT) {
    const cols = Object.keys(table.schema);
    table.memo.INSERT = table.db.prepare(
      'INSERT INTO `' + table.name + '` ('
        + cols.join(', ')
      + ') VALUES ('
        + cols.map(col => '@' + col).join(', ')
      + ')'
    );
  }
  return table.memo.INSERT;
};

const create = (table) => {
  if (!table.memo.CREATE) {
    const cols = Object.keys(table.schema);
    const query = [
      'CREATE TABLE IF NOT EXISTS `',
      table.name,
      '` (',
      cols.map(col => {
        return col + ' ' + table.schema[col];
      }).join(', '),
      ')'
    ].join('');
    table.memo.CREATE = table.db.prepare(query);
  }
  return table.memo.CREATE;
};

const drop = (table) => {
  if (!table.memo.DROP) {
    const query = 'DROP TABLE `' + table.name + '`';
    table.memo.DROP = table.db.prepare(query);
  }
  return table.memo.DROP;
};

const update = (table, props, clause) => {
  const names = Object.keys(props).join(', ');
  const values = Object.keys(props).map(name => name + ' = @value_' + name).join(', ');

  const query = [
    'UPDATE OR REPLACE `' + table.name + '` SET ' + values + '',
    where(clause, 'clause_')
  ].filter(a => !!a).join(' ');
  if (!table.memo[query]) {
    console.log(query);
    table.memo[query] = table.db.prepare(query);
  }
  return table.memo[query];
};

const mergeUpdate = (props, clause) => {
  const out = {};
  Object.keys(props).forEach(name => {
    out['value_' + name] = props[name];
  });
  Object.keys(clause).forEach(name => {
    out['clause_' + name] = clause[name];
  });
  return out;
};

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
