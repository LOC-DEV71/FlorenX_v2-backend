const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const System = require("../api/v1/Models/system.model");

const configureCloudinary = async () => {
  const system = await System.findOne({});
  if (system?.media && !system.media.cloudinaryStatus) {
    throw new Error("Tính năng lưu trữ Cloudinary hiện đang bị tắt.");
  }
   
  cloudinary.config({
    cloud_name: system?.media?.cloudinaryCloudName || process.env.CLOUD_NAME,
    api_key: system?.media?.cloudinaryApiKey || process.env.CLOUD_KEY,
    api_secret: system?.media?.cloudinaryApiSecret || process.env.CLOUD_SECRET
  });
};

const uploadStream = (file) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream((error, result) => {
      if (result) resolve(result);
      else reject(error);
    });

    streamifier.createReadStream(file.buffer).pipe(stream);
  });
};

module.exports.uploadRawStream = async (buffer) => {
  await configureCloudinary();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "raw", public_id: `bao-cao-he-thong-${Date.now()}.pdf` },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

module.exports.uploadImageBuffer = async (buffer) => {
  await configureCloudinary();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image", folder: "articles", public_id: `article-thumbnail-${Date.now()}` },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

module.exports.streamUpload = async (req, res, next) => {
  try {
    await configureCloudinary();
    if (req.files?.thumbnail?.length) {
      const result = await uploadStream(req.files.thumbnail[0]);
      req.body.thumbnail = result.secure_url;
    }

    if (req.files?.images?.length) {
      const results = await Promise.all(
        req.files.images.map((file) => uploadStream(file))
      );
      req.body.images = results.map((item) => item.secure_url);
    }

    next();
  } catch (error) {
    return res.status(500).json({
      message: "Upload image failed"
    });
  }
};

module.exports.streamUploadAvatar = async (req, res, next) => {
  try {
    await configureCloudinary();
    if (req.files?.avatar?.length) {
      const result = await uploadStream(req.files.avatar[0]);
      req.body.avatar = result.secure_url;
    }

    next();
  } catch (error) {
    return res.status(500).json({
      message: "Upload image failed"
    });
  }
};

module.exports.streamUploadSetting = async (req, res, next) => {
  try {
    await configureCloudinary();
    
    if (req.files && Array.isArray(req.files)) {
      const uploadPromises = req.files.map(async (file) => {
        // We can check if it's a video or image based on mimetype or fieldname
        let resource_type = "image";
        if (file.mimetype.startsWith("video/") || file.fieldname.includes("Video")) {
          resource_type = "video";
        }
        
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { resource_type },
            (error, result) => {
              if (result) {
                // Attach the result back to req.body with the fieldname
                req.body[file.fieldname] = result.secure_url;
                resolve();
              } else {
                reject(error);
              }
            }
          );
          streamifier.createReadStream(file.buffer).pipe(stream);
        });
      });
      
      await Promise.all(uploadPromises);
    }

    next();
  } catch (error) {
    console.log("streamUploadSetting error:", error);
    return res.status(500).json({
      message: "Upload image failed"
    });
  }
};

module.exports.streamUploadBotAvatar = async (req, res, next) => {
  try {
    if (req.files?.botAvatar?.length) {
      await configureCloudinary();
      const result = await uploadStream(req.files.botAvatar[0]);
      req.body.botAvatarUrl = result.secure_url;
    }
    next();
  } catch (error) {
    console.log("streamUploadBotAvatar error:", error);
    return res.status(500).json({
      message: "Upload bot avatar failed"
    });
  }
};