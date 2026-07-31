import unittest
import os
import json
import tempfile
import app as app_module
from app import app, init_db

class TaskManagerTestCase(unittest.TestCase):
    def setUp(self):
        # Create a temporary database file
        self.db_fd, self.db_path = tempfile.mkstemp()
        os.close(self.db_fd)  # Close immediately so SQLite can access and lock it on Windows
        app_module.DATABASE = self.db_path
        app.config['TESTING'] = True
        self.client = app.test_client()
        init_db()

    def tearDown(self):
        # Clean up temporary database
        os.unlink(self.db_path)

    def test_index_route(self):
        """Test that the homepage returns the HTML document"""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'<!DOCTYPE html>', response.data)

    def test_get_tasks_empty(self):
        """Test list API returns empty array initially"""
        response = self.client.get('/api/tasks')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.data), [])

    def test_create_task(self):
        """Test task creation through API"""
        payload = {
            'title': 'Test Flask Task',
            'description': 'Description for testing',
            'due_date': '2026-08-15'
        }
        response = self.client.post(
            '/api/tasks',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertIn('id', data)
        self.assertEqual(data['title'], payload['title'])
        self.assertEqual(data['description'], payload['description'])
        self.assertEqual(data['due_date'], payload['due_date'])
        self.assertEqual(data['completed'], False)

    def test_create_task_missing_title(self):
        """Test task creation fails when title is missing"""
        payload = {
            'description': 'No title here'
        }
        response = self.client.post(
            '/api/tasks',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)

    def test_update_task(self):
        """Test task update (completion status and titles)"""
        # First, create a task
        payload = {'title': 'Original Title', 'completed': False}
        res_create = self.client.post(
            '/api/tasks',
            data=json.dumps(payload),
            content_type='application/json'
        )
        task_id = json.loads(res_create.data)['id']

        # Update it
        update_payload = {
            'title': 'Updated Title',
            'completed': True,
            'description': 'Added description'
        }
        response = self.client.put(
            f'/api/tasks/{task_id}',
            data=json.dumps(update_payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['title'], 'Updated Title')
        self.assertEqual(data['completed'], True)
        self.assertEqual(data['description'], 'Added description')

    def test_delete_task(self):
        """Test task deletion through API"""
        # First, create a task
        res_create = self.client.post(
            '/api/tasks',
            data=json.dumps({'title': 'Task to delete'}),
            content_type='application/json'
        )
        task_id = json.loads(res_create.data)['id']

        # Delete it
        res_delete = self.client.delete(f'/api/tasks/{task_id}')
        self.assertEqual(res_delete.status_code, 200)
        self.assertEqual(json.loads(res_delete.data)['message'], 'Task deleted successfully')

        # Double check it is gone
        res_get = self.client.get('/api/tasks')
        self.assertEqual(json.loads(res_get.data), [])

if __name__ == '__main__':
    unittest.main()
