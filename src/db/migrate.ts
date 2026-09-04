import "./env";
import { getSqlite } from "./client";

getSqlite();
console.log("✔ migrations applied");
