const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const multer = require('multer');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const nodemailer = require('nodemailer');
require('dotenv').config();

const port = 3000;
const app = express();
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));

mongoose.connect('mongodb://localhost:27017/cake-shop', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(session({
  secret: process.env.SESSION_SECRET || 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: 'mongodb://localhost:27017/cake-shop',
    collectionName: 'sessions'
  }),
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use((req, res, next) => {
  console.log(`Request URL: ${req.url}, Session ID: ${req.sessionID}, Session User:`, req.session.user);
  next();
});

// Configure Nodemailer with Gmail SMTP using app password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'frostland14cakeshop@gmail.com',
    pass: process.env.EMAIL_PASS || 'mqnl lkhi gcdz sfvy'
  }
});

// Verify the transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP configuration error:', error);
  } else {
    console.log('SMTP server (Gmail) is ready to send emails');
  }
});

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  sequence_value: { type: Number, default: 0 },
});
const Counter = mongoose.model('Counter', counterSchema);

const userSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  mobile: { type: String, required: true },
  address: { type: String, required: true },
  resetCode: { type: String },
  resetCodeExpiry: { type: Date }
});
const User = mongoose.model('User', userSchema);

const cakeSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String, required: true },
  image: { type: Buffer, required: true },
  weight: { type: Number, required: true },
  category: { type: String, required: true },
  quantity: { type: Number, required: true, default: 0 }
});
const Cake = mongoose.model('Cake', cakeSchema, 'cakes');

const customCakeSchema = new mongoose.Schema({
  customDetails: {
    flavor: { type: String, required: true },
    size: { type: String, required: true },
    frostingType: { type: String, required: true },
    frostingColor: { type: String, required: true },
    toppings: { type: [String], default: [] },
    filling: { type: String },
    shape: { type: String, required: true },
    decorativeElements: { type: [String], default: [] },
    message: { type: String },
    occasion: { type: String, required: true },
    customOccasion: { type: String },
    dietaryPreferences: { type: [String], default: [] }
  }
});
const CustomCake = mongoose.model('CustomCake', customCakeSchema);

const cartSchema = new mongoose.Schema({
  username: { type: String, required: true },
  items: [{
    id: { type: Number, required: true },
    name: { type: String, required: true },
    image: { type: String },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    originalQuantity: { type: Number, required: true },
    customCakeId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomCake' }
  }]
});
const Cart = mongoose.model('Cart', cartSchema);

const historySchema = new mongoose.Schema({
  username: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  totalPrice: { type: Number, required: true },
  items: [{
    id: { type: Number, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    customCakeId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomCake' }
  }],
  status: { type: String, enum: ['pending', 'on process', 'delivered'], default: 'pending' }
});
const History = mongoose.model('History', historySchema);

const getNextSequence = async (name) => {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true }
  );
  return counter.sequence_value;
};

// Check username availability
app.get('/check-username', async (req, res) => {
  const { username } = req.query;
  try {
    const user = await User.findOne({ username });
    res.json({ available: !user });
  } catch (err) {
    console.error('Error checking username:', err);
    res.status(500).json({ available: false, message: 'Failed to check username availability.' });
  }
});

