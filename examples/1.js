const { MongoDB } = require("../index.js");

const host = 'localhost:27017' || process.env.DB_ADDR;
const login = '<login>' || process.env.DB_LOGIN;
const password = '<password>' || process.env.DB_PASS;
const dbname = '<dbname>' || process.env.DB_NAME;
const url = process.env.DB_URL || `mongodb://${login}:${password}@${host}/${dbname}`;

class Profile {
	constructor(fields) {
		this._id = null;
		this.title = "";
		this.email = "";
		this.password = "";

		Object.assign(this, fields);
	}
}

(async () => {
	let db = await MongoDB.init({
		url: url,
		dbName: dbname
	}, [Profile]);

	await Profile.clear();

	let p = new Profile({
		title: "Alex",
		email: "test@test.ru",
		password: "testingpas"
	});

	await p.save();
	console.log('Saved with ID: ', p._id);

	let list = await (await Profile.find({})).getAll();
	console.log(list);

	let p2 = await Profile.get(p._id);
	console.log("saved profile: ", p2);

	console.log("deleted: ", await p2.remove());
	console.log("Stored in DB: ", await Profile.find({}).count());

})().then(() => {
	console.log('Complete.');
	process.exit();
}).catch(err => {
	console.error("Error: ", err);
	process.exit();
})