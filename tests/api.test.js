// const request = require('supertest');
// const app = require('../app');

// describe('User API', () => {
//   it('GET /api/users - should return list of users', async () => {
//     const res = await request(app).get('/api/users');
//     expect(res.statusCode).toEqual(200);
//     expect(res.body.length).toBeGreaterThan(0);
//   });

//   it('POST /api/users - should create new user', async () => {
//     const res = await request(app)
//       .post('/api/users')
//       .send({ name: 'Charlie' });
//     expect(res.statusCode).toEqual(201);
//     expect(res.body.name).toBe('Charlie');
//   });

//   it('POST /api/users - should fail without name', async () => {
//     const res = await request(app).post('/api/users').send({});
//     expect(res.statusCode).toEqual(400);
//     expect(res.body.error).toBe('Name is required');
//   });
// });
