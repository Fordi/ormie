const memoized = (memo, key, maker) => {
  if (!memo[key]) {
    memo[key] = maker();
  }
  return memo[key];
};

const where = (props, prefix) => {
  const names = Object.keys(props || {})
    .filter(name => name[0] !== '_');
  if (names.length === 0) {
    return '';
  }
  return `WHERE ${
    names.map(name => (
      `${name} = @${prefix||''}${name}`
    )).join(' AND ')
  }`;
};

const order = (props) => {
  if (!props._sort) {
    return '';
  }
  const sort = (typeof props._sort === 'string')
    ? { [props._sort]: 'ASC' }
    : props._sort;
  return `ORDER BY ${
    Object.keys(sort).sort().map(name => {
      const desc = sort[name].toUpperCase() === 'DESC';
      return `\`${name}\` ${desc ? 'DESC' : 'ASC'}`
    }).join(', ')
  }`;
};

const limit = (props) => {
  if (!('_limit' in props)) {
    return '';
  }
  return `LIMIT @_limit${
    '_offset' in props
      ? ' OFFSET @_offset'
      : ''
  }`;
};

const select = (table, properties) => {
  const props = properties || {};
  const columns = (props._cols || Object.keys(table.schema)).sort();
  const query = [
    `SELECT ${columns.join(', ')} FROM \`${table.name}\``,
    where(props),
    order(props),
    limit(props)
  ].filter(a => !!a).join(' ');
  return memoized(table.memo, query, () => table.db.prepare(query));
};

const remove = (table, props) => {
  const query = [
    `DELETE FROM \`${table.name}\``,
    where(props)
  ].filter(a => !!a).join(' ');
  return memoized(table.memo, query, () => table.db.prepare(query));
};

const insert = (table) => {
  return memoized(table.memo, 'INSERT', () => {
    const cols = Object.keys(table.schema);
    const names = cols.join(', ');
    const values = cols.map(col => `@${col}`).join(', ');
    return table.db.prepare(
      `INSERT INTO \`${table.name}\` (${names}) VALUES (${values})`
    );
  });
};

const create = (table) => {
  return memoized(table.memo, 'CREATE', () => {
    const cols = Object.keys(table.schema).map(col => (
      `\`${col}\` ${table.schema[col]}`
    ));
    return table.db.prepare(
      `CREATE TABLE IF NOT EXISTS \`${table.name}\` (${cols})`
    );
  });
};

const drop = (table) => {
  return memoized(table.memo, 'DROP', () => {
    return table.db.prepare(
      `DROP TABLE \`${table.name}\``
    );
  });
};

const update = (table, props, clause) => {
  const values = Object.keys(props).map(name => (
    `${name} = @value_${name}`
  )).join(', ');

  const query = [
    `UPDATE OR REPLACE \`${table.name}\` SET ${values}`,
    where(clause, 'clause_')
  ].filter(a => !!a).join(' ');
  return memoized(table.memo, query, () => table.db.prepare(query));
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

module.exports = {
  select,
  remove,
  insert,
  create,
  drop,
  update,
  mergeUpdate
};
