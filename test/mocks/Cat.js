class Cat {
  static get tableName() { return 'cats'; }
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
  birthday() {
    this.age++;
  }
}

module.exports = Cat;
