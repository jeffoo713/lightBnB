const pg = require('pg');

const config = {
  name: 'jeffkim',
  password: 123,
  host: 'localhost',
  database: 'lightbnb',
  port: 5432,
};

const client = new pg.Client(config);

client.connect(() => console.log('database connected!'));

const properties = require('./json/properties.json');
const users = require('./json/users.json');

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  const queryString = `
  SELECT * FROM users WHERE email = $1
`;
  return client
    .query(queryString, [email])
    .then(result => result.rows[0])
    .catch(err => console.log(err.message));
};
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (userId) {
  const queryString = `
  SELECT * FROM users WHERE id = $1
`;
  return client
    .query(queryString, [userId])
    .then(result => result.rows[0])
    .catch(err => console.log(err.message));
};
exports.getUserWithId = getUserWithId;

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  const queryString = `
  INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *;
`;
  return client
    .query(queryString, [user.name, user.email, user.password])
    .then(result => result.rows[0])
    .catch(err => console.log(err.message));
};
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  const queryString = `
  SELECT * FROM reservations WHERE guest_id = $1 LIMIT ${limit}
`;
  return client
    .query(queryString, [guest_id])
    .then(result => result.rows)
    .catch(err => console.log(err.message));
};

exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
// const getAllProperties = function (options, limit = 10) {
//   const limitedProperties = {};
//   for (let i = 1; i <= limit; i++) {
//     limitedProperties[i] = properties[i];
//   }
//   return Promise.resolve(limitedProperties);
// };
const getAllProperties = function (options, limit = 10) {
  console.log(options);
  const queryParams = [];

  let queryString = `
  SELECT p.*, AVG(pr.rating) as avg_rating
  FROM properties p
  JOIN property_reviews pr ON pr.property_id = p.id
  `;

  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
  }

  if (options.owner_id) {
    queryParams.push(options.owner_id);
    queryString += `AND p.owner_id = $${queryParams.length} `;
  }

  if (options.minimum_price_per_night && options.maximum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100);
    queryParams.push(options.maximum_price_per_night * 100);
    queryString += `
      AND p.cost_per_night >= $${queryParams.length - 1} 
      AND p.cost_per_night <= $${queryParams.length} 
    `;
  }
  queryString += 'GROUP BY p.id ';

  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    queryString += `
    HAVING AVG(pr.rating) >= $${queryParams.length} `;
  }

  queryParams.push(limit);
  queryString += `
  ORDER BY p.cost_per_night
  LIMIT $${queryParams.length}
  `;

  console.log(queryString, queryParams);

  return client.query(queryString, queryParams).then(res => res.rows);
};

exports.getAllProperties = getAllProperties;

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const queryString = `
    INSERT INTO properties (title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *;
  `;
  const queryParams = [];

  for (const info in property) {
    if (info !== 'owner_id') {
      queryParams.push(property[info]);
    }
  }

  return client
    .query(queryString, queryParams)
    .then(result => {
      console.error(result);
      return result.rows[0];
    })
    .catch(err => console.log(err.message));
};
exports.addProperty = addProperty;
