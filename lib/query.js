const { defaultsDeep } = require("lodash");

class QueryBuilder {
    constructor() {
        this.result = {};
    }
    static build() {
        return new QueryBuilder();
    }
    exec(model, options) {
        return model.find(this.result, options);
    }
    __apply(patch = {}, mergeWith = []) {
        this.result = defaultsDeep(this.result, patch);
        return this;
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

module.exports = {
    QueryBuilder,
    Query: () => new QueryBuilder()
};