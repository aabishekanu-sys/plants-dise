// server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const tf = require('@tensorflow/tfjs-node');

const app = express();
const PORT = 5000;

// ====== MONGODB SETUP ======
mongoose.connect('mongodb://127.0.0.1:27017/plant_ai', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(()=>console.log('MongoDB connected'))
.catch(err => console.log(err));

// ====== SCHEMAS ======
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  role: { type: String, default: 'farmer' },
});

const historySchema = new mongoose.Schema({
  user: String,
  disease: String,
  confidence: String,
  treatmentText: String,
  medicineImage: String,
  date: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const History = mongoose.model('History', historySchema);

// ====== MIDDLEWARE ======
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ====== MULTER SETUP ======
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '_' + file.originalname);
  }
});
const upload = multer({ storage });

// ====== USER LOGIN/REGISTER ======
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: 'User already exists' });
  const newUser = new User({ email, password });
  await newUser.save();
  res.json({ message: 'User registered' });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });
  res.json({ user: { id: user._id, email: user.email, role: user.role } });
});

// ====== GET USERS (ADMIN) ======
app.get('/users', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// ====== LOAD HISTORY ======
app.get('/history', async (req, res) => {
  const history = await History.find().sort({ date: -1 });
  res.json(history);
});

// ====== ANALYZE PLANT ======
app.post('/analyze', upload.single('file'), async (req, res) => {
  const { text, language } = req.body;
  const user = req.body.user || 'Anonymous';
  let disease = 'Healthy';
  let confidence = '100%';
  let treatmentText = 'No issues detected';
  let medicineImage = '';

  try {
    if (req.file) {
      const imageBuffer = fs.readFileSync(req.file.path);
      const tfimage = tf.node.decodeImage(imageBuffer, 3)
        .resizeNearestNeighbor([224,224])
        .expandDims(0)
        .toFloat()
        .div(tf.scalar(255));

      // ===== MOCK PREDICTION =====
      disease = 'Leaf Blight';
      confidence = '92%';
      treatmentText = 'Apply copper-based fungicide and remove infected leaves.';
      medicineImage = '/uploads/sample_medicine.jpg';
    } else if (text) {
      // ===== MOCK TEXT ANALYSIS =====
      disease = 'Nutrient Deficiency';
      confidence = '85%';
      treatmentText = 'Add nitrogen-rich fertilizer. Ensure proper watering.';
      medicineImage = '/uploads/sample_medicine2.jpg';
    }

    // ===== SAVE TO HISTORY =====
    const hist = new History({ user, disease, confidence, treatmentText, medicineImage });
    await hist.save();

    res.json({ disease, confidence, treatmentText, medicineImage, history: true });
  } catch(err) {
    console.error(err);
    res.status(500).json({ message: 'Error analyzing plant', error: err });
  }
});

// ====== START SERVER ======
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));


