const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const pdfParse = require('pdf-parse');
const { v4: uuidv4 } = require('uuid');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Helper function to convert PDF buffer to DOC format
async function convertPdfToDoc(pdfBuffer) {
  try {
    const pdfData = await pdfParse(pdfBuffer);
    const textContent = pdfData.text;
    
    // Create a simple DOC format structure
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: textContent
            }
          ]
        }
      ]
    };
  } catch (error) {
    console.error('Error converting PDF to DOC:', error);
    throw new Error('Failed to convert PDF to DOC');
  }
}

// Upload document
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const userId = req.user.id;
    const fileKey = `${userId}/${uuidv4()}-${file.originalname}`;

    // Upload to S3
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // Generate presigned URL
    const getObjectParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey
    };
    const command = new GetObjectCommand(getObjectParams);
    const fileUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // Save to database
    const result = await pool.query(
      'INSERT INTO documents (title, content, file_type, file_key, file_url, user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [file.originalname, null, 'text', fileKey, fileUrl, userId]
    );

    res.json({
      message: 'Document uploaded successfully',
      document: result.rows[0]
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Convert PDF to text
router.post('/:id/convert-pdf', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the document from database
    const result = await pool.query(
      'SELECT * FROM documents WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = result.rows[0];

    // If it's not a PDF, return error
    if (document.file_type !== 'pdf') {
      return res.status(400).json({ error: 'Document is not a PDF' });
    }

    // Get the PDF content from S3
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    const getObjectParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: document.file_key
    };

    const command = new GetObjectCommand(getObjectParams);
    const response = await s3Client.send(command);
    const pdfBuffer = await response.Body.transformToByteArray();

    // Convert PDF to text
    const pdfData = await pdfParse(pdfBuffer);
    const textContent = pdfData.text;

    // Create a new text document with the converted content
    const newDocument = {
      title: document.title.replace('.pdf', '') + ' (Converted)',
      content: JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: textContent
              }
            ]
          }
        ]
      }),
      file_type: 'text',
      user_id: document.user_id
    };

    // Save the new document
    const newResult = await pool.query(
      'INSERT INTO documents (title, content, file_type, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [newDocument.title, newDocument.content, newDocument.file_type, newDocument.user_id]
    );

    res.json({ 
      message: 'PDF converted successfully',
      document: newResult.rows[0]
    });
  } catch (error) {
    console.error('Error converting PDF:', error);
    res.status(500).json({ error: 'Failed to convert PDF' });
  }
});

module.exports = router; 