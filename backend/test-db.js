require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

client.connect()
  .then(() => {
    console.log('Connected!');
    return client.query('SELECT 1');
  })
  .then(res => {
    console.log('Query result:', res.rows);
    client.end();
  })
  .catch(err => {
    console.error('Error:', err.message);
    client.end();
  });
