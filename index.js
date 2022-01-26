const { MongoClient } = require("mongodb");
const ObjectID = require('mongodb').ObjectID;
const _ = require("lodash");
const {Schema} = require('object-constructor');

class MongoDB {
	constructor(settings) {
		this.settings = Object.assign({}, {
			url: "mongodb+srv://localhost:27017",
      		dbName: "test"
		}, settings);

		this.client = null;
		this.db = null;
	}

	async connect() {
		this.client = new MongoClient(this.settings.url);
		await this.client.connect();
		this.db = this.client.db(this.settings.dbName);
		await this.db.command({ ping: 1 });
	}

	bindModel(model, idKey = '_id') {
		let storage = this;
		let context = this.getModel(model, idKey);

		model.get = function (id) {
			return storage.get(context, id);
		};
		model.find = function (filter) {
			return storage.find(context, filter);
		};
		model.clear = async function (filter = {}) {
			return storage.clear(context, filter, true);
		};
		model.nextID = function () { 
			return storage.nextID(context); 
		}

		model.prototype.save = async function () {
			let data = this.toObject ? this.toObject() : Object.assign({}, this);
			let result = await storage.save(context, data);
			if (result) {
				this[idKey] = result;
			}

			return this;
		};
		model.prototype.remove = async function () {
			return storage.remove(context, this[idKey], true);
		};

		return model;
	}

	error(code) {
		return new Error(code);
	}
	getModel(model, idKey) {
		return {
			name: model.constructor.collection || model.name.toLowerCase(),
			cls: model,
			idKey
		};
	}
	nextID(name) {
		return new ObjectID();
	}

	async save(model, data) {
		const collection = this.db.collection(model.name);
		if (!data[model.idKey]) {
			let result = await collection.insertOne(data);
			if (result && result.insertedId) {
				return result.insertedId;
			} else {
				throw this.error("insert_failed");
			}
		} else {
			let patch = _.omit(data, [model.idKey]);
			let result = await collection.updateOne({
				[model.idKey]: new ObjectID(data[model.idKey])
			}, {
				$set: patch
			});
			if (result.matchedCount === result.modifiedCount 
				&& result.modifiedCount === 1) {
				return data[model.idKey];
			} else {
				throw this.error("update_failed");
			}
		}
	}

	async remove(model, id) {
		const collection = this.db.collection(model.name);
      	let result = await collection.deleteOne({ _id : new ObjectID(id) });
      	if (result.deletedCount === 1) {
      		return true;
      	} else {
      		throw this.error("remove_failed");
      	}
	}

	async count(model, filter = {}) {
		const collection = this.db.collection(model.name);
		if (_.isEmpty(filter)) {
			return await collection.estimatedDocumentCount();
		} else {
			return await collection.countDocuments(filter)
		}
	}

	find(model, filter = {}, options = {}) {
		const collection = this.db.collection(model.name);

		let query = {};
		Schema.define(query, [
			Schema.readonly('count', async () => this.count(model, filter)),
			Schema.readonly('getAll', async () => {
				let items = await collection.find(filter, options).toArray();
				return items.map(item => new model.cls(item));
			}),
			Schema.readonly('getPage', async () => {
				let items = await collection
					.find(filter, options)
					.skip((page - 1) * limit)
					.limit(limit)
					.toArray();
				return items.map(item => new model.cls(item));
			}),
			Schema.readonly('each', async function* () {
				for (let curPage = 1; curPage <= Math.ceil(count / 10); curPage++) {
					let cursor = await collection.find(filter);
					while (await cursor.hasNext()) {
					    let item = await cursor.next();
					    yield {
					    	item,
					    	rewind: () => cursor.rewind(),
					    	close: () => cursor.close()
					    };
					}
				}
			}, false),
		]);

		return query;
	}
	get(model, id) {
		return new Promise((resolve, reject) => {
			const collection = this.db.collection(model.name);

	      	return collection.findOne({ _id : new ObjectID(id) }).then(item => resolve(item ? (new model.cls(item)) : null));
  		});
	}
	async clear(model, filter = {}) {
		const collection = this.db.collection(model.name);
		let result = await collection.deleteMany(filter);	
		return (result.deletedCount > 0);
	}

	static async init(settings = {}, models = []) {
		let db = new MongoDB(settings);
		await db.connect();

		for (let model of models) db.bindModel(model);

		return db;
	}
}

module.exports = {
	MongoDB,
	ObjectID
};