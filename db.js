import pgPromise from 'pg-promise';

const pgp = pgPromise();

const db = pgp('postgres://robotuser:davy@localhost:5432/robotdb');

export default db;
