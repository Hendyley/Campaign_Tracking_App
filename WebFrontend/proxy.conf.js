const port = process.env.API_PORT || '8080';

module.exports = {
  '/api': {
    target: `http://localhost:${port}`,
    secure: false,
  },
};