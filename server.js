// Import required modules
import express from 'express';
import bodyParser from 'body-parser';
import { check, validationResult } from 'express-validator';
import pgPromise from 'pg-promise';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

// Initialize pg-promise and connect to PostgreSQL
const pgp = pgPromise();
const db = pgp('postgres://robotuser:davy@localhost:5432/robotdb');

// Create an instance of express
const app = express();

// Use body-parser middleware to parse JSON bodies
app.use(bodyParser.json());

// Define a rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Apply the rate limiter to all requests
app.use(limiter);

// Define a route
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Validation rules for POST and PUT requests
const recipeValidationRules = [
  check('name').isLength({ min: 1 }).withMessage('Name is required'),
  check('instructions').isLength({ min: 1 }).withMessage('Instructions are required')
];

// Middleware to check JWT
const checkJwt = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  jwt.verify(token, 'your-secret-key', (err, decoded) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to authenticate token' });
    }
    req.userId = decoded.id;
    next();
  });
};

// GET request to /api/recipes
app.get('/api/recipes', checkJwt, async (req, res) => {
  const recipes = await db.any('SELECT * FROM recipes');
  res.json(recipes);
});

// POST request to /api/recipes
app.post('/api/recipes', [checkJwt, ...recipeValidationRules], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const recipe = req.body;
  const savedRecipe = await db.one('INSERT INTO recipes(name, ingredients, instructions) VALUES($1, $2, $3) RETURNING *', [recipe.name, recipe.ingredients, recipe.instructions]);
  res.json(savedRecipe);
});

// PUT request to /api/recipes/:id
app.put('/api/recipes/:id', [checkJwt, ...recipeValidationRules], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { id } = req.params;
  const recipe = req.body;
  const updatedRecipe = await db.one('UPDATE recipes SET name=$1, ingredients=$2, instructions=$3 WHERE id=$4 RETURNING *', [recipe.name, recipe.ingredients, recipe.instructions, id]);
  res.json(updatedRecipe);
});

// DELETE request to /api/recipes/:id
app.delete('/api/recipes/:id', checkJwt, async (req, res) => {
  const { id } = req.params;
  await db.none('DELETE FROM recipes WHERE id=$1', [id]);
  res.json({message: 'Recipe deleted'});
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
