const { MongoDB, ObjectID } = require("./lib/provider");
const { Query } = require("./lib/query");

module.exports = {
	MongoDB, ObjectID, Query,
	Provider: MongoDB,
	ID: ObjectID
};