const router = require('express').Router();
const multer = require('multer');
const { compressImage } = require('../utils/imageCompressor');
const Article = require('../models/Article');
const { authenticate } = require('../middleware/auth');

// Use memory storage — we convert to base64, not save to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté. Utilisez JPEG, PNG, WebP ou GIF.'));
    }
  }
});

// POST /api/upload/article-image/:id — Upload & compress image for an article
router.post('/article-image/:id', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune image fournie' });
    }

    const compressed = await compressImage(req.file.buffer);
    const base64 = `data:image/jpeg;base64,${compressed.toString('base64')}`;

    const article = await Article.findByIdAndUpdate(
      req.params.id,
      { image: base64 },
      { new: true }
    );

    if (!article) {
      return res.status(404).json({ error: 'Article non trouvé' });
    }

    res.json({
      message: 'Image uploadée avec succès',
      originalSize: req.file.size,
      compressedSize: compressed.length,
      savings: Math.round((1 - compressed.length / req.file.size) * 100) + '%'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/upload/article-image-base64/:id — Upload base64 image (from camera capture)
router.post('/article-image-base64/:id', authenticate, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image base64 requise' });
    }

    // Strip data URI prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const compressed = await compressImage(buffer);
    const compressedBase64 = `data:image/jpeg;base64,${compressed.toString('base64')}`;

    const article = await Article.findByIdAndUpdate(
      req.params.id,
      { image: compressedBase64 },
      { new: true }
    );

    if (!article) {
      return res.status(404).json({ error: 'Article non trouvé' });
    }

    res.json({
      message: 'Image uploadée avec succès',
      originalSize: buffer.length,
      compressedSize: compressed.length,
      savings: Math.round((1 - compressed.length / buffer.length) * 100) + '%'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/upload/article-image/:id
router.delete('/article-image/:id', authenticate, async (req, res) => {
  try {
    const article = await Article.findByIdAndUpdate(
      req.params.id,
      { image: '' },
      { new: true }
    );
    if (!article) return res.status(404).json({ error: 'Article non trouvé' });
    res.json({ message: 'Image supprimée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
