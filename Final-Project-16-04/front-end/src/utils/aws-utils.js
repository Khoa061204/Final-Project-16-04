import AWS from 'aws-sdk';

const initializeS3 = () => {
  try {
    AWS.config.update({
      region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
      credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: process.env.REACT_APP_AWS_IDENTITY_POOL_ID,
      }),
    });

    return new AWS.S3({
      apiVersion: '2006-03-01',
      params: { Bucket: process.env.REACT_APP_AWS_BUCKET_NAME }
    });
  } catch (error) {
    console.error('AWS configuration error:', error);
    throw new Error('Failed to initialize AWS S3 client');
  }
};

const s3 = initializeS3();

export const UploadFile = async (file, onProgress) => {
  if (!file) {
    throw new Error('No file provided for upload');
  }

  try {
    const params = {
      Bucket: process.env.REACT_APP_AWS_BUCKET_NAME,
      Key: `uploads/${Date.now()}-${file.name.replace(/\s+/g, '-')}`,
      Body: file,
      ContentType: file.type,
      ACL: 'public-read'
    };

    const upload = s3.upload(params);
    
    upload.on('httpUploadProgress', (progress) => {
      onProgress?.(progress);
    });

    const result = await upload.promise();
    return {
      location: result.Location,
      key: result.Key
    };
  } catch (error) {
    console.error('Upload error details:', error);
    throw new Error(error.message || 'Failed to upload file');
  }
};