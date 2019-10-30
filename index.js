const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const ObjectID = require('mongodb').ObjectID;

class MongoDB {
	constructor(settings) {
		this.settings = Object.assign({}, {
			url: "mongodb://localhost:27017",
      		dbName: "test"
		}, settings);
		this.client = null;
		this.db = null;
	}
	connect() {
		return new Promise((resolve, reject) => {
			MongoClient.connect(this.settings.url, {
		      useNewUrlParser: true,
		      useUnifiedTopology: true
		    }, (err, client) => {
		      assert.equal(null, err);

		      this.client = client;
		      this.db = client.db(this.settings.dbName);
		      resolve(this);
		  });
		});
	}
	bindModel(model, idKey = '_id') {
		let storage = this;

		model.get = function (id) {
			return storage.getByID(model, id);
		};
		model.find = function (filters) {
			return storage.find(model, filters);
		};
		model.clear = async function (filters = {}) {
			let result = await storage.clear(model, filters, true);
			return (result.deletedCount > 0);
		};

		model.prototype.save = async function () {
			try {
				let result = await storage.save(model, Object.assign({}, this));
				if (result[idKey] != undefined) {
					Object.assign(this, result);
				}
				return this;
			} catch (err) {
				throw err;
			}
		};
		model.prototype.remove = async function () {
			let result = await storage.remove(model, this[idKey], true);
			return (result.deletedCount == 1);
		};

		return model;
	}

	combineFilters(filters = []) {
		if (filters['length'] === undefined) filters = [filters];		
		return Object.assign({}, ...filters);
	}

	error(code) {
		return new Error(code);
	}
	getModel(model) {
		return {
			name: model.name.toLowerCase(),
			cls: model
		};
	}
	getNewID(name) {
		return new ObjectID();
	}

	save(model, data) {
		return new Promise((resolve, reject) => {
			model = this.getModel(model);
			const collection = this.db.collection(model.name);

			if (!data._id) {
				//insert
	            collection.insertOne(data).then(result => {
	            	if (result.result.n == 1 && result.ops.length == 1) {
		              resolve(result.ops.pop());
		            } else reject(this.error("NOT_SAVED"));
	            })
			} else {
				//update
				collection.findOne({ _id : new ObjectID(data._id) }).then(item => {
					//console.log('FOUND: ', item);
					if (!item) return reject(this.error("NOT_FOUND"));
					let patch = Object.assign({}, Object.keys(data).reduce((a, c) => { if (c !== '_id') { a[c] = data[c]; } return a; }, {}), {
						_updated: new Date()
					});
					collection.updateOne({
						_id: new ObjectID(data._id)
					}, {
						$set: patch
					}).then(result => {
						if (result.matchedCount == result.modifiedCount && result.modifiedCount == 1) {
							resolve(data);
						} else {
							//console.log('CAN NOT SAVE: ' + data._id, patch);
							resolve({
								_id: data._id
							});
						}
					}).catch(error => {
						console.log('UPDATE ERROR:', error);
						reject(error);
					})
				}).catch(error => {
					console.log("ERROR: ", error);
					reject(error);
				});
			}
		});
	}
	remove(model, id, isFinal) {
		model = this.getModel(model);

		const collection = this.db.collection(model.name);
      	return collection.deleteOne({ _id : new ObjectID(id) });
	}
	find(model, filters) {
		return new Promise((resolve, reject) => {
			model = this.getModel(model);
			let filter = this.combineFilters(filters);
			const collection = this.db.collection(model.name);

			const getAll = async function () {
				let items = await collection.find(filter).toArray();
				return items.map(item => new model.cls(item));
			};
			const getPage = async function (page, limit) {
				let items = await collection
						.find(filter)
						.skip((page - 1) * limit)
						.limit(limit)
						.toArray();
				return items.map(item => new model.cls(item));
			};
			const each = async function* (count, limit) {
				for (let curPage = 1; curPage <= Math.ceil(count / 10); curPage++) {
					let items = await getPage(curPage, limit);
					for (let item of items) {
						yield item;
					}
				}
			};

			collection.countDocuments(filter).then(count => {
				resolve({
					count,
					getAll,
					getPage,
					each
				});
          	});
		});
	}
	getByID(model, id) {
		return new Promise((resolve, reject) => {
			model = this.getModel(model);

			const collection = this.db.collection(model.name);

	      	return collection.findOne({ _id : new ObjectID(id) }).then(item => resolve(item ? (new model.cls(item)) : null));
  		});
	}
	clear(model, filters, isFinal) {
		model = this.getModel(model);
		let filter = this.combineFilters(filters);

		const collection = this.db.collection(model.name);
		return collection.deleteMany(filter);	
	}

	static async init(settings = {}, models = []) {
		let mongo = new MongoDB(settings);

		let db = await mongo.connect();

		for (let model of models) db.bindModel(model);

		return db;
	}
}

module.exports = {
	MongoDB,
	ObjectID
};