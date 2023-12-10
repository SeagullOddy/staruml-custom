/*
 * Copyright (c) 2013-2014 Minkyu Lee. All rights reserved.
 *
 * NOTICE:  All information contained herein is, and remains the
 * property of Minkyu Lee. The intellectual and technical concepts
 * contained herein are proprietary to Minkyu Lee and may be covered
 * by Republic of Korea and Foreign Patents, patents in process,
 * and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Minkyu Lee (niklaus.lee@gmail.com).
 *
 */

const { EventEmitter } = require("events");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const UnregisteredDialog = require("../dialogs/unregistered-dialog");
const SK = "DF9B72CC966FBE3A46F99858C5AEE";
const packageJSON = require("../../package.json");

// Check License When File Save
const LICENSE_CHECK_PROBABILITY = 0.3;

const PRO_DIAGRAM_TYPES = [
  "SysMLRequirementDiagram",
  "SysMLBlockDefinitionDiagram",
  "SysMLInternalBlockDiagram",
  "SysMLParametricDiagram",
  "BPMNDiagram",
  "WFWireframeDiagram",
  "AWSDiagram",
  "GCPDiagram",
];

/**
 * Default registration status & license info
 */
var status = true;
var licenseInfo = {
  licenseType: "PRO",
  name: "Unlimited User",
  quantity: 1,
};

/**
 * Set Registration Status
 * This function is out of LicenseManager class for the security reason
 * (To disable changing License status by API)
 * @private
 * @param {boolean} newStat
 * @return {string}
 */
function setStatus(licenseManager, newStat) {
  if (status !== newStat) {
    status = newStat;
    licenseManager.emit("statusChanged", status);
  }
}

/**
 * @private
 */
class LicenseManager extends EventEmitter {
  constructor() {
    super();
    this.projectManager = null;
  }

  isProDiagram(diagramType) {
    return PRO_DIAGRAM_TYPES.includes(diagramType);
  }

  /**
   * Get Registration Status
   * @return {string}
   */
  getStatus() {
    return status;
  }

  /**
   * Get License Infomation
   * @return {Object}
   */
  getLicenseInfo() {
    return licenseInfo;
  }

  findLicense() {
    var licensePath = path.join(app.getUserPath(), "/license.key");
    if (!fs.existsSync(licensePath)) {
      licensePath = path.join(app.getAppPath(), "../license.key");
    }
    if (fs.existsSync(licensePath)) {
      return licensePath;
    } else {
      return null;
    }
  }

  /**
   * License is always valid
   *
   * @return {Promise}
   */
  validate() {
    return new Promise((resolve, reject) => {
      resolve(licenseInfo)
    });
  }

  checkLicenseValidity() {
    if (packageJSON.config.setappBuild) {
      setStatus(this, true);
    } else {
      this.validate().then(
        () => {
          setStatus(this, true);
        },
        () => {
          setStatus(this, false);
          UnregisteredDialog.showDialog();
        },
      );
    }
  }

  /**
   * No registration required
   *
   * @param {string} licenseKey
   */
  register(licenseKey) {
    return new Promise((resolve, reject) => {
      // Do nothing
    });
  }

  htmlReady() {
    this.projectManager.on("projectSaved", (filename, project) => {
      var val = Math.floor(Math.random() * (1.0 / LICENSE_CHECK_PROBABILITY));
      if (val === 0) {
        this.checkLicenseValidity();
      }
    });
  }

  appReady() {
    this.checkLicenseValidity();
  }
}

module.exports = LicenseManager;
