const express = require('express');
const AWS = require('aws-sdk');
const dotenv = require('dotenv');
const serverless = require('serverless-http');
const cors = require('cors');

// Load environment variables
dotenv.config();

// Configure AWS SDK
const s3 = new AWS.S3({
    region: process.env.AWS_REGION
});

// Create Express app
const app = express();

// Add CORS middleware
app.use(cors({
    origin: '*', // For development - in production, specify your frontend domain
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// API 1: Generate Signed URL for Uploading
app.post('/upload-url', async (req, res) => {
    try {
        const { fileName, fileType } = req.body;
        const params = {
            Bucket: process.env.S3_BUCKET,
            Key: fileName,
            ContentType: fileType,
            ACL: 'bucket-owner-full-control',
            Expires: 600  // Increased to 10 minutes
        };
        
        const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
        
        res.json({ 
            uploadUrl,
            expiresAt: Date.now() + (params.Expires * 1000) // Send expiration time to client
        });
    } catch (error) {
        console.error('Error generating signed URL:', error);
        res.status(500).json({ error: error.message });
    }
});

// API 2: Generate Expiring URL for Downloading
app.post('/expiring-url', async (req, res) => {
    try {
        const { objectId, expirationTime } = req.body;

        const expirationSeconds = parseInt(expirationTime, 10);

        const params = {
            Bucket: process.env.S3_BUCKET,
            Key: objectId,
            Expires: expirationSeconds
        };

        const downloadUrl = await s3.getSignedUrlPromise('getObject', params);
        
        res.json({ downloadUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export the Express app wrapped with serverless-http
module.exports.handler = serverless(app);