// Register a new user
app.post('/register', async (req, res) => {
  const { fullname, email, username, password, mobile, address } = req.body;
  try {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      if (existingUser.email === email) return res.json({ success: false, message: 'Email already registered!' });
      if (existingUser.username === username) return res.json({ success: false, message: 'Username already taken!' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ fullname, email, username, password: hashedPassword, mobile, address });
    await newUser.save();
    res.json({ success: true, message: 'Registration successful! Redirecting to login...' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

// Login user or admin
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    if (username === 'admin_frostland' && password === 'admin123@#') {
      req.session.user = { username, isAdmin: true };
      req.session.save((err) => {
        if (err) {
          console.error('Session save error during admin login:', err);
          return res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
        }
        console.log('Admin login successful, Session:', req.session.user);
        res.json({
          success: true,
          message: 'Admin login successful! Redirecting...',
          redirect: '/admin-dashboard'
        });
      });
      return;
    }

    const user = await User.findOne({ username });
    if (!user) {
      console.log(`Login failed: User ${username} not found`);
      return res.json({ success: false, message: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`Login failed: Incorrect password for user ${username}`);
      return res.json({ success: false, message: 'Invalid username or password.' });
    }

    if (req.session.user && req.session.user.username !== username) {
      console.log(`Clearing cart for previous user: ${req.session.user.username}`);
      await Cart.deleteOne({ username: req.session.user.username });
    }

    req.session.user = { username: user.username, isAdmin: false };
    req.session.save((err) => {
      if (err) {
        console.error('Session save error during user login:', err);
        return res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
      }
      console.log('User login successful, Session:', req.session.user);
      res.json({
        success: true,
        message: 'Login successful! Redirecting...',
        redirect: '/dashboard'
      });
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

// Forgot password endpoint
app.post('/forgot-password', async (req, res) => {
  const { username, email } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.json({ success: false, message: 'User not found.' });
    }

    if (user.email !== email) {
      return res.json({ success: false, message: 'Email does not match the username.' });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpiry = Date.now() + 3600000;

    user.resetCode = resetCode;
    user.resetCodeExpiry = new Date(resetCodeExpiry);
    await user.save();

    const mailOptions = {
      from: process.env.EMAIL_USER || 'frostland14cakeshop@gmail.com',
      to: user.email,
      subject: 'Password Reset Code - Frostland',
      text: `Dear ${user.fullname},\n\nYou requested a password reset. Use the following code to reset your password:\n\n${resetCode}\n\nThis code is valid for 1 hour.\n\nBest regards,\nFrostland Team`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Reset code sent to ${user.email}: ${resetCode}`);
      res.json({ success: true, message: 'A reset code has been sent to your email.', email: user.email });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      console.log(`Reset code for ${user.email}: ${resetCode}`);
      return res.json({ success: true, message: 'Failed to send email, but reset code generated. Check server logs for the code.' });
    }
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'An error occurred. Please try again.' });
  }
});

// Reset password endpoint
app.post('/reset-password', async (req, res) => {
  const { code, newPassword } = req.body;
  console.log('Reset password request received - Code:', code, 'New Password:', newPassword ? 'Provided' : 'Not Provided');

  try {
    const user = await User.findOne({
      resetCode: code,
      resetCodeExpiry: { $gt: Date.now() }
    });

    if (!user) {
      const userWithCode = await User.findOne({ resetCode: code });
      if (userWithCode) {
        console.log('Reset password failed: Code exists but expired. Expiry:', userWithCode.resetCodeExpiry, 'Current Time:', new Date(Date.now()));
        return res.json({ success: false, message: 'Reset code has expired. Please request a new code.' });
      } else {
        console.log('Reset password failed: No user found with reset code:', code);
        return res.json({ success: false, message: 'Invalid reset code.' });
      }
    }

    console.log('Reset code validated for user:', user.username);

    if (!newPassword) {
      console.log('Reset password: Code validated for user:', user.username);
      return res.json({ success: true, message: 'Code validated.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetCode = undefined;
    user.resetCodeExpiry = undefined;
    await user.save();

    console.log(`Password reset successful for user: ${user.username}`);
    res.json({ success: true, message: 'Password reset successfully. Redirecting to login...' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Failed to reset password. Please try again.' });
  }
});

// Logout endpoint
app.get('/logout', (req, res) => {
  console.log('Logout request received, Session:', req.session.user);
  req.session.destroy(err => {
    if (err) {
      console.error('Session destroy error:', err);
      res.status(500).json({ success: false, message: 'Logout failed.' });
    } else {
      console.log('Logout successful');
      res.json({ success: true, message: 'Logged out successfully.' });
    }
  });
});

// Add a new cake
const upload = multer();
app.post('/cakes', upload.single('image'), async (req, res) => {
  const { name, price, description, weight, category, quantity } = req.body;
  const image = req.file ? req.file.buffer : null;

  if (!image || !name || !price || !description || !weight || !category || !quantity) {
    return res.status(400).json({ success: false, message: 'All fields including image and quantity are required.' });
  }

  try {
    const nextId = await getNextSequence('cakeid');
    const newCake = new Cake({ id: nextId, name, price, description, image, weight, category, quantity: parseInt(quantity) });
    await newCake.save();
    res.json({ success: true, message: 'Cake added successfully!' });
  } catch (err) {
    console.error('Error adding cake:', err);
    res.status(500).json({ success: false, message: 'Failed to add cake.' });
  }
});

// Get a specific cake
app.get('/cakes/:id', async (req, res) => {
  try {
    const cake = await Cake.findOne({ id: req.params.id });
    if (!cake) return res.json({ success: false, message: 'Cake not found.' });
    const cakeWithImage = {
      ...cake.toObject(),
      image: cake.image ? cake.image.toString('base64') : null
    };
    res.json({ success: true, cake: cakeWithImage });
  } catch (err) {
    console.error('Error fetching cake:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch cake.' });
  }
});

// Update a cake
app.put('/cakes/:id', upload.single('image'), async (req, res) => {
  const { name, price, description, weight, category, quantity } = req.body;
  const image = req.file ? req.file.buffer : undefined;

  try {
    const updateData = { name, price, description, weight, category };
    if (image !== undefined) updateData.image = image;
    if (quantity !== undefined) updateData.quantity = parseInt(quantity);

    const cake = await Cake.findOneAndUpdate({ id: req.params.id }, { $set: updateData }, { new: true });
    if (!cake) {
      return res.status(404).json({ success: false, message: 'ID not found for update.' });
    }
    const cakeWithImage = {
      ...cake.toObject(),
      image: cake.image ? cake.image.toString('base64') : null
    };
    res.json({ success: true, message: 'Cake updated successfully!', cake: cakeWithImage });
  } catch (err) {
    console.error('Error updating cake:', err);
    res.status(500).json({ success: false, message: 'Failed to update cake.' });
  }
});

// Delete a cake
app.delete('/cakes/:id', async (req, res) => {
  try {
    const cake = await Cake.findOneAndDelete({ id: req.params.id });
    if (!cake) {
      return res.status(404).json({ success: false, message: 'ID not found for delete.' });
    }
    res.json({ success: true, message: 'Cake deleted successfully!' });
  } catch (err) {
    console.error('Error deleting cake:', err);
    res.status(500).json({ success: false, message: 'Failed to delete cake.' });
  }
});

// Get user profile
app.get('/get-profile', async (req, res) => {
  if (!req.session.user || req.session.user.isAdmin) {
    return res.status(401).json({ success: false, message: 'Not authorized.' });
  }

  try {
    const user = await User.findOne({ username: req.session.user.username });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({
      fullname: user.fullname,
      email: user.email,
      username: user.username,
      mobile: user.mobile,
      address: user.address
    });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch profile.' });
  }
});

// Update user profile
app.put('/update-profile', async (req, res) => {
  if (!req.session.user || req.session.user.isAdmin) {
    return res.status(401).json({ success: false, message: 'Not authorized.' });
  }

  try {
    const { fullname, email, mobile, address } = req.body;
    if (!fullname || !email || !mobile || !address) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const user = await User.findOneAndUpdate(
      { username: req.session.user.username },
      { $set: { fullname, email, mobile, address } },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'Profile updated successfully!' });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

// Get all cakes
app.get('/cakes', async (req, res) => {
  try {
    const cakes = await Cake.find();
    const cakesWithImages = cakes.map(cake => ({
      ...cake.toObject(),
      image: cake.image ? cake.image.toString('base64') : null
    }));
    res.json(cakesWithImages);
  } catch (err) {
    console.error('Error fetching cakes:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch cakes.' });
  }
});

// Update cart quantity (including custom cakes)
app.put('/cart/update-quantity/:id', async (req, res) => {
  console.log('Update quantity request - Params:', req.params, 'Body:', req.body);
  if (!req.session.user) {
    console.log('No session user found, rejecting request');
    return res.status(401).json({ success: false, message: 'Please log in to update cart.' });
  }

  const username = req.session.user.username;
  const { action, quantity, customDetails, price } = req.body;
  const cakeId = parseInt(req.params.id);

  if (!action || !['add', 'delete', 'update'].includes(action)) {
    console.log('Invalid action:', action);
    return res.status(400).json({ success: false, message: 'Invalid action specified. Must be add, delete, or update.' });
  }
  if (action !== 'delete' && (!quantity || quantity <= 0 || !Number.isInteger(quantity))) {
    console.log('Invalid quantity:', quantity);
    return res.status(400).json({ success: false, message: 'Quantity must be a positive integer.' });
  }
  if (customDetails) {
    const requiredFields = ['flavor', 'size', 'frostingType', 'frostingColor', 'shape', 'occasion'];
    const missingFields = requiredFields.filter(field => !customDetails[field]);
    if (missingFields.length > 0) {
      console.log('Missing customDetails fields:', missingFields);
      return res.status(400).json({ success: false, message: `Missing required custom details: ${missingFields.join(', ')}.` });
    }
    if (customDetails.occasion === 'Other' && !customDetails.customOccasion) {
      console.log('Missing customOccasion for Other occasion');
      return res.status(400).json({ success: false, message: 'Custom occasion is required when occasion is Other.' });
    }
  }
  if (customDetails && !price) {
    console.log('Missing price for custom cake');
    return res.status(400).json({ success: false, message: 'Price is required for custom cakes.' });
  }

  try {
    let cart = await Cart.findOne({ username }) || new Cart({ username, items: [] });
    const cake = await Cake.findOne({ id: cakeId });

    let customCakeId = null;
    if (customDetails) {
      const customCake = new CustomCake({ customDetails });
      await customCake.save();
      customCakeId = customCake._id;
      console.log('Saved custom cake with ID:', customCakeId);
    }

    let newCakeQuantity = cake ? cake.quantity : 0;
    let cartItem = cart.items.find(item => item.id === cakeId);

    if (action === 'add') {
      if (cake) {
        if (newCakeQuantity < quantity) {
          console.log(`Insufficient stock for cake ${cakeId}: ${newCakeQuantity} available, ${quantity} requested`);
          return res.status(400).json({ success: false, message: `Insufficient stock. Only ${newCakeQuantity} items available.` });
        }
        newCakeQuantity -= quantity;
      }
      if (cartItem) {
        cartItem.quantity += quantity;
        if (customCakeId) cartItem.customCakeId = customCakeId;
        cartItem.price = price || cartItem.price;
      } else {
        const newItem = {
          id: cakeId,
          name: cake ? cake.name : 'Custom Cake',
          image: cake ? cake.image.toString('base64') : '',
          quantity: quantity,
          price: cake ? cake.price : price || 0,
          category: cake ? cake.category : 'custom',
          originalQuantity: quantity,
          customCakeId: customCakeId || undefined
        };
        cart.items.push(newItem);
        console.log('Added new item to cart:', newItem);
      }
    } else if (action === 'delete') {
      if (cartItem) {
        if (cake) newCakeQuantity += cartItem.quantity;
        cart.items = cart.items.filter(item => item.id !== cakeId);
        console.log(`Deleted item ${cakeId} from cart`);
      } else {
        console.log(`Item ${cakeId} not found in cart`);
        return res.status(404).json({ success: false, message: 'Item not found in cart.' });
      }
    } else if (action === 'update') {
      if (!cartItem) {
        console.log(`Item ${cakeId} not found in cart for update`);
        return res.status(404).json({ success: false, message: 'Item not found in cart.' });
      }
      const quantityDifference = quantity - cartItem.quantity;
      if (cake) {
        newCakeQuantity -= quantityDifference;
        if (newCakeQuantity < 0) {
          console.log(`Insufficient stock for update on cake ${cakeId}: ${cake.quantity + cartItem.quantity} available`);
          return res.status(400).json({ success: false, message: `Insufficient stock. Only ${cake.quantity + cartItem.quantity} items available.` });
        }
      }
      cartItem.quantity = quantity;
      if (customCakeId) cartItem.customCakeId = customCakeId;
      cartItem.price = price || cartItem.price;
      console.log(`Updated item ${cakeId} quantity to ${quantity}`);
    }

    if (cake) {
      cake.quantity = newCakeQuantity;
      await cake.save();
      console.log(`Updated cake ${cakeId} quantity to ${newCakeQuantity}`);
    }

    await cart.save();
    console.log('Cart saved successfully for user:', username);
    res.json({ success: true, message: 'Cart updated successfully.', items: cart.items, updatedCakeQuantity: newCakeQuantity });
  } catch (err) {
    console.error('Error updating cart:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Get cart items
app.get('/api/cart', async (req, res) => {
  if (!req.session.user) {
    console.log('No session user found for /api/cart');
    return res.status(401).json({ success: false, message: 'Please log in to view cart.' });
  }

  try {
    const cart = await Cart.findOne({ username: req.session.user.username })
      .populate('items.customCakeId') || { items: [] };
    res.json({ items: cart.items });
  } catch (err) {
    console.error('Error fetching cart:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch cart.' });
  }
});

// Get current user
app.get('/api/user', (req, res) => {
  if (!req.session.user) {
    console.log('No session user found for /api/user');
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }
  res.json({ success: true, username: req.session.user.username });
});

// Save order to history (called before clearing cart)
app.post('/api/save-order', async (req, res) => {
  if (!req.session.user) {
    console.log('No session user found for /api/save-order');
    return res.status(401).json({ success: false, message: 'Please log in to save order.' });
  }

  try {
    const username = req.session.user.username;
    const { items, totalPrice, date, time } = req.body;

    if (!items || items.length === 0) {
      console.log('No items provided in /api/save-order');
      return res.status(400).json({ success: false, message: 'No items to save in order.' });
    }

    // Process items to save custom cake details
    const processedItems = await Promise.all(items.map(async (item) => {
      let customCakeId = null;
      if (item.category === 'custom' && item.customCakeId) {
        const customCake = new CustomCake({
          customDetails: item.customCakeId.customDetails
        });
        await customCake.save();
        customCakeId = customCake._id;
        console.log('Saved custom cake for order with ID:', customCakeId);
      }
      return {
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        category: item.category,
        customCakeId: customCakeId || undefined
      };
    }));

    const historyEntry = new History({
      username: username,
      date: new Date(date),
      time: time,
      totalPrice: totalPrice,
      items: processedItems,
      status: 'pending'
    });

    await historyEntry.save();
    console.log('Order saved to history for user:', username, 'with status:', historyEntry.status);
    const orderId = historyEntry._id.toString();

    res.json({ success: true, message: 'Order saved successfully.', orderId });
  } catch (err) {
    console.error('Error saving order:', err);
    res.status(500).json({ success: false, message: 'Failed to save order.' });
  }
});

// Clear cart (called after payment)
app.post('/api/cart/clear', async (req, res) => {
  if (!req.session.user) {
    console.log('No session user found for /api/cart/clear');
    return res.status(401).json({ success: false, message: 'Please log in to clear cart.' });
  }

  try {
    const username = req.session.user.username;
    await Cart.deleteOne({ username });
    console.log('Cart cleared for user:', username);
    res.json({ success: true, message: 'Cart cleared successfully.', orderId: null });
  } catch (err) {
    console.error('Error clearing cart:', err);
    res.status(500).json({ success: false, message: 'Failed to clear cart.' });
  }
});

// Update order status (for users after payment)
app.put('/api/order/:id/status', async (req, res) => {
  if (!req.session.user) {
    console.log('No session user found for /api/order/:id/status');
    return res.status(401).json({ success: false, message: 'Please log in to update order status.' });
  }

  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log('User updating order status - ID:', id, 'New Status:', status);

    const order = await History.findOne({ _id: id, username: req.session.user.username });
    if (!order) {
      console.log('Order not found for ID:', id, 'or user not authorized');
      return res.status(404).json({ success: false, message: 'Order not found or you are not authorized to update this order.' });
    }

    if (order.status === 'delivered') {
      console.log('Order already delivered:', id);
      return res.status(403).json({ success: false, message: 'Order is already delivered.' });
    }

    const updatedOrder = await History.findOneAndUpdate(
      { _id: id },
      { $set: { status: status || 'delivered' } },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      console.log('Failed to update order with ID:', id);
      throw new Error('Update failed unexpectedly');
    }

    console.log('Order status updated successfully:', updatedOrder);
    res.json({ success: true, message: 'Order status updated successfully.', order: updatedOrder });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Get admin orders
app.get('/api/admin/orders', async (req, res) => {
  if (!req.session.user || !req.session.user.isAdmin) {
    console.log('Admin access required for /api/admin/orders');
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }

  try {
    const { status } = req.query;
    let query = {};
    if (status) {
      query.status = status.toLowerCase();
    }
    console.log('Fetching admin orders with query:', query);
    const orders = await History.find(query)
      .populate('items.customCakeId')
      .sort({ date: -1 });
    console.log('Admin orders fetched:', orders);
    res.json({ success: true, orders });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
  }
});

// Update order status (admin)
app.put('/api/admin/order/:id/status', async (req, res) => {
  if (!req.session.user || !req.session.user.isAdmin) {
    console.log('Admin access required for /api/admin/order/:id/status');
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }

  try {
    const { id } = req.params;
    let { status } = req.body;

    console.log('Update status request - ID:', id, 'New Status:', status);

    status = status.toLowerCase();
    const validStatuses = ['pending', 'on process', 'delivered'];
    if (!validStatuses.includes(status)) {
      console.log('Invalid status value:', status);
      return res.status(400).json({ success: false, message: `Invalid status value. Must be one of: ${validStatuses.join(', ')}.` });
    }

    const order = await History.findById(id);
    if (!order) {
      console.log('Order not found for ID:', id);
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    console.log('Current order status:', order.status);

    if (order.status === 'delivered') {
      console.log('Order already delivered:', id);
      return res.status(403).json({ success: false, message: 'Order is already delivered and cannot be changed.' });
    }

    if (order.status === 'on process' && status === 'pending') {
      console.log('Cannot revert from on process to pending for order:', id);
      return res.status(403).json({ success: false, message: 'Cannot revert from on process to pending.' });
    }

    const updatedOrder = await History.findOneAndUpdate(
      { _id: id },
      { $set: { status: status } },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      console.log('Failed to update order with ID:', id);
      throw new Error('Update failed unexpectedly');
    }

    console.log('Order status updated successfully:', updatedOrder);
    res.json({ success: true, message: 'Order status updated successfully.', order: updatedOrder });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Get track orders
app.get('/api/track-orders', async (req, res) => {
  if (!req.session.user) {
    console.log('No session user found for /api/track-orders');
    return res.status(401).json({ success: false, message: 'Please log in to view track orders.' });
  }

  try {
    const username = req.session.user.username;
    console.log('Fetching track orders for user:', username);
    const orders = await History.find({
      username,
      status: { $in: ['pending', 'on process'] }
    })
      .populate('items.customCakeId')
      .sort({ date: -1 });
    console.log('Track orders fetched:', orders);
    res.json({ success: true, orders });
  } catch (err) {
    console.error('Error fetching track orders:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch track orders.' });
  }
});

// Get order history
app.get('/api/history', async (req, res) => {
  if (!req.session.user) {
    console.log('No session user found for /api/history');
    return res.status(401).json({ success: false, message: 'Please log in to view history.' });
  }

  try {
    const username = req.session.user.username;
    console.log('Fetching history for user:', username);
    const history = await History.find({ username, status: 'delivered' })
      .populate('items.customCakeId')
      .sort({ date: -1 });
    console.log('History fetched:', history);
    res.json({ success: true, history });
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch history.' });
  }
});

// Default 404 handler
app.use((req, res) => {
  console.log('404 - Endpoint not found:', req.url);
  res.status(404).json({ success: false, message: 'Endpoint not found.' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});