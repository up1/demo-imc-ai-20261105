const express = require('express');
const multer = require('multer');
const { getIndex, postExtract, MAX_FILE_SIZE } = require('../controllers/indexController');

const router = express.Router();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_FILE_SIZE, files: 1 },
	fileFilter: (req, file, callback) => {
		const supportedTypes = ['image/png', 'image/jpeg'];
		if (!supportedTypes.includes(file.mimetype)) {
			const error = new Error('Unsupported file type');
			error.code = 'UNSUPPORTED_FILE_TYPE';
			return callback(error);
		}
		return callback(null, true);
	}
});

router.get('/', getIndex);
router.post('/api/extract', upload.single('slip'), postExtract);
router.use((error, req, res, next) => {
	if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
		return res.status(413).json({ error: 'ขนาดไฟล์ต้องไม่เกิน 5 MB' });
	}

	if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_COUNT') {
		return res.status(400).json({ error: 'อัปโหลดได้ครั้งละ 1 ไฟล์เท่านั้น' });
	}

	if (error.code === 'UNSUPPORTED_FILE_TYPE') {
		return res.status(415).json({ error: 'รองรับเฉพาะไฟล์ภาพ PNG, JPG หรือ JPEG' });
	}

	if (error instanceof multer.MulterError) {
		return res.status(400).json({ error: 'ตรวจสอบไฟล์ที่เลือกแล้วลองอีกครั้ง' });
	}

	return res.status(500).json({ error: 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง' });
});

module.exports = router;
