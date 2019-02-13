# Ormie

A Dead-simple ORM for Node

## What does this do?

Allows you to use a better-sqlite3 store for your node app with queries precomposed from your types.

## How do I use this?

Create a type with name and schema, e.g.,

```javascript
class Cat {
  // Without tableName, the table would be named 'Cat'
  static get tableName() {
    return 'cats';
  }
  // Describes the table; you can use standard SQLite types here, as well as `primary key`, `unique`, etc.
  static get schema() {
    return {
      name: 'text primary key',
      age: 'integer'
    }
  }
  constructor({ name, age }) {
    this.name = name;
    this.age = parseInt(age, 10);
  }
}
```

Create an Ormie table from the database and type:

```javascript
const Ormie = require('ormie');

const cats = new Ormie(db, Cat);
```

If you need a couple different tables of cats, you can do that:

```javascript
const otherCats = new Ormie(db, {
  name: 'otherCats',
  schema: Cat.schema
});
```

Once you have your table, you can start making queries:

```javascript
// Your table will not exist until you do this.
cats.create();

// Add a cat
cats.insert({ name: 'Allspice', age: 4 });
cats.insert({ name: 'Nutmeg', age: 4 });
cats.insert({ name: 'Pepper', age: 13 });

// Find cats matching a description
cats.find({ name: 'Nutmeg' });

> [ Cat { name: 'Nutmeg', age: 4 } ]

// Find just one cat
cats.first({ name: 'Nutmeg' });

> Cat { name: 'Nutmeg', age: 4 }

// Get the age of a named cat

cats.first({ name: 'Nutmeg', _cols: 'age' })

> 4

// Update any cat named 'Nutmeg' with an age of `5`

cats.update({ age: 5 }, { name: 'Nutmeg' });

// Remove some cats

cats.remove({ age: 5 });

// Drop the cats table

cats.drop();
```

There are some special search parameters:

`_cols`: An array or string.  If present, your object will not be instantiated; you'll just get data back.  If it's a string,
your results will be stripped down to the raw type in the database for that one column.

`_sort`: Order your results by a name or array of names, optionally with a direction (e.g., `name:desc`)

`_limit`: Limit your results to some number.

`_offset`: Only valid if `_limit` is present; will shift your results by the number specified.
