import unittest
import json
from app import app, routes_data

class SmartWasteAppTestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_index_route(self):
        response = self.app.get('/')
        self.assertEqual(response.status_code, 200)

    def test_get_routes(self):
        response = self.app.get('/api/routes')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode('utf-8'))
        self.assertEqual(data['status'], 'success')
        self.assertIn('data', data)

    def test_login_invalid(self):
        payload = json.dumps({
            "email": "wrong@example.com",
            "password": "wrong",
            "role": "Admin"
        })
        response = self.app.post('/api/login', data=payload, content_type='application/json')
        self.assertEqual(response.status_code, 401)
        data = json.loads(response.data.decode('utf-8'))
        self.assertEqual(data['status'], 'error')

if __name__ == '__main__':
    unittest.main()
