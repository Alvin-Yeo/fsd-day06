// load modules
const express = require('express');
const handlebars = require('express-handlebars');
const mysql = require('mysql2/promise');

// configure environment
const PORT = parseInt(process.argv[2]) || parseInt([process.env.PORT]) || 3000;

// SQL
const SQL_FIND_BY_NAME = `select * from apps where name like ? limit ?`;

// create the database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'playstore',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 4,
    timezone: '+08:00'
});

// test db connection before starting the server
const startApp = async (app, pool) => {
    try {
        // get a connection from the connection pool
        const conn = await pool.getConnection();
        console.info(`Pinging database...`);
        
        await conn.ping();

        // release the connection
        conn.release();

        app.listen(PORT, ()=> {
            console.info(`Application started on PORT ${PORT} at ${new Date()}`);
            console.info(`>> DB_USER: `, process.env.DB_USER);
            console.info(`>> DB_PASSWORD: `, process.env.DB_PASSWORD);
        });
    } catch(e) {
        console.error('Cannot ping database: ', e);
    }
};

// create an instance of express
const app = express();

// configure handlebars
app.engine('hbs', handlebars({ defaultLayout: 'default.hbs' }));
app.set('view engine', 'hbs');

// configure routes
app.get(['/', '/index.html'], (req, res) => {
    res.status(200);
    res.type('text/html');
    res.render('index');
});

app.get('/search', async (req, res) => {
    const q = req.query['keyword'];

    let recs, _;

    // acquire a connection from the pool
    const conn = await pool.getConnection();

    try {
        // perform the query
        [ recs, _ ] = await conn.query(SQL_FIND_BY_NAME, [`%${q}%`, 10]);
        // console.info('>> Records: ', recs);
    } catch(e) {
        console.error('Database query failed: ', e);
    } finally {
        // release connection
        conn.release();
    }

    res.status(200);
    res.type('text/html');
    res.render('result', {
        keyword: q,
        recs,
        hasContent: !!recs.length
    });
});

// start server
startApp(app, pool);