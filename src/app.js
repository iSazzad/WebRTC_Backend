const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/error');

const app = express();

// Security & logs
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static assets
app.use('/', express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api', routes);

// Health without controller (fast path)
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 404 and error handlers
app.use(notFound);
app.use(errorHandler);

module.exports = app;
