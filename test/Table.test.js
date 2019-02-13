const Table = require('../src/index');
const Database = require('better-sqlite3');
const Cat = require('./mocks/Cat');
const cats = require('./mocks/cats').sort((a, b) => (
  a.name > b.name ? 1 : a.name < b.name ? -1 : 0
));

describe('Table', () => {
  let db, table;
  describe('with schema type', () => {
    it('bails if non-schemad type passed', () => {
      expect(() => {
        new Table({}, {
          name: 'thingy'
        });
      }).toThrow();
    });
    it('bails if unnamed type passed', () => {
      expect(() => {
        new Table({}, {
          schema: { name: 'text', age: 'integer' }
        });
      }).toThrow();
    });
    it ('deals with a schema function', () => {
      const schema = { name: 'text', age: 'integer' };
      const table = new Table({}, {
        name: 'thingy',
        schema: () => schema
      });
      expect(table.schema).toBe(schema);
    })
    beforeEach(() => {
      db = new Database(':memory:');
      table = new Table(db, Cat);
      table.create();
    });
    afterEach(() => {
      db.close();
    });
    it('CRUDs just fine', () => {
      table.transaction(data => {
        data.forEach(item => table.insert(item))
      })(cats);
      table.find({ _sort: 'name' }).forEach((cat, i) => {
        expect(cat).toEqual(cats[i]);
      });
      table.remove();
      expect(table.find().length).toBe(0);
    });
    describe('with data', () => {
      beforeEach(() => {
        table.transaction(data => {
          data.forEach(item => table.insert(item))
        })(cats);
      });
      it('filters', () => {
        expect(table.find({ age: 4 }).length).toBe(3);
      });
      it('handle complex sort', () => {
        const result = table.find({
          _sort: [ 'age:asc', 'name:desc' ],
          age: 4
        });
        expect(result[0].name).toBe('Oregano');
        expect(result[2].name).toBe('Allspice');
      });
      it('obeys limits', () => {
        const result = table.find({
          _limit: 1
        });
        expect(result.length).toBe(1);
      });
      it('obeys offsets', () => {
        const result = table.find({
          _sort: [ 'age', 'name' ],
          _limit: 1,
          _offset: 3
        });
        expect(result[0].name).toBe('Musashi');
      });
      it('instantiates by default', () => {
        const result = table.first();
        expect(result instanceof Cat).toBe(true);
      });
      it('limits to columns', () => {
        const result = table.first({
          _cols: ['name']
        });
        expect(typeof result).toBe('object');
        expect(result instanceof Cat).toBe(false);
        const results = table.find({
          _cols: ['name']
        });
        results.forEach(res => {
          expect(typeof res).toBe('object');
          expect(res instanceof Cat).toBe(false);
        })
      });
      it('limits to one column if string passed', () => {
        const result = table.first({
          _cols: 'name'
        });
        expect(typeof result).toBe('string');
        const results = table.find({
          _cols: 'name'
        });
        results.forEach(res => expect(typeof res).toBe('string'));
      });
      it('happily drops tables', () => {
        table.drop();
        expect(() => {
          table.find();
        }).toThrow();
      });
      it('removes', () => {
        table.remove({ age: 4 });
        expect(table.find({ age: 4 }).length).toBe(0);
      });
      it('updates', () => {
        table.update({ age: 5 }, { name: 'Nutmeg' });
        expect(table.first({ name: 'Nutmeg' }).age).toBe(5);
      });
    });
  });
});
