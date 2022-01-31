const { MongoDB, Query } = require("../index");

const host = 'localhost:27017' || process.env.DB_ADDR;
const login = '<login>' || process.env.DB_LOGIN;
const password = '<password>' || process.env.DB_PASS;
const dbname = '<dbname>' || process.env.DB_NAME;
const url = process.env.DB_URL || `mongodb://${login}:${password}@${host}/${dbname}`;

class Test {
	constructor(fields) {
		this._id = null;
		this.name = '';
		this.value = 0;

		Object.assign(this, fields);
	}
}

(async () => {
	let db = await MongoDB.init({
		url: url,
		dbName: dbname
	}, [Test]);

	await db.clear('test');

	let items = await db.createMany('test', [
		{name: 'A', value: 1},
		{name: 'B', value: 2},
		{name: 'C', value: 3}
	]);
	console.log(items);

	let result = await db.updateOne('test', { name: 'E' }, { name: 'E', value: 50 }, { upsert: true });
	console.log('update: ', result);

})().then(() => {
	console.log('Complete.');
	process.exit();
}).catch(err => {
	console.error("Error: ", err);
	process.exit();
})