const { Query } = require("../index");

let getBestOperators = (minRating) => Query()
	.isEqual('status', 'active')
	.isOneOf('role', 'operator')
	.inRange('rating', minRating, 5, '==')
	.result;

console.log(getBestOperators(4));