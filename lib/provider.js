const { MongoDB, ObjectID } = require("./mongodb");
const { Query } = require('./query');
const _ = require("lodash");

class Provider {
    constructor(name, cls) {
        this.colname = name;
        this.cls = cls;
        for (let method of ['clear','count','forEach','addIndex', 'close']) {
    		this[method] = this.raw[method].bind(this.raw, this.colname);
    	}
    }

    static async init(app) {
    	this.instance = new MongoDB(app.config['mongodb'] || {});
    	await this.instance.connect();
    }

    get raw() {
    	return this.constructor.instance;
    }

    castID(v) {
    	this.raw.castID(v);
    }

    create(data) {
    	if (_.isArray(data)) {
    		return this.raw.createMany(this.colname, data);
    	} else {
    		return this.raw.createOne(this.colname, data);
    	}
    }
    update(filter, data, options = {}) {
    	if (!_.isPlainObject(filter) || options.upsert) {
    		filter = _.isPlainObject(filter) ? filter : { _id: filter };
    		return this.raw.updateOne(this.colname, filter, data, options);
    	} else {
    		return this.raw.updateMany(this.colname, filter, data, options);
    	}
    }
    remove(filter = {}) {
    	if (!_.isPlainObject(filter)) {
    		filter = { _id: filter };
    		return this.raw.removeOne(this.colname, filter);
    	} else {
    		return this.raw.removeMany(this.colname, filter);
    	}
    }
    get(filter, options = {}) {
    	if (_.isPlainObject(filter)) {
    		return this.raw.findOne(this.colname, filter, options);
    	} else {
			return this.raw.get(this.colname, filter, options);
    	}
    }
    find(filter = {}, options = {}) {
        return this.raw.findMany(this.colname, filter, options);
    }

    query() {
    	return Query(this.cls || this);
    }
}

module.exports = {
	Provider,
	ObjectID,
	Query
};