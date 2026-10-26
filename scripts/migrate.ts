import { database } from "../src/db";
await database();
console.log("CYPHERFX migrations applied.");
process.exit(0);
