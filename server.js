
const express = require('express');
const multer  = require('multer');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = 3000;

const DATA_DIR      = path.join(__dirname, 'data');
const UPLOAD_DIR    = path.join(__dirname, 'uploads');
const DB_PATH       = path.join(DATA_DIR, 'db.json');
const ADMIN_PASSWORD = 'sheikh@2024'; 

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(DATA_DIR))   fs.mkdirSync(DATA_DIR);

const SEED = {
  nextId: 7,
  orders: [],
  products: [
    { id: 1, title: 'Royal Gold Bridal Set', category: 'Adults Jewelry', price: 24500, stock: 5,
      description: 'Handcrafted 24k-plated bridal necklace set with matching earrings and tikka. Perfect for weddings and formal events.',
      images: ['https://picsum.photos/seed/jewel1/700/700.jpg','https://picsum.photos/seed/jewel1b/700/700.jpg'], created: Date.now() },
    { id: 2, title: 'Emerald Kundan Choker', category: 'Adults Jewelry', price: 8900, stock: 8,
      description: 'Classic kundan choker with emerald center stone, gold finish and adjustable silk cord.',
      images: ['https://picsum.photos/seed/jewel2/700/700.jpg','https://picsum.photos/seed/jewel2b/700/700.jpg'], created: Date.now() },
    { id: 3, title: 'Pearl Drop Earrings', category: 'Adults Jewelry', price: 3200, stock: 15,
      description: 'Elegant freshwater pearl drops suspended from delicate gold-plated hooks. Lightweight for all-day wear.',
      images: ['https://picsum.photos/seed/jewel3/700/700.jpg'], created: Date.now() },
    { id: 4, title: 'Kids Princess Tiara Set', category: 'Kids Jewelry', price: 1850, stock: 12,
      description: 'Sparkling tiara, wand and bracelet set — skin-safe, nickel-free materials designed for little royalty.',
      images: ['https://picsum.photos/seed/jewel4/700/700.jpg'], created: Date.now() },
    { id: 5, title: 'Little Star Bangle Pair', category: 'Kids Jewelry', price: 1200, stock: 20,
      description: 'Adjustable gold-toned bangles with star charms. Soft-edge design safe for children aged 3+.',
      images: ['https://picsum.photos/seed/jewel5/700/700.jpg','https://picsum.photos/seed/jewel5b/700/700.jpg'], created: Date.now() },
    { id: 6, title: 'Crystal Butterfly Hair Clips (Set of 4)', category: 'Hair Clips & Accessories', price: 950, stock: 30,
      description: 'Premium rhinestone butterfly clips with strong spring grip. Set of 4 assorted colors.',
      images: ['https://picsum.photos/seed/jewel6/700/700.jpg'], created: Date.now() }
  ]
};

if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify(SEED, null, 2));

const readDB  = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const writeDB = db  => fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) =>
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-').toLowerCase())
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpe?g|png|webp|gif)$/i.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG / PNG / WEBP / GIF images are allowed'));
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));

const requireAdmin = (req, res, next) => {
  if (req.headers['x-admin-token'] !== ADMIN_PASSWORD)
    return res.status(401).json({ error: 'Unauthorized — admin token missing or invalid' });
  next();
};


app.get('/api/products', (req, res) => {
  const db = readDB();
  res.json([...db.products].sort((a, b) => b.created - a.created));
});

app.get('/api/products/:id', (req, res) => {
  const p = readDB().products.find(p => p.id == req.params.id);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  res.json(p);
});

app.post('/api/products', requireAdmin, upload.array('images', 4), (req, res) => {
  const { title, category, price, description, stock } = req.body;
  if (!title || !category || !price)
    return res.status(400).json({ error: 'Title, category and price are required' });

  const db = readDB();
  const product = {
    id: db.nextId++,
    title: title.trim(),
    category,
    price: Number(price),
    stock: Number(stock) || 0,
    description: (description || '').trim(),
    images: (req.files || []).map(f => '/uploads/' + f.filename),
    created: Date.now()
  };
  db.products.push(product);
  writeDB(db);
  res.status(201).json({ message: 'Ad published live!', product });
});

app.delete('/api/products/:id', requireAdmin, (req, res) => {
  const db = readDB();
  const idx = db.products.findIndex(p => p.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });

  db.products[idx].images.forEach(img => {
    if (img.startsWith('/uploads/')) {
      const f = path.join(UPLOAD_DIR, path.basename(img));
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
  });
  db.products.splice(idx, 1);
  writeDB(db);
  res.json({ message: 'Product deleted' });
});


app.post('/api/orders', (req, res) => {
  const { name, phone, address, city, items } = req.body;
  if (!name || !phone || !address || !city || !items?.length)
    return res.status(400).json({ error: 'All fields and at least one item are required' });

  const db = readDB();

  let total = 0;
  const verified = [];
  for (const it of items) {
    const p = db.products.find(p => p.id == it.id);
    if (!p) return res.status(400).json({ error: `Product ${it.id} no longer exists` });
    const qty = Math.min(Number(it.qty) || 1, p.stock);
    if (qty <= 0) return res.status(400).json({ error: `"${p.title}" is out of stock` });
    total += p.price * qty;
    verified.push({ id: p.id, title: p.title, price: p.price, qty });
    p.stock -= qty; 
  }

  const order = {
    id: 'ORD' + Date.now(),
    name, phone, address, city,
    items: verified,
    total,
    status: 'Pending',
    created: Date.now()
  };
  db.orders.push(order);
  writeDB(db);
  res.status(201).json({ message: 'Order placed successfully!', order });
});

app.get('/api/orders', requireAdmin, (req, res) => res.json(readDB().orders.reverse()));

app.patch('/api/orders/:id', requireAdmin, (req, res) => {
  const db = readDB();
  const o = db.orders.find(o => o.id === req.params.id);
  if (!o) return res.status(404).json({ error: 'Order not found' });
  o.status = req.body.status || o.status;
  writeDB(db);
  res.json({ message: 'Order updated', order: o });
});

app.delete('/api/orders/:id', requireAdmin, (req, res) => {
  const db = readDB();
  db.orders = db.orders.filter(o => o.id !== req.params.id);
  writeDB(db);
  res.json({ message: 'Order removed' });
});


app.post('/api/admin/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD)
    return res.json({ token: ADMIN_PASSWORD, message: 'Welcome back, Sheikh!' });
  res.status(401).json({ error: 'Incorrect password' });
});

app.listen(2000, () => {
    console.log("Server is running on port 2000");
});


