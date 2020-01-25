/**
 * File: index.js
 * Project: download-with-history
 * Version:1.0.0
 * Created Date: Saturday, January 25th 2020, 11:20:45 am
 * Author: Georgian Stan (georgian.stan8@gmail.com)
 * -----
 * Last Modified: Saturday, 25th January 2020 12:26:01 pm
 * Modified By: Georgian Stan (georgian.stan8@gmail.com>)
 * ------------------------------------
 * Javascript will save your soul!
 */

const path = require("path");
const fs = require("fs");

const AWS = require("aws-sdk");
const colors = require("colors");
const inquirer = require("inquirer");
const log = require("single-line-log").stdout;
const jsonfile = require("jsonfile");

require("dotenv").config();

let TOTAL_BYTES_TO_DOWNLOAD = 0;
let BYTES_DOWNLOADED = 0;

/**
 * * Write your credentials here
 */
const endpoint = process.env.SPACE_ENDPOINT.trim();
const accessKeyId = process.env.SPACE_ACCESS_KEY.trim();
const secretAccessKey = process.env.SPACE_SECRET_KEY.trim();
const BUCKET_TO_BACKUP = process.env.BUCKET_TO_BACKUP.trim();

if (
  !(
    endpoint.length &&
    accessKeyId.length &&
    secretAccessKey.length &&
    BUCKET_TO_BACKUP.length
  )
) {
  console.log("Paste your credentials inside .env file.".red);
  console.log("================= Program Started =================".bgMagenta);
  return;
}

const currentTimestamp = Date.now();
const OUTPUT_HISTORY_FILE = `history-${BUCKET_TO_BACKUP}-${currentTimestamp}.json`;

let OUTPUT_DIR = `backup-${BUCKET_TO_BACKUP}-${currentTimestamp}`; // ? Date.now() -> timestamp

const s3 = new AWS.S3({
  endpoint,
  accessKeyId,
  secretAccessKey
});

/**
 * * Human read bytes size
 */
function bytesToSize(bytes) {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes == 0) return "0 Byte";
  var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + " " + sizes[i];
}

/**
 *  * Print download progress
 */
function printTotalProgress(current, total) {
  const percentage = (current * 100) / total;
  log(
    `${bytesToSize(current)} / ${bytesToSize(total)} (${Math.floor(
      percentage
    )}%)`
  );
}

/**
 * * Download a file using the key
 */
async function downloadFile(outputDir, fileKey) {
  const params = {
    Bucket: BUCKET_TO_BACKUP,
    Key: fileKey
  };

  const outputPath = path.join(__dirname, outputDir, fileKey);
  const fileStream = fs.createWriteStream(outputPath);
  s3.getObject(params)
    .createReadStream()
    .on("error", function(err) {
      console.log(err);
    })
    .on("data", function(chunk) {
      BYTES_DOWNLOADED += chunk.length;
      printTotalProgress(BYTES_DOWNLOADED, TOTAL_BYTES_TO_DOWNLOAD);
    })
    .pipe(fileStream);
}

/**
 * * Create the folder structure of the object storage (recursively)
 */
async function createFolderStructure(outputDir, Prefix = "") {
  const params = {
    Bucket: BUCKET_TO_BACKUP,
    Delimiter: "/",
    Prefix
  };

  const { CommonPrefixes } = await s3.listObjects(params).promise();

  if (CommonPrefixes.length) {
    for (let i = 0; i < CommonPrefixes.length; i++) {
      const { Prefix } = CommonPrefixes[i];

      const dirPath = path.join(__dirname, outputDir, Prefix);
      fs.mkdirSync(dirPath);
      await createFolderStructure(outputDir, Prefix);
    }
  }
}

/**
 * * Get a list with all files recursively
 * ? it will return an orray of objects [{size:*file-size-in-bytes*,key:*file-key*}]
 */
