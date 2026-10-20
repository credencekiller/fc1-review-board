const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const db = new Database('fc1.db');
const SECRET = 'fc1secretkey';

app.use(express.json());
app.use(express.static('public'));

db.exec(`
create table if not exists users (id integer primary key autoincrement, name text, email text unique, password text, role text default 'student');
create table if not exists menu (id integer primary key autoincrement, date text, meal text, dish text);
create table if not exists ratings (id integer primary key autoincrement, user_id integer, menu_id integer, stars integer, unique(user_id, menu_id));
create table if not exists comments (id integer primary key autoincrement, user_id integer, menu_id integer, text text, created text default current_timestamp);
`);

if (!db.prepare('select id from users where email = ?').get('admin@fc1.com')) {
  db.prepare('insert into users (name, email, password, role) values (?, ?, ?, ?)').run('Admin', 'admin@fc1.com', bcrypt.hashSync('admin123', 10), 'admin');
}

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Please login' });
  try {
    req.user = jwt.verify(header.split(' ')[1], SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Please login again' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

app.post('/api/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Fill all fields' });
  try {
    db.prepare('insert into users (name, email, password) values (?, ?, ?)').run(name, email, bcrypt.hashSync(password, 10));
    res.json({ message: 'Signup done, now login' });
  } catch (e) {
    res.status(400).json({ error: 'Email already used' });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('select * from users where email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(400).json({ error: 'Wrong email or password' });
  }
  const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, SECRET, { expiresIn: '1d' });
  res.json({ token: token, name: user.name, role: user.role });
});

app.get('/api/menu', auth, (req, res) => {
  const items = db.prepare(`select m.id, m.meal, m.dish, round(avg(r.stars), 1) as avg, count(r.id) as total,
    (select stars from ratings where menu_id = m.id and user_id = ?) as mine
    from menu m left join ratings r on r.menu_id = m.id
    where m.date = ? group by m.id order by m.id`).all(req.user.id, req.query.date);
  res.json(items);
});

app.post('/api/menu', auth, adminOnly, (req, res) => {
  const { date, meal, dish } = req.body;
  if (!date || !meal || !dish) return res.status(400).json({ error: 'Fill all fields' });
  db.prepare('insert into menu (date, meal, dish) values (?, ?, ?)').run(date, meal, dish);
  res.json({ message: 'Dish added' });
});

app.delete('/api/menu/:id', auth, adminOnly, (req, res) => {
  db.prepare('delete from ratings where menu_id = ?').run(req.params.id);
  db.prepare('delete from comments where menu_id = ?').run(req.params.id);
  db.prepare('delete from menu where id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

app.post('/api/rate', auth, (req, res) => {
  const { menu_id, stars } = req.body;
  if (stars < 1 || stars > 5) return res.status(400).json({ error: 'Stars must be 1 to 5' });
  db.prepare('insert into ratings (user_id, menu_id, stars) values (?, ?, ?) on conflict(user_id, menu_id) do update set stars = excluded.stars').run(req.user.id, menu_id, stars);
  res.json({ message: 'Rated' });
});

app.get('/api/comments/:id', auth, (req, res) => {
  const list = db.prepare('select c.text, c.created, u.name from comments c join users u on u.id = c.user_id where c.menu_id = ? order by c.id desc').all(req.params.id);
  res.json(list);
});

app.post('/api/comments', auth, (req, res) => {
  const { menu_id, text } = req.body;
  if (!text) return res.status(400).json({ error: 'Write something' });
  db.prepare('insert into comments (user_id, menu_id, text) values (?, ?, ?)').run(req.user.id, menu_id, text);
  res.json({ message: 'Comment added' });
});

app.get('/api/stats', auth, (req, res) => {
  const days = db.prepare(`select m.date, round(avg(r.stars), 2) as avg from menu m
    join ratings r on r.menu_id = m.id group by m.date order by m.date desc limit 7`).all().reverse();
  const dishes = db.prepare(`select m.dish, round(avg(r.stars), 2) as avg, count(r.id) as total from menu m
    join ratings r on r.menu_id = m.id where m.date >= date('now', '-7 day')
    group by m.dish order by avg desc`).all();
  res.json({ days: days, best: dishes[0] || null, worst: dishes[dishes.length - 1] || null });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
