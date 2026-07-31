import os
import sqlite3
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)
DATABASE = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'tasks.db')

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            completed INTEGER DEFAULT 0,
            due_date TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    try:
        conn = get_db_connection()
        tasks = conn.execute('SELECT * FROM tasks ORDER BY created_at DESC').fetchall()
        conn.close()
        
        task_list = []
        for task in tasks:
            task_list.append({
                'id': task['id'],
                'title': task['title'],
                'description': task['description'],
                'completed': bool(task['completed']),
                'due_date': task['due_date'],
                'created_at': task['created_at']
            })
        return jsonify(task_list)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.get_json() or {}
    title = data.get('title')
    if not title:
        return jsonify({'error': 'Title is required'}), 400
    
    description = data.get('description', '')
    due_date = data.get('due_date', '')
    completed = 1 if data.get('completed') else 0
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO tasks (title, description, completed, due_date) VALUES (?, ?, ?, ?)',
            (title, description, completed, due_date)
        )
        conn.commit()
        task_id = cursor.lastrowid
        
        # Fetch the newly created task
        row = conn.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()
        conn.close()
        
        return jsonify({
            'id': row['id'],
            'title': row['title'],
            'description': row['description'],
            'completed': bool(row['completed']),
            'due_date': row['due_date'],
            'created_at': row['created_at']
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.get_json() or {}
    
    try:
        conn = get_db_connection()
        # Verify task exists
        task = conn.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()
        if not task:
            conn.close()
            return jsonify({'error': 'Task not found'}), 404
        
        title = data.get('title', task['title'])
        description = data.get('description', task['description'])
        due_date = data.get('due_date', task['due_date'])
        completed = 1 if data.get('completed', bool(task['completed'])) else 0
        
        conn.execute(
            'UPDATE tasks SET title = ?, description = ?, completed = ?, due_date = ? WHERE id = ?',
            (title, description, completed, due_date, task_id)
        )
        conn.commit()
        
        # Fetch updated task
        updated_row = conn.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()
        conn.close()
        
        return jsonify({
            'id': updated_row['id'],
            'title': updated_row['title'],
            'description': updated_row['description'],
            'completed': bool(updated_row['completed']),
            'due_date': updated_row['due_date'],
            'created_at': updated_row['created_at']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    try:
        conn = get_db_connection()
        task = conn.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()
        if not task:
            conn.close()
            return jsonify({'error': 'Task not found'}), 404
            
        conn.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Task deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    init_db()
    # Use environment variable PORT or fallback to 5000
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
