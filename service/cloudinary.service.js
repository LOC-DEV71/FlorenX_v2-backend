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
    if (req.files?.logo?.length) {
      const result = await uploadStream(req.files.logo[0]);
      req.body.logo = result.secure_url;
    }

    if (req.files?.favicon?.length) {
      const result = await uploadStream(req.files.favicon[0]);
      req.body.favicon = result.secure_url;
    }

    if (req.files?.bannerDesktop?.length) {
      const result = await uploadStream(req.files.bannerDesktop[0]);
      req.body.bannerDesktop = result.secure_url;
    }

    if (req.files?.bannerMobile?.length) {
      const result = await uploadStream(req.files.bannerMobile[0]);
      req.body.bannerMobile = result.secure_url;
    }

    // upload section hero images
    if (req.files?.sectionHeroImages?.length) {
      const results = await Promise.all(
        req.files.sectionHeroImages.map((file) => uploadStream(file))
      );
      req.body.sectionHeroUploadedLinks = results.map((item) => item.secure_url);
    } else {
      req.body.sectionHeroUploadedLinks = [];
    }

    // upload section hero slider images
    if (req.files?.sectionHeroSliderImages?.length) {
      const results = await Promise.all(
        req.files.sectionHeroSliderImages.map((file) => uploadStream(file))
      );
      req.body.sectionHeroSliderUploadedLinks = results.map(
        (item) => item.secure_url
      );
    } else {
      req.body.sectionHeroSliderUploadedLinks = [];
    }

    next();
  } catch (error) {
    console.log("streamUploadSetting error:", error);
    return res.status(500).json({
      message: "Upload image failed"
    });
  }
};