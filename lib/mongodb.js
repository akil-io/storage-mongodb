const { MongoClient } = require("mongodb");
const ObjectID = require('mongodb').ObjectID;
const { DBError } = require('./utils');
const _ = require("lodash");

class MongoDB {
	constructor(settings) {
		this.settings = Object.assign({}, {
			url: "mongodb+srv://localhost:27017",
      		dbName: "test"
		}, settings);

		this.client = null;
		this.db = null;
	}

	static async init(settings = {}) {
		let db = new MongoDB(settings);
		return await db.connect();
	}

	castID(_id) {
		return _.isString(_id) ? (new ObjectID(_id)) : _id;
	}

	async connect() {
		this.client = new MongoClient(this.settings.url);
		await this.client.connect();
		this.db = this.client.db(this.settings.dbName);
		await this.db.command({ ping: 1 });
		return this.db;
	}

	async close() {
		await this.client.close();
	}

	async createOne(colname, data) {
		const collection = this.db.collection(colname);
		let result = await collection.insertOne(data);
		if (result && result.insertedId) {
			return result.insertedId;
		} else {
			throw new DBError('insertOne_failed', { target: colname, value: data });
		}
	}
	async createMany(colname, data) {
		const collection = this.db.collection(colname);
		let result = await collection.insertMany(data, { ordered: true });
		if (result.insertedCount === data.length) {
			return Object.values(result.insertedIds);
		} else {
			throw new DBError('insertMany_failed', { target: colname, value: result });
		}
	}

	async count(colname, filter = {}) {
		const collection = this.db.collection(colname);
		if (_.isEmpty(filter)) {
			return await collection.estimatedDocumentCount();
		} else {
			return await collection.countDocuments(filter);
		}
	}
	async findOne(colname, filter = {}, options = {}) {
		const collection = this.db.collection(colname);
		return await collection.findOne(filter, options);
	}
	async findMany(colname, filter = {}, options = {}) {
		const collection = this.db.collection(colname);
		let query =  await collection.find(filter, options);
		return query.toArray();
	}
	async * forEach(colname, filter = {}, options = {}) {
		const collection = this.db.collection(colname);
		let cursor = collection.find(filter);

		for await (let item of cursor) {
			yield {
		    	current: item,
		    	rewind: () => cursor.rewind(),
		    	close: () => cursor.close()
		    };
		}
	}

	async get(colname, _id, options = {}) {
		_id = this.castID(_id);
		return await this.findOne(colname, { _id }, options);
	}

	async updateOne(colname, filter, data, options = {}) {
		let { patch, upsert } = _.defaults({}, options, { patch: true, upsert: false });
		const collection = this.db.collection(colname);
		const result = await collection.updateOne(filter, patch ? { $set: data } : data, { upsert });

		const isModified = result.matchedCount === result.modifiedCount && result.modifiedCount === 1;
		const isCreated  = result.matchedCount === 0 && result.upsertedCount === 1 && result.upsertedId;

		if (isModified) {
			return true;
		} else if (isCreated) {
			return result.upsertedId;
		} else {
			throw new DBError('updateOne_failed', { target: colname, value: result });
		}
	}
	async updateMany(colname, filter, data, options = {}) {
		let { patch } = _.defaults({}, options, { patch: true });
		const collection = this.db.collection(colname);
		const result = await collection.updateMany(filter, patch ? { $set: data } : data);
		if (result.matchedCount === result.modifiedCount) {
			return true;
		} else {
			throw new DBError('updateMany_failed', { target: colname, value: result });
		}
	}

	async removeOne(colname, filter = {}) {
		const collection = this.db.collection(colname);
		let result = await collection.deleteOne(filter);
		if (result.deletedCount === 1) {
			return true;
		} else {
			throw new DBError('deleteOne_failed', { target: colname, value: result });
		}
	}
	async removeMany(colname, filter = {}) {
		const collection = this.db.collection(colname);
		let result = await collection.deleteMany(filter);
		return result.deletedCount;
	}
	async clear(colname) {
		const collection = this.db.collection(colname);
		let result = await collection.deleteMany({});	
		return (result.deletedCount > 0);
	}

	async addIndex(colname, index, options) {
		const collection = this.db.collection(colname);
		return await collection.createIndex(index, options);
	}
}

module.exports = {
	MongoDB,
	ObjectID
};