async function getAListWithAllFiles() {
  const output = [];

  async function clojure(Prefix = "") {
    const params = {
      Bucket: BUCKET_TO_BACKUP,
      Delimiter: "/",
      Prefix
    };

    const { Contents, CommonPrefixes } = await s3.listObjects(params).promise();

    if (Contents.length) {
      Contents.forEach(content => {
        const { Size, Key } = content;

        output.push({
          size: Size,
          key: Key
        });
      });
    }

    if (CommonPrefixes.length) {
      for (let i = 0; i < CommonPrefixes.length; i++) {
        const { Prefix } = CommonPrefixes[i];
        await clojure(Prefix);
      }
    }
  }

  await clojure();
  return output;
}

/**
 * * Remove owned files from the list
 */
function trimOwnedFiles(files, currentFiles) {
  const output = [];

  files.forEach(file => {
    const { key } = file;
    if (!currentFiles[key]) {
      output.push(file);
    }
  });

  return output;
}

/**
 * * Main
 */
(async function() {
  console.log("".white);
  console.log("================= Program Started =================".bgMagenta);

  const questions = [
    {
      type: "input",
      name: "historyFilePath",
      message: `Path to .json file with current files or empty spaces to download all files with no history`,
      filter: function(val) {
        return val.trim();
      }
    },

    {
      type: "input",
      name: "downloadFolder",
      message: `Path to folder in which to download files or empty spaces to download all files in a new directory`,
      filter: function(val) {
        return val.trim();
      }
    }
  ];

  // * ask the user if he wants to download (x amount of files with y amount of bytes); useful in case that the object storage is to big and the user does not have the required disk size available
  const makeQuestion = (totalFilesLength, totalSize) => {
    return [
      {
        type: "confirm",
        default: false,
        name: "startProgram",
        message: `Are you sure you want to download ${totalFilesLength} files (${bytesToSize(
          totalSize
        )})?`,
        filter: function(val) {
          return val.toLowerCase().trim();
        }
      }
    ];
  };
  // * get current files
  let currentFiles;
  const { historyFilePath, downloadFolder } = await inquirer.prompt(questions);
  if (!historyFilePath.length) {
    currentFiles = {};
  } else {
    currentFiles = jsonfile.readFileSync(historyFilePath);
  }

  console.log(`Will omit ${Object.keys(currentFiles).length} files`.cyan);

  const allFiles = await getAListWithAllFiles();
  const trimmedFiles = trimOwnedFiles(allFiles, currentFiles);

  // * sum the files sizes (trimmed ones)
  const totalSizeOfFilesToDownload = trimmedFiles
    .map(file => file.size)
    .reduce((prev, curr) => prev + curr, 0);
  TOTAL_BYTES_TO_DOWNLOAD = totalSizeOfFilesToDownload;

  if (!trimmedFiles.length) {
    console.log(
      "No new files to download found, you already have the entire bucket.".red
    );
    console.log("================= Program Stopped =================".bgRed);
    return;
  }

  // * ask the user if he really wants to download all this files
  const { startProgram } = await inquirer.prompt(
    makeQuestion(trimmedFiles.length, totalSizeOfFilesToDownload)
  );
  if (!startProgram) {
    console.log("================= Program Stopped =================".bgRed);
    return;
  }

  // * create the output dir and the folder structure
  if (!downloadFolder.length) {
    fs.mkdirSync(OUTPUT_DIR);
    await createFolderStructure(OUTPUT_DIR);
  } else {
    OUTPUT_DIR = downloadFolder;
  }

  // ! It assumes that all downloads will succeed
  const currentAndNewFiles = JSON.parse(JSON.stringify(currentFiles));

  trimmedFiles
    .map(file => file.key)
    .forEach(key => (currentAndNewFiles[key] = 1));

  const pathToHistoryFile = path.join(__dirname, OUTPUT_HISTORY_FILE);
  jsonfile.writeFile(pathToHistoryFile, currentAndNewFiles);

  // * start download
  trimmedFiles.forEach(file => {
    downloadFile(OUTPUT_DIR, file.key);
  });
})();
