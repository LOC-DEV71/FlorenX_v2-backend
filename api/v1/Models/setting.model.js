const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    websiteName: {
      type: String,
      default: ""
    },
    contactEmail: {
      type: String,
      default: ""
    },
    contactPhone: {
      type: String,
      default: ""
    },
    address: {
      type: String,
      default: ""
    },

    themeColor: {
      type: String,
      enum: ["blue", "green", "orange", "purple"],
      default: "blue"
    },
    themeMode: {
      type: String,
      enum: ["light", "dark"],
      default: "light"
    },

    logo: {
      type: String,
      default: ""
    },
    favicon: {
      type: String,
      default: ""
    },

    postPerPage: {
      type: Number,
      default: 10
    },
    autoApprovePost: {
      type: Boolean,
      default: false
    },
    showFeaturedPost: {
      type: Boolean,
      default: false
    },

    sessionTimeout: {
      type: Number,
      default: 60
    },
    twoFactorAuth: {
      type: Boolean,
      default: false
    },
    strangeLoginAlert: {
      type: Boolean,
      default: false
    },

    saleBanner: {
      isActive: {
        type: Boolean,
        default: false
      },
      title: {
        type: String,
        default: ""
      },
      shortDescription: {
        type: String,
        default: ""
      },
      discountText: {
        type: String,
        default: ""
      },
      redirectLink: {
        type: String,
        default: ""
      },
      desktopImage: {
        type: String,
        default: ""
      },
      mobileImage: {
        type: String,
        default: ""
      },
      startDate: {
        type: Date,
        default: null
      },
      endDate: {
        type: Date,
        default: null
      }
    },

    section_hero: [
      {
        image: {
          type: String,
          default: ""
        },
        title: {
          type: String,
          default: ""
        },
        desc: {
          type: String,
          default: ""
        },
        tag: {
          type: String,
          default: ""
        },
        link: {
          type: String,
          default: ""
        }
      }
    ],

    section_hero_slider: [
      {
        image: {
          type: String,
          default: ""
        },
        title: {
          type: String,
          default: ""
        },
        tag: {
          type: String,
          default: ""
        },
        link: {
          type: String,
          default: ""
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

const Setting = mongoose.model("Setting", settingSchema, "settings");

module.exports = Setting;