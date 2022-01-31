"use strict";
const assert = require('assert');
const { MongoDB, ObjectID } = require('../lib/mongodb');

const host = 'localhost:27017' || process.env.DB_ADDR;
const login = '<login>' || process.env.DB_LOGIN;
const password = '<password>' || process.env.DB_PASS;
const dbname = '<dbname>' || process.env.DB_NAME;
const url = process.env.DB_URL || `mongodb://${login}:${password}@${host}/${dbname}`;

let db = new MongoDB({
	url: url,
	dbName: dbname
});

describe('MongoDB', function () {
	before(async function() {
		await db.connect();
		await db.clear('test');
	});

	after(async function () {
		await db.close();
	});

	it('should createOne', async function () {
		let result = await db.createOne('test', {
			name: 'A',
			value: 1,
			state: false
		});

		assert.ok(result);
		assert.ok(result instanceof ObjectID);
	});

	it('should createMany', async function () {
		let result = await db.createMany('test', [
			{ name: 'B', value: 2, state: false },
			{ name: 'C', value: 3, state: false },
			{ name: 'D', value: 4, state: false }
		]);

		assert.ok(result);
		assert.strictEqual(result.length, 3);
		for (let id of result) {
			assert.ok(id instanceof ObjectID);
		}
	});

	it('should count', async function () {
		let result = await db.count('test');
		assert.strictEqual(result, 4);
	});

	it('should findOne', async function () {
		let result = await db.findOne('test', { name: 'B' });
		assert.ok(result);
		assert.ok(result._id instanceof ObjectID);
		assert.strictEqual(result.name, 'B');
		assert.strictEqual(result.value, 2);
	});

	it('should findMany', async function () {
		let result = await db.findMany('test', { value: { $gt: 2 } });
		assert.ok(result);
		assert.strictEqual(result.length, 2);
		for (let item of result) {
			assert.ok(item._id instanceof ObjectID);
			assert.ok(item.value > 2);
		}
	});

	it ('should forEach', async function () {
		let count = 0;
		for await (let item of db.forEach('test')) {
			assert.ok(item.current);
			assert.ok(item.current._id instanceof ObjectID);
			count++;
		}
		assert.strictEqual(count, 4);
	});

	it('should get', async function () {
		let item = await db.findOne('test', { name: 'B' });
		assert.ok(item);
		assert.ok(item._id);

		let result = await db.get('test', `${item._id}`);
		assert.ok(result);
		assert.strictEqual(result.name, item.name);
	});	

	it('should updateOne', async function () {
		let result1 = await db.updateOne('test', { name: 'B' }, {
			value: 56
		});
		assert.strictEqual(result1, true);

		let item1 = await db.findOne('test', { name: 'B' });
		assert.strictEqual(item1.value, 56);

		let result2 = await db.updateOne('test', { name: 'F' }, {
			name: 'F',
			value: 8,
			state: false
		}, { upsert: true });
		assert.ok(result2 instanceof ObjectID);

		let item2 = await db.findOne('test', { name: 'F' });
		assert.strictEqual(item2.value, 8);
	});

	it('should updateMany', async function () {
		let result = await db.updateMany('test', {}, {
			state: true
		});
		assert.strictEqual(result, true);
	});

	it('should removeOne', async function () {
		let count1 = await db.count('test');
		assert.ok(count1 > 0);
		let result = await db.removeOne('test', { name: 'F' });
		assert.strictEqual(result, true);
		let count2 = await db.count('test');
		assert.strictEqual(count1 - count2, 1);
	});

	it('should removeMany', async function () {
		let filter = { value: { $gt: 2 } };
		let count = await db.count('test', filter);
		let result = await db.removeMany('test', filter);
		assert.strictEqual(result, count);
		let items = await db.findMany('test');
		assert.strictEqual(items.length, 1);
	});

	it('should addIndex', async function () {
		let result = await db.addIndex('test', { value: 1 });
		assert.strictEqual(result, 'value_1');
	});
});