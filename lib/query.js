const { defaultsDeep } = require("lodash");

class QueryBuilder {
    static UP = 1;
    static DOWN = -1;
    constructor(model) {
        this.model = model;
        this.filter = {};
        this.options = {};
        this.handlers = [];
    }
    static build() {
        return new QueryBuilder();
    }
    async find() {
        return this.model.find(this.result, this.options);
    }
    async * each() {
        yield * this.model.forEach(this.result, this.options);
    }
    __apply(patch = {}, mergeWith = []) {
        this.filter = defaultsDeep(this.result, patch);
        return this;
    }
    sort(field, order) {
        if (!this.options.sort) {
            this.options.sort = {};
        }
        this.options.sort[field] = order;
    }
    select(...fields) {
        if (!this.options.projection) {
            this.options.projection = {};
        }
        for (let key of fields) {
            if (key[0] === '+' || key[0] === '-') {
                let name = key.slice(1);
                this.options.projection[name] = (key[0] === '+') ? 1 : 0;
            } else {
                this.options.projection[key] = 1;
            }
        }
    }
    skip(num) {
        this.options.skip = num;
    }
    limit(num) {
        this.options.limit = num;
    }
    page(num = 1, limit = 3) {
        this.skip((page - 1) * limit);
        this.limit(limit);
    }
    use(target) {
        return this.__apply({
            [`db_${target}`]: true
        });
    }
    isEqual(key, val) {
        return this.__apply({
            [key]: val
        });
    } // key: val
    isNotEqual(key, val) {
        return this.__apply({
            [key]: { $ne: val }
        });
    } // key: {$ne: val}
    isOneOf(key, val) {
        return this.__apply({
            [key]: { $in: val }
        });
    } // key: {$in: [...]}
    isNotOneOf(key, val) {
        return this.__apply({
            [key]: { $nin: val }
        });
    } // key: {$nin: [...]}
    isMatch(key, val, flags = 'ig') {
        return this.__apply({
            [key]: new RegExp(val, "ig")
        });
    } // key: /regexp/ig
    isLessThen(key, val) {
        return this.__apply({
            [key]: { $lt: val }
        });
    } // key: {$lt: val}
    isLessOrEqual(key, val) {
        return this.__apply({
            [key]: { $lte: val }
        });
    } // key: {$lte: val}
    isGreaterThen(key, val) {
        return this.__apply({
            [key]: { $gt: val }
        });
    } // key: {$gt: val}
    isGreaterOrEqual(key, val) {
        return this.__apply({
            [key]: { $gte: val }
        });
    } // key: {$gte: val}
    inRange(key, from, to, equalMode = "!=") {
        switch (equalMode) {
            case "<=":
                this.isGreaterThen(key, from);
                this.isLessOrEqual(key, to);
                break;
            case ">=":
                this.isGreaterOrEqual(key, from);
                this.isLessThen(key, to);
                break;
            case "==":
                this.isGreaterOrEqual(key, from);
                this.isLessOrEqual(key, to);
                break;
            default:
                this.isGreaterThen(key, from);
                this.isLessThen(key, to);
                break;
        }
        return this;
    }
    isContainAllOf(key, val) {
        return this.__apply({
            [key]: { $all: [...val] }
        });
    } // key: {$all: [...]}
    hasElement(key, isExists = true) {
        return this.__apply({
            [key]: { $exists: isExists }
        });
    } //$exists: true
    matchElements(key, q) {
        return this.__apply({
            [key]: { $elemMatch: (q instanceof QueryBuilder) ? q.result : q }
        });
    } // key: {$elemMatch}

    or(...queries) {
        return this.__apply({
            $or: [queries.map(q => (q instanceof QueryBuilder) ? q.result : q)]
        }, queries);
    }
    nor(...queries) {
        return this.__apply({
            $nor: [queries.map(q => (q instanceof QueryBuilder) ? q.result : q)]
        }, queries);
    }
    and(...queries) {
        return this.__apply(Object.assign({}, ...queries.map(q => (q instanceof QueryBuilder) ? q.result : q)), queries);
    }
}

function Query(model) {
    return new QueryBuilder(model);
}

Object.defineProperty(Query, 'UP', {
    value: QueryBuilder.UP,
    writable: false
});
Object.defineProperty(Query, 'DOWN', {
    value: QueryBuilder.DOWN,
    writable: false
});

module.exports = {
    QueryBuilder,
    Query
};